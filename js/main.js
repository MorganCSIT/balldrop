/**
 * Main Game Module
 * Entry point for the game
 */

import THREE from "./utils/three-wrapper.js";
import { GAME_SETTINGS, BACKGROUND_COLORS } from "./config.js";
import {
  createBall,
  resetBallState,
  updateBallPosition,
  getBall,
  getExtraJumps,
  addExtraJumps,
} from "./entities/ball.js";
import {
  initAbilities,
  resetAbilities,
  addGrab,
  executeGrab,
  isGrabbingState,
  endGrab,
} from "./entities/abilities.js";
import {
  createClaw,
  updateClaw,
  resetClaw,
  getClaw,
  setClawPosition,
} from "./entities/claw.js";
import {
  createJetpack,
  updateJetpack,
  resetJetpack,
  getJetpack,
} from "./entities/jetpack.js";
import {
  createStartingPlatforms,
  getPlatforms,
  cleanupPlatforms,
  addPlatformsAsNeeded,
  resetPlatforms,
  removeAllPlatformsExceptRedFlag,
  setLastPlatformState,
  getLastPlatformState,
  createPlatform,
  updateMovingPlatforms,
} from "./entities/platform.js";
import { updateFlag, resetFlag } from "./entities/flag.js";
import {
  spawnPowerUps,
  updatePowerUps,
  cleanupPowerUps,
  resetPowerUps,
} from "./entities/powerup.js";
import {
  isOnPlatform,
  handlePlatformCollisions,
  handlePowerUpCollisions,
  checkFallOutOfBounds,
} from "./systems/collision.js";
import {
  initControls,
  getKeys,
  resetKeys,
  onKeyDown,
  onKeyUp,
} from "./systems/controls.js";
import {
  isTouchDevice,
  initTouchControls,
  toggleTouchControlsVisibility,
  virtualKeys,
  updateTouchControlsState,
} from "./systems/touch-controls.js";
import {
  initLevel,
  checkLevelCompletion,
  updateDifficulty,
} from "./systems/levels.js";
import {
  updateScore,
  updateLevel,
  updateJetpackFuel,
  updateExtraJumps,
  showGameOver,
  hideGameOver,
  showStartModal,
  hideStartModal,
  updateBackgroundColor,
  resetUI,
  updateSOSCounter,
} from "./systems/ui.js";

// Game variables
let scene, camera, renderer;
let score = 0;
let level = 1;
let speed = GAME_SETTINGS.initialSpeed;
let gameOver = false;
let gameStarted = false;
let ballReleased = false;
let jetpackFuel = 0;
let isJetpackActive = false;
let redFlagPlatformReached = false;
let currentBackgroundColor = 0;
let clock = new THREE.Clock();
let deltaTime;
let distanceTraveled = 0;
let levelTransitionEffect = null;
let isTransitioning = false;
let isGeneratingNextLevel = false; // Flag to track if we're generating platforms for the next level
let isPaused = false; // Flag to track if the game is paused for grab aiming

/**
 * Initialize the game
 */
