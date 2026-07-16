import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createExhibition,
  draftToGalleryPhotos,
  getExhibition,
  listExhibitions,
  publishExhibition,
  saveExhibition,
  setExhibitionStatus,
  unpublishExhibition,
  type ExhibitionDraft,
  type ExhibitionListItem,
} from '../services/exhibitions';
import { listLibrary, photoViewUrl, type Library } from '../services/photoLibrary';
import { useGalleryStore } from '../state/galleryStore';

interface ExhibitionsPanelProps {
  onClose: () => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

const READINESS_TEXT: Record<string, string> = {
  'missing-title': 'a title',
  'no-photos': 'at least one photograph',
  archived: 'to be restored from the archive',
};

/**
 * The V4 exhibition editor: create a draft, curate photos from the library,
 * reorder, choose a cover, and preview it on the real 3D walls. Autosave is
 * debounced; the Saving/Saved/Failed line always reflects the server truth
 * because every save echoes back the persisted state.
 */
export function ExhibitionsPanel({ onClose }: ExhibitionsPanelProps) {
  const [items, setItems] = useState<ExhibitionListItem[] | null>(null);
  const [draft, setDraft] = useState<ExhibitionDraft | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [newTitle, setNewTitle] = useState('');
  const saveTimer = useRef<number | null>(null);
  const enterPreview = useGalleryStore((s) => s.enterPreview);

  const refreshList = useCallback(async () => {
    setItems(await listExhibitions());
  }, []);

  useEffect(() => {
    void refreshList();
    void listLibrary().then(setLibrary);
  }, [refreshList]);

  // Debounced autosave for text fields; photo operations save immediately.
  const queueSave = (patch: Parameters<typeof saveExhibition>[1]) => {
    if (!draft) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = window.setTimeout(() => void doSave(patch), 700);
  };

  const doSave = async (patch: Parameters<typeof saveExhibition>[1]) => {
    if (!draft) return;
    setSaveState('saving');
    const saved = await saveExhibition(draft.id, patch);
    if (saved) {
      setDraft(saved);
      setSaveState('saved');
      void refreshList();
    } else {
      setSaveState('failed');
    }
  };

  const onCreate = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const created = await createExhibition(title);
    if (created) {
      setNewTitle('');
      setDraft(created);
      void refreshList();
    }
  };

  const openDraft = async (id: string) => {
    setSaveState('idle');
    setDraft(await getExhibition(id));
  };

  const photoIds = draft?.photos.map((p) => p.id) ?? [];

