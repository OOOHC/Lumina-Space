import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { intentBus } from '../input/intent';
import type { Photo } from '../types';

interface PhotoDetailOverlayProps {
  photo: Photo;
}

/** Minimum horizontal travel, in px, before a touch drag counts as a swipe. */
const TOUCH_SWIPE_MIN_PX = 60;
/** |dy| must stay under this fraction of |dx|, or the drag reads as scrolling. */
const TOUCH_SWIPE_VERTICAL_TOLERANCE = 0.6;

/**
 * Detail presentation: the photograph dominant, metadata quiet beneath it,
 * one predictable way back. Works identically for pointer, keyboard, and
 * touch; Escape is handled by the global keyboard listener in App.
 */
export function PhotoDetailOverlay({ photo }: PhotoDetailOverlayProps) {
  const backButton = useRef<HTMLButtonElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [inspectScale, setInspectScale] = useState(1);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onClose = () => intentBus.emit({ type: 'back' });

  /**
   * Touch swipe (2026-07-18): the mobile equivalent of the hand-gesture
   * open-palm swipe, reusing the exact same `swipe` intent and downstream
   * gating in intentBindings.ts (only acts while a photo is open) — no
   * gallery-state change needed here, matching "gesture/touch duplicates
   * intent" (DESIGN.md). One-shot per drag, so no cooldown is needed the
   * way the continuous camera tracker requires one.
   */
  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      touchStart.current = null;
      return;
    }
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < TOUCH_SWIPE_MIN_PX) return;
    if (Math.abs(dy) > Math.abs(dx) * TOUCH_SWIPE_VERTICAL_TOLERANCE) return;
    // Swipe left (finger moves right-to-left, dx < 0) reveals the next
    // photo, matching the standard mobile carousel convention.
    intentBus.emit({ type: 'swipe', direction: dx < 0 ? 1 : -1 });
  };

  // V2.6 held-pinch inspect: the print grows with the thumb–index spread and
  // always settles back to rest when the interaction ends — a partial zoom
  // can never latch. `inspect-end` is the ONLY intent that resets scale
  // (2026-07-17): `point-lost` now means pointer/hover invalidation only and
  // must not snap the zoom back on a single dropped tracking frame — that
  // would defeat ZOOM_CANCEL_GRACE_MS's whole purpose.
  useEffect(() => {
    return intentBus.subscribe((intent) => {
      if (intent.type === 'inspect') {
        setInspectScale(1 + intent.magnitude * 1.35);
      } else if (intent.type === 'inspect-end') {
        setInspectScale(1);
      }
    });
  }, []);

  useEffect(() => {
    backButton.current?.focus();
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [photo.id]);

  return (
    <div
      className="detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        ref={backButton}
        type="button"
        className="text-button detail-back"
        onClick={onClose}
      >
        ← Back to gallery
      </button>
      <figure className="detail-figure">
        {imageFailed ? (
          <div className="detail-image-error">
            <p>This photograph could not be displayed.</p>
          </div>
        ) : (
          <img
            className="detail-image"
            src={photo.src}
            alt={photo.title}
            style={{ transform: `scale(${inspectScale})` }}
            onError={() => setImageFailed(true)}
          />
        )}
        <figcaption className="detail-meta">
          <h2 className="detail-title">{photo.title}</h2>
          <p className="detail-caption">{photo.caption}</p>
          <p className="detail-facts">
            {photo.location && <span>{photo.location}</span>}
            {photo.year && <span> · {photo.year}</span>}
          </p>
          <p className="detail-credit">{photo.credit}</p>
        </figcaption>
      </figure>
    </div>
  );
}
