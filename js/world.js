import * as THREE from 'three';
import { CHUNK_LEN, NUM_CHUNKS, ROAD_HALF_WIDTH, DESPAWN_BEHIND } from './config.js';
import { box, buildTree, buildBush, buildRock, buildFlower, buildLamp } from './models.js';

const GROUND = { cast: false, receive: true };
const GRASS_A = '#5ad65a';
const GRASS_B = '#4cc84f';
const STRIPE_LEN = 4;
const GRASS_WIDTH = 54;
const CURB_W = 0.6;
const GRASS_TOP = 0.15;
const rand = (a, b) => a + Math.random() * (b - a);

/** Endless straight road built from recycled chunks. Each chunk spans local z in [-CHUNK_LEN, 0]. */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = [];
    for (let i = 0; i < NUM_CHUNKS; i++) {
      const chunk = this.buildChunk();
      scene.add(chunk);
      this.chunks.push(chunk);
    }
  }

  buildChunk() {
    const g = new THREE.Group();
    const L = CHUNK_LEN;
    const rw = ROAD_HALF_WIDTH * 2;

    g.add(box(rw, 0.5, L, '#3b3d4c', 0, -0.5, -L / 2, GROUND));

    // dashed white lane separators
    for (const x of [-3, 3]) {
      for (let i = 0; i < L / 6; i++) g.add(box(0.18, 0.03, 3, '#f4f4f4', x, 0, -(i * 6 + 1.5), GROUND));
    }
    // double yellow center line
    for (const x of [-0.22, 0.22]) g.add(box(0.15, 0.03, L, '#ffd23f', x, 0, -L / 2, GROUND));

    for (const side of [-1, 1]) {
      // red/white curb blocks
      for (let i = 0; i < L / 2; i++) {
        const c = i % 2 ? '#ffffff' : '#ff4040';
        g.add(box(CURB_W, 0.55, 2, c, side * (ROAD_HALF_WIDTH + CURB_W / 2), -0.3, -(i * 2 + 1), GROUND));
      }
      // alternating grass stripes (Crossy Road style)
      for (let i = 0; i < L / STRIPE_LEN; i++) {
        const c = i % 2 ? GRASS_A : GRASS_B;
        g.add(box(GRASS_WIDTH, 0.6, STRIPE_LEN, c, side * (ROAD_HALF_WIDTH + CURB_W + GRASS_WIDTH / 2), GRASS_TOP - 0.6, -(i * STRIPE_LEN + STRIPE_LEN / 2), GROUND));
      }
    }

    const scenery = new THREE.Group();
    g.add(scenery);
    g.userData.scenery = scenery;
    return g;
  }

  populate(chunk) {
    const scenery = chunk.userData.scenery;
    scenery.clear();
    const L = CHUNK_LEN;
    const edge = ROAD_HALF_WIDTH + CURB_W;

    for (const side of [-1, 1]) {
      // street lamp near the curb every chunk on alternating sides
      if (Math.random() < 0.5) {
        const lamp = buildLamp();
        lamp.position.set(side * (edge + 0.8), GRASS_TOP, -rand(2, L - 2));
        if (side < 0) lamp.rotation.y = Math.PI;
        scenery.add(lamp);
      }
      const trees = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < trees; i++) {
        const t = buildTree();
        t.position.set(side * rand(edge + 2.5, edge + 26), GRASS_TOP, -rand(1, L - 1));
        scenery.add(t);
      }
      const bushes = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < bushes; i++) {
        const b = Math.random() < 0.75 ? buildBush() : buildRock();
        b.position.x = side * rand(edge + 1.2, edge + 20);
        b.position.y += GRASS_TOP;
        b.position.z = -rand(1, L - 1);
        scenery.add(b);
      }
      const flowers = Math.floor(Math.random() * 5);
      for (let i = 0; i < flowers; i++) {
        const f = buildFlower();
        f.position.set(side * rand(edge + 0.8, edge + 14), GRASS_TOP, -rand(0.5, L - 0.5));
        scenery.add(f);
      }
    }
  }

  reset(playerZ) {
    // first chunk starts a little behind the player
    const start = Math.ceil((playerZ + DESPAWN_BEHIND) / CHUNK_LEN) * CHUNK_LEN;
    this.chunks.forEach((c, i) => {
      c.position.z = start - i * CHUNK_LEN;
      this.populate(c);
    });
  }

  update(playerZ) {
    let minZ = Infinity;
    for (const c of this.chunks) minZ = Math.min(minZ, c.position.z);
    for (const c of this.chunks) {
      if (c.position.z - CHUNK_LEN > playerZ + DESPAWN_BEHIND) {
        minZ -= CHUNK_LEN;
        c.position.z = minZ;
        this.populate(c);
      }
    }
  }
}
