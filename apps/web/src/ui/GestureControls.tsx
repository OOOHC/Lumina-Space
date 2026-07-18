import { useEffect, useRef, useState } from 'react';
import type {
  GestureAdapterHandle,
  GestureDiagnostics,
  GestureStatus,
} from '../input/gesture/gestureAdapter';
import { useGalleryStore } from '../state/galleryStore';

/**
 * Tuning-session instrumentation: dev builds only, and only when the page is
 * opened with ?gestureDebug. Production users can never see a diagnostic
 * overlay (DESIGN gesture visual rules).
 */
const DEBUG_ENABLED =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('gestureDebug');

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
  const [diag, setDiag] = useState<GestureDiagnostics | null>(null);
  const handle = useRef<GestureAdapterHandle | null>(null);
  const photoOpen = useGalleryStore((s) => s.selectedId !== null);
  const active = status === 'starting' || status === 'ready' || status === 'engaged';

  const statusLine =
    status === 'engaged' && photoOpen
      ? 'Hold a pinch and spread your fingers to look closer · swipe an open palm sideways for the next or previous photo · a quick pinch returns it · Esc.'
      : STATUS_LINE[status];

  useEffect(() => {
    return () => handle.current?.stop();
  }, []);

  const enable = async () => {
    const { startGestureAdapter } = await import('../input/gesture/gestureAdapter');
    handle.current = await startGestureAdapter({
      onStatus: setStatus,
      onDiagnostics: DEBUG_ENABLED ? setDiag : undefined,
    });
  };

  const disable = () => {
    handle.current?.stop();
    handle.current = null;
    setDiag(null);
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
      {DEBUG_ENABLED && active && (
        <pre className="gesture-debug" aria-hidden="true">
          {diag
            ? [
                `pose      ${diag.pose}`,
                `engaged   ${diag.engaged ? 'yes' : 'no'}`,
                `pinch     ${diag.pinchActive ? (diag.inspecting ? 'INSPECT' : 'held') : '—'}`,
                `spread    ${diag.spread.toFixed(2)}`,
                `zoom      ${(diag.magnitude * 100).toFixed(0)}%`,
                `pointer   ${diag.pointerX.toFixed(2)}, ${diag.pointerY.toFixed(2)}`,
                `track fps ${diag.fps}`,
              ].join('\n')
            : 'waiting for frames…'}
        </pre>
      )}
    </div>
  );
}
