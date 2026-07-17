import { describe, expect, it } from 'vitest';
import {
  createSwipeState,
  resetSwipeOrigin,
  updateSwipe,
  type SwipeState,
  type SwipeThresholds,
} from './swipeTracker';

const THRESHOLDS: SwipeThresholds = {
  minDistance: 3,
  minVelocity: 5,
  maxVerticalRatio: 0.5,
  cooldownMs: 500,
};

const sample = (over: Partial<Parameters<typeof updateSwipe>[1]>) => ({
  poseIsOpenPalm: true,
  pinchActive: false,
  x: 0,
  y: 0,
  scale: 0.2,
  now: 0,
  ...over,
});

describe('updateSwipe', () => {
  it('starts a candidate but fires no direction on the first open-palm frame', () => {
    const result = updateSwipe(createSwipeState(), sample({ x: 0.4, now: 0 }), THRESHOLDS);
    expect(result.direction).toBeNull();
    expect(result.state.origin).toEqual({ x: 0.4, y: 0, t: 0 });
  });

  it('fires forward (1) on a fast enough rightward move past distance+velocity', () => {
    let state = createSwipeState();
    state = updateSwipe(state, sample({ x: 0.3, now: 0 }), THRESHOLDS).state;
    // distance = |0.3 - 0.9| / 0.2 = 3.0 >= 3; dt = 0.1s → velocity 30 >= 5
    const result = updateSwipe(state, sample({ x: 0.9, now: 100 }), THRESHOLDS);
    expect(result.direction).toBe(1);
  });

  it('fires backward (-1) on a leftward move', () => {
    let state = createSwipeState();
    state = updateSwipe(state, sample({ x: 0.9, now: 0 }), THRESHOLDS).state;
    const result = updateSwipe(state, sample({ x: 0.3, now: 100 }), THRESHOLDS);
    expect(result.direction).toBe(-1);
  });

  it('does not fire below the distance threshold', () => {
    let state = createSwipeState();
    state = updateSwipe(state, sample({ x: 0.5, now: 0 }), THRESHOLDS).state;
    // distance = |0.5-0.55|/0.2 = 0.25, far below 3
    const result = updateSwipe(state, sample({ x: 0.55, now: 500 }), THRESHOLDS);
    expect(result.direction).toBeNull();
  });

  it('does not fire below the velocity threshold even with enough distance', () => {
    let state = createSwipeState();
    state = updateSwipe(state, sample({ x: 0.3, now: 0 }), THRESHOLDS).state;
    // distance 3.0 (meets minDistance) but over 10s → velocity 0.3, below 5
    const result = updateSwipe(state, sample({ x: 0.9, now: 10000 }), THRESHOLDS);
    expect(result.direction).toBeNull();
  });

  it('rejects a diagonal move exceeding the vertical-ratio cap', () => {
    let state = createSwipeState();
    state = updateSwipe(state, sample({ x: 0.3, y: 0, now: 0 }), THRESHOLDS).state;
    // dx=0.6 → distance 3.0, dt=0.1 → velocity 30 (both pass), but dy=0.5
    // gives |dy|/|dx| ~0.83 > 0.5 cap.
    const result = updateSwipe(state, sample({ x: 0.9, y: 0.5, now: 100 }), THRESHOLDS);
    expect(result.direction).toBeNull();
  });

  it('respects cooldown: a second qualifying motion inside the window does not fire', () => {
    let state = createSwipeState();
    state = updateSwipe(state, sample({ x: 0.3, now: 0 }), THRESHOLDS).state;
    const first = updateSwipe(state, sample({ x: 0.9, now: 100 }), THRESHOLDS);
    expect(first.direction).toBe(1);
    state = first.state;
    state = updateSwipe(state, sample({ x: 0.3, now: 150 }), THRESHOLDS).state;
    // Well within cooldownMs (500) of lastFiredAt=100.
    const second = updateSwipe(state, sample({ x: 0.9, now: 250 }), THRESHOLDS);
    expect(second.direction).toBeNull();
  });

  it('does not evaluate at all when the pose is not open-palm', () => {
    let state = createSwipeState();
    state = updateSwipe(state, sample({ x: 0.3, now: 0 }), THRESHOLDS).state;
    expect(state.origin).not.toBeNull();
    const result = updateSwipe(
      state,
      sample({ poseIsOpenPalm: false, x: 0.9, now: 100 }),
      THRESHOLDS,
    );
    expect(result.direction).toBeNull();
    expect(result.state.origin).toBeNull();
  });

  it('does not evaluate while a pinch is active', () => {
    let state = createSwipeState();
    state = updateSwipe(state, sample({ x: 0.3, now: 0 }), THRESHOLDS).state;
    const result = updateSwipe(
      state,
      sample({ pinchActive: true, x: 0.9, now: 100 }),
      THRESHOLDS,
    );
    expect(result.direction).toBeNull();
    expect(result.state.origin).toBeNull();
  });

  it('a tracking gap resets the candidate: the trajectory cannot resume after loss', () => {
    let state = createSwipeState();
    // Halfway through what would become a qualifying rightward swipe.
    state = updateSwipe(state, sample({ x: 0.3, now: 0 }), THRESHOLDS).state;
    // Tracking lost mid-motion: adapter calls resetSwipeOrigin every frame
    // with no landmarks.
    state = resetSwipeOrigin(state);
    expect(state.origin).toBeNull();
    // Hand returns already at the position that would have completed the
    // old trajectory instantly — must NOT fire, because the origin is gone;
    // this frame only re-seeds a new candidate.
    const result = updateSwipe(state, sample({ x: 0.9, now: 100 }), THRESHOLDS);
    expect(result.direction).toBeNull();
    expect(result.state.origin).toEqual({ x: 0.9, y: 0, t: 100 });
  });

  it('resetSwipeOrigin preserves the cooldown timestamp', () => {
    const state: SwipeState = { origin: { x: 0.5, y: 0, t: 10 }, lastFiredAt: 999 };
    expect(resetSwipeOrigin(state).lastFiredAt).toBe(999);
  });

  it('resetSwipeOrigin is a no-op (same reference) when already reset', () => {
    const state = createSwipeState();
    expect(resetSwipeOrigin(state)).toBe(state);
  });
});
