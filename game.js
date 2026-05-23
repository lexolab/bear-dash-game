const gameArea = document.getElementById('gameArea');
const dino = document.getElementById('dino');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const heroBestEl = document.getElementById('heroBest');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restartBtn');
const startHeroBtn = document.getElementById('startHero');

const groundOffset = 61;
const gravity = 0.9;
const jumpForce = 16.5;

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

function formatScore(value) {
  return String(Math.floor(value)).padStart(5, '0');
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
}

function spawnObstacle() {
  const kind = Math.random() < 0.78 ? 'cactus' : 'bird';
  const el = document.createElement('div');
  el.className = kind === 'cactus' ? 'obstacle' : 'bird';
  const areaWidth = gameArea.clientWidth;
  const y = kind === 'cactus' ? groundOffset : groundOffset + (Math.random() < 0.5 ? 45 : 76);
  el.style.left = `${areaWidth + 20}px`;
  el.style.bottom = `${y}px`;
  gameArea.appendChild(el);
  obstacles.push({ el, x: areaWidth + 20, width: kind === 'cactus' ? 24 : 40, height: kind === 'cactus' ? 54 : 18, y, kind });
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
  return {
    left: 60,
    right: 96,
    top: gameArea.clientHeight - groundOffset - dinoY - 48,
    bottom: gameArea.clientHeight - groundOffset - dinoY,
  };
}

function collides(obstacle) {
  const dinoRect = getDinoRect();
  const obstacleLeft = obstacle.x;
  const obstacleRight = obstacle.x + obstacle.width;
  const obstacleTop = gameArea.clientHeight - obstacle.y - obstacle.height;
  const obstacleBottom = gameArea.clientHeight - obstacle.y;

  return (
    dinoRect.left + 6 < obstacleRight &&
    dinoRect.right - 6 > obstacleLeft &&
    dinoRect.top + 6 < obstacleBottom &&
    dinoRect.bottom - 4 > obstacleTop
  );
}

function updateObstacles(delta) {
  obstacles = obstacles.filter((obstacle) => {
    obstacle.x -= speed * delta * 0.06;
    obstacle.el.style.left = `${obstacle.x}px`;

    if (collides(obstacle)) {
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
  const threshold = Math.max(700, 1450 - speed * 65 - Math.random() * 260);
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
  speed = Math.min(15, 7 + score / 180);
  scoreEl.textContent = formatScore(score);

  updateDino();
  updateObstacles(delta);
  maybeSpawn(delta);

  animationId = requestAnimationFrame(gameLoop);
}

function handleAction(event) {
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
