/**
 * Platform Entity
 * Handles creation and management of platforms
 */

import THREE from "../utils/three-wrapper.js";
import {
  GAME_SETTINGS,
  PLATFORM_TYPES,
  PLATFORM_COLORS,
  PLATFORM_MOVEMENT,
} from "../config.js";
import { random, randomInt } from "../utils/helpers.js";
import { createFlag } from "./flag.js";

// Platform collection and state
let platforms = [];
let lastPlatformPosition = { x: 0, y: 0, z: 0 };
let lastPlatformType = "center";
let redFlagPlatform = null;

/**
 * Create a platform
 * @param {boolean} isRedFlag - Whether this is a red flag platform
 * @param {THREE.Scene} scene - The scene to add the platform to
 * @param {number} level - Current game level (for difficulty adjustment)
 * @returns {THREE.Mesh} The platform object
 */
export function createPlatform(isRedFlag = false, scene, level = 1) {
  // Determine the next platform position
  let nextX, nextY, nextZ;

  if (platforms.length === 0) {
    // First platform is always at the origin and larger
    nextX = 0;
    nextY = 0;
    nextZ = 0;

    // Create a much larger starting platform for more run-up time
    const startPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(30, 1, 50),
      new THREE.MeshStandardMaterial({
        color: PLATFORM_COLORS.regular,
        roughness: 0.7,
        metalness: 0.1,
      })
    );
    startPlatform.position.set(0, 0, 0);
    startPlatform.receiveShadow = true;

    // Store the platform's dimensions for collision detection
    startPlatform.userData = {
      width: 30,
      depth: 50,
      isTrampoline: false,
      type: "center",
    };

    scene.add(startPlatform);
    platforms.push(startPlatform);

    // Update the last platform position
    lastPlatformPosition = { x: nextX, y: nextY, z: nextZ };
    lastPlatformType = "center";

    // Return the platform
    return startPlatform;
  } else {
    // More random platform generation with guaranteed connectivity
    // We'll use a combination of the last platform type and random chance
    // to determine the next platform position

    // Determine platform type based on last platform to ensure connectivity
    let platformType;
    const rand = Math.random();

    // Ensure there's always a possible route by limiting how far platforms can be from each other
    if (lastPlatformType === "far-far-left") {
      // From far-far-left, can go to far-left
      platformType = "far-left";
    } else if (lastPlatformType === "far-left") {
      // From far left, can go to far-far-left, left, or center-left
      if (rand < 0.3) platformType = "far-far-left";
      else if (rand < 0.7) platformType = "left";
      else platformType = "center-left";
    } else if (lastPlatformType === "left") {
      // From left, can go to far-left, center-left, or center
      if (rand < 0.3) platformType = "far-left";
      else if (rand < 0.7) platformType = "center-left";
      else platformType = "center";
    } else if (lastPlatformType === "center-left") {
      // From center-left, can go to left, center, or center-right
      if (rand < 0.3) platformType = "left";
      else if (rand < 0.7) platformType = "center";
      else platformType = "center-right";
    } else if (lastPlatformType === "center") {
      // From center, can go anywhere except the extremes
      if (rand < 0.15) platformType = "far-left";
      else if (rand < 0.3) platformType = "left";
      else if (rand < 0.45) platformType = "center-left";
      else if (rand < 0.6) platformType = "center-right";
      else if (rand < 0.75) platformType = "right";
      else if (rand < 0.9) platformType = "far-right";
      else if (rand < 0.95) platformType = "far-far-left";
      else platformType = "far-far-right";
    } else if (lastPlatformType === "center-right") {
      // From center-right, can go to center, right, or far-right
      if (rand < 0.3) platformType = "center";
      else if (rand < 0.7) platformType = "right";
      else platformType = "far-right";
    } else if (lastPlatformType === "right") {
      // From right, can go to center-right, far-right, or far-far-right
      if (rand < 0.3) platformType = "center-right";
      else if (rand < 0.7) platformType = "far-right";
      else platformType = "far-far-right";
    } else if (lastPlatformType === "far-right") {
      // From far right, can go to right, far-far-right
      if (rand < 0.7) platformType = "right";
      else platformType = "far-far-right";
    } else if (lastPlatformType === "far-far-right") {
      // From far-far-right, can go to far-right
      platformType = "far-right";
    }

    // Set X position based on platform type
    switch (platformType) {
      case "far-far-left":
        nextX = -35 - Math.random() * 5;
        break;
      case "far-left":
        nextX = -25 - Math.random() * 5;
        break;
      case "left":
        nextX = -15 - Math.random() * 5;
        break;
      case "center-left":
        nextX = -7 - Math.random() * 3;
        break;
      case "center":
        nextX = Math.random() * 10 - 5;
        break;
      case "center-right":
        nextX = 7 + Math.random() * 3;
        break;
      case "right":
        nextX = 15 + Math.random() * 5;
        break;
      case "far-right":
        nextX = 25 + Math.random() * 5;
        break;
      case "far-far-right":
        nextX = 35 + Math.random() * 5;
        break;
    }

    // Add some minor variation to make each path less predictable
    nextX += Math.random() * 2 - 1;

    // Store the platform type for the next platform
    lastPlatformType = platformType;

    // Always go lower or stay at same level, never go higher
    // This ensures the game can continue indefinitely downward
    const heightVariation = Math.random();
    if (heightVariation < 0.8) {
      // 80% chance to go lower (increased from 70%)
      nextY = lastPlatformPosition.y - (2 + Math.random() * 4); // Increased descent (2-6 units instead of 1-4)
    } else {
      // 20% chance to stay at same level (decreased from 30%)
      nextY = lastPlatformPosition.y;
    }

    // Random distance variation - reduced by 25% to make the stretch shorter
    nextZ = lastPlatformPosition.z - (6 + Math.random() * 5.25); // 25% reduction from (8 + Math.random() * 7)
  }

  // Create platform mesh with varying sizes
  // Occasionally create longer platforms for longer rolling
  const isLongPlatform = Math.random() < 0.2; // 20% chance for a long platform

  // Platform dimensions
  let platformWidth, platformDepth;

  if (isLongPlatform) {
    // Long platforms
    platformWidth = 6 + Math.random() * 6; // Width between 6 and 12
    platformDepth = 15 + Math.random() * 15; // Depth between 15 and 30
  } else {
    // Regular platforms
    platformWidth = 4 + Math.random() * 8; // Width between 4 and 12
    platformDepth = 4 + Math.random() * 8; // Depth between 4 and 12
  }

  // For red flag platform, make it a big round red platform and always a trampoline
  let isTrampoline = false;
  let isSlowDownTrampoline = false;
  let platformColor;
  let isRoundPlatform = false;
  let platformRadius = 0;
  let bounceEffect = null;

  if (isRedFlag) {
    // Red flag platform is always a trampoline and round
    isTrampoline = true;
    isSlowDownTrampoline = false;
    bounceEffect = "forward";
    isRoundPlatform = true;
    platformRadius = 12; // Bigger round platform for better visibility
    platformColor = PLATFORM_COLORS.redFlag;
  } else {
    // Choose platform type - regular, speed-up (trampoline), or slow-down
    const platformTypeRoll = Math.random();
    if (platformTypeRoll < 0.167) {
      isTrampoline = true;
      isSlowDownTrampoline = false;
      bounceEffect = "forward";
      platformColor = PLATFORM_COLORS.trampoline;
    } else if (platformTypeRoll < 0.208) {
      // Reduced from 0.25 to 0.208 (halving orange slow-down trampolines)
      isTrampoline = false;
      isSlowDownTrampoline = true;
      bounceEffect = "backward";
      platformColor = PLATFORM_COLORS.diagonal;
    } else {
      isTrampoline = false;
      isSlowDownTrampoline = false;
      bounceEffect = null;
      platformColor = PLATFORM_COLORS.regular;
    }
  }

  // Define colors and inner scale for trampoline look
  const innerTrampolineColor = 0x333333; // Dark grey
  const innerScaleFactor = 0.8; // 80% inner area

  // --- Determine if it's a Moving Platform FIRST ---
  // This needs to be known before setting the final color for regular platforms.
  let isMovingPlatform = false;
  let movementType = null;
  let finalPlatformColor = platformColor; // Start with the color determined by bounce type

  // Only regular platforms can be moving platforms (not trampolines, slow-down, or red flag platforms)
  // Check !bounceEffect which covers null/undefined (regular platforms)
  if (!isRedFlag && !bounceEffect) {
    // Check level conditions or random chance for moving
    if (
      level % 10 === 5 || // Level ends in 5: all move
      level % 10 === 4 || // Level ends in 4: all move (H/V)
      (level % 10 === 2 && Math.random() < 0.5) || // Level ends in 2: 50% move
      Math.random() < 0.1
    ) {
      // Other levels: 10% move
      isMovingPlatform = true;
      finalPlatformColor = PLATFORM_COLORS.moving; // Update the color *if* it becomes moving

      // Choose a random movement type
      if (level % 10 === 4) {
        // For levels ending in 4, only use horizontal and vertical movement
        movementType = Math.random() < 0.5 ? "horizontal" : "vertical";
      } else {
        // For other levels, use any movement type
        const movementTypeIndex = Math.floor(
          Math.random() * PLATFORM_MOVEMENT.types.length
        );
        movementType = PLATFORM_MOVEMENT.types[movementTypeIndex];
      }
    }
  }

  // --- Create Geometry and Material(s) ---
  let geometry,
    material,
    platform,
    innerMesh = null;
  const tiltAngle = 2; // Degrees

  if (bounceEffect === "forward" || bounceEffect === "backward") {
    // --- Trampoline Platform (Green or Orange) ---
    const outerColor =
      bounceEffect === "forward"
        ? PLATFORM_COLORS.trampoline
        : PLATFORM_COLORS.diagonal;

    if (isRoundPlatform) {
      // Round Trampoline (Red Flag uses this path too)
      const outerRadius = platformRadius;
      const innerRadius = outerRadius * innerScaleFactor;

      // Base (Outer Ring)
      geometry = new THREE.CylinderGeometry(outerRadius, outerRadius, 1, 32);
      material = new THREE.MeshStandardMaterial({
        color: isRedFlag ? PLATFORM_COLORS.redFlag : outerColor, // Use red for red flag
        roughness: 0.5,
        metalness: 0.3,
        ...(isRedFlag && {
          emissive: PLATFORM_COLORS.redFlag,
          emissiveIntensity: 0.5,
        }), // Glow for red flag
      });
      platform = new THREE.Mesh(geometry, material);
      // Apply base rotation + REVERSED tilt
      const tiltRadians = THREE.MathUtils.degToRad(
        bounceEffect === "forward" ? -tiltAngle : tiltAngle
      ); // Reversed signs
      platform.rotation.x = Math.PI / 2 + tiltRadians;

      // Inner Surface (Dark Grey)
      const innerGeometry = new THREE.CylinderGeometry(
        innerRadius,
        innerRadius,
        1.05,
        32
      ); // Slightly taller
      const innerMaterial = new THREE.MeshStandardMaterial({
        color: innerTrampolineColor,
        roughness: 0.7,
        metalness: 0.1,
      });
      innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
      innerMesh.rotation.x = Math.PI / 2; // Inner mesh stays flat relative to parent tilt
      innerMesh.position.y = 0.05; // Raise slightly
      platform.add(innerMesh); // Add inner mesh as child
    } else {
      // Rectangular Trampoline
      const outerWidth = platformWidth;
      const outerDepth = platformDepth;
      const innerWidth = outerWidth * innerScaleFactor;
      const innerDepth = outerDepth * innerScaleFactor;

      // Base (Outer Frame)
      geometry = new THREE.BoxGeometry(outerWidth, 1, outerDepth);
      material = new THREE.MeshStandardMaterial({
        color: outerColor,
        roughness: 0.7,
        metalness: 0.1,
      });
      platform = new THREE.Mesh(geometry, material);
      // Apply REVERSED tilt
      platform.rotation.x = THREE.MathUtils.degToRad(
        bounceEffect === "forward" ? -tiltAngle : tiltAngle
      ); // Reversed signs

      // Inner Surface (Dark Grey)
      const innerGeometry = new THREE.BoxGeometry(innerWidth, 1.05, innerDepth); // Slightly taller
      const innerMaterial = new THREE.MeshStandardMaterial({
        color: innerTrampolineColor,
        roughness: 0.7,
        metalness: 0.1,
      });
      innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
      innerMesh.position.y = 0.05; // Raise slightly
      platform.add(innerMesh); // Add inner mesh as child
    }
    // Shadows for inner mesh too if needed (might be minor)
    if (innerMesh) {
      innerMesh.castShadow = true;
      innerMesh.receiveShadow = true; // Also allow inner mesh to receive shadows if needed
    }
  } else {
    // --- Regular or Moving Platform (Solid Color) ---
    if (isRoundPlatform) {
      // Should not happen for regular/moving, but handle defensively
      geometry = new THREE.CylinderGeometry(
        platformRadius,
        platformRadius,
        1,
        32
      );
      material = new THREE.MeshStandardMaterial({
        color: finalPlatformColor,
        roughness: 0.7,
        metalness: 0.1,
      });
      platform = new THREE.Mesh(geometry, material);
      // Ensure no accidental tilt for regular platforms if they are round
      platform.rotation.x = Math.PI / 2;
    } else {
      geometry = new THREE.BoxGeometry(platformWidth, 1, platformDepth);
      material = new THREE.MeshStandardMaterial({
        color: finalPlatformColor,
        roughness: 0.7,
        metalness: 0.1,
      });
      platform = new THREE.Mesh(geometry, material);
    }
  }

  // Set position and shadows for the main platform group
  platform.position.set(nextX, nextY, nextZ);
  platform.receiveShadow = true;
  platform.castShadow = true; // Main platform should cast shadow

  // Store the platform's dimensions and properties for collision detection
  platform.userData = {
    width: isRoundPlatform ? platformRadius * 2 : platformWidth,
    depth: isRoundPlatform ? platformRadius * 2 : platformDepth,
    radius: isRoundPlatform ? platformRadius : 0,
    isRoundPlatform: isRoundPlatform,
    isTrampoline: isTrampoline,
    isSlowDownTrampoline: isSlowDownTrampoline,
    bounceEffect: bounceEffect,
    type: lastPlatformType,
    isRedFlagPlatform: isRedFlag,
    isMovingPlatform: isMovingPlatform,
    movementType: movementType,
    ...(isMovingPlatform && {
      originalPosition: {
        x: platform.position.x,
        y: platform.position.y,
        z: platform.position.z,
      },
      movementProgress: Math.random() * Math.PI * 2,
      movementSpeed: PLATFORM_MOVEMENT.baseSpeed,
      lastPosition: { ...platform.position },
    }),
  };

  // If it's a moving platform, add movement properties and indicator
  if (isMovingPlatform) {
    // Set movement-specific properties
    switch (movementType) {
      case "horizontal":
        platform.userData.movementRange = PLATFORM_MOVEMENT.horizontalRange;
        break;
      case "vertical":
        platform.userData.movementRange = PLATFORM_MOVEMENT.verticalRange;
        break;
      case "diagonal":
        platform.userData.movementRange = {
          x: PLATFORM_MOVEMENT.diagonalRange,
          y: PLATFORM_MOVEMENT.diagonalRange,
        };
        platform.userData.diagonalDirection = Math.random() < 0.5 ? 1 : -1;
        break;
      case "orbital":
        platform.userData.orbitalRadius = PLATFORM_MOVEMENT.orbitalRadius;
        break;
      case "figure8":
        platform.userData.figure8Scale = { ...PLATFORM_MOVEMENT.figure8Scale };
        break;
      case "pendulum":
        platform.userData.pendulumLength = PLATFORM_MOVEMENT.pendulumLength;
        platform.userData.pendulumAxis = Math.random() < 0.5 ? "x" : "y";
        break;
    }

    // Add visual indicator of movement path
    addMovementIndicator(platform, scene);
  }

  // Store the red flag platform reference
  if (isRedFlag) {
    redFlagPlatform = platform;
  }

  scene.add(platform);
  platforms.push(platform);

  // Update the last platform position
  lastPlatformPosition = { x: nextX, y: nextY, z: nextZ };

  return platform;
}

