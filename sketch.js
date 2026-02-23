/*
Week 5 — Reflective / Meditative Camera World (GitHub Pages friendly)

Based on your Week 5 Example 1 base:
- player in WORLD coords
- cam in WORLD coords
- translate(-cam.x, -cam.y) to draw world
- HUD drawn in screen space after pop()

Upgrades implemented:
1) Calm camera follow (lerp)
2) Pacing + stillness (auto-drift when stopped)
3) Gentle player movement (accel/friction + SHIFT slow walk + consistent diagonals)
4) Reflective visuals (no harsh grid + 3 mood areas + subtle ambient details)
5) Subtle breathing (tiny zoom)
6) Comfort toggles in HUD (M/H/R)
7) Soft camera bounds (smooth clamp + slight overscroll)
*/

let player = { x: 300, y: 300, s: 3, vx: 0, vy: 0 }; // WORLD
let cam = { x: 0, y: 0, tx: 0, ty: 0 }; // camera top-left in WORLD

// World size
const WORLD_W = 2400;
const WORLD_H = 1600;

// Canvas / viewport size
const VIEW_W = 800;
const VIEW_H = 480;

// ---- Motion + feel tuning ----
const MOVE = {
  accel: 0.38,
  friction: 0.9, // higher = more glide (0.88–0.94 good range)
  maxSpeed: 3.0,
  slowMult: 0.5, // SHIFT slow walk multiplier
  stopEps: 0.05, // below this, snap velocity to 0
};

const CAMERA = {
  smooth: 0.09, // calm follow smoothing (0.06–0.12 floaty)
  smoothRM: 0.22, // reduced motion easing (more stable, less float)
  overscrollPad: 60, // allow slight overscroll beyond world edges
  clampSoft: 0.08, // soften target when out of bounds (no hard stop)
};

// Auto-drift when stopped (pacing + stillness)
const DRIFT = {
  amt: 18, // pixels (6–25 subtle)
  speed: 0.0022, // noise speed (very small)
  fadeIn: 0.02,
  fadeOut: 0.06,
};
let driftFade = 0;

// Breathing zoom (subtle)
const BREATH = {
  amp: 0.006, // 0.003–0.010 safe
  rate: (Math.PI * 2) / (60 * 12), // ~12s per cycle at ~60fps
};

// Comfort / inclusivity toggles
let opt = { reducedMotion: false, highContrast: false };

// Calm starting location
const START_X = 300;
const START_Y = 300;

// World “mood” content (pre-generated for stability)
let landmarks = []; // pools/stones
let stars = []; // dusk zone twinkles
let motes = []; // dawn drifting circles

function setup() {
  createCanvas(VIEW_W, VIEW_H);
  textFont("sans-serif");
  textSize(14);
  noStroke();

  // Stable layout (not random every reload)
  randomSeed(5);
  noiseSeed(5);

  // Pre-generate sparse landmarks across the world
  for (let i = 0; i < 52; i++) {
    landmarks.push({
      x: random(80, WORLD_W - 80),
      y: random(80, WORLD_H - 80),
      r: random(20, 70),
      t: random(1000),
    });
  }

  // Gentle motes for left (dawn) zone
  for (let i = 0; i < 90; i++) {
    motes.push({
      x: random(0, WORLD_W / 3),
      y: random(0, WORLD_H),
      r: random(4, 12),
      sp: random(0.15, 0.55),
      n: random(1000),
    });
  }

  // Stars for right (dusk) zone
  for (let i = 0; i < 140; i++) {
    stars.push({
      x: random((WORLD_W * 2) / 3, WORLD_W),
      y: random(0, WORLD_H),
      a: random(0.05, 0.2),
      p: random(0, Math.PI * 2),
      r: random(1.0, 2.0),
    });
  }

  resetToStart();
}

