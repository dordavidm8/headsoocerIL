const appShell = document.getElementById("appShell");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const continueButton = document.getElementById("continueButton");
const beginMatchButton = document.getElementById("beginMatchButton");
const backToLandingButton = document.getElementById("backToLandingButton");
const backToSelectionButton = document.getElementById("backToSelectionButton");
const resetButton = document.getElementById("resetButton");
const singlePlayerButton = document.getElementById("singlePlayerButton");
const twoPlayerButton = document.getElementById("twoPlayerButton");

const landingScreen = document.getElementById("landingScreen");
const selectScreen = document.getElementById("selectScreen");
const gameSideScreen = document.getElementById("gameSideScreen");
const arenaPanel = document.getElementById("arenaPanel");

const leftScoreEl = document.getElementById("leftScore");
const rightScoreEl = document.getElementById("rightScore");
const timerEl = document.getElementById("matchTimer");
const selectStatusText = document.getElementById("selectStatusText");
const gameStatusText = document.getElementById("gameStatusText");
const leftGrid = document.getElementById("leftCharacterGrid");
const rightGrid = document.getElementById("rightCharacterGrid");
const leftCharacterName = document.getElementById("leftCharacterName");
const rightCharacterName = document.getElementById("rightCharacterName");
const leftHudLabel = document.getElementById("leftHudLabel");
const rightHudLabel = document.getElementById("rightHudLabel");
const leftControlsLine1 = document.getElementById("leftControlsLine1");
const leftControlsLine2 = document.getElementById("leftControlsLine2");
const leftControlsLine3 = document.getElementById("leftControlsLine3");
const leftControlsLine4 = document.getElementById("leftControlsLine4");
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
  ballGravity: 0.95,
  airFriction: 0.992,
  wallBounce: 0.76,
  ballBounce: 0.84,
  postBounce: 0.88,
  matchLength: 90,
};

const GOAL = {
  width: 172,
  height: 172,
  topY: WORLD.floorY - 172,
  leftX: 24,
  rightX: WORLD.width - 24 - 172,
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
const particles = [];
const cleanedCropCache = new Map();

let animationFrame = null;
let lastTimestamp = 0;
let countdownAccumulator = 0;
let running = false;
let matchOver = false;
let roundFreeze = 0;
let audioContext = null;

const state = {
  screen: "landing",
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
    headRadius: 28,
    moveSpeed: 0.75,
    jumpForce: -13.6,
    kickForceX: isLeft ? 12 : -12,
    kickForceY: -8,
    kickReach: 34,
    kickCooldown: 0,
    isKicking: false,
    kickLift: 0,
    character: isLeft ? state.selections.left : state.selections.right,
    controls: isLeft
      ? { left: "arrowleft", right: "arrowright", up: "arrowup", kick: "shift" }
      : { left: "j", right: "l", up: "i", kick: "k" },
  };
}

const player1 = makePlayer("left");
const player2 = makePlayer("right");

const ball = {
  x: WORLD.width / 2,
  y: 210,
  vx: 0,
  vy: 0,
  radius: 22,
  spin: 0,
};

function setScreen(screen) {
  state.screen = screen;
  landingScreen.classList.toggle("is-hidden", screen !== "landing");
  selectScreen.classList.toggle("is-hidden", screen !== "select");
  gameSideScreen.classList.toggle("is-hidden", screen !== "game");
  arenaPanel.classList.toggle("is-hidden", screen !== "game");
  appShell.classList.toggle("game-layout", screen === "game");
  render();
}

function setStatus(text) {
  selectStatusText.textContent = text;
  gameStatusText.textContent = text;
}

function syncHud() {
  leftScoreEl.textContent = state.leftScore;
  rightScoreEl.textContent = state.rightScore;
  timerEl.textContent = String(state.timeLeft);
  leftHudLabel.textContent = state.selections.left.name;
  rightHudLabel.textContent =
    state.gameMode === "single" ? `${state.selections.right.name} AI` : state.selections.right.name;
}

function updateControlHints() {
  if (state.gameMode === "single") {
    leftControlsLine1.innerHTML = "<kbd>←</kbd> שמאלה";
    leftControlsLine2.innerHTML = "<kbd>→</kbd> ימינה";
    leftControlsLine3.innerHTML = "<kbd>↑</kbd> קפיצה";
    leftControlsLine4.innerHTML = "<kbd>Shift</kbd> בעיטה";
    rightControlsLine1.textContent = "המחשב זז לבד";
    rightControlsLine2.textContent = "רודף אחרי הכדור";
    rightControlsLine3.textContent = "קופץ לבלוקים";
    rightControlsLine4.textContent = "בועט כשצריך";
  } else {
    leftControlsLine1.innerHTML = "<kbd>A</kbd> שמאלה";
    leftControlsLine2.innerHTML = "<kbd>D</kbd> ימינה";
    leftControlsLine3.innerHTML = "<kbd>W</kbd> קפיצה";
    leftControlsLine4.innerHTML = "<kbd>F</kbd> בעיטה";
    rightControlsLine1.innerHTML = "<kbd>J</kbd> שמאלה";
    rightControlsLine2.innerHTML = "<kbd>L</kbd> ימינה";
    rightControlsLine3.innerHTML = "<kbd>I</kbd> קפיצה";
    rightControlsLine4.innerHTML = "<kbd>K</kbd> בעיטה";
  }
}