/**
 * Create the starting platforms with a green trampoline as the first platform
 * @param {THREE.Scene} scene - The scene to add platforms to
 */
export function createStartingPlatforms(scene) {
  // Remove any existing platforms and their indicators
  platforms.forEach((platform) => {
    // Remove movement indicators if they exist
    if (
      platform.userData.indicators &&
      platform.userData.indicators.length > 0
    ) {
      platform.userData.indicators.forEach((indicator) => {
        scene.remove(indicator);
      });
    }

    scene.remove(platform);
  });
  platforms = [];

  // Reset platform position tracking
  lastPlatformPosition = { x: 0, y: 0, z: 0 };
  lastPlatformType = "center";
  redFlagPlatform = null;

  // Create a green trampoline as the first platform (speed-up)
  const trampolineWidth = 10;
  const trampolineDepth = 10;
  const innerTrampolineColor = 0x333333; // Dark grey
  const innerScaleFactor = 0.8; // 80% inner area
  const tiltAngle = 2; // Degrees

  // Base (Outer Frame - Green)
  const trampolineGeometry = new THREE.BoxGeometry(
    trampolineWidth,
    1,
    trampolineDepth
  );
  const trampolineMaterial = new THREE.MeshStandardMaterial({
    color: PLATFORM_COLORS.trampoline, // Green
    roughness: 0.7,
    metalness: 0.1,
  });
  const trampoline = new THREE.Mesh(trampolineGeometry, trampolineMaterial);

  // Apply REVERSED forward tilt (now backward)
  trampoline.rotation.x = THREE.MathUtils.degToRad(-tiltAngle); // Reversed sign

  // Inner Surface (Dark Grey)
  const innerWidth = trampolineWidth * innerScaleFactor;
  const innerDepth = trampolineDepth * innerScaleFactor;
  const innerGeometry = new THREE.BoxGeometry(innerWidth, 1.05, innerDepth); // Slightly taller
  const innerMaterial = new THREE.MeshStandardMaterial({
    color: innerTrampolineColor,
    roughness: 0.7,
    metalness: 0.1,
  });
  const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
  innerMesh.position.y = 0.05; // Raise slightly
  trampoline.add(innerMesh); // Add inner mesh as child

  // Position and shadows
  trampoline.position.set(0, 0, 0);
  trampoline.receiveShadow = true;
  trampoline.castShadow = true;
  if (innerMesh) {
    innerMesh.castShadow = true;
    innerMesh.receiveShadow = true; // Also allow inner mesh to receive shadows if needed
  }

  // Store the platform's dimensions and properties for collision detection (using base dimensions)
  trampoline.userData = {
    width: trampolineWidth,
    depth: trampolineDepth,
    isTrampoline: true,
    isSlowDownTrampoline: false,
    bounceEffect: "forward",
    type: "center",
  };

  scene.add(trampoline);
  platforms.push(trampoline);

  // Update the last platform position
  lastPlatformPosition = { x: 0, y: 0, z: 0 };

  // Create additional platforms
  for (let i = 0; i < GAME_SETTINGS.platformsPerLevel; i++) {
    createPlatform(false, scene, 1); // Always use level 1 for starting platforms
  }
}

