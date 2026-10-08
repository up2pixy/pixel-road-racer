import * as THREE from 'three';
import {
  PIXEL_SCALE, VIEW_SIZE, CAMERA_YAW, CAMERA_PITCH, CAMERA_DIST, PLAYER,
} from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { findCollision } from './collision.js';
import { UI } from './ui.js';
import { geo, mat } from './models.js';
import { setupSwipe } from './touch.js';

// ---------- Renderer (low-res, upscaled with nearest-neighbour for pixel art) ----------
const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#3fb04a');

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
const CAM_OFFSET = new THREE.Vector3(
  Math.sin(CAMERA_YAW) * Math.cos(CAMERA_PITCH),
  Math.sin(CAMERA_PITCH),
  Math.cos(CAMERA_YAW) * Math.cos(CAMERA_PITCH),
).multiplyScalar(CAMERA_DIST);

function resize() {
  const w = Math.max(1, Math.floor(window.innerWidth / PIXEL_SCALE));
  const h = Math.max(1, Math.floor(window.innerHeight / PIXEL_SCALE));
  renderer.setSize(w, h, false);
  const aspect = w / h;
  // keep enough road visible on portrait screens too
  const view = aspect < 1 ? VIEW_SIZE / aspect * 0.75 : VIEW_SIZE;
  camera.left = (-view * aspect) / 2;
  camera.right = (view * aspect) / 2;
  camera.top = view / 2;
  camera.bottom = -view / 2;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight('#d6f0ff', '#3d7a2a', 1.6));
const sun = new THREE.DirectionalLight('#fff3d6', 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 });
sun.shadow.bias = -0.0015;
scene.add(sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(-14, 30, 10);

// ---------- Game objects ----------
const world = new World(scene);
const player = new Player(scene);
const traffic = new Traffic(scene);
const ui = new UI();

const input = { up: false, down: false };
let state = 'title'; // title | playing | paused | crashed | gameover
let score = 0;
let scoreAcc = 0;
let elapsed = 0;
let crashTimer = 0;
let shake = 0;
const camFocus = new THREE.Vector3();
const LOOK_AHEAD = 11;

// ---------- Crash debris ----------
const debris = [];
const DEBRIS_GEO = geo(0.35, 0.35, 0.35);

function spawnDebris(x, z, colors) {
  for (let i = 0; i < 36; i++) {
    const m = new THREE.Mesh(DEBRIS_GEO, mat(colors[i % colors.length]));
    m.castShadow = true;
    m.position.set(x + (Math.random() - 0.5) * 1.6, 0.6 + Math.random() * 0.8, z + (Math.random() - 0.5) * 3);
    const s = 0.6 + Math.random() * 0.9;
    m.scale.setScalar(s);
    scene.add(m);
    debris.push({
      m,
      vx: (Math.random() - 0.5) * 12,
      vy: 5 + Math.random() * 9,
      vz: (Math.random() - 0.5) * 12 - player.speed * 0.3,
      spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
      half: 0.175 * s,
    });
  }
}

function updateDebris(dt) {
  for (const d of debris) {
    d.vy -= 30 * dt;
    d.m.position.x += d.vx * dt;
    d.m.position.y += d.vy * dt;
    d.m.position.z += d.vz * dt;
    if (d.m.position.y < d.half) {
      d.m.position.y = d.half;
      d.vy = Math.abs(d.vy) > 2 ? -d.vy * 0.35 : 0;
      d.vx *= 0.7;
      d.vz *= 0.7;
      d.spin.multiplyScalar(0.6);
    }
    d.m.rotation.x += d.spin.x * dt;
    d.m.rotation.y += d.spin.y * dt;
    d.m.rotation.z += d.spin.z * dt;
  }
}

function clearDebris() {
  for (const d of debris) scene.remove(d.m);
  debris.length = 0;
}

// ---------- Game flow ----------
function resetRun() {
  player.reset();
  world.reset(player.z);
  traffic.reset(player.z);
  traffic.update(0, player.z, 0); // pre-populate the road ahead
  clearDebris();
  score = 0;
  scoreAcc = 0;
  elapsed = 0;
  shake = 0;
  input.up = input.down = false;
}

function startGame() {
  resetRun();
  state = 'playing';
  ui.show('playing');
  ui.updateHUD({ score, speed: player.speed, time: elapsed, level: 1 });
}

function crash(hit) {
  state = 'crashed';
  crashTimer = 1.1;
  shake = 0.9;
  player.alive = false;
  player.mesh.visible = false;
  spawnDebris(player.x, player.z, player.mesh.userData.colors);
  if (hit && !hit.obstacle) hit.v = 0;
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    ui.show('paused');
  } else if (state === 'paused') {
    state = 'playing';
    ui.show('playing');
  }
}

