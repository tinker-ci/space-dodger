import { InputManager } from './input.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const homeScreen = document.getElementById('homeScreen');
const homeText = document.getElementById('homeText');
const pairButton = document.getElementById('pairButton');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlayText');
const controllerBadge = document.getElementById('controllerBadge');

const input = new InputManager();
const STORAGE_KEY = 'space-dodger-high-score';
const state = {
  mode: 'title',
  score: 0,
  highScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
  width: 0,
  height: 0,
  stars: [],
  asteroids: [],
  spawnTimer: 0,
  scoreTimer: 0,
  lastTime: performance.now(),
  pressedLatch: false,
  startLatch: false,
  controllerName: 'No controller',
  player: {
    x: 0,
    y: 0,
    size: 18,
    speed: 280,
  },
};

highScoreEl.textContent = String(state.highScore);

function resize() {
  const dpr = window.devicePixelRatio || 1;
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = Math.floor(state.width * dpr);
  canvas.height = Math.floor(state.height * dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!state.player.x) state.player.x = state.width * 0.5;
  if (!state.player.y) state.player.y = state.height * 0.78;
  if (!state.stars.length) initStars();
}

function initStars() {
  state.stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    r: Math.random() * 1.6 + 0.4,
    s: Math.random() * 25 + 10,
  }));
}

function controllerLabel(gamepad) {
  const id = (gamepad?.id || '').toLowerCase();
  if (id.includes('playstation') || id.includes('dualshock') || id.includes('dualsense')) return 'PlayStation controller connected';
  if (id.includes('xbox')) return 'Xbox controller connected';
  if (id.includes('switch') || id.includes('pro controller')) return 'Nintendo controller connected';
  if (gamepad) return 'Gamepad connected';
  return 'No controller';
}

function focusPairButton() {
  if (pairButton.hidden) return;
  requestAnimationFrame(() => pairButton.focus());
}

function showHome(message = 'Connect a gamepad to begin.', controllerReady = false) {
  state.mode = 'home';
  homeText.textContent = message;
  pairButton.hidden = controllerReady;
  homeScreen.classList.add('visible');
  overlay.classList.remove('visible');
  canvas.classList.remove('visible');
  scoreEl.textContent = String(state.score);
  state.pressedLatch = false;
  if (!controllerReady) focusPairButton();
}

function hideHome() {
  homeScreen.classList.remove('visible');
}

function showGameCanvas() {
  canvas.classList.add('visible');
}

function enterGame() {
  hideHome();
  showGameCanvas();
  if (state.mode !== 'play') resetGame();
}

function resetGame() {
  state.mode = 'play';
  state.score = 0;
  state.spawnTimer = 0;
  state.scoreTimer = 0;
  state.asteroids = [];
  state.player.x = state.width * 0.5;
  state.player.y = state.height * 0.78;
  state.lastTime = performance.now();
  scoreEl.textContent = '0';
  state.pressedLatch = false;
  overlay.classList.remove('visible');
}

function gameOver() {
  state.mode = 'gameover';
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.highScore));
    highScoreEl.textContent = String(state.highScore);
  }
  overlayText.textContent = 'Press A/Start to Restart.';
  overlay.classList.add('visible');
}

function updateControllerUI(gamepad) {
  controllerBadge.textContent = controllerLabel(gamepad);
}

function openPlatformPairing() {
  // Stubbed platform hook for native pairing flow.
  // Replace with a platform-specific screen or API call.
  window.dispatchEvent(new CustomEvent('open-platform-pairing'));
}

pairButton.addEventListener('click', openPlatformPairing);

input.onConnect = (gamepad) => {
  updateControllerUI(gamepad);
  showHome('Controller detected. Press A, Start, Enter, or Space to begin.', true);
};
input.onDisconnect = () => {
  updateControllerUI(null);
  showHome('Controller disconnected. Pair a controller to continue.');
};
updateControllerUI(input.pollGamepad());

if (input.hasConnectedGamepad()) {
  showHome('Controller detected. Press A, Start, Enter, or Space to begin.', true);
} else {
  showHome();
}

