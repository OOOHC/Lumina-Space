import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../config';
import { GalleryScene } from '../gallery/GalleryScene';
import { attachKeyboardAdapter } from '../input/keyboardAdapter';
import { isWebGLAvailable, SceneCanvas } from '../scene/SceneCanvas';
import { useGalleryStore } from '../state/galleryStore';
import { bindIntents } from '../state/intentBindings';
import { GalleryFallback } from './GalleryFallback';
import { GestureControls } from './GestureControls';
import { PhotoDetailOverlay } from './PhotoDetailOverlay';
import { LoadingScreen, ScenePreparingOverlay } from './StatusScreens';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { intentBus } from '../input/intent';
import type { Photo } from '../types';

interface PublicPhoto {
  id: string;
  title: string;
  caption: string | null;
  width: number;
  height: number;
  previewUrl: string;
  thumbUrl: string;
}

interface PublicExhibition {
  slug: string;
  title: string;
  description: string | null;
  revisionSeq: number;
  photos: PublicPhoto[];
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'removed' }
  | { kind: 'error' }
  | { kind: 'ready'; exhibition: PublicExhibition };

/**
 * The shared-link experience (V5): anyone with the slug sees the published
 * revision in the full 3D gallery — pointer, keyboard, touch fallback, and
 * optional gesture viewing — with no account and no cookies involved.
 */
export function PublicExhibitionPage({ slug }: { slug: string }) {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [sceneReady, setSceneReady] = useState(false);
  const selectedId = useGalleryStore((s) => s.selectedId);
  const photos = useGalleryStore((s) => s.photos);
  const present = useGalleryStore((s) => s.present);
  const reducedMotion = usePrefersReducedMotion();
  const webglAvailable = useMemo(() => isWebGLAvailable(), []);
  const smallViewport = window.matchMedia('(max-width: 767px)').matches;
  const useFallback = smallViewport || !webglAvailable;

  useEffect(() => {
    const unbind = bindIntents();
    const detach = attachKeyboardAdapter();
    return () => {
      detach();
      unbind();
    };
  }, []);

  useEffect(() => {
    setSceneReady(false);
    void (async () => {
      try {
        // Deliberately anonymous: no credentials on a public route.
        const res = await fetch(`${API_BASE}/api/public/exhibitions/${slug}`);
        if (res.status === 404) return setState({ kind: 'not-found' });
        if (res.status === 410) return setState({ kind: 'removed' });
        if (!res.ok) return setState({ kind: 'error' });
        const exhibition = (await res.json()) as PublicExhibition;
        const galleryPhotos: Photo[] = exhibition.photos.map((p) => ({
          id: p.id,
          title: p.title,
          caption: p.caption ?? '',
          credit: exhibition.title,
          src: p.previewUrl,
          width: p.width,
          height: p.height,
        }));
        present(galleryPhotos);
        setState({ kind: 'ready', exhibition });
      } catch {
        setState({ kind: 'error' });
      }
    })();
  }, [slug, present]);

  if (state.kind === 'loading') return <LoadingScreen />;
  if (state.kind !== 'ready') {
    const message =
      state.kind === 'not-found'
        ? 'This exhibition does not exist.'
        : state.kind === 'removed'
          ? 'This exhibition is no longer available.'
          : 'The exhibition could not be loaded right now.';
    return (
      <div className="status-screen">
        <p className="status-wordmark">Lumina Space</p>
        <p className="status-message">{message}</p>
      </div>
    );
  }

  const { exhibition } = state;
  const selectedPhoto = photos.find((p) => p.id === selectedId) ?? null;
  const readinessKey = photos.map((photo) => photo.id).join('|');

  return (
    <div className="app">
      {useFallback ? (
        <GalleryFallback photos={photos} webglUnavailable={!webglAvailable} />
      ) : (
        <>
          <SceneCanvas
            onReady={() => setSceneReady(true)}
            readinessKey={readinessKey}
          >
            <GalleryScene reducedMotion={reducedMotion} />
          </SceneCanvas>
          <div className="hud">
            <p className="hud-wordmark">Lumina Space</p>
            <div className="public-heading">
              <h1 className="public-title">{exhibition.title}</h1>
              {exhibition.description && (
                <p className="public-description">{exhibition.description}</p>
              )}
            </div>
            <p className="hud-hint">
              Drag to look around · Click a photograph · ← → to browse · Enter opens
            </p>
            <button
              type="button"
              className="text-button hud-reset"
              onClick={() => intentBus.emit({ type: 'reset-view' })}
            >
              Reset view
            </button>
          </div>
          {!sceneReady && <ScenePreparingOverlay />}
        </>
      )}
      {selectedPhoto && <PhotoDetailOverlay photo={selectedPhoto} />}
      {!useFallback && (
        <div className="hud-gesture">
          <GestureControls />
        </div>
      )}
    </div>
  );
}
