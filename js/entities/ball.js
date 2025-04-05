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
    if (ballVelocity.x !== 0) {
      // If there's horizontal velocity, the ball rolled off
      airEntryMethod = "rolled";
    } else {
      // Otherwise, the ball fell off
      airEntryMethod = "fell";
    }
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

  // Improved ball rotation based on movement and velocity
  // This makes the ball roll more realistically
  ball.rotation.x -= (speed + Math.abs(ballVelocity.z)) * deltaTime * 60;
  ball.rotation.z -= ballVelocity.x * deltaTime * 60;

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
 */
export function applyPlatformEffects(platformInfo, speed) {
  if (platformInfo.onPlatform && ballVelocity.y < 0) {
    // No bounce back effect - just stop the ball
    ballVelocity.y = 0;
    isJumping = false;
    hasDoubleJumped = false; // Reset double jump flag when landing
    airEntryMethod = ""; // Reset air entry method when landing
    // Do NOT reset extra jumps when landing - they should persist until used

    // If it's a regular trampoline, bounce with reduced force
    if (platformInfo.isTrampoline) {
      ballVelocity.y = GAME_SETTINGS.maxJumpForce * 1.5; // Reduced bounce on trampolines
      isJumping = true;
      airEntryMethod = "bounced"; // Set air entry method to bounced
    }

    // If it's a diagonal trampoline, apply diagonal velocity
    if (platformInfo.isDiagonalTrampoline) {
      // Set vertical velocity for the bounce
      ballVelocity.y = GAME_SETTINGS.maxJumpForce * 1.4; // Reduced bounce on diagonal trampolines
      isJumping = true;
      airEntryMethod = "bounced"; // Set air entry method to bounced

      // Apply horizontal velocity based on the diagonal direction
      const diagonalForce = 0.3; // Horizontal force for diagonal jumps

      switch (platformInfo.diagonalDirection) {
        case "left-forward":
          ballVelocity.x = -diagonalForce; // Move left
          speed += 0.1; // Temporary speed boost forward
          break;
        case "right-forward":
          ballVelocity.x = diagonalForce; // Move right
          speed += 0.1; // Temporary speed boost forward
          break;
        case "left-backward":
          ballVelocity.x = -diagonalForce; // Move left
          speed -= 0.1; // Temporary slow down
          break;
        case "right-backward":
          ballVelocity.x = diagonalForce; // Move right
          speed -= 0.1; // Temporary slow down
          break;
      }

      // Ensure speed doesn't go negative or too slow
      if (speed < 0.1) speed = 0.1;
    }

    return speed;
  }

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
    ballVelocity.y = GAME_SETTINGS.jumpForce * 1.3; // Even stronger than double jump
    extraJumps--; // Use one extra jump
  } else if (isDoubleJump) {
    // Regular double jump
    ballVelocity.y = GAME_SETTINGS.jumpForce * 1.2; // Slightly stronger than regular jump
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
