// script.js

// === DOM ===
const menuScreen = document.getElementById("menu-screen");
const menuTitle = document.getElementById("menu-title");
const menuStats = document.getElementById("menu-stats");
const menuBtn = document.getElementById("menu-btn");
const liveScore = document.getElementById("live-score");
const pauseBtn = document.getElementById("pause-btn");

// === Global Variables ===
let canvas;
let ctx;

let firstGame = true; // Flag to track if this is the first game in the session
let gameRunning = false; // Flag to track the game state
let paused = false; // Flag to track paused game state
let jumpRequested = false; // Flag to track if we should trigger a jump
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

// Sound FX
const sfx = {
  point: new Audio("assets/audio/sfx/point.wav"),
  death: new Audio("assets/audio/sfx/death.wav"),
  jump: new Audio("assets/audio/sfx/jump.wav"),
};

sfx.point.volume = 0.3;
sfx.jump.volume = 0.2;
sfx.death.volume = 0.4;

// Player Sprites
const dragonSpriteFiles = [
  "sprites/dragon/dragonSprite0.png",
  "sprites/dragon/dragonSprite1.png",
  "sprites/dragon/dragonSprite2.png",
  "sprites/dragon/dragonSprite3.png",
  "sprites/dragon/dragonSprite4.png",
  "sprites/dragon/dragonSprite5.png",
  "sprites/dragon/dragonSprite6.png",
];
let dragonSprites = [];
let imagesLoaded = 0;

let player = {
  x: -50, // Creates player off screen
  y: -50,
  width: 0,
  height: 0,
  velocity: 0,
  frameIndex: 0,
  animationSequence: [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1],
  frameTimer: 0,
  frameInterval: 60, // Lower number = faster wings
};

// Audio
const bgMusic = new Audio("assets/audio/bgm/bgm-loop.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.2; // Starts at 50% volume

// Array of obstacles
let obstacles = [];

// === Initialisation ===
async function init() {
  // Change to async to make sure everything is loaded before carrying on
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

  pauseBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // e.stopPropagation stops the button clicks triggering the canvas click event
    inputHandler("Pause");
  });

  if (menuBtn) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // e.stopPropagation stops the button clicks triggering the canvas click event
      inputHandler("Jump");
    });
  }

  await loadAssets();

  // Set the initial Start Screen
  drawStartScreen();

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

  menuScreen.style.display = "none";
}

function gameOver() {
  gameRunning = false;
  drawGameOverScreen();
}

// === Utilities ===
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `assets/${src}`;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
};