function init() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLORS[currentBackgroundColor]);
  scene.fog = new THREE.FogExp2(
    BACKGROUND_COLORS[currentBackgroundColor],
    0.002
  );

  // Make scene globally accessible for abilities
  window.gameScene = scene;

  // Create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.getElementById("game-container").appendChild(renderer.domElement);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // Create the ball (player)
  const ball = createBall();
  scene.add(ball);

  // Create the mechanical claw
  createClaw(scene);

  // Create jetpack for the ball
  createJetpack(ball);

  // Initialize abilities
  initAbilities();

  // Initialize touch controls if on a touch device
  initTouchControls();
  if (isTouchDevice()) {
    toggleTouchControlsVisibility(true);
  }

  // Reset ball released state
  ballReleased = false;

  // Create initial platforms
  createStartingPlatforms(scene);

  // Initialize counters
  updateJetpackFuel(jetpackFuel);
  updateExtraJumps(getExtraJumps());

  // Add event listeners
  window.addEventListener("resize", onWindowResize);

  // Add keyboard event listeners
  document.addEventListener("keydown", (event) =>
    onKeyDown(
      event,
      restartGame,
      gameOver,
      ballReleased,
      jetpackFuel,
      setJetpackActive,
      setGameStarted,
      (released) => {
        ballReleased = released;
      },
      scene,
      pauseGame,
      setClawPosition
    )
  );
  document.addEventListener("keyup", (event) =>
    onKeyUp(event, setJetpackActive)
  );

  // Make important functions available globally for touch controls
  window.gameState = {
    gameOver: gameOver,
    ballReleased: ballReleased,
    jetpackFuel: jetpackFuel,
    gameStarted: gameStarted,
    setJetpackActive: setJetpackActive,
    setGameStarted: setGameStarted,
    setBallReleased: (released) => {
      ballReleased = released;
    },
    scene: scene,
    pauseGame: pauseGame,
    setClawPosition: setClawPosition,
  };

  // Make sure the buttons have event listeners
  const restartButton = document.getElementById("restart-button");
  if (restartButton) {
    restartButton.addEventListener("click", restartGame);
  }

  const startButton = document.getElementById("start-button");
  if (startButton) {
    startButton.addEventListener("click", startGame);
    console.log("Start button listener added");
    // Also handle touchstart for mobile compatibility
    startButton.addEventListener(
      "touchstart",
      (event) => {
        // Prevent the touch event from propagating to the general touch handlers
        event.stopPropagation();
        startGame();
      },
      { passive: false }
    ); // Use passive: false to allow stopPropagation
  }

  // Show the start modal
  showStartModal();

  // Pause the game until the start button is clicked
  gameStarted = false;

  // Start the game loop (rendering will still happen, but game logic is paused)
  animate();
}

/**
 * Handle window resize
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Set jetpack active state
 * @param {boolean} active - Whether the jetpack is active
 */
function setJetpackActive(active) {
  isJetpackActive = active;

  // If fuel runs out, deactivate jetpack
  if (jetpackFuel <= 0) {
    isJetpackActive = false;
  }
}

/**
 * Set game started state
 * @param {boolean} started - Whether the game has started
 */
function setGameStarted(started) {
  gameStarted = started;
}

/**
 * Pause or unpause the game for grab aiming
 * @param {boolean} paused - Whether the game should be paused
 */
function pauseGame(paused) {
  isPaused = paused;

  // If pausing, stop the clock to prevent time from advancing
  if (paused) {
    clock.stop();
    console.log("Game paused for grab aiming");
  } else {
    // If unpausing, start the clock again
    clock.start();
    console.log("Game unpaused, continuing with current trajectory");
  }
}

/**
 * Start the game when the start button is clicked
 */
function startGame() {
  console.log("Start game function called");

  // Hide the start modal
  hideStartModal();

  // Reset game state
  restartGame();

  // Don't start movement until player presses a key or touches the screen
  gameStarted = false;

  // On touch devices, start the game immediately
  if (isTouchDevice()) {
    // We no longer start immediately; wait for first jump/release touch input
  }
}

// Make functions available globally
window.startGame = startGame;
window.restartGame = restartGame;

/**
 * End the game
 */
function endGame() {
  gameOver = true;
  showGameOver(score);
}

/**
 * Restart the game
 */
function restartGame() {
  // Reset game variables
  score = 0;
  level = 1;
  speed = GAME_SETTINGS.initialSpeed;
  gameOver = false;
  gameStarted = false;
  ballReleased = false;
  jetpackFuel = 0;
  isJetpackActive = false;
  redFlagPlatformReached = false;
  distanceTraveled = 0;
  isTransitioning = false;
  isGeneratingNextLevel = false;

  // Remove any existing transition effect
  if (levelTransitionEffect) {
    scene.remove(levelTransitionEffect);
    levelTransitionEffect = null;
  }

  // Reset background color
  currentBackgroundColor = 0;
  updateBackgroundColor(scene, currentBackgroundColor, BACKGROUND_COLORS);

  // Reset UI
  resetUI();

  // Reset entities
  resetBallState();
  resetPlatforms(scene);
  resetPowerUps(scene);
  resetFlag();
  resetJetpack();
  resetClaw(scene);
  resetKeys();
  resetAbilities(scene);

  // Create initial platforms with a green trampoline at the start
  createStartingPlatforms(scene);
}

