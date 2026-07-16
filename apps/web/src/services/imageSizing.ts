/** Derivative ceilings (longest edge, px) for the two stored renditions. */
export const PREVIEW_MAX_PX = 1600;
export const THUMB_MAX_PX = 400;

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Scales dimensions to fit within a square of `maxPx` without upscaling,
 * preserving aspect ratio. Pure so the maths is testable without a canvas.
 */
export function fitWithin({ width, height }: Dimensions, maxPx: number): Dimensions {
  const longest = Math.max(width, height);
  if (longest <= maxPx) {
    return { width, height };
  }
  const scale = maxPx / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
