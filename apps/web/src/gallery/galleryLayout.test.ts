import { describe, expect, it } from 'vitest';
import { GALLERY_ROOM, PHOTO_WIDTH, galleryLayout } from './galleryLayout';

describe('galleryLayout', () => {
  it('returns one placement per photo', () => {
    expect(galleryLayout(12)).toHaveLength(12);
    expect(galleryLayout(1)).toHaveLength(1);
    expect(galleryLayout(0)).toHaveLength(0);
  });

  it('places every photo at the configured hanging height', () => {
    for (const p of galleryLayout(12)) {
      expect(p.position[1]).toBe(GALLERY_ROOM.photoHeight);
    }
  });

  it('keeps every photo inside the room bounds', () => {
    const hw = GALLERY_ROOM.width / 2;
    const hd = GALLERY_ROOM.depth / 2;
    for (const p of galleryLayout(12)) {
      expect(Math.abs(p.position[0])).toBeLessThanOrEqual(hw);
      expect(Math.abs(p.position[2])).toBeLessThanOrEqual(hd);
    }
  });

  it('faces every photo toward the room centre', () => {
    for (const p of galleryLayout(12)) {
      const normal = [Math.sin(p.rotationY), Math.cos(p.rotationY)];
      const toCentre = [-p.position[0], -p.position[2]];
      const dot = normal[0] * toCentre[0] + normal[1] * toCentre[1];
      expect(dot).toBeGreaterThan(0);
    }
  });

  it('leaves at least a frame width between neighbouring photos', () => {
    const placements = galleryLayout(12);
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const a = placements[i].position;
        const b = placements[j].position;
        const distance = Math.hypot(a[0] - b[0], a[2] - b[2]);
        expect(distance).toBeGreaterThan(PHOTO_WIDTH);
      }
    }
  });

  it('is deterministic', () => {
    expect(galleryLayout(12)).toEqual(galleryLayout(12));
  });
});