/**
 * Update the game state
 */
function update() {
  deltaTime = clock.getDelta();

  // Always render the claw and ball even when game is not started
  const ball = getBall();
  const claw = getClaw();

  // Update global game state for touch controls
  if (window.gameState) {
    window.gameState.gameOver = gameOver;
    window.gameState.ballReleased = ballReleased;
    window.gameState.jetpackFuel = jetpackFuel;
    window.gameState.gameStarted = gameStarted;
  }

  if (gameOver || !gameStarted || isPaused) {
    // Even when the game is paused, make sure the claw and ball are properly shown
    if (!ballReleased || (isPaused && isGrabbingState())) {
      // Allow claw movement when paused for grab aiming
      const isGrabbing = isPaused && isGrabbingState();
      updateClaw(getCombinedKeys(), null, ballReleased, isGrabbing);

      // Update ball position to match claw in a safer way
      if (ball && claw) {
        // Only update the Y position to prevent teleporting
        ball.position.y = claw.position.y;
      }

      // Update touch controls for grab mode
      if (isTouchDevice()) {
        updateTouchControlsState();
      }
    }

    // Always update touch controls when ball is not released (initial state)
    // This ensures correct control display before release
    if (isTouchDevice() && !ballReleased) {
      updateTouchControlsState();
    }

    // Update camera to look at the ball
    if (ball) {
      camera.position.x = ball.position.x + GAME_SETTINGS.cameraOffset.x;
      camera.position.y = ball.position.y + GAME_SETTINGS.cameraOffset.y;
      camera.position.z = ball.position.z + GAME_SETTINGS.cameraOffset.z;
      camera.lookAt(ball.position);
    }

    return;
  }

  // If the ball is still in the claw or in grab mode, update the claw position
  if (!ballReleased || isGrabbingState()) {
    updateClaw(getCombinedKeys(), null, ballReleased, isGrabbingState());

    // Update ball position to match claw in a safer way
    if (ball && claw) {
      // Only update the Y position to prevent teleporting
      ball.position.y = claw.position.y;
    }

    // Update touch controls for grab mode
    if (isTouchDevice()) {
      updateTouchControlsState();
    }
  } else {
    // Otherwise, update the ball position normally
    const ballState = updateBallPosition(
      getCombinedKeys(),
      deltaTime,
      speed,
      isJetpackActive,
      jetpackFuel,
      isOnPlatform
    );

    // Update jetpack if it exists
    const updatedVelocity = updateJetpack(
      isJetpackActive,
      jetpackFuel,
      ballState.velocity,
      (newFuel) => {
        jetpackFuel = newFuel;
        updateJetpackFuel(jetpackFuel);
      }
    );

    // Update flag animation
    updateFlag();

    // Ensure touch controls are updated even in normal gameplay
    if (isTouchDevice()) {
      updateTouchControlsState();
    }
  }

  // Update camera position to follow the ball
  camera.position.x = ball.position.x + GAME_SETTINGS.cameraOffset.x;
  camera.position.y = ball.position.y + GAME_SETTINGS.cameraOffset.y;
  camera.position.z = ball.position.z + GAME_SETTINGS.cameraOffset.z;
  camera.lookAt(ball.position);

  // Handle platform collisions
  const collisionResult = handlePlatformCollisions(speed, () => {
    // When the red flag platform is reached, remove all other platforms
    removeAllPlatformsExceptRedFlag(scene);
    redFlagPlatformReached = true;
  });
  speed = collisionResult.speed;

  // Update moving platforms
  updateMovingPlatforms(deltaTime);

  // Check if the ball has fallen too far from the nearest platform
  if (checkFallOutOfBounds(getPlatforms())) {
    endGame();
    return;
  }

  // Remove platforms and power-ups that are too far behind
  const removeDistance = 30;
  cleanupPlatforms(ball.position, removeDistance, scene);
  cleanupPowerUps(ball.position, removeDistance, scene);

  // Add new platforms as needed
  addPlatformsAsNeeded(scene, level);

  // Randomly spawn power-ups (increased chance from 0.5% to 3%)
  if (Math.random() < 0.03) {
    spawnPowerUps(getPlatforms(), scene, level);
  }

  // Occasionally spawn a burst of powerups (0.2% chance per frame)
  if (Math.random() < 0.002) {
    // Spawn 2-3 powerups at once
    const burstCount = Math.random() < 0.5 ? 2 : 3;
    for (let i = 0; i < burstCount; i++) {
      spawnPowerUps(getPlatforms(), scene, level);
    }
  }

  // Occasionally spawn a claw powerup specifically (0.5% chance per frame)
  // This ensures claw powerups appear regularly
  if (Math.random() < 0.005) {
    spawnPowerUps(getPlatforms(), scene, level, "SOS");
  }

  // Update power-ups (rotation and floating animation)
  updatePowerUps(deltaTime);

  // Check for collisions with power-ups
  const powerUpResult = handlePowerUpCollisions(
    scene,
    getJetpack(),
    currentBackgroundColor,
    BACKGROUND_COLORS,
    (newFuel) => {
      jetpackFuel = newFuel;
      updateJetpackFuel(jetpackFuel);
    },
    (amount) => {
      addExtraJumps(amount);
      updateExtraJumps(getExtraJumps());
    },
    addGrab
  );

  // Update background color if changed by power-up
  if (powerUpResult.backgroundColorIndex !== currentBackgroundColor) {
    currentBackgroundColor = powerUpResult.backgroundColorIndex;
    updateBackgroundColor(scene, currentBackgroundColor, BACKGROUND_COLORS);
  }

  // Check if the player has reached the end of the level
  if (redFlagPlatformReached) {
    const levelState = checkLevelCompletion(
      redFlagPlatformReached,
      level,
      speed,
      scene,
      (colorIndex) => {
        currentBackgroundColor = colorIndex;
        updateBackgroundColor(scene, currentBackgroundColor, BACKGROUND_COLORS);
      }
    );

    level = levelState.level;
    speed = levelState.speed;
    redFlagPlatformReached = levelState.redFlagPlatformReached;
  }

  // Update score based on distance traveled
  const newScore = Math.floor(Math.abs(ball.position.z));
  if (newScore > score) {
    score = newScore;
    updateScore(score);

    // Track distance traveled for level progression
    distanceTraveled = newScore;

    // Calculate the next level threshold
    const nextLevelThreshold = GAME_SETTINGS.distanceForNextLevel * level;

    // Generate new platforms when player reaches 75% of the distance threshold
    // This ensures platforms are generated before the player reaches the end
    if (
      distanceTraveled >= nextLevelThreshold * 0.75 &&
      !isGeneratingNextLevel &&
      !isTransitioning
    ) {
      // Set flag to prevent multiple generations
      isGeneratingNextLevel = true;

      // Log for debugging
      console.log(
        `Generating platforms for next level at ${Math.round(
          (distanceTraveled / nextLevelThreshold) * 100
        )}% of level ${level}`
      );

      // Generate new platforms for the next level without removing existing ones
      addPlatformsForNextLevel(scene, level + 1);

      // Reset the generation flag after a delay to prevent multiple triggers
      setTimeout(() => {
        isGeneratingNextLevel = false;
      }, 1000);
    }

    // Show level transition when player reaches 100% of the distance threshold
    if (distanceTraveled >= nextLevelThreshold && !isTransitioning) {
      // Mark as transitioning to prevent multiple triggers
      isTransitioning = true;

      // Log for debugging
      console.log(
        `Level ${level} complete! Distance: ${distanceTraveled}, Threshold: ${nextLevelThreshold}`
      );

      // Create a visual indicator for the player
      const levelText = document.createElement("div");
      levelText.style.position = "absolute";
      levelText.style.top = "50%";
      levelText.style.left = "50%";
      levelText.style.transform = "translate(-50%, -50%)";
      levelText.style.color = "#00ffff";
      levelText.style.fontSize = "48px";
      levelText.style.fontWeight = "bold";
      levelText.style.textShadow = "0 0 10px #00ffff";
      levelText.style.opacity = "0";
      levelText.style.transition = "opacity 0.5s ease-in-out";
      levelText.style.zIndex = "1000";
      levelText.textContent = `LEVEL ${level + 1}`;
      document.body.appendChild(levelText);

      // Fade in the level text
      setTimeout(() => {
        levelText.style.opacity = "1";
      }, 100);

      // Set a timeout to actually change the level after the text animation
      setTimeout(() => {
        // Update background color for the new level
        const newColorIndex = level % BACKGROUND_COLORS.length;
        currentBackgroundColor = newColorIndex;
        updateBackgroundColor(scene, currentBackgroundColor, BACKGROUND_COLORS);

        // Increment level
        level++;
        updateLevel(level);

        // No need to generate platforms here since they were already generated at 75% threshold
        // Just update the level counter and background color

        // Fade out the level text
        levelText.style.opacity = "0";

        // Remove the level text after fade out
        setTimeout(() => {
          document.body.removeChild(levelText);
        }, 500);

        // Reset transition state after a delay
        setTimeout(() => {
          isTransitioning = false;
        }, 1000);
      }, 1500);
    }

    // Increase speed as score increases
    // speed = updateDifficulty(score, speed);
  }
}

