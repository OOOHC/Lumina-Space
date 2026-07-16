interface EnvironmentProps {
  width: number;
  depth: number;
  height: number;
}

/**
 * Neutral architectural gallery (DESIGN v1.1): warm greys, never pure black
 * or pure white. Soft plaster walls, a warm concrete floor with restrained
 * reflectivity, a recessed ceiling cove that reads as indirect light, and a
 * darker skirting line to ground the walls. Generic: it never knows what
 * hangs inside it.
 */
const WALL_COLOR = '#96938c';
const CEILING_COLOR = '#a5a19a';
const FLOOR_COLOR = '#68625a';
const SKIRTING_COLOR = '#4c4842';
const COVE_COLOR = '#fff3e0';

const SKIRTING_HEIGHT = 0.14;
const COVE_INSET = 0.35;

export function Environment({ width, depth, height }: EnvironmentProps) {
  const hw = width / 2;
  const hd = depth / 2;

  const walls: { position: [number, number, number]; rotationY: number; length: number }[] = [
    { position: [0, height / 2, -hd], rotationY: 0, length: width },
    { position: [0, height / 2, hd], rotationY: Math.PI, length: width },
    { position: [-hw, height / 2, 0], rotationY: Math.PI / 2, length: depth },
    { position: [hw, height / 2, 0], rotationY: -Math.PI / 2, length: depth },
  ];

  return (
    <group>
      {/* Floor: warm concrete, restrained reflections via moderate roughness. */}
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, height, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={CEILING_COLOR} roughness={0.95} metalness={0} />
      </mesh>
      {walls.map((wall, index) => (
        <group key={index} position={wall.position} rotation-y={wall.rotationY}>
          <mesh>
            <planeGeometry args={[wall.length, height]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0} />
          </mesh>
          {/* Skirting line grounding the wall. */}
          <mesh position={[0, -height / 2 + SKIRTING_HEIGHT / 2, 0.012]}>
            <planeGeometry args={[wall.length, SKIRTING_HEIGHT]} />
            <meshStandardMaterial color={SKIRTING_COLOR} roughness={0.7} metalness={0} />
          </mesh>
          {/* Recessed cove near the ceiling — reads as indirect light. */}
          <mesh position={[0, height / 2 - COVE_INSET, 0.02]}>
            <planeGeometry args={[wall.length - 0.8, 0.06]} />
            <meshBasicMaterial color={COVE_COLOR} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