/**
 * Remove all platforms except the red flag platform
 * @param {THREE.Scene} scene - The scene
 */
export function removeAllPlatformsExceptRedFlag(scene) {
  // Keep only the red flag platform
  platforms = platforms.filter((platform) => {
    if (!platform.userData.isRedFlagPlatform) {
      // Remove movement indicators if they exist
      if (
        platform.userData.indicators &&
        platform.userData.indicators.length > 0
      ) {
        platform.userData.indicators.forEach((indicator) => {
          scene.remove(indicator);
        });
      }

      scene.remove(platform);
      return false;
    }
    return true;
  });
}

/**
 * Generate a new level with increased difficulty
 * @param {number} level - Current level
 * @param {number} speed - Current speed
 * @param {THREE.Scene} scene - The scene
 * @returns {Object} Updated game state
 */
export function generateNewLevel(level, speed, scene) {
  // Reset red flag platform reached flag
  const redFlagPlatformReached = false;

  // Remove all existing platforms and their indicators
  platforms.forEach((platform) => {
    // Remove movement indicators if they exist
    if (
      platform.userData.indicators &&
      platform.userData.indicators.length > 0
    ) {
      platform.userData.indicators.forEach((indicator) => {
        scene.remove(indicator);
      });
    }

    scene.remove(platform);
  });
  platforms = [];
  redFlagPlatform = null;

  // Create a red flag platform at the center of the new level
  const redFlagX = 0; // Center X position
  const redFlagY = 0; // Starting Y position
  const redFlagZ = -5; // Place it ahead of the starting position

  // Update last platform position for next level generation
  lastPlatformPosition = { x: redFlagX, y: redFlagY, z: redFlagZ };
  lastPlatformType = "center";

  // Create the red flag platform (which is a speed-up trampoline)
  createPlatform(true, scene, level);

  // Calculate adjusted platform count based on level
  // Higher levels have slightly fewer platforms but they're more challenging
  const platformCount = Math.max(
    10, // Minimum 10 platforms per level
    Math.floor(GAME_SETTINGS.platformsPerLevel * (1 - level * 0.02))
  );

  // Generate regular platforms for the next level with increasing difficulty
  for (let i = 0; i < platformCount; i++) {
    createPlatform(false, scene, level);
  }

  return {
    speed,
    redFlagPlatformReached,
  };
}

