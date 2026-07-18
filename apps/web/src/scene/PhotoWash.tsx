import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface PhotoWashProps {
  /** Centre of the lit artwork. */
  position: [number, number, number];
  /** Wall-normal yaw of the artwork. */
  rotationY: number;
}

/**
 * A gallery wash light: one warm, soft spotlight per artwork, hung out from
 * the wall above it — the classic museum accent that lets each print carry
 * its own light. Generic scene capability; the caller decides what is lit.
 */
export function PhotoWash({ position, rotationY }: PhotoWashProps) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (light.current && target.current) {
      light.current.target = target.current;
    }
  }, []);

  const nx = Math.sin(rotationY);
  const nz = Math.cos(rotationY);

  return (
    <>
      <spotLight
        ref={light}
        position={[position[0] + nx * 1.6, position[1] + 1.7, position[2] + nz * 1.6]}
        angle={0.6}
        penumbra={0.9}
        intensity={20}
        distance={8}
        decay={1.7}
        color="#fff1dc"
      />
      <object3D ref={target} position={position} />
    </>
  );
}