function draw() {
  // ---------- 1) UPDATE GAME STATE (WORLD) ----------
  // Input becomes a direction vector (dx, dy)
  const dx =
    (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) -
    (keyIsDown(LEFT_ARROW) || keyIsDown(65));

  const dy =
    (keyIsDown(DOWN_ARROW) || keyIsDown(83)) -
    (keyIsDown(UP_ARROW) || keyIsDown(87));

  // Normalize with Euclidean length so diagonal speed is consistent
  const mag = Math.sqrt(dx * dx + dy * dy);
  const nx = mag > 0 ? dx / mag : 0;
  const ny = mag > 0 ? dy / mag : 0;

  // SHIFT = slow-walk precision
  const slow = keyIsDown(SHIFT);
  const accel = slow ? MOVE.accel * 0.65 : MOVE.accel;
  const maxSp = slow ? MOVE.maxSpeed * MOVE.slowMult : MOVE.maxSpeed;

  // Acceleration into velocity (gentle start/stop)
  player.vx += nx * accel;
  player.vy += ny * accel;

  // Clamp to max speed (prevents runaway skating)
  const sp = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (sp > maxSp) {
    const k = maxSp / sp;
    player.vx *= k;
    player.vy *= k;
  }

  // Friction / damping (gentle deceleration)
  player.vx *= MOVE.friction;
  player.vy *= MOVE.friction;

  // Snap tiny velocities to 0 for calm stillness
  if (Math.abs(player.vx) < MOVE.stopEps) player.vx = 0;
  if (Math.abs(player.vy) < MOVE.stopEps) player.vy = 0;

  // Apply velocity to position (WORLD space)
  player.x += player.vx;
  player.y += player.vy;

  // Optional soft player bounds (keeps you inside designed mood areas)
  // (soft: clamp position + damp velocity at edges)
  const px0 = player.x,
    py0 = player.y;
  player.x = constrain(player.x, 0, WORLD_W);
  player.y = constrain(player.y, 0, WORLD_H);
  if (player.x !== px0) player.vx *= 0.2;
  if (player.y !== py0) player.vy *= 0.2;

  // ---------- 2) UPDATE VIEW STATE (CAMERA) ----------
  // Base target: center camera on player (target, not snap)
  cam.tx = player.x - width / 2;
  cam.ty = player.y - height / 2;

  // Pacing + stillness: auto-drift when player stops moving
  const moving = Math.abs(player.vx) + Math.abs(player.vy) > 0;
  if (opt.reducedMotion) {
    driftFade = 0;
  } else {
    driftFade = lerp(
      driftFade,
      moving ? 0 : 1,
      moving ? DRIFT.fadeOut : DRIFT.fadeIn,
    );
  }

  if (driftFade > 0.001) {
    const t = frameCount * DRIFT.speed;
    const driftX = (noise(t, 0.0) - 0.5) * 2 * DRIFT.amt * driftFade;
    const driftY = (noise(0.0, t) - 0.5) * 2 * DRIFT.amt * driftFade;
    cam.tx += driftX;
    cam.ty += driftY;
  }

  // World/camera bounds: soft-clamp target with slight overscroll (no hard stop)
  const minX = -CAMERA.overscrollPad;
  const minY = -CAMERA.overscrollPad;
  const maxX = WORLD_W - width + CAMERA.overscrollPad;
  const maxY = WORLD_H - height + CAMERA.overscrollPad;

  const clampedTx = constrain(cam.tx, minX, maxX);
  const clampedTy = constrain(cam.ty, minY, maxY);

  // Ease target toward clamp so edges feel gentle
  cam.tx = lerp(cam.tx, clampedTx, CAMERA.clampSoft);
  cam.ty = lerp(cam.ty, clampedTy, CAMERA.clampSoft);

  // Calm camera follow (lerp)
  const camSmooth = opt.reducedMotion ? CAMERA.smoothRM : CAMERA.smooth;
  cam.x = lerp(cam.x, cam.tx, camSmooth);
  cam.y = lerp(cam.y, cam.ty, camSmooth);

  // ---------- 3) DRAW ----------
  // Screen-space clear (outside world)
  background(opt.highContrast ? 10 : 22);

  // Draw the WORLD (scrolling layer) in world space
  push();

  // Subtle breathing zoom (disabled in Reduced Motion)
  let z = 1;
  if (!opt.reducedMotion) {
    z = 1 + Math.sin(frameCount * BREATH.rate) * BREATH.amp;
  }
  translate(width / 2, height / 2);
  scale(z);
  translate(-width / 2, -height / 2);

  // Your original camera translate (world scrolling)
  translate(-cam.x, -cam.y);

  // Draw mood areas + reflective visuals (no harsh grid)
  drawWorld();

  // Player (in world space)
  drawPlayer();

  pop();

  // HUD (screen space): drawn AFTER pop(), so it does not move with camera
  drawHUD();
}

