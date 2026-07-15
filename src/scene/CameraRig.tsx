import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef, type ComponentRef } from 'react';

interface CameraRigProps {
  /** Increment to return the camera to its saved home view. */
  resetToken: number;
  /** Disables damping so motion settles instantly. */
  reducedMotion: boolean;
}

/**
 * Guided orbit navigation: the visitor looks around from the room centre.
 * Distance and polar clamps keep the camera inside the experience and away
 * from walls, floor, and ceiling.
 */
export function CameraRig({ resetToken, reducedMotion }: CameraRigProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    controls.current?.saveState();
  }, []);

  useEffect(() => {
    if (resetToken > 0) {
      controls.current?.reset();
    }
  }, [resetToken]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 1.7, 0]}
      enablePan={false}
      minDistance={1.8}
      maxDistance={6}
      minPolarAngle={Math.PI * 0.34}
      maxPolarAngle={Math.PI * 0.56}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
    />
  );
}
