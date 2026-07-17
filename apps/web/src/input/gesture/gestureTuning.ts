/**
 * Every gesture feel-parameter in one place for the owner tuning session.
 * Each knob maps to a specific complaint:
 *
 * - "pointer lags / floats"        → raise SMOOTH_ALPHA (less smoothing)
 * - "pointer jitters"              → lower SMOOTH_ALPHA (more smoothing)
 * - "wrong photo lights up"        → lower MAGNET_RADIUS (less snapping)
 * - "hard to hit any photo"        → raise MAGNET_RADIUS
 * - "pinch opens too eagerly"      → raise PINCH_RATIO_MAX (in handGestures)
 *                                    or raise PINCH_REFRACTORY_MS
 * - "double-opens from one pinch"  → raise PINCH_REFRACTORY_MS
 * - "hold turns into tap"          → lower HOLD_MS
 * - "tap turns into hold"          → raise HOLD_MS
 * - "zoom maxes out too soon"      → raise INSPECT_SPREAD_MAX
 * - "zoom ends by itself"          → raise INSPECT_RELEASE_SPREAD
 * - "gesture drops out in pauses"  → raise DISENGAGE_AFTER_MS
 *
 * Note: the running adapter captures these at start — after an edit,
 * toggle gesture off/on (or reload) to feel the new values.
 */
export const TUNING = {
  /** EMA factor for the pointer stream; 1 = raw, 0.1 = very floaty. */
  SMOOTH_ALPHA: 0.35,
  /** Normalized viewport radius within which pointing snaps to a photo. */
  MAGNET_RADIUS: 0.16,
  /** Hand missing this long → disengage and cancel cleanly (ms). */
  DISENGAGE_AFTER_MS: 600,
  /** Minimum gap between two pinch actions (ms). */
  PINCH_REFRACTORY_MS: 900,
  /** Pinch held longer than this becomes an inspect, not a tap (ms). */
  HOLD_MS: 400,
  /** Thumb–index spread that ends an inspect (exit hysteresis). */
  INSPECT_RELEASE_SPREAD: 0.62,
  /** Spread mapped to inspect magnitude 0. */
  INSPECT_SPREAD_MIN: 0.08,
  /** Spread mapped to inspect magnitude 1. */
  INSPECT_SPREAD_MAX: 0.55,
};

/** Per-frame diagnostics for the dev-only tuning overlay. */
export interface GestureDiagnostics {
  pose: string;
  engaged: boolean;
  pinchActive: boolean;
  inspecting: boolean;
  spread: number;
  magnitude: number;
  pointerX: number;
  pointerY: number;
  fps: number;
}
