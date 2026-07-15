/**
 * The device-neutral intent vocabulary (ARD rule 3, ADR 0001).
 *
 * Semantics:
 * - Most intents are INSTANT: one complete domain action, no lifecycle.
 * - `point-at` is the one CONTINUOUS intent: a stream of device-neutral
 *   normalized viewport positions (0..1, origin top-left) while the user is
 *   aiming at the view. Its lifecycle is minimal: the stream simply stops,
 *   and `point-lost` marks that the source can no longer point (tracking
 *   lost, hand withdrawn). Consumers must treat stream silence or
 *   `point-lost` as a safe cancel — never as a pending action.
 * - Emitting an intent is a request, not a command: the application layer
 *   applies it only when the current state allows (see
 *   state/intentBindings.ts for instant intents; spatial consumers handle
 *   `point-at` where projection knowledge lives). An inapplicable intent is
 *   ignored, which is what makes cancellation and repeated input safe on
 *   every device.
 * - Nothing downstream of the bus may know which device produced an intent.
 */
export type Intent =
  | { type: 'select-photo'; photoId: string }
  | { type: 'move-focus'; delta: -1 | 1 }
  | { type: 'open-focused' } // toggle: opens the focused print, or returns an open one

  | { type: 'back' }
  | { type: 'reset-view' }
  | { type: 'point-at'; x: number; y: number }
  | { type: 'point-lost' };

export type IntentHandler = (intent: Intent) => void;

export interface IntentBus {
  emit: (intent: Intent) => void;
  /** Returns an unsubscribe function. */
  subscribe: (handler: IntentHandler) => () => void;
}

export function createIntentBus(): IntentBus {
  const handlers = new Set<IntentHandler>();
  return {
    emit(intent) {
      // Copy so a handler unsubscribing mid-dispatch cannot skip others.
      for (const handler of [...handlers]) {
        handler(intent);
      }
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
  };
}

/** The application-wide bus shared by all adapters and the binding layer. */
export const intentBus = createIntentBus();
