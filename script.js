// script.js

//* === DOM Elements ===
//#region DOM Elements
const menuScreen = document.getElementById("menu-screen");
const menuTitle = document.getElementById("menu-title");
const menuStats = document.getElementById("menu-stats");
const menuBtn = document.getElementById("menu-btn");
const uiLayer = document.getElementById("ui-layer");
const liveScore = document.getElementById("live-score");
const pauseBtn = document.getElementById("pause-btn");
const canvas = document.getElementById("game");

// Debug DOM Elements
const debugOverlay = document.getElementById("debug-overlay");
const dbgFps = document.getElementById("debug-fps");
const dbgY = document.getElementById("debug-y");
const dbgDpr = document.getElementById("debug-dpr");
const dbgRes = document.getElementById("debug-res");

//#endregion

//* === Configuration ===
//#region Configuration
const config = {
  gravity: 0.35,
  jumpStrength: -7.5,
  obstacleSpeed: 3,
  obstacleGap: 150,
  obstacleSpawnRate: 2000,
  terminalVelocity: 10,
  playerScale: 0.16, // Player height relative to the canvas width
  aspectRatio: 166 / 129, // Dragon sprite ratio
  hitPadding: 0.25, // This is used to shrink the collision hitbox to make the game feel fairer
};

const controls = {
  Space: "Jump",
  ArrowUp: "Jump",
  KeyP: "Pause",
  Escape: "Pause",
};
//#endregion

//* === Global Variables ===
//#region Global Variables
let ctx, audioCtx, masterGain;

let debug = false;

let firstGame = true; // Flag to track if this is the first game in the session
let gameRunning = false; // Flag to track the game state
let paused = false; // Flag to track paused game state
let isCountingDown = false; // Flag to track if we are counting down after a pause
let jumpRequested = false; // Flag to track if we should trigger a jump
let isMenuVisible = true; // NEW: Boolean flag to replace expensive CSS checks
let isGameOverSequence = false; // Flag to block input during death/reset

let score = 0;
let highScore = 0;
let imagesLoaded = 0;
let spawnTimer = 0; // Timer for spawning obstacles
let lastUpdateTime = 0; // Store the last time we updated the frame
let countdownValue = 3;
let countdownTimer = null;

let backgroundStars = [];
//#endregion

//* === Assets ===
//#region Assets

// Sound Effects
const sfxBuffers = { point: null, death: null, jump: null };
// Background Music
let bgmBuffer = null;
let bgmSource = null;

// Player Sprites
let dragonSprites = [];
const dragonSpriteFiles = [
  "sprites/dragon/dragonSprite0.png",
  "sprites/dragon/dragonSprite1.png",
  "sprites/dragon/dragonSprite2.png",
  "sprites/dragon/dragonSprite3.png",
  "sprites/dragon/dragonSprite4.png",
  "sprites/dragon/dragonSprite5.png",
  "sprites/dragon/dragonSprite6.png",
];
//#endregion

//* === Objects ===
//#region Objects

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

// Array of obstacles
let obstacles = [];

// Defines the actions and states
let controlsAction = {
  Jump: { pressed: false, locked: false },
  Pause: { pressed: false, locked: false },
};
//#endregion

//* === Initialisation ===
//#region Initialisation

async function init() {
  // Uses async to make sure everything is loaded before carrying on
  ctx = canvas.getContext("2d");

  // Initial sizing
  resizeCanvas();

  // Listen for window resizes (desktop) or orientation changes (mobile)
  window.addEventListener("resize", resizeCanvas);

  // Uses the Input Manager Function to control the input
  window.addEventListener("keydown", inputManager);
  window.addEventListener("keyup", inputManager);
  canvas.addEventListener("mousedown", inputManager);
  canvas.addEventListener("touchstart", inputManager, { passive: false });

  pauseBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // e.stopPropagation stops the button clicks triggering the canvas click event
    inputHandler("Pause");
  });

  if (menuBtn) {
    menuBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation(); // e.stopPropagation stops the button clicks triggering the canvas click event

      if (!audioCtx) await initAudio();

      if (!gameRunning) {
        gameReset();
      } else if (paused && !isCountingDown) {
        startResumeCountdown();
      }
    });
  }

  // Initialise Background
  initBackground();

  await loadAssets();

  // Set the initial Start Screen
  setTimeout(() => {
    drawStartScreen();
  }, 2000);

  // Starts the animation
  requestAnimationFrame((timestamp) => {
    lastUpdateTime = timestamp;
    gameLoop(timestamp);
  });
}
//#endregion

