import { describe, expect, it } from 'vitest';
import { fitWithin } from './imageSizing';

describe('fitWithin', () => {
  it('never upscales an image that already fits', () => {
    expect(fitWithin({ width: 300, height: 200 }, 400)).toEqual({ width: 300, height: 200 });
  });

  it('scales landscape by the long edge', () => {
    expect(fitWithin({ width: 3000, height: 2000 }, 1500)).toEqual({ width: 1500, height: 1000 });
  });

  it('scales portrait by the long edge', () => {
    expect(fitWithin({ width: 2000, height: 3000 }, 1500)).toEqual({ width: 1000, height: 1500 });
  });

  it('handles square images', () => {
    expect(fitWithin({ width: 2048, height: 2048 }, 400)).toEqual({ width: 400, height: 400 });
  });

  it('never rounds a dimension to zero', () => {
    expect(fitWithin({ width: 10000, height: 1 }, 400).height).toBe(1);
  });
});