/**
 * Check if the ball is on a platform and return platform info
 * @param {THREE.Vector3} ballPosition - The ball position
 * @param {Object} ballVelocity - The ball velocity
 * @returns {Object} Platform collision information
 */
export function checkPlatformCollision(ballPosition, ballVelocity) {
  // Ball radius for more accurate collision detection
  const ballRadius = 1.0;

  for (const platform of platforms) {
    let collisionDetected = false;
    let platformY = 0;

    // Check collision based on platform shape
    if (platform.userData.isRoundPlatform) {
      // For round platforms, use distance-based collision detection
      const dx = ballPosition.x - platform.position.x;
      const dz = ballPosition.z - platform.position.z;
      const distanceSquared = dx * dx + dz * dz;
      const platformRadius = platform.userData.radius;

      // Check if the ball is within the platform's radius and at the right height
      if (
        distanceSquared <= platformRadius * 0.9 * (platformRadius * 0.9) &&
        Math.abs(ballPosition.y - ballRadius - (platform.position.y + 0.5)) <=
          0.5 &&
        ballVelocity.y <= 0 // Only count as collision when falling or stationary
      ) {
        collisionDetected = true;
        platformY = platform.position.y + 0.5;
      }
    } else {
      // For rectangular platforms, use the existing box collision detection
      const platformBounds = {
        minX: platform.position.x - platform.userData.width / 2,
        maxX: platform.position.x + platform.userData.width / 2,
        minZ: platform.position.z - platform.userData.depth / 2,
        maxZ: platform.position.z + platform.userData.depth / 2,
        y: platform.position.y + 0.5, // Top of the platform
      };

      // Improved collision detection that accounts for the ball's radius
      if (
        ballPosition.x + ballRadius * 0.8 >= platformBounds.minX &&
        ballPosition.x - ballRadius * 0.8 <= platformBounds.maxX &&
        ballPosition.z + ballRadius * 0.8 >= platformBounds.minZ &&
        ballPosition.z - ballRadius * 0.8 <= platformBounds.maxZ &&
        Math.abs(ballPosition.y - ballRadius - platformBounds.y) <= 0.5 &&
        ballVelocity.y <= 0 // Only count as collision when falling or stationary
      ) {
        collisionDetected = true;
        platformY = platformBounds.y;
      }
    }

    // If collision detected, return relevant info including the bounce effect
    if (collisionDetected) {
      return {
        onPlatform: true,
        bounceEffect: platform.userData.bounceEffect,
        isRedFlagPlatform: platform.userData.isRedFlagPlatform,
        platformY: platformY,
        ballRadius: ballRadius,
      };
    }
  }

  // No collision
  return {
    onPlatform: false,
    bounceEffect: null,
    isRedFlagPlatform: false,
  };
}

