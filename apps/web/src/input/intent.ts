/**
 * The device-neutral intent vocabulary (ARD rule 3, ADR 0001).
 *
 * Semantics:
 * - Most intents are INSTANT: one complete domain action, no lifecycle.
 * - `point-at` is the one CONTINUOUS intent: a stream of device-neutral
 *   normalized viewport positions (0..1, origin top-left) while the user is
 *   aiming at the view. Its lifecycle is minimal: the stream simply stops.
 * - Three distinct, NON-overlapping signals mark the end of continuous
 *   input (2026-07-17 correction — do not conflate them again):
 *   - `point-lost`: the pointer/hover/magnetic-focus position is no longer
 *     valid. Fires immediately (adapter-local) on the very first frame
 *     tracking is missing. Never closes an opened photo, never touches the
 *     detail-view zoom.
 *   - `inspect-end`: the active zoom/inspect interaction has ended (release,
 *     or a brief tracking gap during an inspect). The only intent that
 *     resets detail-view scale.
 *   - `tracking-timeout`: hand tracking has been absent for a sustained
 *     period. The only intent that closes an opened photo on tracking loss
 *     (via state/intentBindings.ts); otherwise a no-op.
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
  /** Pointer/hover/magnetic-focus invalidation only — see block comment above. */
  | { type: 'point-lost' }
  /**
   * Continuous inspect stream (V2.6 "held pinch"): magnitude 0..1 expresses
   * how far the inspection has been pulled open. The stream simply stops with
   * `inspect-end`; consumers must settle back to a stable state on end or on
   * silence — never latch a partial zoom.
   */
  | { type: 'inspect'; magnitude: number }
  | { type: 'inspect-end' }
  /** Sustained tracking loss — see block comment above. */
  | { type: 'tracking-timeout' }
  /** Open-palm horizontal swipe while a photo is open: -1 previous, 1 next. */
  | { type: 'swipe'; direction: -1 | 1 };

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
