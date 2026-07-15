import { useEffect, useRef, useState } from 'react';
import type {
  GestureAdapterHandle,
  GestureStatus,
} from '../input/gesture/gestureAdapter';

const STATUS_LINE: Partial<Record<GestureStatus, string>> = {
  starting: 'Preparing the camera…',
  ready: 'Raise an open palm to engage.',
  engaged: 'Point at a photograph · pinch to pull it from the wall.',
  denied: 'Camera permission was declined — pointer and keyboard remain fully available.',
  unavailable: 'Gesture viewing isn’t available on this device — pointer and keyboard remain fully available.',
};

/**
 * The only place gesture mode can be turned on: an explicit visitor action
 * (never an automatic permission prompt). The adapter module is loaded
 * lazily so MediaPipe never weighs down visitors who don't use it.
 */
export function GestureControls() {
  const [status, setStatus] = useState<GestureStatus>('stopped');
  const handle = useRef<GestureAdapterHandle | null>(null);
  const active = status === 'starting' || status === 'ready' || status === 'engaged';

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
      {STATUS_LINE[status] && (
        <p className="gesture-status" role="status">
          {STATUS_LINE[status]}
        </p>
      )}
    </div>
  );
}