/**
 * Create a visual effect for level transition
 * @param {THREE.Vector3} position - Position to create the effect
 */
function createLevelTransitionEffect(position) {
  // Remove any existing effect
  if (levelTransitionEffect) {
    scene.remove(levelTransitionEffect);
  }

  // Create a group to hold all portal elements
  levelTransitionEffect = new THREE.Group();

  // Create a glowing portal effect (outer ring) - increased size by 60%
  const outerRingGeometry = new THREE.TorusGeometry(12, 1.2, 32, 100); // 60% larger
  const outerRingMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 4, // Doubled intensity
    side: THREE.DoubleSide,
  });
  const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);

  // Create inner ring with different color - increased size by 60%
  const innerRingGeometry = new THREE.TorusGeometry(8, 0.8, 32, 100); // 60% larger
  const innerRingMaterial = new THREE.MeshStandardMaterial({
    color: 0x0088ff,
    emissive: 0x0088ff,
    emissiveIntensity: 4, // Doubled intensity
    side: THREE.DoubleSide,
  });
  const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);

  // Add rings to the group
  levelTransitionEffect.add(outerRing);
  levelTransitionEffect.add(innerRing);

  // Position the portal in a more visible location
  // Higher up and closer to ensure it's in the player's field of view
  levelTransitionEffect.position.set(
    position.x,
    position.y + 8,
    position.z - 15
  );

  // No rotation needed - the torus is already vertical by default
  // This allows the ball to roll through it instead of falling into it

  scene.add(levelTransitionEffect);

  // Add a stronger point light at the portal for extra glow
  const portalLight = new THREE.PointLight(0x00ffff, 10, 50); // Brighter light with longer range
  portalLight.position.copy(levelTransitionEffect.position);
  levelTransitionEffect.add(portalLight);

  // Create more particles for a more visible effect
  const particlesGeometry = new THREE.BufferGeometry();
  const particleCount = 200; // Doubled particle count
  const posArray = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    // Create particles in a circular pattern
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 6; // Increased radius for larger portal
    posArray[i] = Math.cos(angle) * radius; // x
    posArray[i + 1] = Math.sin(angle) * radius; // y
    posArray[i + 2] = (Math.random() - 0.5) * 3; // z - wider spread
  }

  particlesGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(posArray, 3)
  );

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.3, // Larger particles
    color: 0x00ffff,
    transparent: true,
    opacity: 0.9, // More opaque
  });

  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  levelTransitionEffect.add(particles);

  // Add a second light on the other side for better visibility from all angles
  const backLight = new THREE.PointLight(0x0088ff, 8, 40);
  backLight.position.set(0, 0, 5); // Position behind the portal
  levelTransitionEffect.add(backLight);

  // Animate the portal - no rotation as requested, but more pronounced pulsing
  const animate = () => {
    if (levelTransitionEffect) {
      // Scale effect for pulsing animation only - more pronounced
      const scale = 1 + Math.sin(performance.now() * 0.002) * 0.15; // Increased amplitude
      outerRing.scale.set(scale, scale, 1);
      innerRing.scale.set(scale * 0.9, scale * 0.9, 1);

      // Pulse the light intensity too
      portalLight.intensity = 8 + Math.sin(performance.now() * 0.003) * 4;

      // Slowly move particles for subtle motion
      particles.rotation.z += 0.001;

      requestAnimationFrame(animate);
    }
  };

  animate();
}

