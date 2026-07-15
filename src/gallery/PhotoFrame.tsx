import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  Component,
  Suspense,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import type { Photo } from '../types';
import { PHOTO_HEIGHT, PHOTO_WIDTH, type PhotoPlacement } from './galleryLayout';

const FRAME_BORDER = 0.09;
const FRAME_DEPTH = 0.05;
const FRAME_COLOR = '#26272d';
const FOCUS_COLOR = '#d9dae2';
const SELECT_PULL = 0.35; // metres a selected print moves off the wall

interface PhotoFrameProps {
  photo: Photo;
  placement: PhotoPlacement;
  focused: boolean;
  dimmed: boolean;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

/** Catches texture load failures so one bad image cannot break the room. */
class FrameBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function FrameShell({ children }: { children?: ReactNode }) {
  return (
    <>
      <mesh>
        <boxGeometry
          args={[
            PHOTO_WIDTH + FRAME_BORDER * 2,
            PHOTO_HEIGHT + FRAME_BORDER * 2,
            FRAME_DEPTH,
          ]}
        />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.6} metalness={0.1} />
      </mesh>
      {children}
    </>
  );
}

/** Matte placeholder shown while a texture loads or after it fails. */
function PhotoSurfacePlaceholder() {
  return (
    <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[PHOTO_WIDTH, PHOTO_HEIGHT]} />
      <meshStandardMaterial color="#0f1013" roughness={1} />
    </mesh>
  );
}

function PhotoSurface({ photo }: { photo: Photo }) {
  const texture = useTexture(photo.src);
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }, [texture]);
  return (
    <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[PHOTO_WIDTH, PHOTO_HEIGHT]} />
      <meshStandardMaterial map={texture} roughness={0.55} metalness={0} />
    </mesh>
  );
}

export function PhotoFrame({
  photo,
  placement,
  focused,
  dimmed,
  selected,
  reducedMotion,
  onSelect,
}: PhotoFrameProps) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const basePosition = useMemo(
    () => new THREE.Vector3(...placement.position),
    [placement],
  );
  const normal = useMemo(
    () =>
      new THREE.Vector3(Math.sin(placement.rotationY), 0, Math.cos(placement.rotationY)),
    [placement],
  );
  const targetPosition = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    targetPosition
      .copy(basePosition)
      .addScaledVector(normal, selected ? SELECT_PULL : 0);
    const targetScale = hovered && !selected && !dimmed ? 1.03 : 1;
    if (reducedMotion) {
      g.position.copy(targetPosition);
      g.scale.setScalar(targetScale);
    } else {
      const t = Math.min(1, delta * 7);
      g.position.lerp(targetPosition, t);
      const s = g.scale.x + (targetScale - g.scale.x) * t;
      g.scale.setScalar(s);
    }
  });

  return (
    <group
      ref={group}
      position={placement.position}
      rotation-y={placement.rotationY}
      onClick={(e) => {
        e.stopPropagation();
        if (!dimmed) onSelect(photo.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Keyboard focus indication: a thin light edge behind the frame. */}
      <mesh position={[0, 0, -0.012]} visible={focused}>
        <planeGeometry
          args={[
            PHOTO_WIDTH + FRAME_BORDER * 2 + 0.09,
            PHOTO_HEIGHT + FRAME_BORDER * 2 + 0.09,
          ]}
        />
        <meshBasicMaterial color={FOCUS_COLOR} toneMapped={false} />
      </mesh>
      {/* Dimming veil used while another photo is open in detail. */}
      <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.004]} visible={dimmed}>
        <planeGeometry
          args={[PHOTO_WIDTH + FRAME_BORDER * 2, PHOTO_HEIGHT + FRAME_BORDER * 2]}
        />
        <meshBasicMaterial color="#0b0b0f" transparent opacity={0.72} />
      </mesh>
      <FrameBoundary
        fallback={
          <FrameShell>
            <PhotoSurfacePlaceholder />
          </FrameShell>
        }
      >
        <FrameShell>
          <Suspense fallback={<PhotoSurfacePlaceholder />}>
            <PhotoSurface photo={photo} />
          </Suspense>
        </FrameShell>
      </FrameBoundary>
    </group>
  );
}
