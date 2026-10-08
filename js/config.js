// Lane centers (world X). Forward travel direction is -Z.
export const LANES = [-4.5, -1.5, 1.5, 4.5];
// +1: oncoming traffic (moves toward +Z), -1: same direction as the player (moves toward -Z)
export const LANE_DIR = [1, 1, -1, -1];

export const ROAD_HALF_WIDTH = 6;
export const CHUNK_LEN = 24;
export const NUM_CHUNKS = 14;

export const PIXEL_SCALE = 3; // render resolution divider for the chunky pixel look
export const VIEW_SIZE = 26; // world units visible vertically
export const CAMERA_YAW = Math.PI / 4; // 45° tilted viewport
export const CAMERA_PITCH = (50 * Math.PI) / 180;
export const CAMERA_DIST = 60;

export const PLAYER = {
  MIN_SPEED: 10,
  CRUISE: 18,
  MAX_SPEED: 32,
  ACCEL: 14,
  BRAKE: 24,
  LANE_LERP: 12,
  HALF_W: 0.8,
  HALF_L: 1.45,
};

export const SPAWN_AHEAD = 130;
export const DESPAWN_BEHIND = 60;
export const START_LANE = 2;
