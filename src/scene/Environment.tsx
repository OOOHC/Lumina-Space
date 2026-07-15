interface EnvironmentProps {
  width: number;
  depth: number;
  height: number;
}

const WALL_COLOR = '#1a1b20';
const FLOOR_COLOR = '#121317';
const CEILING_COLOR = '#101114';

/**
 * A generic dark-neutral room: floor, ceiling, four walls. Dimensions come
 * from the caller; this module has no idea what will hang on the walls.
 */
export function Environment({ width, depth, height }: EnvironmentProps) {
  const hw = width / 2;
  const hd = depth / 2;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.9} metalness={0} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, height, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={CEILING_COLOR} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, height / 2, -hd]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0, height / 2, hd]} rotation-y={Math.PI}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[-hw, height / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[hw, height / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}
