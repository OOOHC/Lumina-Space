export type GestureStatus =
  | 'starting'
  | 'ready'
  | 'engaged'
  | 'denied'
  | 'camera-unavailable'
  | 'model-unavailable'
  | 'stopped';

export function statusForCameraFailure(error: unknown): Extract<
  GestureStatus,
  'denied' | 'camera-unavailable'
> {
  if (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError')
  ) {
    return 'denied';
  }
  return 'camera-unavailable';
}
