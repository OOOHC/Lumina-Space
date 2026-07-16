import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { intentBus, type IntentBus } from '../intent';
import {
  classifyHand,
  pinchSpread,
  smoothPoint,
  type LandmarkPoint,
} from './handGestures';
import {
  statusForCameraFailure,
  type GestureStatus,
} from './gestureStatus';

export type { GestureStatus } from './gestureStatus';

/**
 * Gesture input adapter (ADR 0001, ARD rule 3). MediaPipe hand tracking in,
 * existing intents out: `point-at` while pointing, `open-focused` on a pinch,
 * `point-lost` when tracking ends. Raw landmarks never cross this boundary,
 * and this module knows nothing of gallery, scene, or state.
 *
 * Engagement follows DESIGN.md ("Curator's Hand"): the camera may be on, but
 * nothing acts on the gallery until the visitor shows an OPEN PALM. Losing
 * the hand disengages after a short grace period and cancels cleanly.
 */

export interface GestureAdapterHandle {
  stop: () => void;
}

interface StartOptions {
  onStatus: (status: GestureStatus) => void;
  bus?: IntentBus;
}

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const DISENGAGE_AFTER_MS = 600; // hand missing this long → point-lost
const PINCH_REFRACTORY_MS = 900; // one pinch = one selection
const HOLD_MS = 400; // pinch held longer than this becomes an inspect, not a tap
const INSPECT_RELEASE_SPREAD = 0.62; // fingers this far apart end the inspect
const INSPECT_SPREAD_MIN = 0.08; // tight pinch → magnitude 0
const INSPECT_SPREAD_MAX = 0.55; // wide-but-held pinch → magnitude 1

export async function startGestureAdapter({
  onStatus,
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

  const disengage = () => {
    if (engaged || pointer !== null) {
      // Tracking loss can never latch a partial inspect (DESIGN step 6).
      if (inspecting) bus.emit({ type: 'inspect-end' });
      engaged = false;
      pointer = null;
      pinchActive = false;
      inspecting = false;
      lastPose = 'other';
      bus.emit({ type: 'point-lost' });
      onStatus('ready');
    }
  };

  const frame = (now: number) => {
    if (stopped) return;
    rafId = requestAnimationFrame(frame);
    if (!video || !landmarker || video.readyState < 2) return;

    const result = landmarker.detectForVideo(video, now);
    const landmarks = result.landmarks[0];

    if (!landmarks) {
      if (now - lastSeen > DISENGAGE_AFTER_MS) disengage();
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
      pointer = smoothPoint(pointer, { x: 1 - reading.pointer.x, y: reading.pointer.y });
      bus.emit({ type: 'point-at', x: pointer.x, y: pointer.y });
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
