/*
Week 5 — Example 1: Top-Down Camera Follow (Centered, No Bounds)

Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
Date: Feb. 12, 2026

Move: WASD/Arrows

Goal:
- Keep player position in world space
- Compute a camera offset from the player (view state)
- Draw world using translate(-cam.x, -cam.y)
- Draw HUD in screen space (no translate)
*/

let player = { x: 300, y: 300, s: 3 }; // player in WORLD coords
let cam = { x: 0, y: 0 }; // camera top-left in WORLD coords

// World size (we draw a world rectangle + features, but we do NOT clamp camera)
const WORLD_W = 2400;
const WORLD_H = 1600;

// Canvas / viewport size (SCREEN coords)
const VIEW_W = 800;
const VIEW_H = 480;

function setup() {
  createCanvas(VIEW_W, VIEW_H);
  textFont("sans-serif");
  textSize(14);
  noStroke();
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

  // Cheap diagonal normalization so diagonals aren’t faster
  const len = max(1, abs(dx) + abs(dy));

  // Move player in WORLD space (no bounds in Example 1)
  player.x += (dx / len) * player.s;
  player.y += (dy / len) * player.s;

  // ---------- 2) UPDATE VIEW STATE (CAMERA) ----------
  // Center camera on player (NO constrain / bounds here)
  cam.x = player.x - width / 2;
  cam.y = player.y - height / 2;

  // ---------- 3) DRAW ----------
  background(220);

  // Draw the WORLD (scrolling layer) in world space
  push();
  translate(-cam.x, -cam.y);

  // World background rectangle (so you can see the “world area”)
  noStroke();
  fill(235);
  rect(0, 0, WORLD_W, WORLD_H);

  // Grid lines make camera motion easy to see
  stroke(245);
  for (let x = 0; x <= WORLD_W; x += 160) line(x, 0, x, WORLD_H);
  for (let y = 0; y <= WORLD_H; y += 160) line(0, y, WORLD_W, y);

  // Obstacles (static world features)
  noStroke();
  fill(170, 190, 210);
  for (let i = 0; i < 30; i++) {
    const x = (i * 280) % WORLD_W;
    const y = (i * 180) % WORLD_H;
    rect(x + 40, y + 40, 80, 80, 10);
  }

  // Player (in world space)
  fill(50, 110, 255);
  rect(player.x - 12, player.y - 12, 24, 24, 5);

  pop();

  // HUD (screen space): drawn AFTER pop(), so it does not move with camera
  noStroke();
  fill(20);
  text("Week 5 — Centered camera (no bounds). WASD/Arrows to move.", 12, 20);
  text(
    "Player(world): " +
      (player.x | 0) +
      ", " +
      (player.y | 0) +
      "   Cam(world): " +
      (cam.x | 0) +
      ", " +
      (cam.y | 0),
    12,
    40,
  );
}
