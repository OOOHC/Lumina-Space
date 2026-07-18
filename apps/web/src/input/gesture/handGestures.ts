/**
 * Pure hand-pose classification over MediaPipe's 21 hand landmarks.
 * No MediaPipe import: this module only understands the landmark geometry,
 * which keeps every classification rule unit-testable with synthetic hands.
 *
 * Landmark indices (MediaPipe convention):
 * 0 wrist · 4 thumb tip · 8 index tip · 6 index PIP · 12 middle tip ·
 * 10 middle PIP · 16 ring tip · 14 ring PIP · 20 pinky tip · 18 pinky PIP ·
 * 9 middle MCP (used with the wrist as the hand-scale reference)
 *
 * Pose/scale/spread (classifyHand, handScale, pinchSpread) read
 * `worldLandmarks` (real-world metres, hand-centered, rotation- and
 * distance-invariant) rather than the 2D image-plane `landmarks` (2026-07-17
 * fix): the 2D projection foreshortens under hand rotation and camera
 * distance, which is what made classification noisy. Screen-space position
 * (the on-screen pointer) is a distinct 2D concept and must keep using the
 * image-plane landmarks — it is no longer part of this module's output; the
 * caller builds it directly from `landmarks[8]`.
 */
export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export type HandPose = 'open-palm' | 'pointing' | 'pinch' | 'other';

export interface HandReading {
  pose: HandPose;
}

const PINCH_RATIO = 0.35; // thumb–index distance relative to hand scale
const EXTENDED_RATIO = 1.08; // tip must be this much further from wrist than its PIP

function dist(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

/**
 * Distance from wrist (0) to middle MCP (9): a rotation-stable hand size,
 * used to normalize thresholds (pinch, swipe) so they hold regardless of
 * how close the visitor stands to the camera.
 */
export function handScale(lm: LandmarkPoint[]): number {
  return Math.max(dist(lm[0], lm[9]), 1e-6);
}

function fingerExtended(lm: LandmarkPoint[], tip: number, pip: number): boolean {
  return dist(lm[0], lm[tip]) > dist(lm[0], lm[pip]) * EXTENDED_RATIO;
}

/**
 * Classifies one hand. Priority order matters: pinch is checked first because
 * a pinching hand often still reads as "pointing" by finger extension alone.
 */
export function classifyHand(lm: LandmarkPoint[]): HandReading {
  const scale = handScale(lm);

  const index = fingerExtended(lm, 8, 6);
  const middle = fingerExtended(lm, 12, 10);
  const ring = fingerExtended(lm, 16, 14);
  const pinky = fingerExtended(lm, 20, 18);

  if (dist(lm[4], lm[8]) / scale < PINCH_RATIO) {
    return { pose: 'pinch' };
  }
  if (index && middle && ring && pinky) {
    return { pose: 'open-palm' };
  }
  if (index && !middle && !ring) {
    return { pose: 'pointing' };
  }
  return { pose: 'other' };
}

/**
 * Thumb–index spread relative to hand scale. Below ~PINCH_RATIO reads as a
 * pinch; during a held inspect the adapter tracks this value continuously
 * (with its own exit hysteresis) instead of re-classifying the pose.
 */
export function pinchSpread(lm: LandmarkPoint[]): number {
  return dist(lm[4], lm[8]) / handScale(lm);
}

/** Exponential smoothing for the pointer stream (reduces visible jitter). */
export function smoothPoint(
  previous: LandmarkPoint | null,
  next: LandmarkPoint,
  alpha = 0.35,
): LandmarkPoint {
  if (!previous) return next;
  return {
    x: previous.x + (next.x - previous.x) * alpha,
    y: previous.y + (next.y - previous.y) * alpha,
  };
}

/**
 * Exponential smoothing for a scalar stream. Used for the held-pinch zoom's
 * thumb–index spread (2026-07-17 fix): the raw per-frame value was noisy
 * enough to read as "uncontrollable" since nothing damped it before it
 * drove the zoom magnitude.
 */
export function smoothScalar(
  previous: number | null,
  next: number,
  alpha = 0.35,
): number {
  if (previous === null) return next;
  return previous + (next - previous) * alpha;
}
