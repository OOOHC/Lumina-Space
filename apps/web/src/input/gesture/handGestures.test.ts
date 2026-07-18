import { describe, expect, it } from 'vitest';
import { classifyHand, smoothPoint, smoothScalar, type LandmarkPoint } from './handGestures';

/**
 * Synthetic hands: wrist at (0.5, 0.9), fingers pointing up (decreasing y).
 * Only the landmarks the classifier reads are meaningful; the rest are
 * filled with the wrist position. classifyHand now reads world-space
 * landmarks (real-world, hand-centered), but plain 2D points with z
 * omitted are equally valid inputs — the distance math treats a missing z
 * as 0, which keeps these synthetic hands simple.
 */
function makeHand(overrides: Record<number, LandmarkPoint>): LandmarkPoint[] {
  const lm: LandmarkPoint[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.9 }));
  lm[9] = { x: 0.5, y: 0.7 }; // middle MCP → hand scale 0.2
  for (const [index, point] of Object.entries(overrides)) {
    lm[Number(index)] = point;
  }
  return lm;
}

const EXTENDED = {
  8: { x: 0.5, y: 0.3 }, // index tip far from wrist
  6: { x: 0.5, y: 0.55 }, // index PIP closer
  12: { x: 0.55, y: 0.3 },
  10: { x: 0.55, y: 0.55 },
  16: { x: 0.6, y: 0.32 },
  14: { x: 0.6, y: 0.56 },
  20: { x: 0.65, y: 0.36 },
  18: { x: 0.65, y: 0.58 },
};

describe('classifyHand', () => {
  it('recognises an open palm (all fingers extended, thumb apart)', () => {
    const hand = makeHand({ ...EXTENDED, 4: { x: 0.3, y: 0.5 } });
    expect(classifyHand(hand).pose).toBe('open-palm');
  });

  it('recognises pointing (index extended, middle and ring folded)', () => {
    const hand = makeHand({
      8: { x: 0.5, y: 0.3 },
      6: { x: 0.5, y: 0.55 },
      4: { x: 0.35, y: 0.6 },
    });
    expect(classifyHand(hand).pose).toBe('pointing');
  });

  it('recognises a pinch even while other fingers are extended', () => {
    const hand = makeHand({
      ...EXTENDED,
      4: { x: 0.51, y: 0.31 }, // thumb tip touching index tip
    });
    expect(classifyHand(hand).pose).toBe('pinch');
  });

  it('classifies a closed fist as other', () => {
    const hand = makeHand({ 4: { x: 0.45, y: 0.8 } });
    expect(classifyHand(hand).pose).toBe('other');
  });

  it('treats a z-depth difference the same as an equivalent x/y difference', () => {
    // Thumb and index at the same (x, y) but separated only along z: a
    // world-space classifier must count that as spread, not a pinch.
    const hand = makeHand({
      ...EXTENDED,
      4: { x: 0.5, y: 0.3, z: 0.3 },
      8: { x: 0.5, y: 0.3, z: 0 },
    });
    expect(classifyHand(hand).pose).not.toBe('pinch');
  });
});

describe('smoothPoint', () => {
  it('passes the first sample through unchanged', () => {
    expect(smoothPoint(null, { x: 0.4, y: 0.6 })).toEqual({ x: 0.4, y: 0.6 });
  });

  it('moves a fraction of the way toward each new sample', () => {
    const smoothed = smoothPoint({ x: 0, y: 0 }, { x: 1, y: 1 }, 0.25);
    expect(smoothed.x).toBeCloseTo(0.25);
    expect(smoothed.y).toBeCloseTo(0.25);
  });

  it('converges on a steady target', () => {
    let point: LandmarkPoint = { x: 0, y: 0 };
    for (let i = 0; i < 30; i++) {
      point = smoothPoint(point, { x: 1, y: 1 });
    }
    expect(point.x).toBeGreaterThan(0.99);
  });
});

describe('smoothScalar', () => {
  it('passes the first sample through unchanged', () => {
    expect(smoothScalar(null, 0.4)).toBe(0.4);
  });

  it('moves a fraction of the way toward each new sample', () => {
    expect(smoothScalar(0, 1, 0.25)).toBeCloseTo(0.25);
  });

  it('converges on a steady target', () => {
    let value: number | null = 0;
    for (let i = 0; i < 30; i++) {
      value = smoothScalar(value, 1, 0.25);
    }
    expect(value as number).toBeGreaterThan(0.99);
  });
});
