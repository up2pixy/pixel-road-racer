# Pixel Road Racer

A Crossy Road–style endless HTML5 racing game: a 45°-tilted voxel world rendered at low
resolution for a chunky pixel look. Dodge boxy traffic and roadwork on a busy four-lane road —
the longer you survive, the higher your score.

## Run

ES modules need to be served over HTTP (opening `index.html` via `file://` won't work in most browsers).
From this folder run any static server, for example:

```
npx serve .
# or
python -m http.server 8000
```

Then open the printed URL. An internet connection is required (Three.js and the pixel font load from CDNs).

## Controls

| Key | Action |
| --- | --- |
| ← / → (A / D) | Change lane |
| ↑ / ↓ (W / S) | Speed up / brake (releases back to cruise speed) |
| P / Esc | Pause |
| Space / Enter | Start / retry |

### Touch (phones & tablets)

| Gesture | Action |
| --- | --- |
| Swipe ← / → | Change lane (keep dragging to move several lanes) |
| Swipe ↑ / ↓ and hold | Speed up / brake (release to return to cruise speed) |
| **II** button | Pause |
| Tap | Start / resume / retry |

## Gameplay

- The two left lanes carry oncoming traffic; the two right lanes flow your way but slower.
- Cones, crates and barriers block lanes — traffic queues up behind them.
- Score grows every second you survive, faster when you drive faster. Best score is saved locally.
- Traffic density, obstacle frequency and oncoming speed increase over time (level shown in the HUD).

## Structure

- `index.html`, `style.css` – page, HUD and menus
- `js/config.js` – tunable constants (lanes, camera, speeds, pixel scale)
- `js/main.js` – renderer, camera, game loop and state machine
- `js/models.js` – voxel builders for cars, trucks, buses, obstacles and scenery
- `js/world.js` – recycled road/grass/tree chunks
- `js/player.js` – player car movement
- `js/touch.js` – swipe gesture controls
- `js/traffic.js` – spawning, lane following and difficulty ramp
- `js/collision.js` – AABB collision
- `js/ui.js` – HUD, overlays and high score
