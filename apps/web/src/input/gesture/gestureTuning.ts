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
 * - "zoom survives a brief drop too long"  → lower ZOOM_CANCEL_GRACE_MS
 * - "zoom cancels on a single dropped frame" → raise ZOOM_CANCEL_GRACE_MS
 * - "photo closes too eagerly on a brief gap" → raise TRACKING_LOST_CLOSE_MS
 * - "photo stays open too long after losing the hand" → lower TRACKING_LOST_CLOSE_MS
 * - "swipe doesn't trigger"        → lower SWIPE_MIN_DISTANCE / SWIPE_MIN_VELOCITY
 * - "swipe triggers from ordinary drift" → raise SWIPE_MIN_DISTANCE / SWIPE_MIN_VELOCITY
 * - "swipe triggers on a diagonal/vertical move" → lower SWIPE_MAX_VERTICAL_RATIO
 * - "one swipe motion changes two photos" → raise SWIPE_COOLDOWN_MS
 *
 * Note: the running adapter captures these at start — after an edit,
 * toggle gesture off/on (or reload) to feel the new values.
 *
 * SWIPE_* values below are initial, UNVALIDATED tuning defaults — they were
 * set from geometric reasoning, not a real-camera session, and must be
 * confirmed or replaced during owner-present tuning.
 */
export const TUNING = {
  /** EMA factor for the pointer stream; 1 = raw, 0.1 = very floaty. */
  SMOOTH_ALPHA: 0.35,
  /** Normalized viewport radius within which pointing snaps to a photo. */
  MAGNET_RADIUS: 0.16,
  /**
   * Hand missing this long while INSPECTING → end the zoom only (ms).
   * Independent of TRACKING_LOST_CLOSE_MS: a brief drop should not close
   * the photo, but a frozen zoomed print looks broken if left too long.
   */
  ZOOM_CANCEL_GRACE_MS: 250,
  /**
   * Hand missing this long overall → full disengage; intentBindings closes
   * the open photo via `tracking-timeout` (ms). Kept well above a single
   * dropped frame so brief tracking gaps never close the photo.
   */
  TRACKING_LOST_CLOSE_MS: 1800,
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
  /** UNVALIDATED: horizontal swipe distance, in hand-scale multiples. */
  SWIPE_MIN_DISTANCE: 3.2,
  /** UNVALIDATED: horizontal swipe speed, hand-scale multiples per second. */
  SWIPE_MIN_VELOCITY: 6.0,
  /** UNVALIDATED: max |dy|/|dx| ratio before a move is rejected as non-horizontal. */
  SWIPE_MAX_VERTICAL_RATIO: 0.5,
  /** UNVALIDATED: minimum gap between two accepted swipes (ms). */
  SWIPE_COOLDOWN_MS: 600,
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
