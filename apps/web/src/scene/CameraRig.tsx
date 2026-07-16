import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, type ComponentRef } from 'react';
import * as THREE from 'three';

export interface Waypoint {
  /** Where the visitor stands. */
  position: [number, number, number];
  /** What they face (orbit target). */
  target: [number, number, number];
  /** Wall yaw used to clamp looking-around; null means unrestricted. */
  yaw: number | null;
}

const HOME: Waypoint = { position: [0, 1.7, 5.2], target: [0, 1.7, 0], yaw: null };
const ARRIVE_EPSILON = 0.04;
/** How far the visitor may swing around a wall viewpoint (radians). */
const WALL_SWING = 0.9;

interface CameraRigProps {
  /** Viewpoint for the currently focused artwork; null before layout exists. */
  waypoint: Waypoint | null;
  /** Deliberate-navigation counter: each change glides to `waypoint`. */
  walkToken: number;
  /** Increment to glide back to the home overview. */
  resetToken: number;
  reducedMotion: boolean;
}

/**
 * Guided waypoint gliding (DESIGN v1.1, owner decision): browsing walks the
 * visitor smoothly to a curated spot in front of each photograph; dragging
 * looks around from where they stand, clamped so they can never face out of
 * the experience or clip a wall. Reset glides back to the room overview.
 */
export function CameraRig({ waypoint, walkToken, resetToken, reducedMotion }: CameraRigProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const goal = useRef<Waypoint | null>(null);
  const gliding = useRef(false);
  const goalPos = useRef(new THREE.Vector3());
  const goalTarget = useRef(new THREE.Vector3());

  const startGlide = (to: Waypoint) => {
    goal.current = to;
    goalPos.current.set(...to.position);
    goalTarget.current.set(...to.target);
    gliding.current = true;
    const c = controls.current;
    if (c) {
      // Free the clamps while travelling; reapply on arrival.
      c.enabled = false;
      c.minAzimuthAngle = -Infinity;
      c.maxAzimuthAngle = Infinity;
      c.maxDistance = 20;
      c.minDistance = 0.1;
    }
  };

  useEffect(() => {
    // walkToken 0 is the initial state — the room opens on the overview.
    if (walkToken > 0 && waypoint) {
      startGlide(waypoint);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkToken]);

  useEffect(() => {
    if (resetToken > 0) {
      startGlide(HOME);
    }
  }, [resetToken]);

  useFrame(({ camera }, delta) => {
    const c = controls.current;
    if (!c || !gliding.current || !goal.current) return;
    const t = reducedMotion ? 1 : Math.min(1, delta * 3.2);
    camera.position.lerp(goalPos.current, t);
    c.target.lerp(goalTarget.current, t);
    c.update();
    if (camera.position.distanceTo(goalPos.current) < ARRIVE_EPSILON) {
      camera.position.copy(goalPos.current);
      c.target.copy(goalTarget.current);
      gliding.current = false;
      const yaw = goal.current.yaw;
      if (yaw !== null) {
        c.minAzimuthAngle = yaw - WALL_SWING;
        c.maxAzimuthAngle = yaw + WALL_SWING;
        c.minDistance = 1.4;
        c.maxDistance = 4.5;
      } else {
        c.minAzimuthAngle = -Infinity;
        c.maxAzimuthAngle = Infinity;
        c.minDistance = 1.8;
        c.maxDistance = 6;
      }
      c.enabled = true;
      c.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={HOME.target}
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
