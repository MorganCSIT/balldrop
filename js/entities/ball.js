/**
 * Ball Entity
 * Handles creation and movement of the player ball
 */

import THREE from "../utils/three-wrapper.js";
import { GAME_SETTINGS } from "../config.js";
import { clamp } from "../utils/helpers.js";
import { getCurrentPlatform } from "./platform.js";

// Ball reference
let ball = null;

// Ball state
let ballVelocity = { x: 0, y: 0, z: 0 };
let isJumping = false;
let hasDoubleJumped = false;
let jumpChargeTime = 0;
// Track how the player got into the air: "jumped", "bounced", "rolled", "fell"
let airEntryMethod = "";
// Track if the player was on a platform in the previous frame
let wasOnPlatform = false;
// Extra jumps counter
let extraJumps = 0;

/**
 * Create the player (red ball with visible features to show rolling)
 * @returns {THREE.Group} The ball object
 */
export function createBall() {
  // Create a group to hold the ball and its features
  ball = new THREE.Group();

  // Create the main ball
  const ballGeometry = new THREE.SphereGeometry(1, 32, 32);
  const ballMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
  });
  const mainBall = new THREE.Mesh(ballGeometry, ballMaterial);
  mainBall.castShadow = true;
  ball.add(mainBall);

  // Add visible features to show rolling
  // Add white stripes
  const stripeGeometry = new THREE.BoxGeometry(2.1, 0.1, 0.1);
  const stripeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  // Horizontal stripe
  const horizontalStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
  horizontalStripe.position.set(0, 0, 0);
  ball.add(horizontalStripe);

  // Vertical stripe
  const verticalStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
  verticalStripe.position.set(0, 0, 0);
  verticalStripe.rotation.z = Math.PI / 2; // Rotate 90 degrees
  ball.add(verticalStripe);

  // Add a third stripe at an angle
  const diagonalStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
  diagonalStripe.position.set(0, 0, 0);
  diagonalStripe.rotation.z = Math.PI / 4; // Rotate 45 degrees
  ball.add(diagonalStripe);

  // Position the ball
  ball.position.set(0, 10, 0);
  ball.castShadow = true;
  ball.receiveShadow = true;

  return ball;
}

/**
 * Update ball position based on keyboard input
 * @param {Object} keys - The keyboard state
 * @param {number} deltaTime - Time since last frame
 * @param {number} speed - Current game speed
 * @param {boolean} isJetpackActive - Whether the jetpack is active
 * @param {number} jetpackFuel - Current jetpack fuel
 * @param {Function} isOnPlatform - Function to check if ball is on platform
 * @returns {Object} Updated ball state
 */
