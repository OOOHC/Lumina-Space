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
    case 'inspect':
      // A held pinch with nothing open pulls the focused print out first;
      // the zoom itself is consumed by the detail view, not by state.
      if (store.selectedId === null) {
        const focused = store.photos[store.focusedIndex];
        if (focused) store.select(focused.id);
      }
      break;
    case 'tracking-timeout':
      // Sustained tracking loss (>= TRACKING_LOST_CLOSE_MS). The one signal
      // that closes an opened photo on tracking loss — deliberately NOT
      // point-lost, which only invalidates the pointer (2026-07-17).
      if (store.selectedId !== null) {
        store.select(null);
      }
      break;
    case 'swipe': {
      // Open-palm horizontal swipe: only while a photo is open, changing
      // which photo is open directly (does not reuse move-focus, which is
      // for the closed/browsing state — see ADR discussion 2026-07-17).
      if (store.selectedId === null) break;
      const total = store.photos.length;
      if (total === 0) break;
      const next = (store.focusedIndex + intent.direction + total) % total;
      store.select(store.photos[next].id);
      break;
    }
    // 'point-lost' is intentionally unhandled here: it only invalidates the
    // pointer/hover position (see input/intent.ts), which is entirely
    // adapter-local state. It never reaches gallery state.
  }
}

export function bindIntents(bus: IntentBus = intentBus): () => void {
  return bus.subscribe(applyIntent);
}