/**
 * Remove platforms that are too far behind
 * @param {THREE.Vector3} ballPosition - The ball position
 * @param {number} removeDistance - Distance threshold for removal
 * @param {THREE.Scene} scene - The scene
 */
export function cleanupPlatforms(ballPosition, removeDistance, scene) {
  platforms = platforms.filter((platform) => {
    if (platform.position.z > ballPosition.z + removeDistance) {
      // Remove movement indicators if they exist
      if (
        platform.userData.indicators &&
        platform.userData.indicators.length > 0
      ) {
        platform.userData.indicators.forEach((indicator) => {
          scene.remove(indicator);
        });
      }

      scene.remove(platform);
      return false;
    }
    return true;
  });
}

/**
 * Add new platforms as needed
 * @param {THREE.Scene} scene - The scene
 * @param {number} level - Current game level (for difficulty adjustment)
 */
export function addPlatformsAsNeeded(scene, level = 1) {
  while (lastPlatformPosition.z > GAME_SETTINGS.platformSpawnZ) {
    createPlatform(false, scene, level);
  }
}

/**
 * Get all platforms
 * @returns {Array} Array of platforms
 */
export function getPlatforms() {
  return platforms;
}

/**
 * Get the red flag platform
 * @returns {THREE.Mesh} The red flag platform
 */