export function updateBallPosition(
  keys,
  deltaTime,
  speed,
  isJetpackActive,
  jetpackFuel,
  isOnPlatform
) {
  const acceleration = 0.01;
  const maxVelocity = 0.3;
  const friction = 0.98;
  const onPlatformNow = isOnPlatform();

  // Check if the ball has rolled/fallen off a platform
  if (wasOnPlatform && !onPlatformNow && !isJumping) {
    // Ball was on platform last frame but not this frame, and not jumping
    // This means the ball rolled or fell off the platform
    if (Math.abs(ballVelocity.x) > 0.01) {
      // If there's significant horizontal velocity, the ball rolled off
      airEntryMethod = "rolled";
      // Don't set jumping state to true here, to allow for first jump after rolling
      console.log("Ball rolled off platform - airEntryMethod set to 'rolled'");
    } else {
      // Otherwise, the ball fell off
      airEntryMethod = "fell";
      console.log("Ball fell off platform - airEntryMethod set to 'fell'");
    }

    // Reset double jump state to ensure double jump is available after rolling/falling
    hasDoubleJumped = false;
  }

  // Update wasOnPlatform for the next frame
  wasOnPlatform = onPlatformNow;

  // If the ball is on a platform, check if it's a moving platform
  if (onPlatformNow) {
    // Get the current platform
    const currentPlatform = getCurrentPlatform(ball.position, ballVelocity);

    // If it's a moving platform, apply its movement to the ball
    if (
      currentPlatform &&
      currentPlatform.userData.isMovingPlatform &&
      currentPlatform.userData.lastPosition
    ) {
      // Calculate platform movement delta since last frame
      const deltaX =
        currentPlatform.position.x - currentPlatform.userData.lastPosition.x;
      const deltaY =
        currentPlatform.position.y - currentPlatform.userData.lastPosition.y;
      const deltaZ =
        currentPlatform.position.z - currentPlatform.userData.lastPosition.z;

      // Apply platform movement to ball
      ball.position.x += deltaX;
      ball.position.y += deltaY;
      ball.position.z += deltaZ;
    }
  }

  // Apply acceleration based on key presses
  if (keys.left) ballVelocity.x -= acceleration;
  if (keys.right) ballVelocity.x += acceleration;

  // Apply friction to horizontal movement
  ballVelocity.x *= friction;

  // Limit maximum horizontal velocity
  ballVelocity.x = clamp(ballVelocity.x, -maxVelocity, maxVelocity);

  // Update jump charge time if spacebar is being held
  if (keys.space && !isJumping && onPlatformNow) {
    jumpChargeTime += deltaTime;
    // Limit maximum charge time
    if (jumpChargeTime > 0.5) jumpChargeTime = 0.5;
  }

  // Apply gravity to vertical movement with improved physics
  // Don't apply gravity if jetpack is active and has fuel
  if (!isJetpackActive || jetpackFuel <= 0) {
    // Apply stronger initial gravity to make the ball drop faster when released
    ballVelocity.y -= GAME_SETTINGS.gravity * deltaTime * 60;
  }

  // Terminal velocity for more realistic falling
  const terminalVelocity = -0.5;
  if (ballVelocity.y < terminalVelocity) {
    ballVelocity.y = terminalVelocity;
  }

  // Update ball position
  ball.position.x += ballVelocity.x * deltaTime * 60;
  ball.position.y += ballVelocity.y * deltaTime * 60;

  // Add automatic forward movement (the ball is always rolling forward)
  ball.position.z -= speed * deltaTime * 60;

  // Calculate rotation based on actual movement distance
  // For a ball with radius 1, one full rotation (2*PI radians) should happen when it travels 2*PI units
  const rotationFactor = 1 / (2 * Math.PI); // For a ball of radius 1
  ball.rotation.x -= speed * rotationFactor * deltaTime * 360; // Forward rotation based on speed (increased for better feel)
  ball.rotation.z -= ballVelocity.x * rotationFactor * deltaTime * 360; // Side rotation based on x velocity (increased for better feel)

  return {
    position: ball.position,
    velocity: ballVelocity,
    isJumping,
    hasDoubleJumped,
    jumpChargeTime,
    airEntryMethod,
  };
}

/**
 * Apply platform collision effects to the ball
 * @param {Object} platformInfo - Information about the platform collision
 * @param {number} speed - Current game speed
 * @returns {number} The potentially updated game speed
 */
export function applyPlatformEffects(platformInfo, speed) {
  // Check if the ball just landed on a platform (velocity is downward)
  if (platformInfo.onPlatform && ballVelocity.y < 0) {
    // Reset vertical velocity and flags upon landing
    ballVelocity.y = 0;
    isJumping = false;
    hasDoubleJumped = false; // Reset double jump flag
    airEntryMethod = ""; // Reset air entry method

    // Apply bounce effect based on the platform type
    switch (platformInfo.bounceEffect) {
      case "forward":
        // Speed-up (Green) Platform: Bounce up, slightly forward impulse, and slightly increase base speed
        ballVelocity.y = GAME_SETTINGS.maxJumpForce * 1.5; // Standard bounce force
        ballVelocity.z -= 0.1; // Keep small forward impulse
        speed += 0.025; // Increase the base forward speed by 25% of the previous increment (0.1 * 0.25)
        isJumping = false; // Bounce doesn't count as the first jump
        airEntryMethod = "bounced";
        hasDoubleJumped = false; // Ensure double jump is available
        console.log(
          "Trampoline bounce (forward) - isJumping: false, airEntryMethod: bounced"
        ); // Added log
        break;

      case "backward":
        // Slow-down (Orange) Platform: Bounce up, backward impulse, and decrease base speed
        ballVelocity.y = GAME_SETTINGS.maxJumpForce * 1.5; // Standard bounce force
        ballVelocity.z += 0.2; // Keep backward impulse
        speed -= 0.05; // Decrease the base forward speed (adjust value as needed)
        // Ensure speed doesn't become too low or negative
        if (speed < GAME_SETTINGS.minSpeed) {
          speed = GAME_SETTINGS.minSpeed; // Assuming GAME_SETTINGS.minSpeed exists, otherwise use a small positive value like 0.1
        }
        isJumping = false; // Bounce doesn't count as the first jump
        airEntryMethod = "bounced";
        hasDoubleJumped = false; // Ensure double jump is available
        console.log(
          "Trampoline bounce (backward) - isJumping: false, airEntryMethod: bounced"
        ); // Added log
        break;

      default:
        // Regular platform or no bounce effect defined
        // Just landing, velocity already set to 0 above.
        break;
    }

    // Return the potentially modified speed
    return speed;
  }

  // If not on a platform or moving upwards, return the current speed
  return speed;
}

