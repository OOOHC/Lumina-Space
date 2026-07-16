import { describe, expect, it } from 'vitest';
import { buildShareMetadata } from './shareMetadata';

describe('published exhibition share metadata', () => {
  it('uses the immutable revision title, description, URL, and image', () => {
    expect(
      buildShareMetadata({
        origin: 'https://lumina.example',
        slug: 'quiet-coast-abc123',
        title: 'A Quiet Coast',
        description: 'Twelve studies of the winter shoreline.',
        imageUrl: 'https://images.example/cover.jpg',
      }),
    ).toEqual({
      documentTitle: 'A Quiet Coast — Lumina Space',
      title: 'A Quiet Coast',
      description: 'Twelve studies of the winter shoreline.',
      url: 'https://lumina.example/e/quiet-coast-abc123',
      imageUrl: 'https://images.example/cover.jpg',
    });
  });

  it('provides a useful description when a photographer leaves it blank', () => {
    const metadata = buildShareMetadata({
      origin: 'https://lumina.example',
      slug: 'untitled-abc123',
      title: 'Untitled Studies',
      description: '   ',
      imageUrl: null,
    });
    expect(metadata.description).toContain('immersive photography exhibition');
  });
});
