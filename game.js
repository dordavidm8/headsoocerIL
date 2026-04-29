const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const singlePlayerButton = document.getElementById("singlePlayerButton");
const twoPlayerButton = document.getElementById("twoPlayerButton");
const leftScoreEl = document.getElementById("leftScore");
const rightScoreEl = document.getElementById("rightScore");
const timerEl = document.getElementById("matchTimer");
const statusText = document.getElementById("statusText");
const leftGrid = document.getElementById("leftCharacterGrid");
const rightGrid = document.getElementById("rightCharacterGrid");
const leftCharacterName = document.getElementById("leftCharacterName");
const rightCharacterName = document.getElementById("rightCharacterName");
const leftHudLabel = document.getElementById("leftHudLabel");
const rightHudLabel = document.getElementById("rightHudLabel");
const rightControlsLine1 = document.getElementById("rightControlsLine1");
const rightControlsLine2 = document.getElementById("rightControlsLine2");
const rightControlsLine3 = document.getElementById("rightControlsLine3");
const rightControlsLine4 = document.getElementById("rightControlsLine4");

const spriteSheet = new Image();
spriteSheet.src = "./Gemini_Generated_Image_wlocajwlocajwloc.png";

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  floorY: 530,
  gravity: 0.65,
  airFriction: 0.995,
  wallBounce: 0.78,
  ballBounce: 0.86,
  postBounce: 0.9,
  matchLength: 90,
};

const GOAL = {
  width: 120,
  height: 135,
  topY: WORLD.floorY - 135,
  leftX: 42,
  rightX: WORLD.width - 42 - 120,
};

const CHARACTER_DEFS = [
  {
    id: "netanyahu",
    name: "Big Yahu",
    jersey: "#356ca7",
    accent: "#17304b",
    preview: { x: 40, y: 120, w: 395, h: 710 },
    head: { x: 60, y: 160, w: 360, h: 620 },
    feet: { x: 95, y: 880, w: 295, h: 180 },
  },
  {
    id: "bennett",
    name: "נפתול תעלול",
    jersey: "#4689d4",
    accent: "#1c3d65",
    preview: { x: 500, y: 120, w: 400, h: 710 },
    head: { x: 515, y: 160, w: 375, h: 620 },
    feet: { x: 555, y: 880, w: 290, h: 180 },
  },
  {
    id: "lapid",
    name: "הלפיד הלילי",
    jersey: "#707b8d",
    accent: "#303a46",
    preview: { x: 970, y: 110, w: 400, h: 720 },
    head: { x: 985, y: 155, w: 375, h: 625 },
    feet: { x: 1025, y: 880, w: 300, h: 180 },
  },
  {
    id: "eisenkot",
    name: "אייזי",
    jersey: "#90945d",
    accent: "#4f5431",
    preview: { x: 1440, y: 120, w: 395, h: 710 },
    head: { x: 1460, y: 160, w: 365, h: 620 },
    feet: { x: 1495, y: 880, w: 295, h: 180 },
  },
  {
    id: "ben-gvir",
    name: "כהנא",
    jersey: "#4d87d7",
    accent: "#183257",
    preview: { x: 1910, y: 115, w: 395, h: 715 },
    head: { x: 1935, y: 160, w: 360, h: 620 },
    feet: { x: 1975, y: 880, w: 295, h: 180 },
  },
  {
    id: "abbas",
    name: "מנסורי",
    jersey: "#9b7859",
    accent: "#583f2b",
    preview: { x: 2380, y: 120, w: 390, h: 710 },
    head: { x: 2395, y: 165, w: 370, h: 615 },
    feet: { x: 2435, y: 880, w: 295, h: 180 },
  },
];

const keys = {};

let animationFrame = null;
let lastTimestamp = 0;
let countdownAccumulator = 0;
let running = false;
let matchOver = false;
let roundFreeze = 0;
let audioContext = null;

const particles = [];