function drawWorld() {
  // Fixed 3-zone world: left/middle/right thirds
  const third = WORLD_W / 3;

  // Draw three large mood bands (soft gradients)
  drawMoodBand(0, 0, third, WORLD_H, 0);
  drawMoodBand(third, 0, third, WORLD_H, 1);
  drawMoodBand(third * 2, 0, third, WORLD_H, 2);

  // Sparse landmarks (pools/stones) with zone-tinted colors
  noStroke();
  for (let i = 0; i < landmarks.length; i++) {
    const L = landmarks[i];
    const zone = getZoneAt(L.x);
    const pal = getPalette(zone, opt.highContrast);

    // Very slow shimmer (non-flashy)
    const shimmer = 0.08 + 0.05 * Math.sin(frameCount * 0.006 + L.t);

    fill(pal.landA[0], pal.landA[1], pal.landA[2], pal.landA[3]);
    ellipse(L.x, L.y, L.r * 2.2, L.r * 1.7);

    fill(
      pal.landB[0],
      pal.landB[1],
      pal.landB[2],
      pal.landB[3] * (0.8 + shimmer),
    );
    ellipse(L.x + L.r * 0.15, L.y - L.r * 0.1, L.r * 1.3, L.r * 0.9);
  }

  // Subtle ambient details per zone (calm, no flashing)
  drawAmbientDetails();
}

function drawMoodBand(x, y, w, h, zone) {
  const pal = getPalette(zone, opt.highContrast);
  const ctx = drawingContext;

  // Gradient fill (GitHub Pages friendly; no images)
  ctx.save();
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, pal.bgTop);
  grad.addColorStop(1, pal.bgBot);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // Gentle overlay to reduce “flatness”
  noStroke();
  fill(pal.haze[0], pal.haze[1], pal.haze[2], pal.haze[3]);
  rect(x, y, w, h);

  // Optional high-contrast boundary hints (very subtle, not “grid”)
  if (opt.highContrast) {
    stroke(255, 255, 255, 18);
    line(x, 0, x, WORLD_H);
    noStroke();
  }
}

function drawAmbientDetails() {
  const third = WORLD_W / 3;

  // Dawn zone: drifting motes (left third)
  if (!opt.highContrast) {
    noStroke();
    fill(255, 255, 255, 22);
  } else {
    noStroke();
    fill(255, 255, 255, 42);
  }

  for (let i = 0; i < motes.length; i++) {
    const m = motes[i];
    // Slow vertical drift + slight sideways wander
    const t = frameCount * 0.003 + m.n;
    const ox = (noise(t, 1.3) - 0.5) * 14;
    const oy = (frameCount * m.sp) % (WORLD_H + 80);
    const yy = m.y + oy - 40;
    ellipse(m.x + ox, yy, m.r * 2, m.r * 2);
  }

  // Middle zone: slow “current” lines (wide spacing)
  const midX0 = third;
  const midX1 = third * 2;
  stroke(
    opt.highContrast ? 255 : 255,
    opt.highContrast ? 255 : 255,
    opt.highContrast ? 255 : 255,
    opt.highContrast ? 18 : 12,
  );
  strokeWeight(1);
  for (let y = 120; y < WORLD_H; y += 180) {
    const wave = Math.sin(frameCount * 0.004 + y * 0.02) * 18;
    line(midX0 + 60, y + wave, midX1 - 60, y - wave);
  }
  noStroke();

  // Dusk zone: slow twinkle stars (right third)
  noStroke();
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    // Twinkle very slowly + tiny amplitude (no flash)
    const tw = 0.03 * Math.sin(frameCount * 0.01 + s.p);
    const a = constrain(s.a + tw, 0.03, 0.22);
    fill(255, 255, 255, opt.highContrast ? a * 255 : a * 180);
    circle(s.x, s.y, s.r);
  }

  // Subtle vignette “edge softening” for reflective feel
  // (drawn in world space so it scrolls; gentle, not dark)
  const cx = cam.x + width / 2;
  const cy = cam.y + height / 2;
  noStroke();
  fill(0, 0, 0, opt.highContrast ? 18 : 10);
  // Four big soft corners around current view area
  circle(cx - width * 0.55, cy - height * 0.55, 520);
  circle(cx + width * 0.55, cy - height * 0.55, 520);
  circle(cx - width * 0.55, cy + height * 0.55, 520);
  circle(cx + width * 0.55, cy + height * 0.55, 520);
}

function drawPlayer() {
  const zone = getZoneAt(player.x);
  const pal = getPalette(zone, opt.highContrast);

  // Soft shadow under player
  noStroke();
  fill(0, 0, 0, opt.highContrast ? 70 : 30);
  ellipse(player.x + 2, player.y + 6, 28, 18);

  // Player body (calm, readable)
  fill(pal.player[0], pal.player[1], pal.player[2], 255);
  rect(player.x - 12, player.y - 12, 24, 24, 6);

  // Gentle “center” dot (helps focus, non-gamey)
  fill(255, 255, 255, opt.highContrast ? 220 : 160);
  circle(player.x, player.y, 4);
}

