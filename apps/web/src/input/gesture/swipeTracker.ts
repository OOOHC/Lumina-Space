/**
 * Pure open-palm horizontal-swipe detection. No MediaPipe import, no shared
 * mutable state — the adapter holds one `SwipeState` and threads it through
 * `updateSwipe` every frame, exactly like `classifyHand`/`smoothPoint` are
 * pure and unit-tested without a camera.
 *
 * A swipe candidate is a run of consecutive frames where the pose is
 * `open-palm` and no pinch is active. Distance and velocity are normalized
 * by hand-scale (see `handScale`) so the same physical motion counts the
 * same regardless of distance from the camera. All thresholds here are
 * UNVALIDATED initial defaults — see gestureTuning.ts.
 */

export type SwipeDirection = -1 | 1;

export interface SwipeState {
  /** Origin of the current candidate run, or null if not accumulating. */
  origin: { x: number; y: number; t: number } | null;
  /** Timestamp (ms) of the last successful swipe; -Infinity if none yet. */
  lastFiredAt: number;
}

export function createSwipeState(): SwipeState {
  return { origin: null, lastFiredAt: -Infinity };
}

/**
 * Immediately abandons the current candidate run. Called on every frame
 * where hand tracking is absent — a swipe trajectory must NOT survive a
 * tracking gap, even briefly (owner correction, 2026-07-17). The cooldown
 * (`lastFiredAt`) is untouched: it is wall-clock time and does not care
 * whether the hand was visible in between.
 */
export function resetSwipeOrigin(state: SwipeState): SwipeState {
  if (state.origin === null) return state; // avoid needless object churn
  return { origin: null, lastFiredAt: state.lastFiredAt };
}

export interface SwipeSample {
  poseIsOpenPalm: boolean;
  /** True while a pinch/inspect interaction owns the hand this frame. */
  pinchActive: boolean;
  /** Screen-space (already mirrored) fingertip x, 0..1. */
  x: number;
  /** Screen-space (already mirrored) fingertip y, 0..1. */
  y: number;
  /** Hand-scale reference for this frame (see `handScale`). */
  scale: number;
  /** Current timestamp, ms (same clock as `performance.now()`). */
  now: number;
}

export interface SwipeThresholds {
  /** Horizontal distance, in hand-scale multiples, to count as a swipe. */
  minDistance: number;
  /** Horizontal speed, hand-scale multiples per second. */
  minVelocity: number;
  /** Max |dy|/|dx| before a move is rejected as non-horizontal. */
  maxVerticalRatio: number;
  /** Minimum gap between two accepted swipes, ms. */
  cooldownMs: number;
}

export interface SwipeUpdateResult {
  state: SwipeState;
  /** -1 (previous) or 1 (next) the frame a swipe is recognised; else null. */
  direction: SwipeDirection | null;
}

export function updateSwipe(
  state: SwipeState,
  sample: SwipeSample,
  thresholds: SwipeThresholds,
): SwipeUpdateResult {
  if (!sample.poseIsOpenPalm || sample.pinchActive) {
    return { state: resetSwipeOrigin(state), direction: null };
  }

  if (state.origin === null) {
    return {
      state: { origin: { x: sample.x, y: sample.y, t: sample.now }, lastFiredAt: state.lastFiredAt },
      direction: null,
    };
  }

  const dx = sample.x - state.origin.x;
  const dy = sample.y - state.origin.y;
  const dt = (sample.now - state.origin.t) / 1000;
  if (dt <= 0) {
    return { state, direction: null };
  }

  const distance = Math.abs(dx) / sample.scale;
  const velocity = distance / dt;
  const verticalOk = Math.abs(dy) <= thresholds.maxVerticalRatio * Math.abs(dx);
  const cooledDown = sample.now - state.lastFiredAt >= thresholds.cooldownMs;

  if (
    distance >= thresholds.minDistance &&
    velocity >= thresholds.minVelocity &&
    verticalOk &&
    cooledDown
  ) {
    return {
      state: { origin: null, lastFiredAt: sample.now },
      direction: dx > 0 ? 1 : -1,
    };
  }

  return { state, direction: null };
}
