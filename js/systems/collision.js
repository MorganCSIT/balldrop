/**
 * Collision System
 * Handles collision detection and response
 */

import {
  getBall,
  getBallVelocity,
  applyPlatformEffects,
  getExtraJumps,
  addExtraJumps,
} from "../entities/ball.js";
import { checkPlatformCollision } from "../entities/platform.js";
import { checkPowerUpCollisions } from "../entities/powerup.js";
import { updateExtraJumps } from "./ui.js";

/**
 * Check if the ball is on a platform
 * @param {Function} isOnPlatformCallback - Callback to set if the ball is on a platform
 * @returns {boolean} Whether the ball is on a platform
 */
export function isOnPlatform(isOnPlatformCallback) {
  return checkPlatformCollision(getBall().position, getBallVelocity())
    .onPlatform;
}

/**
 * Handle platform collisions
 * @param {number} speed - Current game speed
 * @param {Function} onRedFlagPlatformReached - Callback when red flag platform is reached
 * @returns {Object} Updated game state
 */
export function handlePlatformCollisions(speed, onRedFlagPlatformReached) {
  const ball = getBall();
  const ballVelocity = getBallVelocity();

  // Check if the ball is on a platform
  const platformInfo = checkPlatformCollision(ball.position, ballVelocity);

  // Apply platform effects to the ball
  const newSpeed = applyPlatformEffects(platformInfo, speed);

  // If on a platform, snap the ball to the platform surface
  if (platformInfo.onPlatform) {
    ball.position.y = platformInfo.platformY + platformInfo.ballRadius;

    // Check if this is a red flag platform and handle level progression
    // The ball will continue rolling without stopping
    if (platformInfo.isRedFlagPlatform && platformInfo.isTrampoline) {
      // Trigger level progression without stopping the ball
      onRedFlagPlatformReached();
    }

    // We don't need to update the extra jumps UI here anymore
    // Extra jumps should persist across platform landings
  }

  return {
    onPlatform: platformInfo.onPlatform,
    speed: newSpeed,
  };
}

/**
 * Handle power-up collisions
 * @param {THREE.Scene} scene - The scene
 * @param {THREE.Group} jetpack - The jetpack object
 * @param {number} currentBackgroundColor - Current background color index
 * @param {Array} backgroundColors - Array of background colors
 * @param {Function} updateJetpackFuel - Function to update jetpack fuel
 * @param {Function} updateExtraJumps - Function to update extra jumps
 * @param {Function} addGrab - Function to add grab to counter
 * @returns {Object} Updated game state
 */
export function handlePowerUpCollisions(
  scene,
  jetpack,
  currentBackgroundColor,
  backgroundColors,
  updateJetpackFuel,
  updateExtraJumps,
  addGrab
) {
  const ball = getBall();

  return checkPowerUpCollisions(
    ball,
    scene,
    jetpack,
    currentBackgroundColor,
    backgroundColors,
    updateJetpackFuel,
    updateExtraJumps,
    addGrab
  );
}

/**
 * Check if the ball has fallen too far
 * @param {Array} platforms - Array of platforms
 * @param {number} fallThreshold - Distance threshold for falling
 * @returns {boolean} Whether the ball has fallen too far
 */
export function checkFallOutOfBounds(platforms, fallThreshold = 30) {
  // Increased threshold from 15 to 30
  const ball = getBall();

  if (platforms.length === 0) return false;

  // Find the nearest platform's Y position in front of or below the ball
  // This ensures we don't trigger game over when just dropping to the next platform
  let validPlatforms = [];

  // First, collect all platforms that are ahead of or below the ball
  for (const platform of platforms) {
    // Consider platforms that are ahead of the ball (in the direction of travel)
    // or platforms that are below the ball's current position
    if (
      platform.position.z <= ball.position.z ||
      platform.position.y <= ball.position.y
    ) {
      validPlatforms.push(platform);
    }
  }

  // If no valid platforms found, use all platforms
  if (validPlatforms.length === 0) {
    validPlatforms = platforms;
  }

  // Find the highest platform among valid platforms
  let highestPlatformY = -Infinity;
  for (const platform of validPlatforms) {
    if (platform.position.y > highestPlatformY) {
      highestPlatformY = platform.position.y;
    }
  }

  // Game over only if the ball falls too far from the highest valid platform
  return ball.position.y < highestPlatformY - fallThreshold;
}
