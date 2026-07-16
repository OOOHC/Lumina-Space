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
        // Ceiling-track position (owner-tuned 2026-07-17): hung right under
        // the 5 m ceiling, slightly closer to the wall, with a longer throw —
        // the beam draws a taller scallop down the wall across the print.
        position={[position[0] + nx * 1.4, position[1] + 2.85, position[2] + nz * 1.4]}
        angle={0.5}
        penumbra={0.95}
        intensity={38}
        distance={13}
        decay={1.7}
        color="#fff1dc"
      />
      <object3D ref={target} position={position} />
    </>
  );
}
