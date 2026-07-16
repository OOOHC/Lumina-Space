import { useEffect, useRef, useState } from 'react';
import {
  listLibrary,
  photoViewUrl,
  uploadPhoto,
  type Library,
} from '../services/photoLibrary';

interface LibraryPanelProps {
  onClose: () => void;
}

const MB = 1024 * 1024;
const formatMb = (bytes: number) => `${(bytes / MB).toFixed(1)} MB`;

/**
 * The photographer's workspace library: upload, see what exists, watch the
 * storage headroom. Exhibition curation belongs to V4 — this is the V3 scope
 * boundary, deliberately.
 */
export function LibraryPanel({ onClose }: LibraryPanelProps) {
  const [library, setLibrary] = useState<Library | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = async () => setLibrary(await listLibrary());

  useEffect(() => {
    void refresh();
  }, []);

  const onFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      const result = await uploadPhoto(file, title || 'Untitled');
      if (!result.ok) {
        setError(result.error ?? 'Upload failed.');
        break;
      }
    }
    if (fileInput.current) fileInput.current.value = '';
    await refresh();
    setBusy(false);
  };

  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Photo library">
      <div className="library-panel">
        <header className="library-header">
          <h2 className="account-title">Your photo library</h2>
          {library && (
            <p className="library-storage">
              {formatMb(library.storage.usedBytes)} of {formatMb(library.storage.quotaBytes)} used
            </p>
          )}
        </header>

        <div className="library-actions">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            id="library-file-input"
            onChange={(e) => void onFilesChosen(e.target.files)}
          />
          <label htmlFor="library-file-input" className="text-button library-upload">
            {busy ? 'Uploading…' : 'Upload photographs'}
          </label>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>

        {error && <p className="account-error">{error}</p>}

        {library === null ? (
          <p className="status-message">Loading your library…</p>
        ) : library.photos.length === 0 ? (
          <p className="status-message">
            No photographs yet — your first upload starts the collection.
          </p>
        ) : (
          <ul className="library-grid">
            {library.photos.map((photo) => (
              <li key={photo.id} className="library-card">
                <img src={photoViewUrl(photo.id, 'thumb')} alt={photo.title} loading="lazy" />
                <span className="library-card-title">{photo.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
