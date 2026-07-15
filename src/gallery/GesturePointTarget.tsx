import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { intentBus } from '../input/intent';
import { useGalleryStore } from '../state/galleryStore';
import type { PhotoPlacement } from './galleryLayout';

interface GesturePointTargetProps {
  placements: PhotoPlacement[];
}

/**
 * Turns device-neutral `point-at` positions into curatorial focus. This is
 * gallery code on purpose: projecting wall placements into the viewport
 * needs the camera, which no input adapter is allowed to know about.
 *
 * Magnetism: the pointed position snaps to the nearest photograph within a
 * generous radius, so hand jitter selects prints, not pixels.
 */
const MAGNET_RADIUS = 0.16; // normalized viewport distance

export function GesturePointTarget({ placements }: GesturePointTargetProps) {
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const projected = new THREE.Vector3();
    return intentBus.subscribe((intent) => {
      if (intent.type !== 'point-at') return;
      const store = useGalleryStore.getState();
      if (store.phase !== 'ready' || store.selectedId !== null) return;

      let bestIndex = -1;
      let bestDistance = MAGNET_RADIUS;
      placements.forEach((placement, index) => {
        projected.set(...placement.position).project(camera);
        if (projected.z > 1) return; // behind the camera
        const px = (projected.x + 1) / 2;
        const py = (1 - projected.y) / 2;
        const distance = Math.hypot(px - intent.x, py - intent.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      if (bestIndex >= 0) {
        store.setFocusedIndex(bestIndex);
      }
    });
  }, [camera, placements]);

  return null;
}
