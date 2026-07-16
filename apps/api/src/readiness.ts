/**
 * Publication readiness (V4 scope): the checks a draft must pass before V5
 * will ever allow publishing. Pure so the rules are testable and the UI can
 * explain exactly what is missing instead of a generic "not ready".
 */
export type ReadinessProblem = 'missing-title' | 'no-photos' | 'archived';

export interface Readiness {
  ready: boolean;
  problems: ReadinessProblem[];
}

export function publicationReadiness(input: {
  title: string;
  photoCount: number;
  status: 'active' | 'archived';
}): Readiness {
  const problems: ReadinessProblem[] = [];
  if (input.title.trim().length === 0) problems.push('missing-title');
  if (input.photoCount === 0) problems.push('no-photos');
  if (input.status === 'archived') problems.push('archived');
  return { ready: problems.length === 0, problems };
}