function applySelectionsToPlayers() {
  player1.character = state.selections.left;
  player2.character = state.selections.right;
  player1.controls =
    state.gameMode === "single"
      ? { left: "arrowleft", right: "arrowright", up: "arrowup", kick: "shift" }
      : { left: "a", right: "d", up: "w", kick: "f" };
  player2.controls = { left: "j", right: "l", up: "i", kick: "k" };
}

function resetPositions() {
  Object.assign(player1, {
    x: 250,
    y: WORLD.floorY,
    vx: 0,
    vy: 0,
    kickCooldown: 0,
    isKicking: false,
    kickLift: 0,
  });
  Object.assign(player2, {
    x: 850,
    y: WORLD.floorY,
    vx: 0,
    vy: 0,
    kickCooldown: 0,
    isKicking: false,
    kickLift: 0,
  });
  Object.assign(ball, {
    x: WORLD.width / 2,
    y: 190,
    vx: (Math.random() - 0.5) * 4,
    vy: -1.5,
    spin: 0,
  });
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

function ensureAudio() {
  if (!audioContext) {
    audioContext = new window.AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(frequency, duration, type, volume) {
  if (!audioContext) {
    return;
  }
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.55), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playKickSound() {
  ensureAudio();
  playTone(520, 0.08, "square", 0.06);
}

function playBounceSound() {
  ensureAudio();
  playTone(180, 0.05, "triangle", 0.025);
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

function startGame() {
  ensureAudio();
  resetMatch();
  running = true;
  lastTimestamp = 0;
  setScreen("game");
  setStatus(state.gameMode === "single" ? "הקרב מול המחשב התחיל." : "הדו-קרב המקומי התחיל.");
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

function selectCharacter(side, id) {
  const character = CHARACTER_DEFS.find((entry) => entry.id === id);
  if (!character) {
    return;
  }
  state.selections[side] = character;
  applySelectionsToPlayers();
  renderCharacterGrids();
  syncHud();
  render();
}

function createPreviewCanvas(crop) {
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = 120;
  previewCanvas.height = 120;
  previewCanvas.className = "character-avatar";
  const previewCtx = previewCanvas.getContext("2d");
  if (spriteSheet.complete) {
    const { dx, dy, dw, dh } = getContainRect(crop.w, crop.h, 120, 120);
    previewCtx.drawImage(getTransparentCrop(crop), 0, 0, crop.w, crop.h, dx, dy, dw, dh);
  }
  return previewCanvas;
}

function buildCharacterCard(character, side) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "character-card";
  const avatar = createPreviewCanvas(character.preview);
  const title = document.createElement("strong");
  title.textContent = character.name;
  const subtitle = document.createElement("span");
  subtitle.textContent =
    side === "left" ? "לשחקן 1" : state.gameMode === "single" ? "למחשב" : "לשחקן 2";
  button.append(avatar, title, subtitle);
  button.addEventListener("click", () => selectCharacter(side, character.id));
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
  leftCharacterName.textContent = state.selections.left.name;
  rightCharacterName.textContent = state.selections.right.name;
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

  const shouldJump =
    ball.x > WORLD.width / 2 - 40 &&
    Math.abs(ball.x - player.x) < 110 &&
    ball.y < player.y - 45 &&
    Math.abs(player.y - WORLD.floorY) < 0.5;
  if (shouldJump) {
    player.vy = player.jumpForce;
  }

  const closeEnoughToKick =
    Math.abs(ball.x - player.x) < 92 &&
    Math.abs(ball.y - (player.y - 34)) < 80 &&
    player.kickCooldown <= 0;
  if (closeEnoughToKick) {
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
  player.x = clamp(player.x, player.radius, WORLD.width - player.radius);
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
  const targetKickLift = player.isKicking ? 1 : 0;
  player.kickLift += (targetKickLift - player.kickLift) * 0.35;
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
  ball.spin += impulseX * 0.04;
  spawnBurst(ball.x, ball.y, "#ffffff", 4, 2.2);
  playBounceSound();
  return true;
}

function updateBall() {
  ball.vy += WORLD.ballGravity;
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= WORLD.airFriction;
  ball.vy *= 0.998;
  ball.spin += ball.vx * 0.003;

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

  for (const player of [player1, player2]) {
    resolveBallCollisionWithCircle(
      player.x,
      player.y - player.radius - 6,
      player.headRadius,
      player.vx * 0.1,
      player.vy * 0.03,
    );
    if (player.isKicking) {
      const kickOffset = player.side === "left" ? player.radius + 18 : -player.radius - 18;
      const footX = player.x + kickOffset;
      const footY = player.y - 42 - player.kickLift * 24;
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

  const underLeftCrossbar =
    ball.x > GOAL.leftX &&
    ball.x < GOAL.leftX + GOAL.width &&
    ball.y - ball.radius < GOAL.topY + 10 &&
    ball.y > GOAL.topY - 30;
  if (underLeftCrossbar) {
    ball.y = GOAL.topY + 10 + ball.radius;
    ball.vy = Math.abs(ball.vy) * 0.92;
  }

  const underRightCrossbar =
    ball.x > GOAL.rightX &&
    ball.x < GOAL.rightX + GOAL.width &&
    ball.y - ball.radius < GOAL.topY + 10 &&
    ball.y > GOAL.topY - 30;
  if (underRightCrossbar) {
    ball.y = GOAL.topY + 10 + ball.radius;
    ball.vy = Math.abs(ball.vy) * 0.92;
  }
}

function detectGoal() {
  const fullyInsideLeftGoal =
    ball.x - ball.radius >= GOAL.leftX &&
    ball.x + ball.radius <= GOAL.leftX + GOAL.width &&
    ball.y - ball.radius >= GOAL.topY &&
    ball.y + ball.radius <= WORLD.floorY;

  const fullyInsideRightGoal =
    ball.x - ball.radius >= GOAL.rightX &&
    ball.x + ball.radius <= GOAL.rightX + GOAL.width &&
    ball.y - ball.radius >= GOAL.topY &&
    ball.y + ball.radius <= WORLD.floorY;

  if (!fullyInsideLeftGoal && !fullyInsideRightGoal) {
    return;
  }

  if (fullyInsideLeftGoal) {
    state.rightScore += 1;
    setStatus(`גול ל-${state.selections.right.name}!`);
    spawnBurst(GOAL.leftX + GOAL.width / 2, GOAL.topY + 70, "#7ae582", 26, 8);
  } else {
    state.leftScore += 1;
    setStatus(`גול ל-${state.selections.left.name}!`);
    spawnBurst(GOAL.rightX + GOAL.width / 2, GOAL.topY + 70, "#5cc8ff", 26, 8);
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
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.rect(x, GOAL.topY, GOAL.width, GOAL.height);
  ctx.stroke();

  const netDepth = 36;
  ctx.beginPath();
  if (openRight) {
    ctx.moveTo(x, GOAL.topY);
    ctx.lineTo(x + netDepth, GOAL.topY + 24);
    ctx.lineTo(x + netDepth, WORLD.floorY);
    ctx.lineTo(x, WORLD.floorY);
  } else {
    ctx.moveTo(x + GOAL.width, GOAL.topY);
    ctx.lineTo(x + GOAL.width - netDepth, GOAL.topY + 24);
    ctx.lineTo(x + GOAL.width - netDepth, WORLD.floorY);
    ctx.lineTo(x + GOAL.width, WORLD.floorY);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 7; i += 1) {
    const y = GOAL.topY + i * 24;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + GOAL.width, y);
    ctx.stroke();
  }
}

function isCheckerPixel(r, g, b, a) {
  if (a === 0) {
    return false;
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const neutral = max - min < 18;
  const brightness = (r + g + b) / 3;
  return neutral && brightness > 105 && brightness < 245;
}

function getTransparentCrop(crop) {
  const key = `${crop.x}:${crop.y}:${crop.w}:${crop.h}`;
  if (cleanedCropCache.has(key)) {
    return cleanedCropCache.get(key);
  }
  const offscreen = document.createElement("canvas");
  offscreen.width = crop.w;
  offscreen.height = crop.h;
  const offCtx = offscreen.getContext("2d");
  offCtx.drawImage(spriteSheet, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  const imageData = offCtx.getImageData(0, 0, crop.w, crop.h);
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = [];

  function maybeQueue(x, y) {
    const idx = y * width + x;
    if (visited[idx]) {
      return;
    }
    const offset = idx * 4;
    if (isCheckerPixel(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])) {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  for (let x = 0; x < width; x += 1) {
    maybeQueue(x, 0);
    maybeQueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    maybeQueue(0, y);
    maybeQueue(width - 1, y);
  }

  while (queue.length > 0) {
    const idx = queue.pop();
    const px = idx % width;
    const py = Math.floor(idx / width);
    data[idx * 4 + 3] = 0;
    if (px > 0) {
      maybeQueue(px - 1, py);
    }
    if (px < width - 1) {
      maybeQueue(px + 1, py);
    }
    if (py > 0) {
      maybeQueue(px, py - 1);
    }
    if (py < height - 1) {
      maybeQueue(px, py + 1);
    }
  }

  offCtx.putImageData(imageData, 0, 0);
  cleanedCropCache.set(key, offscreen);
  return offscreen;
}

function getContainRect(srcW, srcH, boxW, boxH) {
  const scale = Math.min(boxW / srcW, boxH / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  return {
    dx: (boxW - dw) / 2,
    dy: (boxH - dh) / 2,
    dw,
    dh,
  };
}

function drawContainedCrop(crop, x, y, maxW, maxH) {
  if (!spriteSheet.complete) {
    return;
  }
  const { dx, dy, dw, dh } = getContainRect(crop.w, crop.h, maxW, maxH);
  ctx.drawImage(getTransparentCrop(crop), 0, 0, crop.w, crop.h, x + dx, y + dy, dw, dh);
}

function drawPlayer(player) {
  const bodyColor = player.character.jersey;
  const accent = player.character.accent;
  const direction = player.side === "left" ? 1 : -1;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, -18, 34, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(0, -5, 24, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-20, 34);
  ctx.moveTo(14, 0);
  if (player.isKicking) {
    ctx.lineTo(direction * 34, -18 - player.kickLift * 18);
  } else {
    ctx.lineTo(20, 34);
  }
  ctx.stroke();
  if (player.isKicking) {
    ctx.beginPath();
    ctx.moveTo(direction * 30, -18 - player.kickLift * 18);
    ctx.lineTo(direction * 60, -18 - player.kickLift * 28);
    ctx.stroke();
  }
  ctx.restore();

  drawContainedCrop(player.character.head, player.x - 58, player.y - 145, 116, 126);

  if (player.isKicking) {
    ctx.save();
    ctx.translate(player.x + direction * 38, player.y - 38);
    ctx.rotate(direction * -0.5);
    drawContainedCrop(player.character.feet, -28, -12, 72, 38);
    ctx.restore();
  } else {
    drawContainedCrop(player.character.feet, player.x - 42, player.y - 16, 84, 48);
  }

  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(player.x, WORLD.floorY + 8, 40, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBall() {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.spin);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "40px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
  ctx.fillText("⚽", 0, 2);
  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = `${particle.color}${Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOverlay() {
  if (state.screen !== "game" || running) {
    return;
  }
  ctx.fillStyle = "rgba(5, 13, 20, 0.24)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 46px Rubik, sans-serif";
  ctx.fillText(matchOver ? "המשחק נגמר" : "Knesset Cup", WORLD.width / 2, 150);
  ctx.font = "500 24px Rubik, sans-serif";
  ctx.fillText(matchOver ? "חזור לבחירה או אפס משחק" : "לחץ התחל משחק כדי לפתוח סיבוב", WORLD.width / 2, 192);
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

window.addEventListener("keydown", (event) => {
  keys[event.key.toLowerCase()] = true;
  const blocked = ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "shift"];
  if (blocked.includes(event.key.toLowerCase())) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

continueButton.addEventListener("click", () => {
  setScreen("select");
});

backToLandingButton.addEventListener("click", () => {
  stopGame();
  setScreen("landing");
});

singlePlayerButton.addEventListener("click", () => {
  state.gameMode = "single";
  singlePlayerButton.classList.add("is-active");
  twoPlayerButton.classList.remove("is-active");
  applySelectionsToPlayers();
  updateControlHints();
  renderCharacterGrids();
  syncHud();
});

twoPlayerButton.addEventListener("click", () => {
  state.gameMode = "two";
  singlePlayerButton.classList.remove("is-active");
  twoPlayerButton.classList.add("is-active");
  applySelectionsToPlayers();
  updateControlHints();
  renderCharacterGrids();
  syncHud();
});

beginMatchButton.addEventListener("click", () => {
  startGame();
});

backToSelectionButton.addEventListener("click", () => {
  stopGame();
  resetMatch();
  setScreen("select");
});

resetButton.addEventListener("click", () => {
  stopGame();
  resetMatch();
  running = true;
  lastTimestamp = 0;
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  animationFrame = requestAnimationFrame(loop);
});

spriteSheet.addEventListener("load", () => {
  renderCharacterGrids();
  render();
});

resetMatch();
applySelectionsToPlayers();
updateControlHints();
setScreen("landing");
if (spriteSheet.complete) {
  renderCharacterGrids();
}
render();
