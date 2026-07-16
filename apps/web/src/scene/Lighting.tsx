/**
 * Base light for the neutral architectural gallery (DESIGN v1.1): a soft
 * indirect feel — hemisphere carrying warm ceiling bounce, gentle ambient,
 * and two low-intensity directionals for natural modelling. Photograph
 * accents come from PhotoWash lights placed by the gallery, not from here.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#e8e2d6', '#5f5a52', 0.65]} />
      <directionalLight position={[6, 5, 4]} intensity={0.5} />
      <directionalLight position={[-5, 5, -4]} intensity={0.35} />
    </>
  );
}
