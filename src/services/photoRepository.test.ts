import { describe, expect, it } from 'vitest';
import { getPhotos } from './photoRepository';

describe('photoRepository', () => {
  it('returns the 12 exhibition photographs', async () => {
    const photos = await getPhotos();
    expect(photos).toHaveLength(12);
  });

  it('returns unique ids', async () => {
    const photos = await getPhotos();
    const ids = new Set(photos.map((p) => p.id));
    expect(ids.size).toBe(photos.length);
  });

  it('serves every photo from flat public /photos/ URLs', async () => {
    const photos = await getPhotos();
    for (const photo of photos) {
      expect(photo.src).toMatch(/^\/photos\/[^/]+\.jpg$/);
    }
  });

  it('provides complete display metadata', async () => {
    const photos = await getPhotos();
    for (const photo of photos) {
      expect(photo.title.length).toBeGreaterThan(0);
      expect(photo.caption.length).toBeGreaterThan(0);
      expect(photo.credit.length).toBeGreaterThan(0);
      expect(photo.width).toBeGreaterThan(0);
      expect(photo.height).toBeGreaterThan(0);
    }
  });
});