const state = {
  leftScore: 0,
  rightScore: 0,
  timeLeft: WORLD.matchLength,
  gameMode: "single",
  selections: {
    left: CHARACTER_DEFS[0],
    right: CHARACTER_DEFS[4],
  },
};

function makePlayer(side) {
  const isLeft = side === "left";
  return {
    side,
    x: isLeft ? 250 : 850,
    y: WORLD.floorY,
    vx: 0,
    vy: 0,
    radius: 44,
    headRadius: 38,
    moveSpeed: 0.75,
    jumpForce: -13.6,
    kickForceX: isLeft ? 12 : -12,
    kickForceY: -8,
    kickReach: 34,
    kickCooldown: 0,
    isKicking: false,
    character: isLeft ? state.selections.left : state.selections.right,
    controls: isLeft
      ? { left: "a", right: "d", up: "w", kick: "s" }
      : { left: "arrowleft", right: "arrowright", up: "arrowup", kick: "arrowdown" },
  };
}

const player1 = makePlayer("left");
const player2 = makePlayer("right");

const ball = {
  x: WORLD.width / 2,
  y: 210,
  vx: 0,
  vy: 0,
  radius: 24,
  spin: 0,
};

function ensureAudio() {
  if (!audioContext) {
    audioContext = new window.AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(frequency, duration, type, volume, ramp = "exponential") {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (ramp === "linear") {
    oscillator.frequency.linearRampToValueAtTime(Math.max(60, frequency * 0.45), now + duration);
  } else {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.55), now + duration);
  }
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playKickSound() {
  ensureAudio();
  playTone(520, 0.08, "square", 0.06, "linear");
}

function playBounceSound() {
  ensureAudio();
  playTone(180, 0.05, "triangle", 0.025, "linear");
}

function playGoalSound() {
  ensureAudio();
  playTone(420, 0.18, "sawtooth", 0.05);
  playTone(760, 0.28, "square", 0.035);
}

function playWinSound() {
  ensureAudio();
  playTone(330, 0.15, "triangle", 0.04);
  playTone(495, 0.22, "triangle", 0.04);
  playTone(660, 0.3, "triangle", 0.04);
}

function spawnBurst(x, y, color, count, power) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * (power * (0.55 + Math.random())),
      vy: Math.sin(angle) * (power * (0.55 + Math.random())) - 2,
      life: 28 + Math.random() * 18,
      maxLife: 44,
      color,
      size: 4 + Math.random() * 6,
    });
  }
}

function resetPositions() {
  Object.assign(player1, {
    x: 250,
    y: WORLD.floorY,
    vx: 0,
    vy: 0,
    kickCooldown: 0,
    isKicking: false,
  });

  Object.assign(player2, {
    x: 850,
    y: WORLD.floorY,
    vx: 0,
    vy: 0,
    kickCooldown: 0,
    isKicking: false,
  });

  Object.assign(ball, {
    x: WORLD.width / 2,
    y: 190,
    vx: (Math.random() - 0.5) * 4,
    vy: -1.5,
    spin: 0,
  });
}

function setStatus(text) {
  statusText.textContent = text;
}

function syncHud() {
  leftScoreEl.textContent = state.leftScore;
  rightScoreEl.textContent = state.rightScore;
  timerEl.textContent = String(state.timeLeft);
  leftHudLabel.textContent = state.selections.left.name;
  rightHudLabel.textContent = state.gameMode === "single" ? `${state.selections.right.name} AI` : state.selections.right.name;
}

function updateControlHints() {
  if (state.gameMode === "single") {
    rightControlsLine1.textContent = "המחשב זז לבד";
    rightControlsLine2.textContent = "רודף אחרי הכדור";
    rightControlsLine3.textContent = "קופץ לבלוקים";
    rightControlsLine4.textContent = "בועט כשצריך";
  } else {
    rightControlsLine1.innerHTML = "<kbd>←</kbd> שמאלה";
    rightControlsLine2.innerHTML = "<kbd>→</kbd> ימינה";
    rightControlsLine3.innerHTML = "<kbd>↑</kbd> קפיצה";
    rightControlsLine4.innerHTML = "<kbd>↓</kbd> בעיטה";
  }
}