//* === Core Game Loop ===
//#region Core Game Loop

function gameLoop(timestamp) {
  // Calculate time since last frame update in milliseconds
  let deltaTime = timestamp - lastUpdateTime;
  lastUpdateTime = timestamp;

  // Cap the deltaTime to 16.67 to prevent any huge lag spikes
  if (deltaTime > 100) deltaTime = 16.67;

  // This normalises dt for 60 frames per second
  const dt = deltaTime / 16.67;

  updateDebug(dt);
  update(dt, deltaTime);
  draw();
  requestAnimationFrame(gameLoop);
}

function update(dt, deltaTime) {
  // Update particles regardless of gameRunning state
  particles.forEach((p, index) => {
    p.update(dt);
    if (p.alpha <= 0) particles.splice(index, 1);
  });

  if (gameRunning && !paused) {
    if (jumpRequested) {
      playerJump();
      jumpRequested = false; // Reset the flag
    }

    // Animation Logic
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
  // Clear the whole canvas including DPR scaling
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  drawWorld(); // Draws first
  drawObstacles(); // Draws on top of the World
  drawPlayer(); // Draws on top of the Obstacles
  particles.forEach((p) => p.draw()); // Draw particles on top of player to create explosion effect

  if (debug) drawDebugHitboxes();
}
//#endregion

//* === Input Management ===
//#region Input Management

// REMOVED 'async' to make the jump trigger instant
function inputManager(e) {
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();

  // Prevents a mobile touch triggering as a mouse click
  if (e.type === "touchstart") e.preventDefault();

  // Gets the action from our dictionary (e.g., "Jump" or "Pause")
  const actionName = controls[e.code];

  if (actionName && controlsAction[actionName]) {
    // Handle Keyboard events
    // Only trigger if not held down (locked)
    if (
      e.type === "keydown" &&
      !e.repeat &&
      !controlsAction[actionName].locked
    ) {
      controlsAction[actionName].locked = true;
      inputHandler(actionName);
    }
    // When a keyup event happens we unlock the action
    if (e.type === "keyup") controlsAction[actionName].locked = false;
  }

  // Handle Mouse and Touch events (Defaults to "Jump")
  if (e.type === "mousedown" || e.type === "touchstart") {
    // Check our boolean flag instead of the DOM
    if (gameRunning && !paused && !isMenuVisible) {
      jumpRequested = true;
    } else {
      inputHandler("Jump");
    }
  }
}

async function inputHandler(action) {
  if (action === "Jump") {
    if (isGameOverSequence) return; // If we are in the middle of a death animation return immediately

    if (!gameRunning) {
      if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
      gameReset();
    } else if (paused && !isCountingDown) {
      startResumeCountdown();
    } else {
      // Using the flag instead of just calling the jump function straight way makes sure that we only trigger the jump at the start of the next frame update which should prevent any glitches and stuttering
      jumpRequested = true;
    }
  }

  if (action === "Pause" && gameRunning && !isCountingDown) {
    paused = !paused;
    if (paused) {
      drawPauseScreen();
      if (audioCtx) audioCtx.suspend();
    } else {
      startResumeCountdown();
    }
  }
}
//#endregion

//* === Player Logic ===
//#region Player Logic

function resetPlayer() {
  player.x = canvas.clientWidth / 5;
  player.y = canvas.clientHeight / 2;
  player.velocity = 0;
}

function movePlayer(dt) {
  // We multiply everything by dt to make sure the fall speed is consistent on any device
  player.velocity += config.gravity * dt;

  // Caps falling speed to 10 to prevent glitches
  if (player.velocity > config.terminalVelocity) {
    player.velocity = config.terminalVelocity;
  }

  player.y += player.velocity * dt; // Makes the player fall at the rate of gravity

  if (player.y + player.height > canvas.clientHeight) {
    player.y = canvas.clientHeight - player.height;
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
  setTimeout(() => {
    if (sfxBuffers.jump) playSfx(sfxBuffers.jump, 0.2);
  }, 0);
}

function drawPlayer() {
  // If the game isn't running and it's not the first load,
  // hide the player (because they just exploded!)
  if (!gameRunning && !isMenuVisible) return;

  // Safety check: if images aren't loaded yet, draw the fallback square
  if (imagesLoaded < dragonSpriteFiles.length) {
    player.width = canvas.clientWidth * 0.08;
    player.height = player.width;
    ctx.fillStyle = "yellow";
    ctx.fillRect(player.x, player.y, player.width, player.height);
    return;
  }

  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  // Rotate based on velocity (tilt up when jumping, down when falling)
  let tilt = Math.max(-0.5, Math.min(player.velocity * 0.05, 0.5)); // Clamp the tilt so the player doesn't do a backflip
  ctx.rotate(tilt);

  const currentImg = dragonSprites[player.animationSequence[player.frameIndex]];
  ctx.drawImage(
    currentImg,
    -player.width / 2,
    -player.height / 2,
    player.width,
    player.height,
  );

  ctx.restore();
}
//#endregion

//* === Obstacle Logic ===
//#region Obstacle Logic

// Creates the obstacle and pushes it on to the array 'obstacles'
function createObstacles() {
  const minHeight = 50;
  const maxHeight = canvas.clientHeight - config.obstacleGap - 50;

  // Sets the size of the top part of the obstacle
  const topObstacleHeight =
    Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

  // Creates the obstacle object
  let obstacle = {
    x: canvas.clientWidth, // Starts at the right edge of canvas
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

function moveObstacles(dt) {
  // Loops through the array of 'obstacles' and updates the x positions
  // We multiply everything by dt to make sure the speed is consistent on any device
  obstacles.forEach((obs) => {
    obs.x -= config.obstacleSpeed * dt;
  });
}

// This filters out obstacles that have gone off the screen so we do not keep calculating them to follow good memory management
function cleanupObstacles() {
  // Removes obstacles when they have gone off the screen
  obstacles = obstacles.filter((obs) => obs.x + obs.width > 0);
}

function drawObstacles() {
  ctx.save();
  // Cyan glow for obstacles
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 3;
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#00f0ff";
  ctx.fillStyle = "#00eeffc4"; // Semi-transparent fill

  // Loop through the array of 'obstacles' and draws them
  obstacles.forEach((obs) => {
    const drawX = Math.floor(obs.x);
    // Draw the top part of the obstacle
    ctx.strokeRect(drawX, 0, obs.width, obs.topHeight); // Introduced Math.floor to smooth out the edges
    ctx.fillRect(drawX, 0, obs.width, obs.topHeight);
    // Draw the bottom part of the obstacle
    ctx.strokeRect(
      drawX,
      obs.bottomY,
      obs.width,
      canvas.clientHeight - obs.bottomY,
    );
    ctx.fillRect(
      drawX,
      obs.bottomY,
      obs.width,
      canvas.clientHeight - obs.bottomY,
    );
  });
  ctx.restore();
}
//#endregion

//* === Collision & Scoring ===
//#region Collision & Scoring
function checkCollision() {
  // Changed the bounding box of the player to be slightly smaller than the sprite to make it feel slightly fairer if the sprite barely clips the obstacles
  const hitPaddingX = player.width * config.hitPadding;
  const hitPaddingY = player.height * config.hitPadding * 1.25;

  // Define the player's bounding box
  const pLeft = player.x + hitPaddingX;
  const pRight = player.x + player.width - hitPaddingX;
  const pTop = player.y + hitPaddingY;
  const pBottom = player.y + player.height - hitPaddingY;

  obstacles.forEach((obs) => {
    // Define the Obstacle's left and right sides
    const oLeft = obs.x;
    const oRight = obs.x + obs.width;

    // If the player has passed through the gap change the passed flag to true and update score
    if (oRight < pLeft) {
      if (!obs.passed) {
        updateScore();
        obs.passed = true;
      }
      return;
    }

    // Check if the player is within the obstacle bounding box
    if (pRight > oLeft && pLeft < oRight) {
      // If the player touches the top or bottom parts of the obstacle trigger collision
      if (pTop < obs.topHeight || pBottom > obs.bottomY) {
        onCollision();
      }
    }
  });
}

function onCollision() {
  if (!gameRunning) return; // Prevent multiple triggers

  isGameOverSequence = true; // Lock inputs
  if (sfxBuffers.death) playSfx(sfxBuffers.death, 0.2);

  // Trigger particle burst at player location
  createExplosion(
    player.x + player.width / 2,
    player.y + player.height / 2,
    "#f20df2",
  );
  createExplosion(
    player.x + player.width / 2,
    player.y + player.height / 2,
    "#00f0ff",
  );

  gameRunning = false;

  // Wait 1 second to allow for particle explosion
  setTimeout(() => {
    // We keep isGameOverSequence true until they click "Try Again"
    drawGameOverScreen();
  }, 1000);
}
//#endregion

//* === Score Logic ===
//#region Score Logic

function updateScore() {
  score++;
  liveScore.textContent = score;
  if (sfxBuffers.point) playSfx(sfxBuffers.point, 0.2);
  if (score > highScore) {
    highScore = score;
    // Save to browser memory
    localStorage.setItem("gloWingHighScore", highScore);
  }
}
//#endregion

//* === Audio System ===
//#region Audio System

//* Initialises the Web Audio API.
//! Browsers require this to be triggered by a user gesture (click/tap).
async function initAudio() {
  // If the audio context already exists, we don't need to create it again
  if (audioCtx) return;

  // Create the main audio context (supports older webkit browsers)
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Create a Master Gain node to act as a global volume slider
  masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  masterGain.gain.value = 0.5;

  // Load all sound files into memory so they play instantly when needed
  sfxBuffers.point = await loadAudioBuffer("./assets/audio/sfx/point.wav");
  sfxBuffers.death = await loadAudioBuffer("./assets/audio/sfx/death.wav");
  sfxBuffers.jump = await loadAudioBuffer("./assets/audio/sfx/jump.wav");
  bgmBuffer = await loadAudioBuffer("./assets/audio/bgm/bgm-loop.mp3");

  // Start the background music loop once it's loaded
  playBGM();
}

//* Fetches an audio file and decodes it into a buffer to allow for instant playback, which overcomes the HTML Audio limitations
async function loadAudioBuffer(path) {
  try {
    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer(); // Converts the file to raw binary data
    return await audioCtx.decodeAudioData(arrayBuffer); // Turn that data into an audio buffer
  } catch (err) {
    console.error(`[ERROR] Failed to load audio:`, path, err);
    return null;
  }
}

//* Plays a short Sound Effect (SFX).
// This creates a new source every time, allowing sounds to overlap. Like if the player jumps repeatedly
function playSfx(buffer, volume = 1.0) {
  // Safety check: Don't try to play if audio isn't ready or file is missing
  if (!buffer || !audioCtx) return;

  const source = audioCtx.createBufferSource(); // Creates the virtual record player
  const gainNode = audioCtx.createGain(); // Creates a volume control for this specific sound

  source.buffer = buffer; // Assigns the sound data
  gainNode.gain.value = volume; // Set the specific volume level

  // Source -> Volume Control -> Master Volume -> Plays the sounds
  source.connect(gainNode);
  gainNode.connect(masterGain);

  source.start(0); // Plays the sound immediately
}

//* Handles the Background Music loop
function playBGM() {
  if (!bgmBuffer || !audioCtx) return;

  stopBGM(); // Prevents multiple tracks from playing at once

  bgmSource = audioCtx.createBufferSource();
  bgmSource.buffer = bgmBuffer;
  bgmSource.loop = true; // Makes the music loop indefinitely

  const bgmGain = audioCtx.createGain();
  bgmGain.gain.value = 0.15; // Set the music quieter than the SFX

  bgmSource.connect(bgmGain);
  bgmGain.connect(masterGain);
  bgmSource.start(0);
}

//* Stops the background music and clears the source.
function stopBGM() {
  if (bgmSource) {
    bgmSource.stop(); // Stops the background music
    bgmSource = null; // Clears the background music source
  }
}
//#endregion

//* === UI & Visuals ===
//#region UI & Visuals
function resizeCanvas() {
  // Sets the canvas resolution to the actual canvas size as defined in the CSS
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  // Updates player size on resize event
  if (player) {
    player.height = canvas.clientWidth * config.playerScale;
    // Maintain the aspect ratio of the sprite
    player.width = player.height * config.aspectRatio;
  }
}

async function loadAssets() {
  drawLoadingScreen();

  // Load high score from memory when the game starts
  const savedScore = localStorage.getItem("gloWingHighScore");
  if (savedScore) {
    highScore = parseInt(savedScore);
  }

  // Loop through the files in the dragonSpriteFiles array
  for (let i = 0; i < dragonSpriteFiles.length; i++) {
    try {
      const img = await loadImage(dragonSpriteFiles[i]);
      dragonSprites.push(img); // When the image has loaded push it to the dragonSprites array
      imagesLoaded++;
    } catch (err) {
      console.error(`Could not load image: ${dragonSpriteFiles[i]}`); // If any image fails, log it with the error
    }
  }
  resizeCanvas();
}

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `assets/${src}`;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
};

function gameReset() {
  isGameOverSequence = false; // Unlock inputs
  isMenuVisible = false;
  resetPlayer();
  obstacles = []; // Resets the obstacles array
  particles = []; // Resets death particles
  score = 0; // Resets the score
  liveScore.textContent = score; // Resets the live score
  gameRunning = true;
  paused = false;
  spawnTimer = 0;

  if (audioCtx) audioCtx.resume();

  uiLayer.style.display = "flex";
  menuScreen.style.display = "none";
}

function gameOver() {
  gameRunning = false;
  drawGameOverScreen();
}

function drawLoadingScreen() {
  isMenuVisible = true;
  menuTitle.innerHTML = "Loading";
  menuStats.textContent = "Waking up the dragon...";
  menuBtn.style.display = "none";
  menuScreen.style.display = "flex";
}

function drawStartScreen() {
  isMenuVisible = true;
  menuTitle.innerHTML = "Glo-<br>Wing";
  menuStats.textContent = "HumbleeCreative";
  menuBtn.textContent = "Start Game";
  menuBtn.style.display = "block";
  menuScreen.style.display = "flex";
}
function drawGameOverScreen() {
  isMenuVisible = true;
  menuTitle.innerHTML = "💀<br>uh oh!";
  menuStats.innerHTML = `SCORE: ${score} <span style="color:white; margin: 0 10px;">|</span> BEST: ${highScore}`;
  menuBtn.textContent = "Try Again";
  menuBtn.style.display = "block";
  menuScreen.style.display = "flex";
}

function drawPauseScreen() {
  isMenuVisible = true;
  menuTitle.textContent = "Paused";
  menuStats.textContent = "Taking a break?";
  menuBtn.textContent = "Resume";
  menuBtn.style.display = "block";
  menuScreen.style.display = "flex";
}

function drawCountdownScreen() {
  isMenuVisible = true;
  menuTitle.innerHTML = countdownValue;
  menuStats.textContent = "GET READY...";
  menuBtn.style.display = "none";
  menuScreen.style.display = "flex";
}

async function startResumeCountdown() {
  if (isCountingDown) return;

  isCountingDown = true;
  countdownValue = 3;
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();

  drawCountdownScreen();
  playSfx(sfxBuffers.point, 0.1);

  menuTitle.classList.remove("countdown-active");
  void menuTitle.offsetWidth;
  menuTitle.classList.add("countdown-active");

  countdownTimer = setInterval(() => {
    countdownValue--;

    if (countdownValue > 0) {
      drawCountdownScreen();
      playSfx(sfxBuffers.point, 0.1);
      menuTitle.classList.remove("countdown-active");
      void menuTitle.offsetWidth;
      menuTitle.classList.add("countdown-active");
    } else {
      clearInterval(countdownTimer);
      isCountingDown = false;
      paused = false;
      isMenuVisible = false;
      menuScreen.style.display = "none";
      menuTitle.classList.remove("countdown-active");
    }
  }, 1000);
}

//* === Background ===
function initBackground() {
  for (let i = 0; i < 50; i++) {
    backgroundStars.push({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      size: Math.random() * 2,
      speed: Math.random() * 0.5 + 0.2,
    });
  }
}

function drawWorld() {
  ctx.fillStyle = "#ffee00b2";
  backgroundStars.forEach((star) => {
    ctx.fillRect(star.x, star.y, star.size, star.size);
    if (gameRunning && !paused) {
      star.x -= star.speed; // Move stars left
      if (star.x < 0) star.x = canvas.clientWidth; // Wrap around
    }
  });
}
//#endregion

//* === Particle System ===
//#region Particles
let particles = [];

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 2;
    // Random velocity in any direction
    this.speedX = (Math.random() - 0.5) * 4;
    this.speedY = (Math.random() - 0.5) * 4;
    this.color = color;
    this.alpha = 1; // For fading out
    this.decay = Math.random() * 0.02 + 0.015; // How fast it disappears
  }

  update(dt) {
    this.x += this.speedX * dt;
    this.y += this.speedY * dt;
    this.alpha -= this.decay * dt;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.restore();
  }
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(x, y, color));
  }
}
//#endregion

