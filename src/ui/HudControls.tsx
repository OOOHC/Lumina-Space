import { intentBus } from '../input/intent';
import { GestureControls } from './GestureControls';

interface HudControlsProps {
  /** Title of the keyboard-focused photograph, announced to screen readers. */
  focusedTitle: string | null;
}

/**
 * Minimal chrome over the 3D view: wordmark, a one-line hint, Reset View.
 * Everything else belongs to the photographs.
 */
export function HudControls({ focusedTitle }: HudControlsProps) {
  const onResetView = () => intentBus.emit({ type: 'reset-view' });
  return (
    <div className="hud">
      <p className="hud-wordmark">Lumina Space</p>
      <p className="hud-hint">
        Drag to look around · Click a photograph · ← → to browse · Enter opens · R resets
      </p>
      <button type="button" className="text-button hud-reset" onClick={onResetView}>
        Reset view
      </button>
      <div className="hud-gesture">
        <GestureControls />
      </div>
      <div aria-live="polite" className="sr-only">
        {focusedTitle ?? ''}
      </div>
    </div>
  );
}