function applySelectionsToPlayers() {
  player1.character = state.selections.left;
  player2.character = state.selections.right;
}

function resetMatch() {
  state.leftScore = 0;
  state.rightScore = 0;
  state.timeLeft = WORLD.matchLength;
  matchOver = false;
  roundFreeze = 0;
  countdownAccumulator = 0;
  particles.length = 0;
  applySelectionsToPlayers();
  resetPositions();
  syncHud();
  updateControlHints();
  setStatus("בחר דמויות ומצב משחק, ואז פתח את הזירה.");
}

function startGame() {
  ensureAudio();

  if (running) {
    return;
  }

  if (matchOver) {
    state.leftScore = 0;
    state.rightScore = 0;
    state.timeLeft = WORLD.matchLength;
    matchOver = false;
    particles.length = 0;
    resetPositions();
  }

  applySelectionsToPlayers();
  syncHud();
  updateControlHints();
  running = true;
  lastTimestamp = 0;
  setStatus(state.gameMode === "single" ? "שחקן נגד מחשב התחיל. תן לו בראש." : "הדו-קרב התחיל. יאללה גולים!");
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  animationFrame = requestAnimationFrame(loop);
}

function stopGame() {
  running = false;
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

function endMatch() {
  running = false;
  matchOver = true;
  spawnBurst(WORLD.width / 2, 150, "#ffd166", 22, 7);
  playWinSound();

  if (state.leftScore === state.rightScore) {
    setStatus("נגמר הזמן. תיקו מטורף!");
  } else if (state.leftScore > state.rightScore) {
    setStatus(`${state.selections.left.name} ניצח את הזירה!`);
  } else {
    setStatus(`${state.selections.right.name} ניצח את הזירה!`);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setGameMode(mode) {
  state.gameMode = mode;
  singlePlayerButton.classList.toggle("is-active", mode === "single");
  twoPlayerButton.classList.toggle("is-active", mode === "two");
  syncHud();
  updateControlHints();
  renderCharacterGrids();
  render();
}

function updatePickedNames() {
  leftCharacterName.textContent = state.selections.left.name;
  rightCharacterName.textContent = state.selections.right.name;
}

function selectCharacter(side, id) {
  const character = CHARACTER_DEFS.find((entry) => entry.id === id);
  if (!character) {
    return;
  }

  state.selections[side] = character;
  applySelectionsToPlayers();
  updatePickedNames();
  renderCharacterGrids();
  syncHud();
  render();
}

function buildCharacterCard(character, side) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "character-card";
  button.dataset.side = side;
  button.dataset.characterId = character.id;

  const avatar = document.createElement("div");
  avatar.className = "character-avatar";
  avatar.style.backgroundPosition = `${character.preview.xPercent}% ${character.preview.yPercent}%`;

  const title = document.createElement("strong");
  title.textContent = character.name;

  const subtitle = document.createElement("span");
  subtitle.textContent =
    side === "left"
      ? "לשחקן 1"
      : state.gameMode === "single"
        ? "למחשב"
        : "לשחקן 2";

  button.append(avatar, title, subtitle);
  button.addEventListener("click", () => {
    selectCharacter(side, character.id);
  });

  return button;
}

function renderCharacterGrids() {
  leftGrid.innerHTML = "";
  rightGrid.innerHTML = "";

  for (const character of CHARACTER_DEFS) {
    const leftCard = buildCharacterCard(character, "left");
    if (state.selections.left.id === character.id) {
      leftCard.classList.add("is-selected");
    }
    leftGrid.appendChild(leftCard);

    const rightCard = buildCharacterCard(character, "right");
    if (state.selections.right.id === character.id) {
      rightCard.classList.add("is-selected");
    }
    rightGrid.appendChild(rightCard);
  }

  updatePickedNames();
}

function applyHumanInput(player) {
  const { left, right, up, kick } = player.controls;

  if (keys[left]) {
    player.vx -= player.moveSpeed;
  }

  if (keys[right]) {
    player.vx += player.moveSpeed;
  }

  if (keys[up] && Math.abs(player.y - WORLD.floorY) < 0.5) {
    player.vy = player.jumpForce;
  }

  if (keys[kick] && player.kickCooldown <= 0) {
    player.kickCooldown = 24;
    player.isKicking = true;
    playKickSound();
  }
}

function applyAiInput(player) {
  const defendX = 820;
  const targetX = ball.x > WORLD.width / 2 ? ball.x : defendX;
  const distanceX = targetX - player.x;

  if (distanceX > 14) {
    player.vx += player.moveSpeed * 0.92;
  } else if (distanceX < -14) {
    player.vx -= player.moveSpeed * 0.92;
  }

  const shouldJumpForBall =
    ball.x > WORLD.width / 2 - 40 &&
    Math.abs(ball.x - player.x) < 110 &&
    ball.y < player.y - 45 &&
    Math.abs(player.y - WORLD.floorY) < 0.5;

  const emergencyJump =
    ball.x > WORLD.width - 220 &&
    ball.y < GOAL.topY + 40 &&
    Math.abs(player.y - WORLD.floorY) < 0.5;

  if (shouldJumpForBall || emergencyJump) {
    player.vy = player.jumpForce;
  }

  const closeEnoughToKick =
    Math.abs(ball.x - player.x) < 92 &&
    Math.abs(ball.y - (player.y - 34)) < 80 &&
    player.kickCooldown <= 0;

  const attackNearGoal =
    ball.x > WORLD.width / 2 &&
    ball.x < WORLD.width - 120 &&
    Math.abs(ball.x - player.x) < 120 &&
    player.kickCooldown <= 0;

  if (closeEnoughToKick || attackNearGoal) {
    player.kickCooldown = 24;
    player.isKicking = true;
    playKickSound();
  }
}

function updatePlayer(player, controlMode) {
  if (controlMode === "human") {
    applyHumanInput(player);
  } else {
    applyAiInput(player);
  }

  player.vy += WORLD.gravity;
  player.vx *= 0.92;
  player.x += player.vx;
  player.y += player.vy;

  const minX = player.radius;
  const maxX = WORLD.width - player.radius;
  player.x = clamp(player.x, minX, maxX);

  if (player.y > WORLD.floorY) {
    player.y = WORLD.floorY;
    player.vy = 0;
  }

  if (player.kickCooldown > 0) {
    player.kickCooldown -= 1;
  }

  if (player.kickCooldown < 12) {
    player.isKicking = false;
  }
}

function separatePlayers(a, b) {
  const dx = b.x - a.x;
  const dy = (b.y - b.radius) - (a.y - a.radius);
  const distance = Math.hypot(dx, dy);
  const minDistance = a.radius + b.radius - 4;

  if (distance === 0 || distance >= minDistance) {
    return;
  }

  const overlap = (minDistance - distance) / 2;
  const nx = dx / distance;
  const ny = dy / distance;

  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;

  a.vx -= nx * 0.4;
  b.vx += nx * 0.4;
  playBounceSound();
}

function resolveBallCollisionWithCircle(cx, cy, radius, impulseX = 0, impulseY = 0) {
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const distance = Math.hypot(dx, dy);
  const minDistance = ball.radius + radius;

  if (distance === 0 || distance >= minDistance) {
    return false;
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minDistance - distance;

  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const relativeVelocity = ball.vx * nx + ball.vy * ny;
  ball.vx -= 2 * relativeVelocity * nx;
  ball.vy -= 2 * relativeVelocity * ny;

  ball.vx += impulseX;
  ball.vy += impulseY;
  ball.vx *= 0.98;
  ball.vy *= 0.98;
  ball.spin += impulseX * 0.03;
  spawnBurst(ball.x, ball.y, "#ffffff", 4, 2.2);
  playBounceSound();

  return true;
}

function updateBall() {
  ball.vy += WORLD.gravity;
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= WORLD.airFriction;
  ball.vy *= 0.998;
  ball.spin *= 0.99;

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx *= -WORLD.wallBounce;
    playBounceSound();
  }

  if (ball.x + ball.radius > WORLD.width) {
    ball.x = WORLD.width - ball.radius;
    ball.vx *= -WORLD.wallBounce;
    playBounceSound();
  }

  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy *= -WORLD.wallBounce;
    playBounceSound();
  }

  if (ball.y + ball.radius > WORLD.floorY) {
    ball.y = WORLD.floorY - ball.radius;
    ball.vy *= -WORLD.ballBounce;
    ball.vx *= 0.99;
  }

  const players = [player1, player2];
  for (const player of players) {
    resolveBallCollisionWithCircle(player.x, player.y - player.radius + 10, player.headRadius, player.vx * 0.1, player.vy * 0.03);

    if (player.isKicking) {
      const kickOffset = player.side === "left" ? player.radius + 16 : -player.radius - 16;
      const footX = player.x + kickOffset;
      const footY = player.y - 16;
      resolveBallCollisionWithCircle(footX, footY, player.kickReach, player.kickForceX, player.kickForceY);
    }
  }

  collideBallWithPosts();
  detectGoal();
}

function collideBallWithPosts() {
  const posts = [
    { x: GOAL.leftX + GOAL.width, y: GOAL.topY, r: 12 },
    { x: GOAL.rightX, y: GOAL.topY, r: 12 },
  ];

  for (const post of posts) {
    const hit = resolveBallCollisionWithCircle(post.x, post.y, post.r);
    if (hit) {
      ball.vx *= WORLD.postBounce;
      ball.vy *= WORLD.postBounce;
    }
  }

  if (
    ball.y - ball.radius < GOAL.topY + 12 &&
    ball.y > GOAL.topY - 24 &&
    ball.x > GOAL.leftX &&
    ball.x < GOAL.leftX + GOAL.width
  ) {
    ball.y = GOAL.topY + 12 + ball.radius;
    ball.vy = Math.abs(ball.vy) * 0.92;
  }

  if (
    ball.y - ball.radius < GOAL.topY + 12 &&
    ball.y > GOAL.topY - 24 &&
    ball.x > GOAL.rightX &&
    ball.x < GOAL.rightX + GOAL.width
  ) {
    ball.y = GOAL.topY + 12 + ball.radius;
    ball.vy = Math.abs(ball.vy) * 0.92;
  }
}

function detectGoal() {
  const ballInsideLeftGoal =
    ball.x - ball.radius <= GOAL.leftX + GOAL.width &&
    ball.y + ball.radius >= GOAL.topY &&
    ball.x > GOAL.leftX &&
    ball.y < WORLD.floorY;

  const ballInsideRightGoal =
    ball.x + ball.radius >= GOAL.rightX &&
    ball.y + ball.radius >= GOAL.topY &&
    ball.x < GOAL.rightX + GOAL.width &&
    ball.y < WORLD.floorY;

  if (!ballInsideLeftGoal && !ballInsideRightGoal) {
    return;
  }

  if (ballInsideLeftGoal) {
    state.rightScore += 1;
    setStatus(`גול ל-${state.selections.right.name}!`);
    spawnBurst(120, 250, "#7ae582", 26, 8);
  } else {
    state.leftScore += 1;
    setStatus(`גול ל-${state.selections.left.name}!`);
    spawnBurst(WORLD.width - 120, 250, "#5cc8ff", 26, 8);
  }

  playGoalSound();
  syncHud();
  roundFreeze = 80;
  resetPositions();
}

function updateMatchClock(deltaMs) {
  countdownAccumulator += deltaMs;
  while (countdownAccumulator >= 1000) {
    countdownAccumulator -= 1000;
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      syncHud();
      endMatch();
      return;
    }
    syncHud();
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.2;
    particle.vx *= 0.98;
    particle.life -= 1;
    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  sky.addColorStop(0, "#7ad7ff");
  sky.addColorStop(0.55, "#ccecff");
  sky.addColorStop(1, "#7fe08a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  drawCloud(170, 105, 1.1);
  drawCloud(730, 88, 0.9);
  drawCloud(930, 145, 0.7);

  ctx.fillStyle = "#4bb05f";
  ctx.fillRect(0, WORLD.floorY, WORLD.width, WORLD.height - WORLD.floorY);

  ctx.fillStyle = "#318f49";
  for (let i = 0; i < WORLD.width; i += 40) {
    ctx.fillRect(i, WORLD.floorY, 22, 18);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(WORLD.width / 2, WORLD.floorY);
  ctx.lineTo(WORLD.width / 2, WORLD.floorY - 120);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(WORLD.width / 2, WORLD.floorY, 80, Math.PI, 0);
  ctx.stroke();

  drawGoal(GOAL.leftX, false);
  drawGoal(GOAL.rightX, true);
}

function drawCloud(x, y, scale) {
  ctx.beginPath();
  ctx.arc(x, y, 26 * scale, 0, Math.PI * 2);
  ctx.arc(x + 26 * scale, y - 12 * scale, 22 * scale, 0, Math.PI * 2);
  ctx.arc(x + 54 * scale, y, 28 * scale, 0, Math.PI * 2);
  ctx.arc(x + 24 * scale, y + 12 * scale, 24 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawGoal(x, openRight) {
  ctx.strokeStyle = "#f4f8ff";
  ctx.lineWidth = 8;
  ctx.fillStyle = "rgba(255,255,255,0.2)";

  ctx.beginPath();
  ctx.rect(x, GOAL.topY, GOAL.width, GOAL.height);
  ctx.stroke();

  const netDepth = 26;
  ctx.beginPath();
  if (openRight) {
    ctx.moveTo(x, GOAL.topY);
    ctx.lineTo(x + netDepth, GOAL.topY + 20);
    ctx.lineTo(x + netDepth, WORLD.floorY);
    ctx.lineTo(x, WORLD.floorY);
  } else {
    ctx.moveTo(x + GOAL.width, GOAL.topY);
    ctx.lineTo(x + GOAL.width - netDepth, GOAL.topY + 20);
    ctx.lineTo(x + GOAL.width - netDepth, WORLD.floorY);
    ctx.lineTo(x + GOAL.width, WORLD.floorY);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i += 1) {
    const y = GOAL.topY + i * 22;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + GOAL.width, y);
    ctx.stroke();
  }
}

function drawSpriteCrop(crop, dx, dy, dw, dh) {
  if (!spriteSheet.complete) {
    return;
  }
  ctx.drawImage(spriteSheet, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh);
}

function drawPlayer(player) {
  const bodyColor = player.character.jersey;
  const accent = player.character.accent;
  const baseX = player.x;
  const baseY = player.y;
  const direction = player.side === "left" ? 1 : -1;

  ctx.save();
  ctx.translate(baseX, baseY);

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, -22, 38, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(0, -6, 26, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-20, 34);
  ctx.moveTo(14, 0);
  ctx.lineTo(20, 34);
  ctx.stroke();

  if (player.isKicking) {
    ctx.beginPath();
    ctx.moveTo(direction * 14, 0);
    ctx.lineTo(direction * 52, -12);
    ctx.stroke();
  }

  ctx.restore();

  drawSpriteCrop(player.character.head, baseX - 62, baseY - 148, 124, 148);

  const feetWidth = player.isKicking ? 94 : 78;
  const feetX = player.isKicking ? baseX - 44 + direction * 12 : baseX - 39;
  drawSpriteCrop(player.character.feet, feetX, baseY - 14, feetWidth, 46);

  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.ellipse(baseX, WORLD.floorY + 8, 40, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBall() {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.spin);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#202733";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 5; i += 1) {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * 10;
    const py = Math.sin(angle) * 10;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = `${particle.color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOverlay() {
  if (running) {
    return;
  }

  ctx.fillStyle = "rgba(5, 13, 20, 0.24)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 48px Rubik, sans-serif";
  ctx.fillText(matchOver ? "המשחק נגמר" : "HeadSoccer Arena", WORLD.width / 2, 145);

  ctx.font = "500 24px Rubik, sans-serif";
  const subtitle = matchOver
    ? "לחץ על התחל משחק כדי לפתוח משחק חדש"
    : state.gameMode === "single"
      ? "בחר דמויות וצלול לקרב מול המחשב"
      : "בחר דמויות ופתח דו-קרב מקומי";
  ctx.fillText(subtitle, WORLD.width / 2, 190);

  drawPlayerCardsPreview();
}

function drawPlayerCardsPreview() {
  const leftX = WORLD.width / 2 - 210;
  const rightX = WORLD.width / 2 + 70;
  drawPreviewCard(leftX, state.selections.left, "#5cc8ff", "שמאל");
  drawPreviewCard(rightX, state.selections.right, "#7ae582", state.gameMode === "single" ? "מחשב" : "ימין");
}

function drawPreviewCard(x, character, glowColor, label) {
  ctx.fillStyle = "rgba(10, 22, 36, 0.75)";
  ctx.fillRect(x, 240, 140, 190);
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, 240, 140, 190);
  drawSpriteCrop(character.head, x + 20, 258, 100, 118);
  drawSpriteCrop(character.feet, x + 26, 362, 88, 40);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 19px Rubik, sans-serif";
  ctx.fillText(character.name, x + 70, 418);
  ctx.font = "500 15px Rubik, sans-serif";
  ctx.fillText(label, x + 70, 444);
}

function render() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  drawBackground();
  drawPlayer(player1);
  drawPlayer(player2);
  drawBall();
  drawParticles();
  drawOverlay();
}

function update(deltaMs) {
  updateParticles();

  if (!running || matchOver) {
    return;
  }

  updateMatchClock(deltaMs);
  if (!running) {
    return;
  }

  if (roundFreeze > 0) {
    roundFreeze -= 1;
    return;
  }

  updatePlayer(player1, "human");
  updatePlayer(player2, state.gameMode === "single" ? "ai" : "human");
  separatePlayers(player1, player2);
  updateBall();
}

function loop(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const deltaMs = Math.min(32, timestamp - lastTimestamp);
  lastTimestamp = timestamp;

  update(deltaMs);
  render();

  if (running) {
    animationFrame = requestAnimationFrame(loop);
  } else {
    animationFrame = null;
  }
}

function prepareCharacterAtlasUi() {
  for (const character of CHARACTER_DEFS) {
    character.preview.xPercent = (character.preview.x / (2816 - character.preview.w)) * 100;
    character.preview.yPercent = (character.preview.y / (1536 - character.preview.h)) * 100;
  }
  renderCharacterGrids();
}

window.addEventListener("keydown", (event) => {
  keys[event.key.toLowerCase()] = true;
  const blocked = ["arrowup", "arrowdown", "arrowleft", "arrowright", " "];
  if (blocked.includes(event.key.toLowerCase())) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

singlePlayerButton.addEventListener("click", () => {
  setGameMode("single");
});

twoPlayerButton.addEventListener("click", () => {
  setGameMode("two");
});

startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", () => {
  stopGame();
  resetMatch();
  render();
});

spriteSheet.addEventListener("load", () => {
  prepareCharacterAtlasUi();
  render();
});

resetMatch();
prepareCharacterAtlasUi();
if (spriteSheet.complete) {
  render();
}
render();
