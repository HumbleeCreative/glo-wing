// script.js

// === Global Variables ===
let canvas;
let ctx;

let gameRunning = false;
let lastSpawnTimer = 0;
let score = 0;
let highScore = 0;

const config = {
  gravity: 0,
  jumpStrength: 0,
  obstacleSpeed: 0,
  obstacleGap: 0,
  obstacleSpawnRate: 0,
};

let player = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  velocity: 0,
  sprite: 0,
};

// Array of obstacles
let obstacles = [];

// === Initialisation ===
function init() {
  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");

  // Initial sizing
  resizeCanvas();

  // Listen for window resizes (desktop) or orientation changes (mobile)
  window.addEventListener("resize", resizeCanvas);

  window.addEventListener("keydown", handleInput);
  canvas.addEventListener("mousedown", handleInput);

  loadAssets();

  gameLoop();
}

window.onload = init; // Runs the initialisation on page load

// === Game Loop ===
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// === Game States ===
function gameReset() {
  resetPlayer();
  resetObstacles();
  resetScore();
  gameRunning = true;
}

function gameOver() {
  gameRunning = false;
}

// === Utilities ===
function resizeCanvas() {
  // Sets the canvas resolution to the actual canvas size as defined in the CSS
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
function update() {
  if (gameRunning) {
    movePlayer();
    spawnObstacles();
    moveObstacles();
    cleanupObstacles();
    checkCollision();
  }
}
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawWorld();
  drawPlayer();
  drawObstacles();
  drawScore();
}

// === Visuals ===
function loadAssets() {
  // Loads the sprites for anything visual
}
function drawStartScreen() {}
function drawGameOverScreen() {}

// === Player Logic ===
function createPlayer() {}
function resetPlayer() {}
function drawPlayer() {}
function movePlayer() {}
function playerJump() {}

// === Obstacle Logic ===
function createObstacles() {
  // Creates the obstacle and pushes it on to the array 'obstacles'
}
function spawnObstacles() {
  // Handles the spawning of obstacles with a timer
}
function drawObstacles() {
  // Loops through the array of 'obstacles' and draws them
}
function moveObstacles() {
  // Loops through the array of 'obstacles' and updates the x positions
}
function cleanupObstacles() {
  // Removes obstacles when they have gone off the screen
}
function resetObstacles() {
  obstacles = []; // Clears the array
}

// === Game Logic ===
function checkCollision() {}
function onCollision() {
  gameOver();
}

// === Score Logic ===
function resetScore() {}
function updateScore() {}
function updateHighScore() {}
function drawScore() {
  ctx.save();

  ctx.fillStyle = "white";
  ctx.font = "bold 24px Verdana";
  ctx.textAlign = "center";

  // Shadow
  ctx.shadowColor = "black";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Paints the score at the top center of the canvas
  ctx.fillText(`${score}`, canvas.width / 2, canvas.height / 10);

  ctx.restore();
}

// === World Logic ===
function createWorld() {}
function drawWorld() {}

// === Input Logic ===
function handleInput(e) {
  if (e.code === "Space" || e.type === "mousedown") {
    // If the game is not running, reset the game.
    // If the game is running, make the player jump
    if (!gameRunning) {
      gameReset();
    } else {
      playerJump();
    }
  }
}