/**
 * Add platforms for the next level without removing existing ones
 * @param {THREE.Scene} scene - The scene
 * @param {number} level - The new level number
 */
function addPlatformsForNextLevel(scene, level) {
  // Get the furthest platform to start generating from
  const platforms = getPlatforms();

  if (platforms.length === 0) {
    // If no platforms exist, create starting platforms
    createStartingPlatforms(scene);
    return;
  }

  // Sort platforms by Z position (from closest to furthest)
  // Note: More negative Z values are further away
  platforms.sort((a, b) => a.position.z - b.position.z);

  // Get the furthest platform (the one with the most negative Z value)
  const furthestPlatform = platforms[0];

  console.log(`Furthest platform at Z: ${furthestPlatform.position.z}`);

  // Save the current platform state to restore later
  const originalState = getLastPlatformState();

  // Set the last platform position to the furthest platform
  // This ensures new platforms will be generated from this position
  setLastPlatformState(
    {
      x: furthestPlatform.position.x,
      y: furthestPlatform.position.y,
      z: furthestPlatform.position.z - 20, // Start a bit further ahead
    },
    furthestPlatform.userData.type || "center"
  );

  // Calculate how many platforms to generate based on level
  // Higher levels have more platforms for increased difficulty
  const platformCount =
    GAME_SETTINGS.platformsPerLevel + Math.floor(level / 2) * 5;

  // Generate new platforms for the next level
  for (let i = 0; i < platformCount; i++) {
    // Create platforms directly instead of using addPlatformsAsNeeded
    // This gives us more control over the generation
    const platform = createPlatform(false, scene, level);
    console.log(
      `Generated platform ${i + 1}/${platformCount} at Z: ${
        platform.position.z
      }`
    );
  }

  // Generate extra platforms to ensure there's always enough ahead
  const extraPlatforms = 10;
  for (let i = 0; i < extraPlatforms; i++) {
    createPlatform(false, scene, level);
  }

  console.log(
    `Generated ${
      platformCount + extraPlatforms
    } new platforms for level ${level}`
  );
}

/**
 * Animation loop
 */
function animate() {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
}

// Start the game
init();

// Combine keyboard and virtual touch keys
function getCombinedKeys() {
  const keyboardKeys = getKeys();
  return {
    left: keyboardKeys.left || virtualKeys.left,
    right: keyboardKeys.right || virtualKeys.right,
    up: keyboardKeys.up || virtualKeys.up,
    down: keyboardKeys.down || virtualKeys.down,
    space: keyboardKeys.space || virtualKeys.space,
    // Add any other keys if needed
  };
}
