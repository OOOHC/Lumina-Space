import { samplePhotos } from '../data/samplePhotos';
import type { Photo } from '../types';

/**
 * The only path through which gallery code obtains photo data (ARD rule 4).
 * V1 serves bundled sample data; a remote backend replaces this body at V3
 * without changing any call site.
 */
export async function getPhotos(): Promise<Photo[]> {
  return samplePhotos;
}