  const move = (id: string, delta: -1 | 1) => {
    const index = photoIds.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= photoIds.length) return;
    const next = [...photoIds];
    [next[index], next[target]] = [next[target], next[index]];
    void doSave({ photoIds: next });
  };

  const remove = (id: string) => {
    const next = photoIds.filter((p) => p !== id);
    void doSave({
      photoIds: next,
      coverPhotoId: draft?.coverPhotoId === id ? null : undefined,
    });
  };

  const addFromLibrary = (id: string) => {
    void doSave({ photoIds: [...photoIds, id] });
  };

  const onPreview = () => {
    if (!draft || draft.photos.length === 0) return;
    enterPreview(draftToGalleryPhotos(draft), draft.title);
    onClose();
  };

  const availableFromLibrary =
    library?.photos.filter((p) => !photoIds.includes(p.id)) ?? [];

  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Exhibitions">
      <div className="library-panel">
        {draft === null ? (
          <>
            <header className="library-header">
              <h2 className="account-title">Your exhibitions</h2>
            </header>
            <div className="library-actions">
              <input
                type="text"
                className="exhibit-title-input"
                placeholder="New exhibition title…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void onCreate()}
              />
              <button type="button" className="text-button" onClick={() => void onCreate()}>
                Create
              </button>
              <button type="button" className="text-button" onClick={onClose}>
                Close
              </button>
            </div>
            {items === null ? (
              <p className="status-message">Loading…</p>
            ) : items.length === 0 ? (
              <p className="status-message">No exhibitions yet — name your first one above.</p>
            ) : (
              <ul className="exhibit-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="exhibit-row"
                      onClick={() => void openDraft(item.id)}
                    >
                      <span className="exhibit-row-title">{item.title}</span>
                      <span className="exhibit-row-meta">
                        {item.photoCount} photo{item.photoCount === 1 ? '' : 's'}
                        {item.status === 'archived' ? ' · archived' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <header className="library-header">
              <input
                type="text"
                className="exhibit-title-input exhibit-title-main"
                value={draft.title}
                onChange={(e) => {
                  setDraft({ ...draft, title: e.target.value });
                  queueSave({ title: e.target.value });
                }}
              />
              <textarea
                className="exhibit-description"
                placeholder="Exhibition description…"
                value={draft.description ?? ''}
                rows={2}
                onChange={(e) => {
                  setDraft({ ...draft, description: e.target.value });
                  queueSave({ description: e.target.value });
                }}
              />
              <p className="library-storage" role="status">
                {saveState === 'saving' && 'Saving…'}
                {saveState === 'saved' && 'Saved'}
                {saveState === 'failed' && (
                  <>
                    Save failed —{' '}
                    <button type="button" className="link-button" onClick={() => void doSave({ title: draft.title, description: draft.description })}>
                      retry
                    </button>
                  </>
                )}
                {saveState === 'idle' && ' '}
              </p>
              <p className="library-storage">
                {draft.readiness.ready
                  ? draft.publication
                    ? draft.publication.status === 'unpublished'
                      ? 'Unpublished — the link shows "no longer available".'
                      : draft.publication.draftChangedSincePublish
                        ? `Live: revision ${draft.publication.revisionSeq} — this draft has unpublished changes.`
                        : `Live: revision ${draft.publication.revisionSeq} — up to date.`
                    : 'Ready to publish.'
                  : `Needs ${draft.readiness.problems.map((p) => READINESS_TEXT[p]).join(' and ')}.`}
              </p>
              {draft.publication && draft.publication.status === 'published' && (
                <p className="library-storage">
                  <a
                    className="public-link"
                    href={`/e/${draft.publication.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {window.location.origin}/e/{draft.publication.slug}
                  </a>
                </p>
              )}
            </header>

            <div className="library-actions">
              {draft.readiness.ready && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    void publishExhibition(draft.id).then(() => void openDraft(draft.id))
                  }
                >
                  {draft.publication?.status === 'published'
                    ? draft.publication.draftChangedSincePublish
                      ? 'Republish'
                      : 'Published ✓'
                    : 'Publish'}
                </button>
              )}
              {draft.publication?.status === 'published' && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    void unpublishExhibition(draft.id).then(() => void openDraft(draft.id))
                  }
                >
                  Unpublish
                </button>
              )}
              <button
                type="button"
                className="text-button"
                onClick={onPreview}
                disabled={draft.photos.length === 0}
              >
                Preview in gallery
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  void setExhibitionStatus(
                    draft.id,
                    draft.status === 'archived' ? 'restore' : 'archive',
                  ).then(() => void openDraft(draft.id))
                }
              >
                {draft.status === 'archived' ? 'Restore' : 'Archive'}
              </button>
              <button type="button" className="text-button" onClick={() => setDraft(null)}>
                Back
              </button>
              <button type="button" className="text-button" onClick={onClose}>
                Close
              </button>
            </div>

            <h3 className="exhibit-section">In this exhibition — walls hang in this order</h3>
            {draft.photos.length === 0 ? (
              <p className="status-message">Empty — add photographs from your library below.</p>
            ) : (
              <ul className="library-grid">
                {draft.photos.map((photo, index) => (
                  <li key={photo.id} className="library-card">
                    <img src={photo.thumbUrl} alt={photo.title} loading="lazy" />
                    <div className="library-card-row">
                      <span className="library-card-title">
                        {index + 1}. {photo.title}
                        {draft.coverPhotoId === photo.id ? ' ★' : ''}
                      </span>
                    </div>
                    <div className="exhibit-card-actions">
                      <button type="button" className="link-button" onClick={() => move(photo.id, -1)} disabled={index === 0}>←</button>
                      <button type="button" className="link-button" onClick={() => move(photo.id, 1)} disabled={index === draft.photos.length - 1}>→</button>
                      <button type="button" className="link-button" onClick={() => void doSave({ coverPhotoId: photo.id })}>Cover</button>
                      <button type="button" className="link-button" onClick={() => remove(photo.id)}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="exhibit-section">Add from your library</h3>
            {availableFromLibrary.length === 0 ? (
              <p className="status-message">
                Everything in your library is already in this exhibition.
              </p>
            ) : (
              <ul className="library-grid">
                {availableFromLibrary.map((photo) => (
                  <li key={photo.id} className="library-card">
                    <img src={photoViewUrl(photo.id, 'thumb')} alt={photo.title} loading="lazy" />
                    <button
                      type="button"
                      className="exhibit-add"
                      onClick={() => addFromLibrary(photo.id)}
                    >
                      + Add “{photo.title}”
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