export function getRedFlagPlatform() {
  return redFlagPlatform;
}

/**
 * Reset platforms
 * @param {THREE.Scene} scene - The scene
 */
export function resetPlatforms(scene) {
  // Remove all platforms and their indicators
  platforms.forEach((platform) => {
    // Remove movement indicators if they exist
    if (
      platform.userData.indicators &&
      platform.userData.indicators.length > 0
    ) {
      platform.userData.indicators.forEach((indicator) => {
        scene.remove(indicator);
      });
    }

    scene.remove(platform);
  });

  platforms = [];
  redFlagPlatform = null;

  // Reset platform position tracking
  lastPlatformPosition = { x: 0, y: 0, z: 0 };
  lastPlatformType = "center";
}

/**
 * Set the last platform position and type
 * This is used to control where new platforms will be generated from
 * @param {Object} position - The position {x, y, z} to set as the last platform position
 * @param {string} type - The platform type to set as the last platform type
 */
export function setLastPlatformState(position, type = "center") {
  console.log(
    `Setting last platform position to: ${JSON.stringify(
      position
    )}, type: ${type}`
  );
  lastPlatformPosition = { ...position };
  lastPlatformType = type;
}

/**
 * Get the last platform position and type
 * @returns {Object} The last platform position and type
 */
export function getLastPlatformState() {
  return {
    position: { ...lastPlatformPosition },
    type: lastPlatformType,
  };
}

