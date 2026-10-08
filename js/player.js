import { LANES, PLAYER, START_LANE } from './config.js';
import { buildPlayerCar } from './models.js';

export class Player {
  constructor(scene) {
    this.mesh = buildPlayerCar();
    scene.add(this.mesh);
    this.reset();
  }

  reset() {
    this.lane = START_LANE;
    this.x = LANES[this.lane];
    this.z = 0;
    this.speed = PLAYER.CRUISE;
    this.alive = true;
    this.mesh.visible = true;
    this.mesh.rotation.set(0, 0, 0);
    this.sync();
  }

  changeLane(dir) {
    this.lane = Math.max(0, Math.min(LANES.length - 1, this.lane + dir));
  }

  /** input: { up: bool, down: bool } */
  update(dt, input) {
    if (input.up && !input.down) this.speed += PLAYER.ACCEL * dt;
    else if (input.down && !input.up) this.speed -= PLAYER.BRAKE * dt;
    else this.speed += (PLAYER.CRUISE - this.speed) * Math.min(1, dt * 0.8);
    this.speed = Math.max(PLAYER.MIN_SPEED, Math.min(PLAYER.MAX_SPEED, this.speed));

    const targetX = LANES[this.lane];
    const dx = targetX - this.x;
    this.x += dx * Math.min(1, dt * PLAYER.LANE_LERP);
    this.z -= this.speed * dt;

    // steer into the lane change and lean slightly
    this.mesh.rotation.y = -dx * 0.12;
    this.mesh.rotation.z = dx * 0.04;
    // tiny engine bounce
    this.mesh.position.y = Math.abs(Math.sin(this.z * 0.9)) * 0.04;
    this.sync();
  }

  sync() {
    this.mesh.position.x = this.x;
    this.mesh.position.z = this.z;
  }

  get box() {
    return { x: this.x, z: this.z, hw: PLAYER.HALF_W, hl: PLAYER.HALF_L };
  }
}
