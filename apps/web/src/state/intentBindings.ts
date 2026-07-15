import { intentBus, type Intent, type IntentBus } from '../input/intent';
import { useGalleryStore } from './galleryStore';

/**
 * The single place where intents become state changes. Guards live here, not
 * in adapters: an intent that does not apply to the current state is ignored,
 * which keeps every device's cancellation and repeated input safe and keeps
 * pointer, keyboard, and touch behaviour identical (V2 exit criterion).
 */
export function applyIntent(intent: Intent): void {
  const store = useGalleryStore.getState();
  if (store.phase !== 'ready') return;

  switch (intent.type) {
    case 'select-photo':
      if (store.selectedId === null) {
        store.select(intent.photoId);
      }
      break;
    case 'move-focus':
      if (store.selectedId === null) {
        store.moveFocus(intent.delta);
      }
      break;
    case 'open-focused': {
      // Toggle: the same physical action that pulls a photograph from the
      // wall also returns it. This is what lets gesture (and Enter) complete
      // the full journey instead of dead-ending inside the detail view —
      // the owner's first field run showed gesture "dying" after one pinch.
      if (store.selectedId !== null) {
        store.select(null);
        break;
      }
      const focused = store.photos[store.focusedIndex];
      if (focused) {
        store.select(focused.id);
      }
      break;
    }
    case 'back':
      if (store.selectedId !== null) {
        store.select(null);
      }
      break;
    case 'reset-view':
      if (store.selectedId === null) {
        store.requestReset();
      }
      break;
  }
}

export function bindIntents(bus: IntentBus = intentBus): () => void {
  return bus.subscribe(applyIntent);
}
