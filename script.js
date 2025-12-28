// script.js

// === Global Variables ===
let canvas;
let ctx;

let gameRunning = false;
let lastSpawnTimer = 0;
let score = 0;
let highScore = 0;

const config = {
  gravity: 0.3,
  jumpStrength: -8,
  obstacleSpeed: 3,
  obstacleGap: 150,
  obstacleSpawnRate: 1500,
};

let player = {
  x: -50, // Creates player off screen
  y: -50,
  width: 64,
  height: 64,
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

  player.width = canvas.width * 0.08; // Makes the player object responsive to canvas size
  player.height = player.width;
}
function drawStartScreen() {}
function drawGameOverScreen() {}

// === Player Logic ===
function createPlayer() {}
function resetPlayer() {
  player.x = canvas.width / 5;
  player.y = canvas.height / 2;
  player.velocity = 0;
}
function drawPlayer() {
  ctx.fillStyle = "yellow";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}
function movePlayer() {
  player.velocity += config.gravity;
  player.y += player.velocity; // Makes the player fall at the rate of gravity

  // If the player hits the floor trigger collision
  if (player.y + player.height > canvas.height) {
    player.y = canvas.height - player.height;
    onCollision();
  }

  // If the player hits the top of the screen set the velocity to 0
  // This prevents the player going off the screen
  if (player.y < 0 - player.height / 2) {
    player.y = 0 - player.height / 2;
    player.velocity = 0;
  }
}
function playerJump() {
  player.velocity = config.jumpStrength;
}

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