function resizeCanvas() {
  // Sets the canvas resolution to the actual canvas size as defined in the CSS
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // Updates player size on resize event
  if (player) {
    player.height = canvas.width * 0.16;
    // Maintain the aspect ratio
    player.width = player.height * (166 / 129);
  }
}
function update(dt, deltaTime) {
  if (gameRunning && !paused) {
    // Check the buffer before moving anything
    if (jumpRequested) {
      playerJump();
      jumpRequested = false; // Reset the flag
    }

    // === Animation Logic ===
    player.frameTimer += deltaTime; // Tracks the time since the last frame
    if (player.frameTimer > player.frameInterval) {
      // Moves to the next item in the animation sequence array
      player.frameIndex++;

      // If we get to the end of the animation sequence start from the beginning again
      if (player.frameIndex >= player.animationSequence.length) {
        player.frameIndex = 0;
      }
      player.frameTimer = 0; // Resets the frame timer back to 0
    }

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

  // Moved over to using a live-score element instead of the canvas
  // drawScore(); // Draws on top of the everything
}

// === Visuals ===
async function loadAssets() {
  // Load high score from memory when the game starts
  const savedScore = localStorage.getItem("flappyDragonHighScore");
  if (savedScore) {
    highScore = parseInt(savedScore);
  }

  // Loop through the files in the dragonSpriteFiles array
  for (let i = 0; i < dragonSpriteFiles.length; i++) {
    try {
      // Get the file names from the dragonSpriteFiles array
      const fileName = dragonSpriteFiles[i];

      // 'await' pauses this loop until the image has fully loaded before moving on to the next one
      const img = await loadImage(fileName);

      // When the image has loaded push it to the dragonSprites array
      dragonSprites.push(img);

      imagesLoaded++;

      console.log(`Loaded image ${i + 1} of ${dragonSpriteFiles.length}`);
    } catch (err) {
      // If any image fails, log it with the error
      console.error(`Could not load image: ${dragonSpriteFiles[i]}`);
    }
  }

  // // Loads the sprites for the player
  // spriteFiles.forEach((file, index) => {
  //   const img = new Image();
  //   img.src = `assets/${file}`; // Relative path to sprite files
  //   img.onload = () => {
  //     imagesLoaded++;
  //   };
  //   dragonSprites[index] = img;
  // });

  player.height = canvas.width * 0.16; // Makes the player object responsive to canvas size
  player.width = player.height * (166 / 129); // Multiply the player height by the aspect ratio
}
function drawStartScreen() {
  menuTitle.innerHTML = "FLAPPY<br>DRAGON";
  menuStats.textContent = "HumbleeCreative";
  menuBtn.textContent = "Start Game";
  menuBtn.style.display = "block";
  menuScreen.style.display = "flex";
}
function drawGameOverScreen() {
  menuTitle.innerHTML = "💀<br>uh oh!";
  menuStats.innerHTML = `SCORE: ${score} <span style="color:white; margin: 0 10px;">|</span> BEST: ${highScore}`;
  menuBtn.textContent = "Try Again";
  menuBtn.style.display = "block";
  menuScreen.style.display = "flex";
}
function drawPauseScreen() {
  menuTitle.textContent = "Paused";
  menuStats.textContent = "Taking a break?";
  menuBtn.textContent = "Resume";
  menuBtn.style.display = "block";
  menuScreen.style.display = "flex";
}

// === Player Logic ===
function createPlayer() {}
function resetPlayer() {
  // Resets the player to be 20% of the canvas width from the left of the canvas and centred vertically
  player.x = canvas.width / 5;
  player.y = canvas.height / 2;
  player.velocity = 0;
}
function drawPlayer() {
  // Safety check: if images aren't loaded yet, draw the fallback square
  if (imagesLoaded < dragonSpriteFiles.length) {
    player.width = canvas.width * 0.08;
    player.height = player.width;
    ctx.fillStyle = "yellow";
    ctx.fillRect(player.x, player.y, player.width, player.height);
    return;
  }
  ctx.save();

  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  // Rotate based on velocity (tilt up when jumping, down when falling)
  let tilt = player.velocity * 0.05;
  tilt = Math.max(-0.5, Math.min(tilt, 0.5)); // Clamp the tilt so he doesn't do a backflip
  ctx.rotate(tilt);

  const currentImg = dragonSprites[player.animationSequence[player.frameIndex]];
  ctx.drawImage(
    currentImg,
    -player.width / 2,
    -player.height / 2,
    player.width,
    player.height
  );

  ctx.restore();
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
  playSfx(sfx.jump);
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
  // Cyan glow for obstacles
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 3;
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#00f0ff";
  ctx.fillStyle = "#00eeffc4"; // Semi-transparent body

  // Loop through the array of 'obstacles' and draws them
  obstacles.forEach((obs) => {
    // Draw the top part of the obstacle
    ctx.strokeRect(Math.floor(obs.x), 0, obs.width, obs.topHeight); // Introduced Math.floor to smooth out the edges
    ctx.fillRect(Math.floor(obs.x), 0, obs.width, obs.topHeight);

    // Draw the bottom part of the obstacle
    ctx.strokeRect(obs.x, obs.bottomY, obs.width, canvas.height - obs.bottomY);
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
  obstacles = obstacles.filter((obs) => obs.x + obs.width > 0); // This filters out obstacles that have gone off the screen so we do not keep calculating them to follow good memory management
}
function resetObstacles() {
  obstacles = []; // Clears the array
}

// === Game Logic ===
function checkCollision() {
  obstacles.forEach((obs) => {
    // Changed the bounding box of the player to be slightly smaller than the sprite to make it feel slightly fairer if the sprite barely clips the obstacles
    const hitPaddingX = player.width * 0.25;
    const hitPaddingY = player.height * 0.25;

    // Define the player's bounding box
    const pLeft = player.x + hitPaddingX;
    const pRight = player.x + player.width - hitPaddingX;
    const pTop = player.y + hitPaddingY;
    const pBottom = player.y + player.height - hitPaddingY;

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
  playSfx(sfx.death);
  gameOver();
}

// === Score Logic ===
function resetScore() {
  score = 0;
  liveScore.textContent = score;
}
function updateScore() {
  score++;
  liveScore.textContent = score;

  playSfx(sfx.point);

  if (score > highScore) {
    updateHighScore();
  }
}
function updateHighScore() {
  highScore = score;
  // Save to browser memory
  localStorage.setItem("flappyDragonHighScore", highScore);
}

// Moved over to using a live-score element instead of the canvas
// function drawScore() {
//   ctx.save();

//   ctx.fillStyle = "white";
//   ctx.font = "bold 24px Verdana";
//   ctx.textAlign = "center";

//   // Shadow
//   ctx.shadowColor = "black";
//   ctx.shadowBlur = 2;
//   ctx.shadowOffsetX = 2;
//   ctx.shadowOffsetY = 2;

//   // Draws the score at the top center of the canvas
//   ctx.fillText(`${score}`, canvas.width / 2, canvas.height / 10);

//   ctx.restore();
// }

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
    if (!gameRunning || paused) {
      inputHandler("Jump");
    } else if (menuScreen.style.display !== "flex") {
      inputHandler("Jump");
    }
  }
}

// === Input Handler ===
function inputHandler(action) {
  if (action === "Jump") {
    if (!gameRunning) {
      gameReset();
      // bgMusic.play();
    } else if (paused) {
      paused = false;
      // bgMusic.play();
      menuScreen.style.display = "none";
    } else {
      jumpRequested = true; // Using the flag instead of just calling the jump function straight way makes sure that we only trigger the jump at the start of the next frame update which should prevent any glitches and stuttering
      // playerJump();
    }
  }

  if (action === "Pause") {
    // console.log("Game Paused!");
    if (gameRunning) {
      paused = !paused;
      if (paused) {
        drawPauseScreen();
        // bgMusic.pause();
      } else {
        // bgMusic.play();
        menuScreen.style.display = "none";
      }
    }
  }
}

function playSfx(sound) {
  // Restarts the sound effect from the beginning if it is already playing
  sound.currentTime = 0;
  sound.play();
}
