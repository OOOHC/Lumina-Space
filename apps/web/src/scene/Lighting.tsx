/**
 * Restrained exhibition lighting: even, dark-neutral, no shadows (V1
 * performance budget). Photograph surfaces supply the colour.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#3d3f48', '#16171b', 0.7]} />
      <directionalLight position={[4, 4.5, 6]} intensity={0.9} />
      <directionalLight position={[-4, 4.5, -6]} intensity={0.7} />
    </>
  );
}
