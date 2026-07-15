import { useEffect, useMemo, useState } from 'react';
import { GalleryScene } from './gallery/GalleryScene';
import { isWebGLAvailable, SceneCanvas } from './scene/SceneCanvas';
import { useGalleryStore } from './state/galleryStore';
import { GalleryFallback } from './ui/GalleryFallback';
import { HudControls } from './ui/HudControls';
import { PhotoDetailOverlay } from './ui/PhotoDetailOverlay';
import { EmptyScreen, ErrorScreen, LoadingScreen } from './ui/StatusScreens';
import { usePrefersReducedMotion } from './ui/usePrefersReducedMotion';

const SMALL_VIEWPORT_QUERY = '(max-width: 767px)';

function useSmallViewport(): boolean {
  const [small, setSmall] = useState(
    () => window.matchMedia(SMALL_VIEWPORT_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(SMALL_VIEWPORT_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSmall(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return small;
}

export default function App() {
  const phase = useGalleryStore((s) => s.phase);
  const photos = useGalleryStore((s) => s.photos);
  const selectedId = useGalleryStore((s) => s.selectedId);
  const focusedIndex = useGalleryStore((s) => s.focusedIndex);
  const load = useGalleryStore((s) => s.load);
  const select = useGalleryStore((s) => s.select);
  const requestReset = useGalleryStore((s) => s.requestReset);

  const reducedMotion = usePrefersReducedMotion();
  const smallViewport = useSmallViewport();
  const webglAvailable = useMemo(() => isWebGLAvailable(), []);
  const useFallback = smallViewport || !webglAvailable;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useGalleryStore.getState();
      if (store.phase !== 'ready') return;
      switch (event.key) {
        case 'Escape':
          if (store.selectedId !== null) {
            event.preventDefault();
            store.select(null);
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          if (store.selectedId === null) {
            event.preventDefault();
            store.moveFocus(1);
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          if (store.selectedId === null) {
            event.preventDefault();
            store.moveFocus(-1);
          }
          break;
        case 'Enter':
          if (store.selectedId === null && store.photos.length > 0) {
            const target = event.target as HTMLElement | null;
            // Leave Enter alone when a button or link is focused.
            if (target && (target.tagName === 'BUTTON' || target.tagName === 'A')) return;
            event.preventDefault();
            store.select(store.photos[store.focusedIndex].id);
          }
          break;
        case 'r':
        case 'R':
          if (store.selectedId === null) {
            store.requestReset();
          }
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (phase === 'loading') return <LoadingScreen />;
  if (phase === 'error') return <ErrorScreen onRetry={() => void load()} />;
  if (phase === 'empty') return <EmptyScreen />;

  const selectedPhoto = photos.find((p) => p.id === selectedId) ?? null;
  const focusedTitle =
    selectedId === null && photos[focusedIndex] ? photos[focusedIndex].title : null;

  return (
    <div className="app">
      {useFallback ? (
        <GalleryFallback
          photos={photos}
          onSelect={select}
          webglUnavailable={!webglAvailable}
        />
      ) : (
        <>
          <SceneCanvas>
            <GalleryScene reducedMotion={reducedMotion} />
          </SceneCanvas>
          <HudControls onResetView={requestReset} focusedTitle={focusedTitle} />
        </>
      )}
      {selectedPhoto && (
        <PhotoDetailOverlay photo={selectedPhoto} onClose={() => select(null)} />
      )}
    </div>
  );
}
