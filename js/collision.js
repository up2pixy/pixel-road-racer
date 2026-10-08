/** Axis-aligned overlap test on the ground plane. Boxes: { x, z, hw, hl } (half width / half length). */
export function overlaps(a, b) {
  return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.z - b.z) < a.hl + b.hl;
}

/** Returns the first entity colliding with the player box, or null. */
export function findCollision(playerBox, entities) {
  for (const e of entities) {
    if (overlaps(playerBox, { x: e.x, z: e.z, hw: e.w * 0.46, hl: e.L * 0.46 })) return e;
  }
  return null;
}
