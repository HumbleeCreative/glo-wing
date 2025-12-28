// script.js

// === Global Variables ===
let canvas;
let ctx;

let gameRunning = false;
let lastSpawnTimer = 0;

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

  // Set the canvas internal resolution here:
  canvas.width = 400;
  canvas.height = 500;

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
function drawScore() {}

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
