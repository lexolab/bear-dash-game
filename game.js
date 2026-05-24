const gameArea = document.getElementById('gameArea');
const dino = document.getElementById('dino');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const heroBestEl = document.getElementById('heroBest');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restartBtn');
const startHeroBtn = document.getElementById('startHero');

const groundOffset = 61;
const gravity = 0.82;
const jumpForce = 18.2;
const obstacleWidth = 40;
const obstacleHeight = 64;
const birdWidth = 48;
const birdHeight = 28;
const birdHeightOffset = 78;

let animationId = null;
let gameRunning = false;
let gameStarted = false;
let score = 0;
let bestScore = Number(localStorage.getItem('dinoDashBest') || 0);
let lastTimestamp = 0;
let spawnTimer = 0;
let speed = 7;
let verticalVelocity = 0;
let dinoY = 0;
let obstacles = [];
let colorsInverted = false;
let audioContext = null;
let audioUnlocked = false;

function formatScore(value) {
  return String(Math.floor(value)).padStart(5, '0');
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }
  return audioContext;
}

function unlockAudio() {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  if (!audioUnlocked) {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    audioUnlocked = true;
  }
}

function playJumpSound() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  unlockAudio();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(520, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.09);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.14);
}

function playCrashSound() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  unlockAudio();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(280, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.22);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.24);
}

function setInvertedColors(enabled) {
  colorsInverted = enabled;
  document.body.classList.toggle('inverted', enabled);
}

function syncBestScore() {
  bestScoreEl.textContent = formatScore(bestScore);
  heroBestEl.textContent = formatScore(bestScore);
}

function resetGameState() {
  obstacles.forEach((item) => item.el.remove());
  obstacles = [];
  score = 0;
  speed = 7;
  spawnTimer = 0;
  verticalVelocity = 0;
  dinoY = 0;
  lastTimestamp = 0;
  setInvertedColors(false);
  scoreEl.textContent = formatScore(score);
  dino.style.bottom = `${groundOffset}px`;
  dino.classList.add('running');
}

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.style.display = 'block';
}

function hideMessage() {
  messageEl.style.display = 'none';
}

function startGame() {
  if (gameRunning) return;
  gameStarted = true;
  gameRunning = true;
  resetGameState();
  hideMessage();
  animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  dino.classList.remove('running');
  playCrashSound();
  cancelAnimationFrame(animationId);
  if (score > bestScore) {
    bestScore = Math.floor(score);
    localStorage.setItem('dinoDashBest', String(bestScore));
    syncBestScore();
  }
  showMessage(`Game over — score ${formatScore(score)}. Press restart or space.`);
}

function jump() {
  if (!gameStarted) {
    startGame();
  }
  if (!gameRunning) {
    startGame();
    return;
  }
  if (dinoY > 0) return;
  verticalVelocity = jumpForce;
  dino.classList.add('jumping');
  playJumpSound();
}

function spawnObstacle() {
  const kind = Math.random() < 0.88 ? 'cactus' : 'bird';
  const el = document.createElement('div');
  el.className = kind === 'cactus' ? 'obstacle' : 'bird';
  const areaWidth = gameArea.clientWidth;
  const y = kind === 'cactus' ? groundOffset : groundOffset + birdHeightOffset;
  el.style.left = `${areaWidth + 20}px`;
  el.style.bottom = `${y}px`;
  gameArea.appendChild(el);
  obstacles.push({
    el,
    x: areaWidth + 20,
    width: kind === 'cactus' ? obstacleWidth : birdWidth,
    height: kind === 'cactus' ? obstacleHeight : birdHeight,
    y,
    kind,
  });
}

function updateDino() {
  dinoY += verticalVelocity;
  verticalVelocity -= gravity;
  if (dinoY <= 0) {
    dinoY = 0;
    verticalVelocity = 0;
    dino.classList.remove('jumping');
  }
  dino.style.bottom = `${groundOffset + dinoY}px`;
}

function getDinoRect() {
  const width = dino.offsetWidth;
  const height = dino.offsetHeight;
  const left = dino.offsetLeft;

  return {
    left: left + width * 0.2,
    right: left + width * 0.78,
    top: gameArea.clientHeight - groundOffset - dinoY - height + 12,
    bottom: gameArea.clientHeight - groundOffset - dinoY - 6,
  };
}

function collides(obstacle) {
  const dinoRect = getDinoRect();
  const obstacleLeft = obstacle.x;
  const obstacleRight = obstacle.x + obstacle.width;
  const obstacleTop = gameArea.clientHeight - obstacle.y - obstacle.height;
  const obstacleBottom = gameArea.clientHeight - obstacle.y;

  const beePadding = obstacle.kind === 'bird' ? 14 : 4;
  const trashPadding = obstacle.kind === 'cactus' ? 14 : 0;

  return (
    dinoRect.left + 6 < obstacleRight - beePadding &&
    dinoRect.right - 6 > obstacleLeft + beePadding &&
    dinoRect.top + 6 < obstacleBottom - trashPadding &&
    dinoRect.bottom - 4 > obstacleTop + (obstacle.kind === 'bird' ? 4 : 8)
  );
}

function updateObstacles(delta) {
  obstacles = obstacles.filter((obstacle) => {
    obstacle.x -= speed * delta * 0.06;
    obstacle.el.style.left = `${obstacle.x}px`;

    if (collides(obstacle)) {
      obstacle.el.remove();
      endGame();
      return false;
    }

    if (obstacle.x + obstacle.width < -10) {
      obstacle.el.remove();
      return false;
    }

    return true;
  });
}

function maybeSpawn(delta) {
  spawnTimer += delta;
  const threshold = Math.max(1180, 2050 - speed * 45 - Math.random() * 140);
  if (spawnTimer >= threshold) {
    spawnObstacle();
    spawnTimer = 0;
  }
}

function gameLoop(timestamp) {
  if (!gameRunning) return;
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  score += delta * 0.02;
  speed = Math.min(10.4, 5.8 + score / 320);
  scoreEl.textContent = formatScore(score);

  if (!colorsInverted && Math.floor(score) >= 1000) {
    setInvertedColors(true);
  }

  updateDino();
  updateObstacles(delta);
  maybeSpawn(delta);

  animationId = requestAnimationFrame(gameLoop);
}

function handleAction(event) {
  unlockAudio();
  if (event.type === 'keydown') {
    if (!['Space', 'ArrowUp'].includes(event.code)) return;
    event.preventDefault();
  }
  jump();
}

restartBtn.addEventListener('click', startGame);
startHeroBtn.addEventListener('click', () => {
  document.getElementById('game').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(startGame, 250);
});
window.addEventListener('keydown', handleAction);
gameArea.addEventListener('pointerdown', jump);

dino.style.bottom = `${groundOffset}px`;
scoreEl.textContent = formatScore(score);
syncBestScore();
showMessage('Press play or hit space');
