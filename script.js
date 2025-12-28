// script.js

// === Global Variables ===
let canvas;
let ctx;

let firstGame = true; // Flag to track if this is the first game in the session
let gameRunning = false; // Flag to track the game state
let paused = false; // Flag to track paused game state
let spawnTimer = 0;
let score = 0;
let highScore = 0;
let lastUpdateTime = 0;

const config = {
  gravity: 0.3,
  jumpStrength: -8,
  obstacleSpeed: 3,
  obstacleGap: 150,
  obstacleSpawnRate: 2000,
};

// Maps the keys to an action
const controls = {
  Space: "Jump",
  ArrowUp: "Jump",
  KeyP: "Pause",
  Escape: "Pause",
};

// Defines the actions and states
let controlsAction = {
  Jump: { pressed: false, locked: false },
  Pause: { pressed: false, locked: false },
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

  // Refactored to use an Input Manager Function
  window.addEventListener("keydown", inputManager);
  window.addEventListener("keyup", inputManager);
  canvas.addEventListener("mousedown", inputManager);
  canvas.addEventListener("touchstart", inputManager, { passive: false });

  loadAssets();
  requestAnimationFrame((timestamp) => {
    lastUpdateTime = timestamp;
    gameLoop(timestamp);
  });
}

window.onload = init; // Runs the initialisation on page load

// === Game Loop ===
function gameLoop(timestamp) {
  // Calculate time since last frame update in milliseconds
  let deltaTime = timestamp - lastUpdateTime;
  lastUpdateTime = timestamp;

  // Cap the deltaTime to 16.6 to prevent any huge lag spikes
  if (deltaTime > 100) deltaTime = 16.6;

  // This normalises dt for 60 frames per second
  let dt = deltaTime / 16.6;

  update(dt, deltaTime);
  draw();
  requestAnimationFrame(gameLoop);
}

// === Game States ===
function gameReset() {
  firstGame = false;
  resetPlayer();
  resetObstacles();
  resetScore();
  gameRunning = true;
  paused = false;
  spawnTimer = 0;
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
function update(dt, deltaTime) {
  if (gameRunning && !paused) {
    movePlayer(dt);
    spawnObstacles(deltaTime); // Makes sure the timer only counts up when the game is not paused.
    moveObstacles(dt);
    cleanupObstacles();
    checkCollision();
  }
}
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clears the canvas

  drawWorld(); // Draws first
  drawObstacles(); // Draws on top of the World
  drawPlayer(); // Draws on top of the Obstacles
  drawScore(); // Draws on top of the everything

  if (!gameRunning) {
    if (firstGame) {
      drawStartScreen();
    } else {
      drawGameOverScreen();
    }
  }
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
  // Resets the player to be 20% of the canvas width from the left of the canvas and centred vertically
  player.x = canvas.width / 5;
  player.y = canvas.height / 2;
  player.velocity = 0;
}
function drawPlayer() {
  ctx.fillStyle = "yellow";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}
