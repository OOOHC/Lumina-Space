import { useEffect, useRef, useState } from 'react';
import type { Photo } from '../types';

interface PhotoDetailOverlayProps {
  photo: Photo;
  onClose: () => void;
}

/**
 * Detail presentation: the photograph dominant, metadata quiet beneath it,
 * one predictable way back. Works identically for pointer, keyboard, and
 * touch; Escape is handled by the global keyboard listener in App.
 */
export function PhotoDetailOverlay({ photo, onClose }: PhotoDetailOverlayProps) {
  const backButton = useRef<HTMLButtonElement>(null);
  const [imageFailed, setImageFailed] = useState(false);

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