/**
 * Add visual indicators to show the platform's movement path
 * @param {THREE.Mesh} platform - The platform
 * @param {THREE.Scene} scene - The scene
 */
function addMovementIndicator(platform, scene) {
  const indicatorSize = PLATFORM_MOVEMENT.indicatorSize;
  const indicatorMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
  });

  // Initialize indicators array if it doesn't exist
  platform.userData.indicators = [];

  // Create different indicators based on movement type
  switch (platform.userData.movementType) {
    case "horizontal":
      // Create a line of small spheres
      for (let i = -1; i <= 1; i += 0.2) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(indicatorSize, 8, 8),
          indicatorMaterial
        );
        const x =
          platform.userData.originalPosition.x +
          i * platform.userData.movementRange;
        sphere.position.set(x, platform.position.y, platform.position.z);
        scene.add(sphere);
        platform.userData.indicators.push(sphere);
      }
      break;

    case "vertical":
      // Create a line of small spheres
      for (let i = -1; i <= 1; i += 0.2) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(indicatorSize, 8, 8),
          indicatorMaterial
        );
        const y =
          platform.userData.originalPosition.y +
          i * platform.userData.movementRange;
        sphere.position.set(platform.position.x, y, platform.position.z);
        scene.add(sphere);
        platform.userData.indicators.push(sphere);
      }
      break;

    case "diagonal":
      // Create a line of small spheres
      for (let i = -1; i <= 1; i += 0.2) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(indicatorSize, 8, 8),
          indicatorMaterial
        );
        const x =
          platform.userData.originalPosition.x +
          i *
            platform.userData.movementRange.x *
            platform.userData.diagonalDirection;
        const y =
          platform.userData.originalPosition.y +
          i * platform.userData.movementRange.y;
        sphere.position.set(x, y, platform.position.z);
        scene.add(sphere);
        platform.userData.indicators.push(sphere);
      }
      break;

    case "orbital":
      // Create a circle of small spheres
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 12) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(indicatorSize, 8, 8),
          indicatorMaterial
        );
        const x =
          platform.userData.originalPosition.x +
          Math.cos(i) * platform.userData.orbitalRadius;
        const z =
          platform.userData.originalPosition.z +
          Math.sin(i) * platform.userData.orbitalRadius;
        sphere.position.set(x, platform.position.y, z);
        scene.add(sphere);
        platform.userData.indicators.push(sphere);
      }
      break;

    case "figure8":
      // Create a figure-8 of small spheres
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 12) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(indicatorSize, 8, 8),
          indicatorMaterial
        );
        const x =
          platform.userData.originalPosition.x +
          Math.sin(i) * platform.userData.figure8Scale.x;
        const y =
          platform.userData.originalPosition.y +
          (Math.sin(i * 2) * platform.userData.figure8Scale.y) / 2;
        sphere.position.set(x, y, platform.position.z);
        scene.add(sphere);
        platform.userData.indicators.push(sphere);
      }
      break;

    case "pendulum":
      // Create a pendulum arc of small spheres
      const axis = platform.userData.pendulumAxis;
      for (let i = -Math.PI / 2; i <= Math.PI / 2; i += Math.PI / 12) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(indicatorSize, 8, 8),
          indicatorMaterial
        );
        if (axis === "x") {
          const x =
            platform.userData.originalPosition.x +
            Math.sin(i) * platform.userData.pendulumLength;
          sphere.position.set(x, platform.position.y, platform.position.z);
        } else {
          const y =
            platform.userData.originalPosition.y +
            Math.sin(i) * platform.userData.pendulumLength;
          sphere.position.set(platform.position.x, y, platform.position.z);
        }
        scene.add(sphere);
        platform.userData.indicators.push(sphere);
      }
      break;
  }
}

/**
 * Update moving platforms
 * @param {number} deltaTime - Time since last frame
 */
