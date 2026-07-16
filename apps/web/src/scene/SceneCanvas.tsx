import { useProgress } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, type ReactNode } from 'react';

/** Feature-detects WebGL so the application can choose the 2D fallback. */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl'),
    );
  } catch {
    return false;
  }
}

interface SceneCanvasProps {
  children: ReactNode;
  onReady?: () => void;
  readinessKey?: string;
}

function SceneReadyReporter({ onReady, readinessKey }: Omit<SceneCanvasProps, 'children'>) {
  const { active, progress } = useProgress();
  const reported = useRef(false);

  useEffect(() => {
    reported.current = false;
  }, [readinessKey]);

  useFrame(() => {
    if (!reported.current && !active && progress >= 100) {
      reported.current = true;
      onReady?.();
    }
  });
  return null;
}

/**
 * Generic 3D canvas: renderer configuration, camera defaults, atmosphere.
 * Content is supplied by the caller; this module knows nothing about it.
 */
export function SceneCanvas({ children, onReady, readinessKey }: SceneCanvasProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 58, position: [0, 1.7, 5.2], near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#8f8b84']} />
      <fog attach="fog" args={['#8f8b84', 22, 48]} />
      <SceneReadyReporter onReady={onReady} readinessKey={readinessKey} />
      {children}
    </Canvas>
  );
}
