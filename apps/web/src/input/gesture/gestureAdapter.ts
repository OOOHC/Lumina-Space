import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { intentBus, type IntentBus } from '../intent';
import {
  classifyHand,
  handScale,
  pinchSpread,
  smoothPoint,
  type LandmarkPoint,
} from './handGestures';
import {
  statusForCameraFailure,
  type GestureStatus,
} from './gestureStatus';
import { TUNING, type GestureDiagnostics } from './gestureTuning';
import {
  createSwipeState,
  resetSwipeOrigin,
  updateSwipe,
} from './swipeTracker';

export type { GestureStatus } from './gestureStatus';
export type { GestureDiagnostics } from './gestureTuning';

/**
 * Gesture input adapter (ADR 0001, ARD rule 3). MediaPipe hand tracking in,
 * device-neutral intents out: `point-at` while pointing, `open-focused` on
 * a quick pinch, `inspect`/`inspect-end` for a held-pinch zoom, `swipe` on
 * an open-palm horizontal motion. Raw landmarks never cross this boundary,
 * and this module knows nothing of gallery, scene, or state.
 *
 * Tracking loss is a three-tier timeline (2026-07-17), not one event:
 * `point-lost` fires immediately (pointer/hover only), an active zoom ends
 * after ZOOM_CANCEL_GRACE_MS, and only sustained loss past
 * TRACKING_LOST_CLOSE_MS emits `tracking-timeout` — the signal
 * state/intentBindings.ts uses to close an opened photo. See intent.ts's
 * module doc for why these three are kept deliberately separate.
 *
 * Engagement follows DESIGN.md ("Curator's Hand"): the camera may be on, but
 * nothing acts on the gallery until the visitor shows an OPEN PALM.
 */

export interface GestureAdapterHandle {
  stop: () => void;
}

interface StartOptions {
  onStatus: (status: GestureStatus) => void;
  /** Dev-only tuning overlay feed; never wired in production UI. */
  onDiagnostics?: (d: GestureDiagnostics) => void;
  bus?: IntentBus;
}

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// Feel parameters live in gestureTuning.ts so the owner tuning session can
// adjust one file; the running adapter reads them at start.
const {
  ZOOM_CANCEL_GRACE_MS,
  TRACKING_LOST_CLOSE_MS,
  PINCH_REFRACTORY_MS,
  HOLD_MS,
  INSPECT_RELEASE_SPREAD,
  INSPECT_SPREAD_MIN,
  INSPECT_SPREAD_MAX,
  SMOOTH_ALPHA,
  SWIPE_MIN_DISTANCE,
  SWIPE_MIN_VELOCITY,
  SWIPE_MAX_VERTICAL_RATIO,
  SWIPE_COOLDOWN_MS,
} = TUNING;
const SWIPE_THRESHOLDS = {
  minDistance: SWIPE_MIN_DISTANCE,
  minVelocity: SWIPE_MIN_VELOCITY,
  maxVerticalRatio: SWIPE_MAX_VERTICAL_RATIO,
  cooldownMs: SWIPE_COOLDOWN_MS,
};

