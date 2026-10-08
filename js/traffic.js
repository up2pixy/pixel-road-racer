import { LANES, LANE_DIR, SPAWN_AHEAD, DESPAWN_BEHIND } from './config.js';
import { buildRandomVehicle, buildRandomObstacle } from './models.js';

const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);

// Base speed magnitude per lane: oncoming lanes are fast, same-direction lanes are slower than the player.
const LANE_SPEED = [10, 8, 8, 6];
const FOLLOW_GAP = 2.5;

export class Traffic {
  constructor(scene) {
    this.scene = scene;
    this.entities = [];
    this.nextRowZ = 0;
  }

  reset(playerZ) {
    for (const e of this.entities) this.scene.remove(e.mesh);
    this.entities = [];
    this.nextRowZ = playerZ - 45; // keep the start of the run clear
  }

  difficulty(t) {
    const k = Math.min(t / 120, 1);
    return {
      gapMin: lerp(16, 6.5, k),
      gapMax: lerp(28, 12, k),
      maxLanes: t < 25 ? 2 : 3,
      minLanes: t < 40 ? 1 : 2,
      obstacleChance: lerp(0.08, 0.25, k),
      oncomingMult: lerp(1, 1.6, k),
      sameMult: lerp(1, 1.25, k),
    };
  }

  laneFree(lane, z, margin) {
    return !this.entities.some((e) => e.lane === lane && Math.abs(e.z - z) < margin + e.L / 2);
  }

  spawnRow(z, d) {
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    // never block every lane in a single row
    const count = Math.min(LANES.length - 1, d.minLanes + Math.floor(Math.random() * (d.maxLanes - d.minLanes + 1)));
    let placed = 0;
    for (const lane of order) {
      if (placed >= count) break;
      if (!this.laneFree(lane, z, 9)) continue;
      const obstacle = Math.random() < d.obstacleChance;
      const mesh = obstacle ? buildRandomObstacle() : buildRandomVehicle();
      const { w, L } = mesh.userData;
      const dir = LANE_DIR[lane];
      const e = {
        mesh,
        lane,
        dir,
        x: LANES[lane] + (obstacle ? rand(-0.3, 0.3) : 0),
        z: z + rand(-2, 2),
        w,
        L,
        obstacle,
        base: obstacle ? 0 : LANE_SPEED[lane] * rand(0.9, 1.1),
        v: 0,
      };
      e.v = this.desiredV(e, d);
      if (dir > 0 && !obstacle) mesh.rotation.y = Math.PI; // oncoming cars face the player
      mesh.position.set(e.x, 0, e.z);
      this.scene.add(mesh);
      this.entities.push(e);
      placed++;
    }
  }

  desiredV(e, d) {
    if (e.obstacle) return 0;
    return e.dir * e.base * (e.dir > 0 ? d.oncomingMult : d.sameMult);
  }

  /** Nearest entity ahead of `e` (in its driving direction) in the same lane. */
  leaderOf(e) {
    let best = null;
    let bestDist = Infinity;
    for (const o of this.entities) {
      if (o === e || o.lane !== e.lane) continue;
      const ahead = (o.z - e.z) * e.dir;
      if (ahead > 0 && ahead < bestDist) {
        bestDist = ahead;
        best = o;
      }
    }
    return best ? { o: best, gap: bestDist - (e.L + best.L) / 2 } : null;
  }

  update(dt, playerZ, t, { spawn = true } = {}) {
    const d = this.difficulty(t);
    if (spawn) {
      while (this.nextRowZ > playerZ - SPAWN_AHEAD) {
        this.spawnRow(this.nextRowZ, d);
        this.nextRowZ -= rand(d.gapMin, d.gapMax);
      }
    }

    for (const e of this.entities) {
      if (e.obstacle) continue;
      let target = this.desiredV(e, d);
      const lead = this.leaderOf(e);
      // queue up behind slower traffic / roadwork instead of driving through it
      if (lead && lead.gap < FOLLOW_GAP) {
        target = Math.abs(lead.o.v) < Math.abs(target) ? lead.o.v : target;
        if (lead.gap < 0.6) e.v = target;
      }
      e.v += (target - e.v) * Math.min(1, dt * 4);
    }

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      e.z += e.v * dt;
      e.mesh.position.z = e.z;
      if (e.z > playerZ + DESPAWN_BEHIND || e.z < playerZ - SPAWN_AHEAD - 40) {
        this.scene.remove(e.mesh);
        this.entities.splice(i, 1);
      }
    }
  }
}
