import type { Photo } from '../types';

interface GalleryFallbackProps {
  photos: Photo[];
  onSelect: (id: string) => void;
  /** True when the 3D view is unavailable rather than merely impractical. */
  webglUnavailable: boolean;
}

/**
 * Deliberate lower-complexity presentation for small viewports and browsers
 * without WebGL. The complete journey — browse, open detail, read metadata,
 * return — is preserved in editorial 2D.
 */
export function GalleryFallback({ photos, onSelect, webglUnavailable }: GalleryFallbackProps) {
  return (
    <div className="fallback">
      <header className="fallback-header">
        <p className="hud-wordmark">Lumina Space</p>
        <p className="fallback-subtitle">Sample Collection</p>
        {webglUnavailable && (
          <p className="fallback-note">
            The 3D exhibition isn’t available in this browser, so the collection is
            presented as an editorial layout.
          </p>
        )}
      </header>
      <ul className="fallback-grid">
        {photos.map((photo) => (
          <li key={photo.id}>
            <button
              type="button"
              className="fallback-card"
              onClick={() => onSelect(photo.id)}
            >
              <img src={photo.src} alt={photo.title} loading="lazy" />
              <span className="fallback-card-title">{photo.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