const level = () => 1 + Math.floor(elapsed / 15);

// ---------- Input ----------
const HANDLED = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'KeyP', 'Escape', 'KeyA', 'KeyD', 'KeyW', 'KeyS']);

window.addEventListener('keydown', (e) => {
  if (HANDLED.has(e.code)) e.preventDefault();
  switch (e.code) {
    case 'Space':
    case 'Enter':
      if (state === 'title' || state === 'gameover') startGame();
      else if (state === 'paused') togglePause();
      break;
    case 'KeyP':
    case 'Escape':
      togglePause();
      break;
    case 'ArrowLeft':
    case 'KeyA':
      if (state === 'playing' && !e.repeat) player.changeLane(-1);
      break;
    case 'ArrowRight':
    case 'KeyD':
      if (state === 'playing' && !e.repeat) player.changeLane(1);
      break;
    case 'ArrowUp':
    case 'KeyW':
      input.up = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      input.down = true;
      break;
    default:
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = false;
});

window.addEventListener('blur', () => {
  input.up = input.down = false;
  if (state === 'playing') togglePause();
});

for (const id of ['title', 'gameover']) {
  document.getElementById(id).addEventListener('click', () => {
    if (state === 'title' || state === 'gameover') startGame();
  });
}
document.getElementById('pause').addEventListener('click', togglePause);
document.getElementById('pause-btn').addEventListener('click', togglePause);

setupSwipe({
  isActive: () => state === 'playing',
  onLane: (dir) => player.changeLane(dir),
  onSpeed: (dir) => {
    input.up = dir > 0;
    input.down = dir < 0;
  },
});

// ---------- Main loop ----------
function updateCamera(dt) {
  camFocus.x += (player.x * 0.5 - camFocus.x) * Math.min(1, dt * 5);
  camFocus.z = player.z - LOOK_AHEAD; // look ahead so more of the oncoming road is visible
  camera.position.copy(camFocus).add(CAM_OFFSET);
  if (shake > 0) {
    const a = shake * shake * 1.2;
    camera.position.x += (Math.random() - 0.5) * a;
    camera.position.y += (Math.random() - 0.5) * a;
    shake = Math.max(0, shake - dt * 1.5);
  }
  camera.lookAt(camera.position.clone().sub(CAM_OFFSET));
  sun.position.copy(camFocus).add(SUN_OFFSET);
  sun.target.position.copy(camFocus);
}

const clock = new THREE.Clock();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state === 'playing') {
    elapsed += dt;
    player.update(dt, input);
    traffic.update(dt, player.z, elapsed);
    world.update(player.z);

    // survive longer -> more points; driving faster earns them quicker
    scoreAcc += dt * 10 * (player.speed / PLAYER.CRUISE);
    score = Math.floor(scoreAcc);

    const hit = findCollision(player.box, traffic.entities);
    if (hit) crash(hit);
    ui.updateHUD({ score, speed: player.speed, time: elapsed, level: level() });
  } else if (state === 'crashed' || state === 'gameover') {
    updateDebris(dt);
    if (state === 'crashed') {
      crashTimer -= dt;
      if (crashTimer <= 0) {
        state = 'gameover';
        const isNew = ui.submitScore(score);
        ui.showGameOver(score, elapsed, isNew);
      }
    }
  }

  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

resetRun();
camFocus.set(player.x * 0.5, 0, player.z - LOOK_AHEAD);
ui.show('title');
requestAnimationFrame(frame);

// expose for debugging in the console
window.__game = { scene, camera, player, traffic, world, get state() { return state; } };
