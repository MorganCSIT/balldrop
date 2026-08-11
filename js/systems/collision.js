/**
 * Collision System
 * Handles collision detection and response
 */

import {
  GAME_SETTINGS,
} from "../config.js";
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
import {
  addScaledAxis,
  getGravityConfig,
  getPositionAlong,
  setPositionAlong,
} from "./gravity.js";

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
export function handlePlatformCollisions(
  speed,
  onRedFlagPlatformReached,
  gravityDirection = "down"
) {
  const ball = getBall();
  const ballVelocity = getBallVelocity();
  const gravityConfig = getGravityConfig(gravityDirection);
  const wasFalling = getPositionAlong(ballVelocity, gravityConfig.gravity) > 0;

  // Check if the ball is on a platform
  const platformInfo = checkPlatformCollision(ball.position, ballVelocity);

  // Apply platform effects to the ball
  const newSpeed = applyPlatformEffects(platformInfo, speed);

  // If on a platform, snap the ball to the platform surface
  if (platformInfo.onPlatform) {
    const platformNormal =
      platformInfo.platform && platformInfo.platform.userData.gravityDirection
        ? getGravityConfig(platformInfo.platform.userData.gravityDirection)
            .normal
        : gravityConfig.normal;
    setPositionAlong(
      ball.position,
      platformNormal,
      platformInfo.platformSurface + platformInfo.ballRadius
    );

    // Check if this is a red flag platform and handle level progression
    // The ball will continue rolling without stopping
    if (platformInfo.isRedFlagPlatform && platformInfo.isTrampoline) {
      // Trigger level progression without stopping the ball
      onRedFlagPlatformReached();
    }

    if (platformInfo.platform && platformInfo.challengeType === "crumbling") {
      startCrumblingPlatform(platformInfo.platform);
    }

    if (platformInfo.platform && platformInfo.challengeType === "hazard") {
      updateHazardPlatform(platformInfo.platform, ballVelocity);
    }

    // We don't need to update the extra jumps UI here anymore
    // Extra jumps should persist across platform landings
  }

  return {
    onPlatform: platformInfo.onPlatform,
    speed: newSpeed,
    justLanded: platformInfo.onPlatform && wasFalling,
    platformType: platformInfo.challengeType,
    platformId: platformInfo.platformId,
    isMovingPlatform: platformInfo.isMovingPlatform,
    isTrampoline: platformInfo.isTrampoline,
  };
}

function startCrumblingPlatform(platform) {
  if (platform.userData.crumbleStarted) return;

  platform.userData.crumbleStarted = true;
  platform.material.opacity = 0.65;
  platform.material.transparent = true;

  setTimeout(() => {
    platform.userData.isCollapsed = true;
    platform.visible = false;
  }, 650);
}

function updateHazardPlatform(platform, ballVelocity) {
  const now = performance.now();
  const gravityConfig = getGravityConfig(platform.userData.gravityDirection || "down");

  if (!platform.userData.hazardContactStart) {
    platform.userData.hazardContactStart = now;
  }

  ballVelocity.x *= 1.015;

  if (now - platform.userData.hazardContactStart > 700) {
    addScaledAxis(ballVelocity, gravityConfig.gravity, 0.25);
    platform.userData.hazardContactStart = now;
  }
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
export function checkFallOutOfBounds(
  platforms,
  fallThreshold = GAME_SETTINGS.fallOutOfBoundsDistance,
  gravityDirection = "down",
  graceDistance = 0
) {
  const ball = getBall();
  if (graceDistance > 0) return false;

  if (platforms.length === 0) return false;
  const gravityConfig = getGravityConfig(gravityDirection);
  const ballGravityPosition = getPositionAlong(
    ball.position,
    gravityConfig.gravity
  );

  // Use nearby platforms only. Far-ahead generated platforms may be much lower,
  // and comparing against them makes missed platforms fall for too long.
  let validPlatforms = [];

  for (const platform of platforms) {
    if ((platform.userData.gravityDirection || "down") !== gravityDirection) {
      continue;
    }

    const zOffset = platform.position.z - ball.position.z;
    const isRecentlyPassed =
      zOffset >= 0 && zOffset <= GAME_SETTINGS.fallOutOfBoundsLookBehind;
    const isReachableAhead =
      zOffset < 0 && Math.abs(zOffset) <= GAME_SETTINGS.fallOutOfBoundsLookAhead;

    if (isRecentlyPassed || isReachableAhead) {
      validPlatforms.push(platform);
    }
  }

  // At level edges or after cleanup, fall back to same-gravity platforms so the
  // check remains active instead of silently disabling game over.
  if (validPlatforms.length === 0) {
    validPlatforms = platforms.filter(
      (platform) =>
        (platform.userData.gravityDirection || "down") === gravityDirection
    );
  }

  if (validPlatforms.length === 0) return false;

  let nearestPlatform = null;
  let nearestZDistance = Infinity;
  for (const platform of validPlatforms) {
    const zDistance = Math.abs(platform.position.z - ball.position.z);
    if (zDistance < nearestZDistance) {
      nearestZDistance = zDistance;
      nearestPlatform = platform;
    }
  }

  if (!nearestPlatform) return false;

  const nearestSafeSurface = getPositionAlong(
    nearestPlatform.position,
    gravityConfig.gravity
  );

  return ballGravityPosition > nearestSafeSurface + fallThreshold;
}