//* === Debug Logic ===
//#region Debug Logic

function updateDebug(dt) {
  if (debug) {
    debugOverlay.style.display = "block";
    dbgFps.textContent = Math.round(60 / dt);
    dbgY.textContent = Math.round(player.y);
    dbgDpr.textContent = window.devicePixelRatio;
    dbgRes.textContent = `${canvas.clientWidth} / ${canvas.clientHeight}`;
  }
}

function drawDebugHitboxes() {
  if (!debug) return;

  ctx.save();
  ctx.lineWidth = 2;

  // Draw Player Hitbox (Yellow)
  const hitPaddingX = player.width * config.hitPadding;
  const hitPaddingY = player.height * config.hitPadding * 1.25;

  ctx.strokeStyle = "yellow";
  ctx.strokeRect(
    player.x + hitPaddingX,
    player.y + hitPaddingY,
    player.width - hitPaddingX * 2,
    player.height - hitPaddingY * 2,
  );

  // Draw Obstacle Hitbox (Red)
  ctx.strokeStyle = "red";
  obstacles.forEach((obs) => {
    // Top obstacle
    ctx.strokeRect(obs.x, 0, obs.width, obs.topHeight);
    // Bottom obstacle
    ctx.strokeRect(
      obs.x,
      obs.bottomY,
      obs.width,
      canvas.clientHeight - obs.bottomY,
    );
  });

  ctx.restore();
}
//#endregion

window.onload = init; // Runs the initialisation on page load
