import { describe, expect, it } from 'vitest';
import { statusForCameraFailure } from './gestureStatus';

describe('gesture availability status', () => {
  it('distinguishes permission denial from missing or busy camera hardware', () => {
    expect(statusForCameraFailure(new DOMException('denied', 'NotAllowedError'))).toBe(
      'denied',
    );
    expect(statusForCameraFailure(new DOMException('missing', 'NotFoundError'))).toBe(
      'camera-unavailable',
    );
    expect(statusForCameraFailure(new TypeError('mediaDevices unavailable'))).toBe(
      'camera-unavailable',
    );
  });
});
