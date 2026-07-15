import { useMemo } from 'react';
import { CameraRig } from '../scene/CameraRig';
import { Environment } from '../scene/Environment';
import { Lighting } from '../scene/Lighting';
import { useGalleryStore } from '../state/galleryStore';
import { GALLERY_ROOM, galleryLayout } from './galleryLayout';
import { PhotoFrame } from './PhotoFrame';

interface GallerySceneProps {
  reducedMotion: boolean;
}

/**
 * Composes the exhibition: the generic room from scene/ plus one PhotoFrame
 * per photograph, arranged by galleryLayout.
 */
export function GalleryScene({ reducedMotion }: GallerySceneProps) {
  const photos = useGalleryStore((s) => s.photos);
  const selectedId = useGalleryStore((s) => s.selectedId);
  const focusedIndex = useGalleryStore((s) => s.focusedIndex);
  const select = useGalleryStore((s) => s.select);
  const resetToken = useGalleryStore((s) => s.resetToken);

  const placements = useMemo(() => galleryLayout(photos.length), [photos.length]);

  return (
    <>
      <CameraRig resetToken={resetToken} reducedMotion={reducedMotion} />
      <Lighting />
      <Environment
        width={GALLERY_ROOM.width}
        depth={GALLERY_ROOM.depth}
        height={GALLERY_ROOM.height}
      />
      {photos.map((photo, index) => (
        <PhotoFrame
          key={photo.id}
          photo={photo}
          placement={placements[index]}
          focused={index === focusedIndex && selectedId === null}
          dimmed={selectedId !== null && selectedId !== photo.id}
          selected={selectedId === photo.id}
          reducedMotion={reducedMotion}
          onSelect={select}
        />
      ))}
    </>
  );
}