function spawnAsteroid() {
  const side = Math.floor(Math.random() * 4);
  const r = 16 + Math.random() * 28;
  const speed = 120 + Math.random() * 170 + state.score * 3;
  const asteroid = { r, speed, vx: 0, vy: 0, x: 0, y: 0 };
  if (side === 0) {
    asteroid.x = Math.random() * state.width;
    asteroid.y = -r;
  } else if (side === 1) {
    asteroid.x = state.width + r;
    asteroid.y = Math.random() * state.height;
  } else if (side === 2) {
    asteroid.x = Math.random() * state.width;
    asteroid.y = state.height + r;
  } else {
    asteroid.x = -r;
    asteroid.y = Math.random() * state.height;
  }
  const dx = state.player.x - asteroid.x;
  const dy = state.player.y - asteroid.y;
  const len = Math.hypot(dx, dy) || 1;
  asteroid.vx = (dx / len) * speed;
  asteroid.vy = (dy / len) * speed;
  state.asteroids.push(asteroid);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function update(dt) {
  const gamepad = input.pollGamepad();
  updateControllerUI(gamepad);

  if (!gamepad) {
    if (state.mode !== 'home') showHome('Controller disconnected. Pair a controller to continue.');
    return;
  }

  if (state.mode === 'home') {
    if (input.isStartPressed() && !state.startLatch) {
      state.startLatch = true;
      enterGame();
    }
    if (!input.isStartPressed()) state.startLatch = false;
    return;
  }

  if (input.isPausePressed() && !state.pressedLatch) {
    if (state.mode === 'play') {
      state.mode = 'paused';
      overlayText.textContent = 'Paused. Press Start or P to Resume.';
      overlay.classList.add('visible');
    } else if (state.mode === 'paused') {
      state.mode = 'play';
      overlay.classList.remove('visible');
    }
    state.pressedLatch = true;
  }

  if (!input.isPausePressed()) state.pressedLatch = false;

  if (state.mode === 'gameover') {
    if (input.isStartPressed()) resetGame();
    return;
  }

  if (state.mode === 'paused') return;

  if (state.mode === 'home') {
    if (input.isStartPressed()) enterGame();
    return;
  }

  const move = input.moveVector();
  state.player.x += move.x * state.player.speed * dt;
  state.player.y += move.y * state.player.speed * dt;
  state.player.x = clamp(state.player.x, state.player.size, state.width - state.player.size);
  state.player.y = clamp(state.player.y, state.player.size, state.height - state.player.size);

  state.spawnTimer -= dt;
  state.scoreTimer += dt;
  if (state.spawnTimer <= 0) {
    spawnAsteroid();
    state.spawnTimer = Math.max(0.35, 1.1 - state.score * 0.01);
  }
  if (state.scoreTimer >= 1) {
    const gained = Math.floor(state.scoreTimer);
    state.score += gained;
    state.scoreTimer -= gained;
    scoreEl.textContent = String(state.score);
  }

  for (const asteroid of state.asteroids) {
    asteroid.x += asteroid.vx * dt;
    asteroid.y += asteroid.vy * dt;
  }

  state.asteroids = state.asteroids.filter((asteroid) =>
    asteroid.x > -120 && asteroid.x < state.width + 120 &&
    asteroid.y > -120 && asteroid.y < state.height + 120
  );

  for (const asteroid of state.asteroids) {
    const dx = asteroid.x - state.player.x;
    const dy = asteroid.y - state.player.y;
    if (Math.hypot(dx, dy) < asteroid.r + state.player.size * 0.85) {
      scoreEl.textContent = String(state.score);
      gameOver();
      break;
    }
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, state.width, state.height);
  const grad = ctx.createLinearGradient(0, 0, 0, state.height);
  grad.addColorStop(0, '#070b18');
  grad.addColorStop(1, '#0f1730');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.save();
  ctx.globalAlpha = 0.35;
  for (const star of state.stars) {
    star.y += star.s * (1 / 60);
    if (star.y > state.height + 4) {
      star.y = -4;
      star.x = Math.random() * state.width;
    }
    ctx.fillStyle = '#dff5ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer() {
  const { x, y, size } = state.player;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#7be4ff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -size * 1.3);
  ctx.lineTo(size * 0.9, size * 1.2);
  ctx.lineTo(0, size * 0.5);
  ctx.lineTo(-size * 0.9, size * 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawAsteroid(asteroid) {
  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.fillStyle = '#d37d4f';
  ctx.strokeStyle = '#ffcf96';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const points = 10;
  for (let i = 0; i < points; i += 1) {
    const angle = (Math.PI * 2 * i) / points;
    const radius = asteroid.r * (0.75 + Math.sin(i * 13.37 + asteroid.r) * 0.12);
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function draw() {
  drawBackground();
  for (const asteroid of state.asteroids) drawAsteroid(asteroid);
  drawPlayer();

  if (state.mode === 'paused') {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.restore();
  }
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function init() {
  resize();
  overlayText.textContent = 'Paused. Press Start or P to Resume.';
  scoreEl.textContent = '0';
  canvas.classList.remove('visible');
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
}

init();

