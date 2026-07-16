import { useCallback, useMemo } from 'react';
import { intentBus } from '../input/intent';
import { CameraRig, type Waypoint } from '../scene/CameraRig';
import { Environment } from '../scene/Environment';
import { Lighting } from '../scene/Lighting';
import { PhotoWash } from '../scene/PhotoWash';
import { useGalleryStore } from '../state/galleryStore';
import { GALLERY_ROOM, galleryLayout } from './galleryLayout';
import { GesturePointTarget } from './GesturePointTarget';
import { PhotoFrame } from './PhotoFrame';

interface GallerySceneProps {
  reducedMotion: boolean;
}

/** Standing distance from a photograph at its curated viewpoint, metres. */
const VIEW_DISTANCE = 3.4;
const EYE_HEIGHT = 1.7;

/**
 * Composes the exhibition: the generic room from scene/ plus one PhotoFrame
 * and its wash light per photograph, arranged by galleryLayout. Deliberate
 * navigation glides the camera to a curated viewpoint per photograph.
 */
export function GalleryScene({ reducedMotion }: GallerySceneProps) {
  const photos = useGalleryStore((s) => s.photos);
  const selectedId = useGalleryStore((s) => s.selectedId);
  const focusedIndex = useGalleryStore((s) => s.focusedIndex);
  const resetToken = useGalleryStore((s) => s.resetToken);
  const walkToken = useGalleryStore((s) => s.walkToken);

  const placements = useMemo(() => galleryLayout(photos.length), [photos.length]);
  const select = useCallback(
    (photoId: string) => intentBus.emit({ type: 'select-photo', photoId }),
    [],
  );

  const waypoint = useMemo<Waypoint | null>(() => {
    const placement = placements[focusedIndex];
    if (!placement) return null;
    const nx = Math.sin(placement.rotationY);
    const nz = Math.cos(placement.rotationY);
    return {
      position: [
        placement.position[0] + nx * VIEW_DISTANCE,
        EYE_HEIGHT,
        placement.position[2] + nz * VIEW_DISTANCE,
      ],
      target: [placement.position[0], placement.position[1], placement.position[2]],
      yaw: placement.rotationY,
    };
  }, [placements, focusedIndex]);

  return (
    <>
      <CameraRig
        waypoint={waypoint}
        walkToken={walkToken}
        resetToken={resetToken}
        reducedMotion={reducedMotion}
      />
      <GesturePointTarget placements={placements} />
      <Lighting />
      <Environment
        width={GALLERY_ROOM.width}
        depth={GALLERY_ROOM.depth}
        height={GALLERY_ROOM.height}
      />
      {placements.map((placement, index) => (
        <PhotoWash
          key={`wash-${index}`}
          position={placement.position}
          rotationY={placement.rotationY}
        />
      ))}
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
