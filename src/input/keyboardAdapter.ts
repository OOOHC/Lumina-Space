import { intentBus, type IntentBus } from './intent';

/**
 * Keyboard adapter: raw key events in, intents out. It knows nothing about
 * gallery state — an intent that does not currently apply is ignored by the
 * binding layer, so this adapter never needs to ask. Native key behaviour is
 * never prevented; buttons and links keep their own Enter handling.
 */
export function attachKeyboardAdapter(bus: IntentBus = intentBus): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const onInteractiveElement =
      target !== null && (target.tagName === 'BUTTON' || target.tagName === 'A');

    switch (event.key) {
      case 'Escape':
        bus.emit({ type: 'back' });
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        bus.emit({ type: 'move-focus', delta: 1 });
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        bus.emit({ type: 'move-focus', delta: -1 });
        break;
      case 'Enter':
        if (!onInteractiveElement) {
          bus.emit({ type: 'open-focused' });
        }
        break;
      case 'r':
      case 'R':
        bus.emit({ type: 'reset-view' });
        break;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
