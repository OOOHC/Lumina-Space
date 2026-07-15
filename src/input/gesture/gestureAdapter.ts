import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { intentBus, type IntentBus } from '../intent';
import { classifyHand, smoothPoint, type LandmarkPoint } from './handGestures';

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

export type GestureStatus =
  | 'starting'
  | 'ready' // camera live, waiting for open palm
  | 'engaged' // open palm seen; pointing and pinching are active
  | 'denied' // camera permission refused
  | 'unavailable' // no camera or model failed to load
  | 'stopped';

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
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
  } catch (error) {
    const denied =
      error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'SecurityError');
    onStatus(denied ? 'denied' : 'unavailable');
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
    onStatus('unavailable');
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
  let pinchHeld = false;

  onStatus('ready');

  const disengage = () => {
    if (engaged || pointer !== null) {
      engaged = false;
      pointer = null;
      pinchHeld = false;
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
        onStatus('engaged');
      }
      return;
    }

    if (reading.pose === 'pointing' || reading.pose === 'pinch') {
      // Selfie view: mirror x so pointing right moves right on screen.
      pointer = smoothPoint(pointer, { x: 1 - reading.pointer.x, y: reading.pointer.y });
      bus.emit({ type: 'point-at', x: pointer.x, y: pointer.y });
    }

    if (reading.pose === 'pinch') {
      if (!pinchHeld && now - lastPinchAt > PINCH_REFRACTORY_MS) {
        pinchHeld = true;
        lastPinchAt = now;
        bus.emit({ type: 'open-focused' });
      }
    } else {
      pinchHeld = false;
    }
  };

  rafId = requestAnimationFrame(frame);
  return { stop };
}