export async function startGestureAdapter({
  onStatus,
  onDiagnostics,
  bus = intentBus,
}: StartOptions): Promise<GestureAdapterHandle> {
  onStatus('starting');

  let stream: MediaStream | null = null;
  let landmarker: HandLandmarker | null = null;
  let video: HTMLVideoElement | null = null;
  let rafId = 0;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(rafId);
    // Explicit lifecycle termination: an active inspect must not survive
    // shutdown, matching disengage()'s defensive cleanup (2026-07-17).
    if (inspecting) bus.emit({ type: 'inspect-end' });
    stream?.getTracks().forEach((track) => track.stop());
    landmarker?.close();
    video?.remove();
    bus.emit({ type: 'point-lost' });
    onStatus('stopped');
  };

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      onStatus('camera-unavailable');
      return { stop: () => undefined };
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
  } catch (error) {
    onStatus(statusForCameraFailure(error));
    return { stop: () => undefined };
  }

  try {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    });
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    onStatus('model-unavailable');
    return { stop: () => undefined };
  }

  video = document.createElement('video');
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;
  video.style.display = 'none'; // never shown: no camera preview in product UI
  document.body.append(video);
  await video.play();

  let engaged = false;
  let pointer: LandmarkPoint | null = null;
  let lastSeen = performance.now();
  let lastPinchAt = 0;
  let pinchActive = false;
  let pinchStartAt = 0;
  let inspecting = false;
  let lastPose: ReturnType<typeof classifyHand>['pose'] = 'other';
  let swipeState = createSwipeState();
  let frameCount = 0;
  let fps = 0;
  let fpsWindowStart = performance.now();

  onStatus('ready');

  const endPinch = (now: number, asTap: boolean) => {
    if (inspecting) {
      bus.emit({ type: 'inspect-end' });
    } else if (asTap) {
      bus.emit({ type: 'open-focused' });
    }
    pinchActive = false;
    inspecting = false;
    lastPinchAt = now;
  };

  /**
   * Sustained tracking loss (>= TRACKING_LOST_CLOSE_MS): full disengage.
   * Emits `tracking-timeout`, NOT `point-lost` — the pointer was already
   * cleared far earlier, at the first missing frame (2026-07-17 correction).
   */
  const disengage = () => {
    if (!engaged) return;
    // Defensive safety net: ZOOM_CANCEL_GRACE_MS should already have ended
    // any inspect well before this point, but tracking loss must never
    // latch a partial zoom (DESIGN step 6) even if that tier is skipped.
    if (inspecting) bus.emit({ type: 'inspect-end' });
    engaged = false;
    pointer = null;
    pinchActive = false;
    inspecting = false;
    lastPose = 'other';
    swipeState = resetSwipeOrigin(swipeState);
    bus.emit({ type: 'tracking-timeout' });
    onStatus('ready');
  };

  const frame = (now: number) => {
    if (stopped) return;
    rafId = requestAnimationFrame(frame);
    if (!video || !landmarker || video.readyState < 2) return;

    const result = landmarker.detectForVideo(video, now);
    const landmarks = result.landmarks[0];

    frameCount += 1;
    if (now - fpsWindowStart >= 1000) {
      fps = Math.round((frameCount * 1000) / (now - fpsWindowStart));
      frameCount = 0;
      fpsWindowStart = now;
    }

    if (!landmarks) {
      // Tier 0 (every frame while tracking is absent): a swipe trajectory
      // must never survive a gap, however brief (2026-07-17 correction) —
      // unconditional and idempotent, no edge-triggering needed.
      swipeState = resetSwipeOrigin(swipeState);

      // Tier 0 (edge-triggered, first missing frame only): the pointer/
      // hover/magnetic-focus position is invalidated immediately. This does
      // NOT close the photo and does NOT touch the zoom — see intent.ts.
      if (pointer !== null) {
        pointer = null;
        bus.emit({ type: 'point-lost' });
      }

      onDiagnostics?.({
        pose: 'no-hand',
        engaged,
        pinchActive,
        inspecting,
        spread: 0,
        magnitude: 0,
        pointerX: 0,
        pointerY: 0,
        fps,
      });

      // Tier 1 (short grace, inspect-only): a brief drop ends an active
      // zoom without closing the photo or fully disengaging.
      if (inspecting && now - lastSeen > ZOOM_CANCEL_GRACE_MS) {
        bus.emit({ type: 'inspect-end' });
        pinchActive = false;
        inspecting = false;
      }

      // Tier 2 (sustained loss): full disengage; intentBindings.ts closes
      // the open photo (if any) via `tracking-timeout`.
      if (now - lastSeen > TRACKING_LOST_CLOSE_MS) disengage();
      return;
    }
    lastSeen = now;

    const reading = classifyHand(landmarks);

    if (!engaged) {
      if (reading.pose === 'open-palm') {
        engaged = true;
        lastPose = 'open-palm';
        onStatus('engaged');
      }
      return;
    }

    if (reading.pose === 'pointing' || reading.pose === 'pinch') {
      // Selfie view: mirror x so pointing right moves right on screen.
      pointer = smoothPoint(
        pointer,
        { x: 1 - reading.pointer.x, y: reading.pointer.y },
        SMOOTH_ALPHA,
      );
      bus.emit({ type: 'point-at', x: pointer.x, y: pointer.y });
    }

    /**
     * Open-palm horizontal swipe (V2.6, UNVALIDATED thresholds — see
     * gestureTuning.ts). Reuses the same mirrored fingertip coordinate as
     * point-at for directional consistency. Gating on "only while a photo
     * is open" happens downstream in intentBindings.ts, not here — the
     * adapter stays ignorant of gallery state (ARD rule 3).
     */
    const swipeResult = updateSwipe(
      swipeState,
      {
        poseIsOpenPalm: reading.pose === 'open-palm',
        pinchActive,
        x: 1 - reading.pointer.x,
        y: reading.pointer.y,
        scale: handScale(landmarks),
        now,
      },
      SWIPE_THRESHOLDS,
    );
    swipeState = swipeResult.state;
    if (swipeResult.direction !== null) {
      bus.emit({ type: 'swipe', direction: swipeResult.direction });
    }

    /**
     * Pinch machine (V2.6): a pinch that RELEASES quickly is a tap —
     * take/return the focused print (open-focused fires on release, so a
     * budding hold is never mistaken for a tap). A pinch HELD past HOLD_MS
     * becomes a continuous inspect whose magnitude follows the thumb–index
     * spread, with exit hysteresis so widening fingers to zoom does not
     * instantly end the pinch. Release settles everything (inspect-end).
     */
    const spread = pinchSpread(landmarks);
    onDiagnostics?.({
      pose: reading.pose,
      engaged,
      pinchActive,
      inspecting,
      spread,
      magnitude: inspecting
        ? Math.min(
            1,
            Math.max(
              0,
              (spread - INSPECT_SPREAD_MIN) / (INSPECT_SPREAD_MAX - INSPECT_SPREAD_MIN),
            ),
          )
        : 0,
      pointerX: pointer?.x ?? 0,
      pointerY: pointer?.y ?? 0,
      fps,
    });
    if (!pinchActive) {
      // A pinch starts only from a pointing pose. Field finding (owner,
      // 2026-07-15): a relaxing open palm reads as a pinch for a few frames.
      if (
        reading.pose === 'pinch' &&
        lastPose === 'pointing' &&
        now - lastPinchAt > PINCH_REFRACTORY_MS
      ) {
        pinchActive = true;
        pinchStartAt = now;
        inspecting = false;
      }
    } else {
      const held = now - pinchStartAt;
      if (!inspecting && held >= HOLD_MS) {
        inspecting = true;
      }
      if (inspecting) {
        const magnitude = Math.min(
          1,
          Math.max(0, (spread - INSPECT_SPREAD_MIN) / (INSPECT_SPREAD_MAX - INSPECT_SPREAD_MIN)),
        );
        bus.emit({ type: 'inspect', magnitude });
      }
      const released = inspecting
        ? spread > INSPECT_RELEASE_SPREAD || reading.pose === 'open-palm'
        : reading.pose !== 'pinch';
      if (released) {
        endPinch(now, !inspecting && held < HOLD_MS);
      }
    }
    lastPose = reading.pose;
  };

  rafId = requestAnimationFrame(frame);
  return { stop };
}
