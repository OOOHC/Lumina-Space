import { useEffect, useRef, useState } from 'react';
import type {
  GestureAdapterHandle,
  GestureStatus,
} from '../input/gesture/gestureAdapter';
import { useGalleryStore } from '../state/galleryStore';

const STATUS_LINE: Partial<Record<GestureStatus, string>> = {
  starting: 'Preparing the camera…',
  ready: 'Raise an open palm to engage.',
  engaged: 'Point at a photograph · pinch to pull it from the wall.',
  denied: 'Camera permission was declined — pointer and keyboard remain fully available.',
  'camera-unavailable':
    'No available camera was found — close other camera apps or continue with pointer and keyboard.',
  'model-unavailable':
    'Hand tracking could not start — check the connection or continue with pointer and keyboard.',
};

/**
 * The only place gesture mode can be turned on: an explicit visitor action
 * (never an automatic permission prompt). The adapter module is loaded
 * lazily so MediaPipe never weighs down visitors who don't use it.
 */
export function GestureControls() {
  const [status, setStatus] = useState<GestureStatus>('stopped');
  const handle = useRef<GestureAdapterHandle | null>(null);
  const photoOpen = useGalleryStore((s) => s.selectedId !== null);
  const active = status === 'starting' || status === 'ready' || status === 'engaged';

  const statusLine =
    status === 'engaged' && photoOpen
      ? 'Point, then pinch to return the photograph — or press Esc.'
      : STATUS_LINE[status];

  useEffect(() => {
    return () => handle.current?.stop();
  }, []);

  const enable = async () => {
    const { startGestureAdapter } = await import('../input/gesture/gestureAdapter');
    handle.current = await startGestureAdapter({ onStatus: setStatus });
  };

  const disable = () => {
    handle.current?.stop();
    handle.current = null;
  };

  return (
    <div className="gesture-controls">
      <button
        type="button"
        className="text-button"
        onClick={active ? disable : () => void enable()}
      >
        {active ? 'Disable gesture viewing' : 'Enable gesture viewing'}
      </button>
      {statusLine && (
        <p className="gesture-status" role="status">
          {statusLine}
        </p>
      )}
    </div>
  );
}
