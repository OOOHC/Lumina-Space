import { useEffect, useRef, useState } from 'react';
import { intentBus } from '../input/intent';
import type { Photo } from '../types';

interface PhotoDetailOverlayProps {
  photo: Photo;
}

/**
 * Detail presentation: the photograph dominant, metadata quiet beneath it,
 * one predictable way back. Works identically for pointer, keyboard, and
 * touch; Escape is handled by the global keyboard listener in App.
 */
export function PhotoDetailOverlay({ photo }: PhotoDetailOverlayProps) {
  const backButton = useRef<HTMLButtonElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [inspectScale, setInspectScale] = useState(1);
  const onClose = () => intentBus.emit({ type: 'back' });

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
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-label={photo.title}>
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