export function updateMovingPlatforms(deltaTime) {
  for (const platform of platforms) {
    if (platform.userData.isMovingPlatform) {
      // Store last position for collision handling
      platform.userData.lastPosition = {
        x: platform.position.x,
        y: platform.position.y,
        z: platform.position.z,
      };

      // Update movement progress
      platform.userData.movementProgress +=
        platform.userData.movementSpeed * deltaTime * 60;

      // Apply movement based on type
      switch (platform.userData.movementType) {
        case "horizontal":
          platform.position.x =
            platform.userData.originalPosition.x +
            Math.sin(platform.userData.movementProgress) *
              platform.userData.movementRange;
          break;

        case "vertical":
          platform.position.y =
            platform.userData.originalPosition.y +
            Math.sin(platform.userData.movementProgress) *
              platform.userData.movementRange;
          break;

        case "diagonal":
          platform.position.x =
            platform.userData.originalPosition.x +
            Math.sin(platform.userData.movementProgress) *
              platform.userData.movementRange.x *
              platform.userData.diagonalDirection;
          platform.position.y =
            platform.userData.originalPosition.y +
            Math.sin(platform.userData.movementProgress) *
              platform.userData.movementRange.y;
          break;

        case "orbital":
          platform.position.x =
            platform.userData.originalPosition.x +
            Math.cos(platform.userData.movementProgress) *
              platform.userData.orbitalRadius;
          platform.position.z =
            platform.userData.originalPosition.z +
            Math.sin(platform.userData.movementProgress) *
              platform.userData.orbitalRadius;
          break;

        case "figure8":
          // Figure-8 pattern using parametric equation
          platform.position.x =
            platform.userData.originalPosition.x +
            Math.sin(platform.userData.movementProgress) *
              platform.userData.figure8Scale.x;
          platform.position.y =
            platform.userData.originalPosition.y +
            (Math.sin(platform.userData.movementProgress * 2) *
              platform.userData.figure8Scale.y) /
              2;
          break;

        case "pendulum":
          // Pendulum movement with natural acceleration/deceleration
          if (platform.userData.pendulumAxis === "x") {
            platform.position.x =
              platform.userData.originalPosition.x +
              Math.sin(platform.userData.movementProgress) *
                platform.userData.pendulumLength;
          } else {
            platform.position.y =
              platform.userData.originalPosition.y +
              Math.sin(platform.userData.movementProgress) *
                platform.userData.pendulumLength;
          }
          break;
      }
    }
  }
}

/**
 * Get the platform the ball is currently on
 * @param {THREE.Vector3} ballPosition - The ball position
 * @param {Object} ballVelocity - The ball velocity
 * @returns {THREE.Mesh|null} The platform or null if not on a platform
 */
export function getCurrentPlatform(ballPosition, ballVelocity) {
  // Ball radius for more accurate collision detection
  const ballRadius = 1.0;

  for (const platform of platforms) {
    let collisionDetected = false;

    // Check collision based on platform shape
    if (platform.userData.isRoundPlatform) {
      // For round platforms, use distance-based collision detection
      const dx = ballPosition.x - platform.position.x;
      const dz = ballPosition.z - platform.position.z;
      const distanceSquared = dx * dx + dz * dz;
      const platformRadius = platform.userData.radius;

      // Check if the ball is within the platform's radius and at the right height
      if (
        distanceSquared <= platformRadius * 0.9 * (platformRadius * 0.9) &&
        Math.abs(ballPosition.y - ballRadius - (platform.position.y + 0.5)) <=
          0.5 &&
        ballVelocity.y <= 0 // Only count as collision when falling or stationary
      ) {
        collisionDetected = true;
      }
    } else {
      // For rectangular platforms, use the existing box collision detection
      const platformBounds = {
        minX: platform.position.x - platform.userData.width / 2,
        maxX: platform.position.x + platform.userData.width / 2,
        minZ: platform.position.z - platform.userData.depth / 2,
        maxZ: platform.position.z + platform.userData.depth / 2,
        y: platform.position.y + 0.5, // Top of the platform
      };

      // Improved collision detection that accounts for the ball's radius
      if (
        ballPosition.x + ballRadius * 0.8 >= platformBounds.minX &&
        ballPosition.x - ballRadius * 0.8 <= platformBounds.maxX &&
        ballPosition.z + ballRadius * 0.8 >= platformBounds.minZ &&
        ballPosition.z - ballRadius * 0.8 <= platformBounds.maxZ &&
        Math.abs(ballPosition.y - ballRadius - platformBounds.y) <= 0.5 &&
        ballVelocity.y <= 0 // Only count as collision when falling or stationary
      ) {
        collisionDetected = true;
      }
    }

    if (collisionDetected) {
      return platform; // Return the platform object itself
    }
  }
  return null; // No platform found
}
