export interface RoomSpec {
  /** Inner room extent along x, in metres. */
  width: number;
  /** Inner room extent along z, in metres. */
  depth: number;
  /** Wall height in metres. */
  height: number;
  /** Height of each photo's centre above the floor. */
  photoHeight: number;
}

export const GALLERY_ROOM: RoomSpec = {
  width: 24,
  depth: 16,
  height: 5,
  photoHeight: 2.1,
};

/** Displayed photo plane size (3:2 landscape), metres. */
export const PHOTO_WIDTH = 2.4;
export const PHOTO_HEIGHT = 1.6;

export interface PhotoPlacement {
  position: [number, number, number];
  /** Rotation about y so the photo faces the room centre. */
  rotationY: number;
}

interface Wall {
  length: number;
  /** Places a distance `t` along the wall (centred on 0) into world space. */
  toWorld: (t: number) => [number, number];
  rotationY: number;
}

const WALL_GAP = 0.06; // stand-off from the wall surface to avoid z-fighting
const END_MARGIN = 2; // clear space kept at each end of a wall

/**
 * Evenly distributes `count` photographs along the four walls of the room,
 * proportionally to wall length, all facing the room centre. Pure and
 * deterministic so it can be unit-tested without a renderer.
 */
export function galleryLayout(count: number, room: RoomSpec = GALLERY_ROOM): PhotoPlacement[] {
  if (count <= 0) return [];

  const hw = room.width / 2;
  const hd = room.depth / 2;

  const walls: Wall[] = [
    // North wall (z = -hd), faces +z.
    { length: room.width, toWorld: (t) => [t, -hd + WALL_GAP], rotationY: 0 },
    // South wall (z = +hd), faces -z.
    { length: room.width, toWorld: (t) => [-t, hd - WALL_GAP], rotationY: Math.PI },
    // West wall (x = -hw), faces +x.
    { length: room.depth, toWorld: (t) => [-hw + WALL_GAP, -t], rotationY: Math.PI / 2 },
    // East wall (x = +hw), faces -x.
    { length: room.depth, toWorld: (t) => [hw - WALL_GAP, t], rotationY: -Math.PI / 2 },
  ];

  // Distribute count proportionally to wall length (largest-remainder method).
  const totalLength = walls.reduce((sum, w) => sum + w.length, 0);
  const exact = walls.map((w) => (count * w.length) / totalLength);
  const counts = exact.map(Math.floor);
  let remaining = count - counts.reduce((a, b) => a + b, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { index } of byRemainder) {
    if (remaining === 0) break;
    counts[index] += 1;
    remaining -= 1;
  }

  const placements: PhotoPlacement[] = [];
  walls.forEach((wall, wallIndex) => {
    const n = counts[wallIndex];
    if (n === 0) return;
    const span = wall.length - 2 * END_MARGIN;
    const step = span / n;
    for (let i = 0; i < n; i++) {
      const t = -span / 2 + step * (i + 0.5);
      const [x, z] = wall.toWorld(t);
      placements.push({
        position: [x, room.photoHeight, z],
        rotationY: wall.rotationY,
      });
    }
  });

  return placements;
}
