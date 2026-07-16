import { describe, expect, it } from 'vitest';
import { publicationReadiness } from './readiness';

describe('publicationReadiness', () => {
  it('accepts an active titled draft with photos', () => {
    expect(
      publicationReadiness({ title: 'Dawn Studies', photoCount: 3, status: 'active' }),
    ).toEqual({ ready: true, problems: [] });
  });

  it('rejects a blank or whitespace title', () => {
    expect(
      publicationReadiness({ title: '   ', photoCount: 3, status: 'active' }).problems,
    ).toContain('missing-title');
  });

  it('rejects an empty exhibition', () => {
    expect(
      publicationReadiness({ title: 'Dawn', photoCount: 0, status: 'active' }).problems,
    ).toContain('no-photos');
  });

  it('rejects an archived draft and reports every problem at once', () => {
    const result = publicationReadiness({ title: '', photoCount: 0, status: 'archived' });
    expect(result.ready).toBe(false);
    expect(result.problems).toEqual(['missing-title', 'no-photos', 'archived']);
  });
});
