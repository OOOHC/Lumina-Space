import { useEffect, useMemo, useState } from 'react';
import { GalleryScene } from './gallery/GalleryScene';
import { attachKeyboardAdapter } from './input/keyboardAdapter';
import { isWebGLAvailable, SceneCanvas } from './scene/SceneCanvas';
import { useGalleryStore } from './state/galleryStore';
import { bindIntents } from './state/intentBindings';
import { AccountPanel } from './ui/AccountPanel';
import { GalleryFallback } from './ui/GalleryFallback';
import { GestureControls } from './ui/GestureControls';
import { HudControls } from './ui/HudControls';
import { PhotoDetailOverlay } from './ui/PhotoDetailOverlay';
import { ScenePreparingOverlay } from './ui/StatusScreens';
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

/**
 * Draft preview is an explicit transition from authoring into the real gallery
 * runtime. The creator workspace itself never renders demo photographs.
 */
function DraftPreview({ title }: { title: string }) {
  const [sceneReady, setSceneReady] = useState(false);
  const photos = useGalleryStore((state) => state.photos);
  const selectedId = useGalleryStore((state) => state.selectedId);
  const focusedIndex = useGalleryStore((state) => state.focusedIndex);
  const exitPreview = useGalleryStore((state) => state.exitPreview);
  const reducedMotion = usePrefersReducedMotion();
  const smallViewport = useSmallViewport();
  const webglAvailable = useMemo(() => isWebGLAvailable(), []);
  const useFallback = smallViewport || !webglAvailable;
  const readinessKey = photos.map((photo) => photo.id).join('|');

  useEffect(() => {
    setSceneReady(false);
  }, [readinessKey]);

  useEffect(() => {
    const unbindIntents = bindIntents();
    const detachKeyboard = attachKeyboardAdapter();
    return () => {
      detachKeyboard();
      unbindIntents();
    };
  }, []);

  const selectedPhoto = photos.find((photo) => photo.id === selectedId) ?? null;
  const focusedTitle =
    selectedId === null && photos[focusedIndex] ? photos[focusedIndex].title : null;

  return (
    <div className="app app--preview">
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
          <HudControls focusedTitle={focusedTitle} />
          {!sceneReady && <ScenePreparingOverlay />}
        </>
      )}
      {selectedPhoto && <PhotoDetailOverlay photo={selectedPhoto} />}
      {!useFallback && (
        <div className="hud-gesture">
          <GestureControls />
        </div>
      )}
      <div className="preview-banner" role="status">
        <span>Previewing draft — {title}</span>
        <button type="button" className="text-button" onClick={() => void exitPreview()}>
          Exit preview
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const preview = useGalleryStore((state) => state.preview);

  return preview ? <DraftPreview title={preview.title} /> : <AccountPanel />;
}
