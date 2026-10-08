const SWIPE_PX = 28; // CSS pixels of travel that count as a swipe
const EXTRA_LANE_PX = 80; // further drag needed for each additional lane in the same gesture
const MIN_SPEED_HOLD_MS = 350; // quick flicks still give a short burst of accel/brake

/**
 * Swipe controls on the whole screen.
 * - Swipe left/right: change lane (keep dragging to move several lanes in one gesture)
 * - Swipe up/down: accelerate/brake while the finger stays down
 */
export function setupSwipe({ isActive, onLane, onSpeed }) {
  let pointerId = null;
  let anchorX = 0;
  let anchorY = 0;
  let lanesMoved = 0;
  let speedSince = 0;
  let releaseTimer = 0;

  const setSpeed = (dir) => {
    clearTimeout(releaseTimer);
    speedSince = performance.now();
    onSpeed(dir);
  };

  const end = (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    const held = performance.now() - speedSince;
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => onSpeed(0), Math.max(0, MIN_SPEED_HOLD_MS - held));
  };

  window.addEventListener('pointerdown', (e) => {
    if (!isActive() || pointerId !== null || e.target.closest('button')) return;
    pointerId = e.pointerId;
    anchorX = e.clientX;
    anchorY = e.clientY;
    lanesMoved = 0;
  });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    if (!isActive()) {
      pointerId = null;
      return;
    }
    const dx = e.clientX - anchorX;
    const dy = e.clientY - anchorY;
    const lanePx = lanesMoved ? EXTRA_LANE_PX : SWIPE_PX;
    if (Math.abs(dx) >= lanePx && Math.abs(dx) > Math.abs(dy)) {
      onLane(Math.sign(dx));
      lanesMoved++;
      anchorX = e.clientX;
      anchorY = e.clientY;
    } else if (Math.abs(dy) >= SWIPE_PX && Math.abs(dy) > Math.abs(dx)) {
      setSpeed(dy < 0 ? 1 : -1);
      anchorX = e.clientX;
      anchorY = e.clientY;
    }
  });

  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}