function movePlayer(dt) {
  // We multiply everything by dt to make sure the fall speed is consistent on any device
  player.velocity += config.gravity * dt;
  // Caps falling speed to 10 to prevent glitches
  if (player.velocity > 10) player.velocity = 10;
  player.y += player.velocity * dt; // Makes the player fall at the rate of gravity

  // If the player hits the floor trigger collision
  if (player.y + player.height > canvas.height) {
    player.y = canvas.height - player.height;
    // Triggers a collision
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

  let minHeight = 50;
  let maxHeight = canvas.height - config.obstacleGap - 50;
  // Sets the size of the top part of the obstacle
  let topObstacleHeight =
    Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

  // Creates the obstacle object
  let obstacle = {
    x: canvas.width, // Starts at the right edge of canvas
    width: 50, // Fixed width for obstacle
    topHeight: topObstacleHeight, // Where the top part of the obstacle ends
    bottomY: topObstacleHeight + config.obstacleGap, // Where the bottom part of the obstacle starts
    passed: false, // Flag to track score
  };
  // Adds the obstacle to the array
  obstacles.push(obstacle);
}
function spawnObstacles(deltaTime) {
  // spawnTimer will essentially work like a stopwatch and count upwards
  spawnTimer += deltaTime;

  // If the spawnTimer reaches our spawn rate variable then we trigger createObstacles
  if (spawnTimer >= config.obstacleSpawnRate) {
    createObstacles();
    spawnTimer = 0; // Resets the spawnTimer back to 0
  }
}
function drawObstacles() {
  ctx.save();
  ctx.fillStyle = "Green";

  // Loop through the array of 'obstacles' and draws them
  obstacles.forEach((obs) => {
    // Draw the top part of the obstacle
    ctx.fillRect(obs.x, 0, obs.width, obs.topHeight);

    // Draw the bottom part of the obstacle
    ctx.fillRect(obs.x, obs.bottomY, obs.width, canvas.height - obs.bottomY);
  });
  ctx.restore();
}
function moveObstacles(dt) {
  // Loops through the array of 'obstacles' and updates the x positions
  // We multiply everything by dt to make sure the speed is consistent on any device
  obstacles.forEach((obs) => {
    obs.x -= config.obstacleSpeed * dt;
  });
}
function cleanupObstacles() {
  // Removes obstacles when they have gone off the screen
  obstacles = obstacles.filter((obs) => obs.x + obs.width > 0);
}
function resetObstacles() {
  obstacles = []; // Clears the array
}

// === Game Logic ===
function checkCollision() {
  obstacles.forEach((obs) => {
    // Define the player's bounding box
    const pLeft = player.x;
    const pRight = player.x + player.width;
    const pTop = player.y;
    const pBottom = player.y + player.height;

    // Define the Obstacle's left and right sides
    const oLeft = obs.x;
    const oRight = obs.x + obs.width;

    // Check if the player is within the obstacle bounding box
    if (pRight > oLeft && pLeft < oRight) {
      // If the player touches the top part of the obstacle trigger collision
      if (pTop < obs.topHeight) {
        onCollision();
      }

      // If the player touches the bottom part of the obstacle trigger collision
      if (pBottom > obs.bottomY) {
        onCollision();
      }
    }

    // If the player has passed through the gap change the passed flag to true and update score
    if (!obs.passed && pLeft > oRight) {
      updateScore();
      obs.passed = true;
    }
  });
}
function onCollision() {
  gameOver();
}

// === Score Logic ===
function resetScore() {
  score = 0;
}
function updateScore() {
  score++;
  if (score > highScore) {
    updateHighScore();
  }
}
function updateHighScore() {
  highScore = score;
}
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

  // Draws the score at the top center of the canvas
  ctx.fillText(`${score}`, canvas.width / 2, canvas.height / 10);

  ctx.restore();
}

// === World Logic ===
function createWorld() {}
function drawWorld() {}

// === Input Manager ===
function inputManager(e) {
  // Prevents a mobile touch triggering as a mouse click
  if (e.type === "touchstart") e.preventDefault();

  // Gets the action from our dictionary (e.g., "Jump" or "Pause")
  const actionName = controls[e.code];

  // Handle Keyboard events
  if (e.type === "keydown" && actionName) {
    const action = controlsAction[actionName];

    // Only trigger if not held down (locked)
    if (!e.repeat && !action.locked) {
      action.locked = true;
      inputHandler(actionName);
    }
  }

  // When a keyup event happens we unlock the action
  if (e.type === "keyup" && actionName) {
    controlsAction[actionName].locked = false;
  }

  // Handle Mouse and Touch events (Defaults to "Jump")
  if (e.type === "mousedown" || e.type === "touchstart") {
    inputHandler("Jump");
  }
}

// === Input Handler ===
function inputHandler(action) {
  if (action === "Jump") {
    if (!gameRunning) {
      gameReset();
    } else if (!paused) {
      playerJump();
    }
  }

  if (action === "Pause") {
    // console.log("Game Paused!");
    if (gameRunning) {
      paused = !paused;
      // if (!paused) {
      //   lastSpawnTime = Date.now();
      // }
    }
  }
}
