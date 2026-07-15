/**
 * Pure hand-pose classification over MediaPipe's 21 hand landmarks.
 * No MediaPipe import: this module only understands the landmark geometry,
 * which keeps every classification rule unit-testable with synthetic hands.
 *
 * Landmark indices (MediaPipe convention):
 * 0 wrist · 4 thumb tip · 8 index tip · 6 index PIP · 12 middle tip ·
 * 10 middle PIP · 16 ring tip · 14 ring PIP · 20 pinky tip · 18 pinky PIP ·
 * 9 middle MCP (used with the wrist as the hand-scale reference)
 */
export interface LandmarkPoint {
  x: number;
  y: number;
}

export type HandPose = 'open-palm' | 'pointing' | 'pinch' | 'other';

export interface HandReading {
  pose: HandPose;
  /** Index-fingertip position in the source frame (normalized 0..1). */
  pointer: LandmarkPoint;
}

const PINCH_RATIO = 0.35; // thumb–index distance relative to hand scale
const EXTENDED_RATIO = 1.08; // tip must be this much further from wrist than its PIP

function dist(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance from wrist (0) to middle MCP (9): a rotation-stable hand size. */
function handScale(lm: LandmarkPoint[]): number {
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
  const pointer = { x: lm[8].x, y: lm[8].y };
  const scale = handScale(lm);

  const index = fingerExtended(lm, 8, 6);
  const middle = fingerExtended(lm, 12, 10);
  const ring = fingerExtended(lm, 16, 14);
  const pinky = fingerExtended(lm, 20, 18);

  if (dist(lm[4], lm[8]) / scale < PINCH_RATIO) {
    return { pose: 'pinch', pointer };
  }
  if (index && middle && ring && pinky) {
    return { pose: 'open-palm', pointer };
  }
  if (index && !middle && !ring) {
    return { pose: 'pointing', pointer };
  }
  return { pose: 'other', pointer };
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
