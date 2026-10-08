import * as THREE from 'three';

// Shared geometry/material caches keep recycled chunks and traffic cheap.
const geoCache = new Map();
const matCache = new Map();

export function mat(color) {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    matCache.set(color, m);
  }
  return m;
}

export function geo(w, h, d) {
  const key = `${w}|${h}|${d}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, g);
  }
  return g;
}

/** Box mesh whose `y` is its bottom face. */
export function box(w, h, d, color, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo(w, h, d), mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const GLASS = '#9fe8ff';
const TIRE = '#23232b';
const HEADLIGHT = '#fff6a0';
const TAILLIGHT = '#ff2a2a';

export const TRAFFIC_COLORS = [
  '#2ec4ff', '#7d5cff', '#33d17a', '#ff7ac6', '#ffffff',
  '#ff8c1a', '#3a7bff', '#00d4b4', '#b6ff3b', '#ff5e9c',
];

function addWheels(g, w, zs) {
  for (const z of zs) {
    for (const s of [-1, 1]) g.add(box(0.36, 0.62, 0.72, TIRE, s * (w / 2 - 0.08), 0, z));
  }
}

function addLights(g, w, L, y) {
  for (const s of [-1, 1]) {
    g.add(box(0.42, 0.26, 0.08, HEADLIGHT, s * w * 0.3, y, -L / 2 - 0.04, { cast: false }));
    g.add(box(0.42, 0.22, 0.08, TAILLIGHT, s * w * 0.3, y, L / 2 + 0.04, { cast: false }));
  }
}

function finish(g, w, L, kind, colors) {
  g.userData = { w, L, kind, colors };
  return g;
}

/** Sedan-style boxy car. Front faces -Z. */
export function buildCar(color, { stripe = null, taxi = false } = {}) {
  const g = new THREE.Group();
  const w = 1.8;
  const L = 3.2;
  addWheels(g, w, [-L * 0.3, L * 0.3]);
  g.add(box(w, 0.7, L, color, 0, 0.25, 0));
  g.add(box(w + 0.08, 0.2, 0.22, '#4a4a55', 0, 0.2, -L / 2));
  g.add(box(w + 0.08, 0.2, 0.22, '#4a4a55', 0, 0.2, L / 2));
  // cabin + windows
  const cz = 0.2;
  const cl = L * 0.5;
  g.add(box(w * 0.86, 0.62, cl, color, 0, 0.95, cz));
  g.add(box(w * 0.86 + 0.06, 0.38, cl * 0.78, GLASS, 0, 1.06, cz, { cast: false }));
  g.add(box(w * 0.74, 0.42, 0.06, GLASS, 0, 1.04, cz - cl / 2 - 0.02, { cast: false }));
  g.add(box(w * 0.74, 0.36, 0.06, GLASS, 0, 1.06, cz + cl / 2 + 0.02, { cast: false }));
  addLights(g, w, L, 0.55);
  if (stripe) {
    g.add(box(0.42, 0.04, L + 0.02, stripe, 0, 0.94, 0, { cast: false }));
    g.add(box(0.42, 0.04, cl + 0.02, stripe, 0, 1.57, cz, { cast: false }));
  }
  if (taxi) {
    g.add(box(0.8, 0.28, 0.4, '#222222', 0, 1.57, cz));
    g.add(box(0.7, 0.2, 0.42, '#fffbe0', 0, 1.6, cz, { cast: false }));
    for (const s of [-1, 1]) g.add(box(0.04, 0.16, L * 0.8, '#222222', s * (w / 2 + 0.01), 0.55, 0, { cast: false }));
  }
  return finish(g, w, L, 'car', [color, stripe || color, GLASS, TIRE]);
}

export function buildPlayerCar() {
  const g = buildCar('#ff2e4d', { stripe: '#ffffff' });
  // spoiler
  g.add(box(1.7, 0.12, 0.4, '#1d1d24', 0, 1.15, 1.4));
  for (const s of [-1, 1]) g.add(box(0.12, 0.25, 0.2, '#1d1d24', s * 0.6, 0.95, 1.4));
  g.userData.kind = 'player';
  return g;
}

export function buildTruck(color) {
  const g = new THREE.Group();
  const w = 2.2;
  const L = 6.2;
  addWheels(g, w, [-L / 2 + 1.0, L / 2 - 1.6, L / 2 - 0.7]);
  g.add(box(w * 0.9, 0.4, L, '#33333d', 0, 0.25, 0));
  // cab
  const cabZ = -L / 2 + 0.95;
  g.add(box(w, 1.7, 1.9, color, 0, 0.35, cabZ));
  g.add(box(w * 0.82, 0.6, 0.06, GLASS, 0, 1.2, cabZ - 0.97, { cast: false }));
  g.add(box(w + 0.06, 0.5, 0.9, GLASS, 0, 1.25, cabZ - 0.3, { cast: false }));
  // cargo box
  const cargoColor = pick(['#f2f2f2', '#ffd23f', '#ff8c1a', '#e3e3ff']);
  g.add(box(w, 2.3, L - 2.05, cargoColor, 0, 0.55, cabZ + 0.95 + (L - 2.05) / 2 + 0.1));
  g.add(box(w + 0.04, 0.3, L - 2.2, color, 0, 1.6, cabZ + 0.95 + (L - 2.05) / 2 + 0.1, { cast: false }));
  addLights(g, w, L, 0.55);
  return finish(g, w, L, 'truck', [color, cargoColor, TIRE]);
}

export function buildBus() {
  const g = new THREE.Group();
  const w = 2.2;
  const L = 7.2;
  const color = pick(['#ffc21a', '#ff4757', '#2ec4ff']);
  addWheels(g, w, [-L / 2 + 1.3, L / 2 - 1.3]);
  g.add(box(w, 2.1, L, color, 0, 0.3, 0));
  g.add(box(w + 0.06, 0.62, L - 1.4, GLASS, 0, 1.35, 0.4, { cast: false }));
  g.add(box(w * 0.84, 0.75, 0.06, GLASS, 0, 1.25, -L / 2 - 0.02, { cast: false }));
  g.add(box(w + 0.06, 0.14, L, '#1d1d24', 0, 0.85, 0, { cast: false }));
  g.add(box(w * 0.7, 0.1, L * 0.5, '#ffffff', 0, 2.4, 0.3));
  addLights(g, w, L, 0.55);
  return finish(g, w, L, 'bus', [color, GLASS, TIRE]);
}

export function buildRandomVehicle() {
  const r = Math.random();
  if (r < 0.55) return buildCar(pick(TRAFFIC_COLORS), { stripe: Math.random() < 0.3 ? '#ffffff' : null });
  if (r < 0.67) return buildCar('#ffd000', { taxi: true });
  if (r < 0.87) return buildTruck(pick(TRAFFIC_COLORS));
  return buildBus();
}

// ---------- Road obstacles ----------

function cone(x, z) {
  const g = new THREE.Group();
  g.add(box(0.7, 0.12, 0.7, '#ff6a00', 0, 0, 0));
  g.add(box(0.46, 0.34, 0.46, '#ff6a00', 0, 0.12, 0));
  g.add(box(0.38, 0.16, 0.38, '#ffffff', 0, 0.46, 0));
  g.add(box(0.28, 0.32, 0.28, '#ff6a00', 0, 0.62, 0));
  g.position.set(x, 0, z);
  return g;
}

export function buildCones() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) g.add(cone(rand(-0.25, 0.25), -1.6 + i * 1.6));
  return finish(g, 1.2, 4.0, 'cones', ['#ff6a00', '#ffffff']);
}

export function buildCrate() {
  const g = new THREE.Group();
  const s = 1.5;
  g.add(box(s, s, s, '#c8873a', 0, 0, 0));
  g.add(box(s + 0.04, 0.2, s + 0.04, '#8a5523', 0, 0.15, 0));
  g.add(box(s + 0.04, 0.2, s + 0.04, '#8a5523', 0, s - 0.35, 0));
  g.add(box(0.2, s + 0.02, s + 0.04, '#8a5523', 0, 0, 0));
  return finish(g, s, s, 'crate', ['#c8873a', '#8a5523']);
}

export function buildBarrier() {
  const g = new THREE.Group();
  const w = 2.4;
  for (const s of [-1, 1]) {
    g.add(box(0.16, 0.9, 0.5, '#5a5a66', s * (w / 2 - 0.2), 0, 0));
    g.add(box(0.3, 0.12, 0.6, '#5a5a66', s * (w / 2 - 0.2), 0, 0));
  }
  const n = 6;
  for (let i = 0; i < n; i++) {
    const c = i % 2 ? '#ffffff' : '#ff3030';
    g.add(box(w / n, 0.38, 0.18, c, -w / 2 + (i + 0.5) * (w / n), 0.55, 0));
  }
  g.add(box(0.26, 0.2, 0.2, '#ffcc00', 0, 0.95, 0, { cast: false }));
  return finish(g, w, 0.7, 'barrier', ['#ff3030', '#ffffff', '#5a5a66']);
}

export function buildRandomObstacle() {
  const r = Math.random();
  if (r < 0.4) return buildCones();
  if (r < 0.7) return buildCrate();
  return buildBarrier();
}

// ---------- Scenery ----------

const LEAF_GREENS = ['#2fbf4a', '#22a03c', '#4cd964', '#1e8f3a', '#5fe35a'];
const FLOWERS = ['#ff4757', '#ffd23f', '#ffffff', '#ff7ac6', '#7d5cff'];

export function buildTree() {
  const g = new THREE.Group();
  const green = pick(LEAF_GREENS);
  const green2 = pick(LEAF_GREENS);
  if (Math.random() < 0.6) {
    const th = rand(0.8, 1.4);
    g.add(box(0.6, th, 0.6, '#8b5a2b', 0, 0, 0));
    const s = rand(1.8, 2.4);
    g.add(box(s, s, s, green, 0, th, 0));
    if (Math.random() < 0.6) g.add(box(s * 0.65, s * 0.55, s * 0.65, green2, 0, th + s, 0));
  } else {
    // pine
    g.add(box(0.5, 0.8, 0.5, '#7a4a22', 0, 0, 0));
    let y = 0.8;
    for (const s of [2.2, 1.6, 1.0]) {
      g.add(box(s, 0.9, s, green, 0, y, 0));
      y += 0.8;
    }
  }
  g.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;
  return g;
}

export function buildBush() {
  const g = new THREE.Group();
  const s = rand(0.9, 1.4);
  g.add(box(s, s * 0.7, s, pick(LEAF_GREENS), 0, 0, 0));
  if (Math.random() < 0.4) g.add(box(0.22, 0.22, 0.22, pick(FLOWERS), rand(-0.3, 0.3), s * 0.7, rand(-0.3, 0.3), { cast: false }));
  return g;
}

export function buildRock() {
  return box(rand(0.8, 1.3), rand(0.4, 0.8), rand(0.7, 1.1), pick(['#9aa0a6', '#b8bec4', '#80868c']));
}

export function buildFlower() {
  const g = new THREE.Group();
  g.add(box(0.08, 0.3, 0.08, '#1e8f3a', 0, 0, 0, { cast: false }));
  g.add(box(0.26, 0.2, 0.26, pick(FLOWERS), 0, 0.3, 0, { cast: false }));
  return g;
}

export function buildLamp() {
  const g = new THREE.Group();
  g.add(box(0.25, 3.6, 0.25, '#5a5a66', 0, 0, 0));
  g.add(box(1.2, 0.18, 0.25, '#5a5a66', -0.5, 3.5, 0));
  g.add(box(0.45, 0.2, 0.4, '#fff6a0', -0.95, 3.32, 0, { cast: false }));
  return g;
}