function drawHUD() {
  const pad = 10;

  // HUD panel for readability
  noStroke();
  if (opt.highContrast) {
    fill(0, 0, 0, 180);
  } else {
    fill(255, 255, 255, 140);
  }
  rect(pad, pad, 780, 86, 10);

  // HUD text
  if (opt.highContrast) fill(255);
  else fill(20);

  const cx = (cam.x + width / 2) | 0;
  const cy = (cam.y + height / 2) | 0;
  const zone = getZoneAt(cx);
  const zoneName = ["Dawn", "Meadow", "Dusk"][zone];

  text(
    "Week 5 — Reflective camera world (calm travel + pause). Move: WASD/Arrows. SHIFT: slow walk.",
    pad + 10,
    pad + 22,
  );
  text(
    `[M] Reduced Motion: ${opt.reducedMotion ? "ON" : "OFF"}   [H] High Contrast: ${opt.highContrast ? "ON" : "OFF"}   [R] Reset`,
    pad + 10,
    pad + 42,
  );
  text(
    `Mood: ${zoneName}   Player(world): ${player.x | 0}, ${player.y | 0}   CamCenter(world): ${cx}, ${cy}`,
    pad + 10,
    pad + 62,
  );
}

function keyPressed() {
  if (key === "m" || key === "M") {
    opt.reducedMotion = !opt.reducedMotion;
    // When enabling reduced motion, also quiet drift immediately
    if (opt.reducedMotion) driftFade = 0;
  }
  if (key === "h" || key === "H") {
    opt.highContrast = !opt.highContrast;
  }
  if (key === "r" || key === "R") {
    resetToStart();
  }
}

function resetToStart() {
  player.x = START_X;
  player.y = START_Y;
  player.vx = 0;
  player.vy = 0;

  cam.x = player.x - width / 2;
  cam.y = player.y - height / 2;
  cam.tx = cam.x;
  cam.ty = cam.y;

  driftFade = 0;
}

// Zone detection (3 distinct mood areas across the large world)
function getZoneAt(worldX) {
  const third = WORLD_W / 3;
  if (worldX < third) return 0;
  if (worldX < third * 2) return 1;
  return 2;
}

// Palettes (zone + high-contrast variants)
// bgTop/bgBot are CSS strings for Canvas gradients.
// landA/landB/player/haze are RGBA arrays for p5 fills.
function getPalette(zone, highContrast) {
  if (!highContrast) {
    if (zone === 0) {
      // Dawn (cool, airy)
      return {
        bgTop: "#E6F0FF",
        bgBot: "#CFE2FF",
        haze: [255, 255, 255, 22],
        landA: [160, 198, 220, 70],
        landB: [210, 235, 255, 65],
        player: [56, 120, 255],
      };
    }
    if (zone === 1) {
      // Meadow (warm, grounded)
      return {
        bgTop: "#F0F6E8",
        bgBot: "#DDEBD0",
        haze: [255, 255, 255, 18],
        landA: [160, 200, 170, 60],
        landB: [230, 245, 235, 55],
        player: [40, 140, 120],
      };
    }
    // Dusk (deep, quiet)
    return {
      bgTop: "#1F2A44",
      bgBot: "#131A2C",
      haze: [0, 0, 0, 16],
      landA: [90, 110, 160, 55],
      landB: [160, 170, 210, 35],
      player: [190, 210, 255],
    };
  }

  // High contrast variants (stronger separation + HUD already dark)
  if (zone === 0) {
    return {
      bgTop: "#FFFFFF",
      bgBot: "#D7E6FF",
      haze: [255, 255, 255, 10],
      landA: [40, 90, 160, 110],
      landB: [220, 240, 255, 90],
      player: [0, 120, 255],
    };
  }
  if (zone === 1) {
    return {
      bgTop: "#F7FFE8",
      bgBot: "#CFE9A8",
      haze: [255, 255, 255, 10],
      landA: [20, 110, 60, 120],
      landB: [235, 255, 235, 90],
      player: [0, 180, 120],
    };
  }
  return {
    bgTop: "#05070F",
    bgBot: "#000000",
    haze: [0, 0, 0, 6],
    landA: [140, 170, 255, 120],
    landB: [220, 230, 255, 90],
    player: [255, 255, 255],
  };
}