/**
 * Make the ball jump
 * @param {boolean} isDoubleJump - Whether this is a double jump
 * @param {boolean} isExtraJump - Whether this is an extra jump (beyond double jump)
 * @returns {number} Current number of extra jumps remaining
 */
export function jump(isDoubleJump = false, isExtraJump = false) {
  if (isExtraJump) {
    // Extra jump (beyond double jump)
    ballVelocity.y = GAME_SETTINGS.jumpForce * 1.0; // Same force as regular jump
    extraJumps--; // Use one extra jump
  } else if (isDoubleJump) {
    // Regular double jump
    ballVelocity.y = GAME_SETTINGS.jumpForce * 1.0; // Same force as regular jump
    hasDoubleJumped = true;
  } else {
    // First jump
    isJumping = true;
    hasDoubleJumped = false; // Reset double jump flag
    ballVelocity.y = GAME_SETTINGS.jumpForce;
    jumpChargeTime = 0; // Reset charge time

    // If we're on a platform, set air entry method to jumped
    if (wasOnPlatform) {
      airEntryMethod = "jumped";
    }
  }
  return extraJumps;
}

/**
 * Apply additional jump force based on charge time
 * @param {number} additionalForce - Additional force to apply
 */
export function applyJumpForce(additionalForce) {
  ballVelocity.y += additionalForce;
}

/**
 * Get the ball object
 * @returns {THREE.Group} The ball object
 */
export function getBall() {
  return ball;
}

/**
 * Get the ball velocity
 * @returns {Object} The ball velocity
 */
export function getBallVelocity() {
  return ballVelocity;
}

/**
 * Set the ball velocity
 * @param {Object} velocity - The new ball velocity
 */
export function setBallVelocity(velocity) {
  ballVelocity = velocity;
}

/**
 * Check if the ball is jumping
 * @returns {boolean} Whether the ball is jumping
 */
export function isJumpingState() {
  return isJumping;
}

/**
 * Set the jumping state
 * @param {boolean} state - The new jumping state
 */
export function setJumpingState(state) {
  isJumping = state;
}

/**
 * Check if the ball has double jumped
 * @returns {boolean} Whether the ball has double jumped
 */
export function hasDoubleJumpedState() {
  return hasDoubleJumped;
}

/**
 * Set the double jumped state
 * @param {boolean} state - The new double jumped state
 */
export function setDoubleJumpedState(state) {
  hasDoubleJumped = state;
}

/**
 * Get the jump charge time
 * @returns {number} The jump charge time
 */
export function getJumpChargeTime() {
  return jumpChargeTime;
}

/**
 * Get the air entry method
 * @returns {string} How the player got into the air
 */
export function getAirEntryMethod() {
  return airEntryMethod;
}

/**
 * Set the air entry method
 * @param {string} method - The new air entry method ("jumped", "bounced", "rolled", "fell", etc.)
 */
export function setAirEntryMethod(method) {
  airEntryMethod = method;
}

/**
 * Get the number of extra jumps
 * @returns {number} The number of extra jumps
 */
export function getExtraJumps() {
  return extraJumps;
}

/**
 * Add extra jumps
 * @param {number} amount - The number of extra jumps to add
 */
export function addExtraJumps(amount) {
  extraJumps += amount;
}

/**
 * Reset the ball state
 */
export function resetBallState() {
  ballVelocity = { x: 0, y: 0, z: 0 };
  isJumping = false;
  hasDoubleJumped = false;
  jumpChargeTime = 0;
  airEntryMethod = "";
  wasOnPlatform = false;
  extraJumps = 0;

  if (ball) {
    ball.position.set(0, 10, 0);
    ball.rotation.set(0, 0, 0);
  }
}
