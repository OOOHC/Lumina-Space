/**
 * The device-neutral intent vocabulary (ARD rule 3, ADR 0001).
 *
 * Semantics:
 * - Every intent below is INSTANT: it describes one complete domain action
 *   and carries no lifecycle. Lifecycle phases (start/update/end/cancel)
 *   are introduced only for genuinely continuous interactions, none of
 *   which exist yet; camera orbit is handled internally by the camera rig.
 * - Emitting an intent is a request, not a command: the application layer
 *   applies it only when the current state allows (see
 *   state/intentBindings.ts). An inapplicable intent is ignored, which is
 *   what makes cancellation and repeated input safe on every device.
 * - Nothing downstream of the bus may know which device produced an intent.
 */
export type Intent =
  | { type: 'select-photo'; photoId: string }
  | { type: 'move-focus'; delta: -1 | 1 }
  | { type: 'open-focused' }
  | { type: 'back' }
  | { type: 'reset-view' };

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
