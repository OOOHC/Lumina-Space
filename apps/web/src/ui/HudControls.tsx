import { intentBus } from '../input/intent';

interface HudControlsProps {
  /** Title of the keyboard-focused photograph, announced to screen readers. */
  focusedTitle: string | null;
}

/**
 * Minimal chrome over the 3D view: wordmark, a one-line hint, Reset View.
 * Everything else belongs to the photographs.
 *
 * Gesture status (`.hud-gesture`) is deliberately NOT rendered here: it lives
 * as its own top-level, always-on-top element (see App.tsx /
 * PublicExhibitionPage.tsx) so it stays legible even while the detail overlay
 * (a near-opaque full-screen modal) is covering the rest of this HUD
 * (2026-07-18 fix — the gesture hint was unreadable while a photo was open).
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
      <div aria-live="polite" className="sr-only">
        {focusedTitle ?? ''}
      </div>
    </div>
  );
}
