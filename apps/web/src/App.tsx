import { useEffect, useMemo, useState } from 'react';
import { GalleryScene } from './gallery/GalleryScene';
import { attachKeyboardAdapter } from './input/keyboardAdapter';
import { isWebGLAvailable, SceneCanvas } from './scene/SceneCanvas';
import { useGalleryStore } from './state/galleryStore';
import { bindIntents } from './state/intentBindings';
import { AccountPanel } from './ui/AccountPanel';
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

  const reducedMotion = usePrefersReducedMotion();
  const smallViewport = useSmallViewport();
  const webglAvailable = useMemo(() => isWebGLAvailable(), []);
  const useFallback = smallViewport || !webglAvailable;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unbindIntents = bindIntents();
    const detachKeyboard = attachKeyboardAdapter();
    return () => {
      detachKeyboard();
      unbindIntents();
    };
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
        <GalleryFallback photos={photos} webglUnavailable={!webglAvailable} />
      ) : (
        <>
          <SceneCanvas>
            <GalleryScene reducedMotion={reducedMotion} />
          </SceneCanvas>
          <HudControls focusedTitle={focusedTitle} />
        </>
      )}
      {selectedPhoto && <PhotoDetailOverlay photo={selectedPhoto} />}
      <AccountPanel />
    </div>
  );
}
