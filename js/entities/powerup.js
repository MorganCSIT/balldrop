/**
 * Power-Up Entity
 * Handles creation and management of power-ups
 */

import THREE from "../utils/three-wrapper.js";
import { MATERIALS } from "../config.js";
import { random } from "../utils/helpers.js";
import { ELEMENT_IDS } from "../config.js";
import { setText, showElement } from "../utils/helpers.js";

// Power-up collection
let powerUps = [];

/**
 * Create a power-up
 * @param {string} type - The type of power-up ('jetpack', 'extraJump', or 'SOS')
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} z - Z position
 * @param {THREE.Scene} scene - The scene to add the power-up to
 * @returns {THREE.Mesh} The power-up object
 */
export function createPowerUp(type, x, y, z, scene) {
  // Create a floating triangle (tetrahedron) for the power-up
  let size = 1.4; // Base size for tetrahedron
  if (type === "SOS") {
    size = 1.2; // Make SOS/claw slightly larger
  }
  const geometry = new THREE.TetrahedronGeometry(size); // Use Tetrahedron for all types

  // Set color based on power-up type
  let color;
  if (type === "extraJump") {
    color = MATERIALS.powerUp.extraJump;
  } else if (type === "jetpack") {
    color = MATERIALS.powerUp.jetpack;
  } else if (type === "SOS") {
    color = 0xff1493; // Hot pink color for claw/SOS ability
  }

  const material = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    // General boost + extra for SOS
    emissiveIntensity: type === "SOS" ? 2.0 : 1.2,
    transparent: true,
    opacity: 0.85, // Slightly less transparent
  });

  const powerUp = new THREE.Mesh(geometry, material);
  powerUp.position.set(x, y, z);

  // Initialize userData with common properties
  powerUp.userData = {
    type: type,
    rotationSpeed: 0.02,
    floatSpeed: 0.01,
    floatAmplitude: type === "SOS" ? 0.8 : 0.5, // Increased float amplitude for claw powerups
    originalY: y,
    floatOffset: Math.random() * Math.PI * 2, // Random starting phase
    // Add pulse effect for claw powerups
    pulseSpeed: type === "SOS" ? 0.1 : 0,
    pulseTime: 0,
  };

  // Add a point light to claw powerups to make them more visible
  if (type === "SOS") {
    const light = new THREE.PointLight(color, 2, 7); // Increased intensity and range
    light.position.set(0, 0, 0);
    powerUp.add(light);

    // Store the light reference for animation
    powerUp.userData.light = light;
  }

  scene.add(powerUp);
  powerUps.push(powerUp);

  return powerUp;
}

/**
 * Spawn power-ups randomlcggvb cdy on platforms
 * @param {Array} platforms - Array of platforms
 * @param {THREE.Scene} scene - The scene to add power-ups to
 * @param {number} level - Current game level (for scaling)
 * @param {string} forcedType - Optional type to force spawn (for debugging or specific powerup spawning)
 */
export function spawnPowerUps(platforms, scene, level = 1, forcedType = null) {
  // Calculate max powerups based on level (more powerups at higher levels)
  const maxPowerUps = Math.min(15, 8 + Math.floor(level / 2));

  // Only spawn if we have fewer than the maximum number of power-ups
  if (powerUps.length < maxPowerUps && platforms.length > 0) {
    // Find a random platform
    const randomPlatform =
      platforms[Math.floor(Math.random() * platforms.length)];

    if (randomPlatform) {
      // Position above the platform - reduced height
      const x = randomPlatform.position.x + (Math.random() * 4 - 2); // Random offset
      const y = randomPlatform.position.y + 1.5 + Math.random() * 1.5; // Lowered spawn height
      const z = randomPlatform.position.z;

      let type;

      if (forcedType) {
        // Use the forced type if provided
        type = forcedType;
      } else {
        // Slightly increased chance for claw powerups (40% instead of 33%)
        const rand = Math.random();
        if (rand < 0.3) {
          type = "extraJump";
        } else if (rand < 0.6) {
          type = "jetpack";
        } else {
          type = "SOS"; // Claw powerup (40% chance)
        }
      }

      createPowerUp(type, x, y, z, scene);
    }
  }
}

/**
 * Check for collisions with power-ups
 * @param {THREE.Group} ball - The ball object
 * @param {THREE.Scene} scene - The scene
 * @param {THREE.Group} jetpack - The jetpack object
 * @param {number} currentBackgroundColor - Current background color index
 * @param {Array} backgroundColors - Array of background colors
 * @param {Function} updateJetpackFuel - Function to update jetpack fuel
 * @param {Function} updateExtraJumps - Function to update extra jumps counter
 * @param {Function} addGrab - Function to add grab to counter
 * @returns {Object} Updated game state
 */
export function checkPowerUpCollisions(
  ball,
  scene,
  jetpack,
  currentBackgroundColor,
  backgroundColors,
  updateJetpackFuel,
  updateExtraJumps,
  addGrab
) {
  const ballRadius = 1.0;
  let newBackgroundColor = currentBackgroundColor;

  // Check each power-up
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    const distance = ball.position.distanceTo(powerUp.position);

    // If the ball touches the power-up
    // Increase collision radius for claw powerups to make them easier to collect
    let collisionRadius = 0.8; // Default collision radius
    if (powerUp.userData.type === "extraJump") {
      collisionRadius = 1.2; // Bigger collision for extra jump tokens
    } else if (powerUp.userData.type === "SOS") {
      collisionRadius = 1.5; // Bigger collision for claw powerups
    }

    if (distance < ballRadius + collisionRadius) {
      // Apply power-up effect
      if (powerUp.userData.type === "jetpack") {
        // Add jetpack fuel
        updateJetpackFuel(100);

        // Make sure the jetpack is visible
        if (jetpack) {
          jetpack.visible = true;
        }
      } else if (powerUp.userData.type === "extraJump") {
        // Add an extra jump
        updateExtraJumps(1);
      } else if (powerUp.userData.type === "SOS") {
        // Add grab to counter
        if (addGrab) {
          addGrab();
        }
      }

      // Remove the power-up
      scene.remove(powerUp);
      powerUps.splice(i, 1);
    }
  }

  return {
    backgroundColorIndex: newBackgroundColor,
  };
}

/**
 * Update power-ups (rotation, floating, and attraction animation)
 * @param {number} deltaTime - Time since last frame
 * @param {THREE.Vector3} ballPosition - The current position of the player's ball
 */
export function updatePowerUps(deltaTime, ballPosition) {
  const attractionRadius = 8.0; // Increased radius
  const maxAttractionSpeed = 15.0; // Max speed towards the ball
  const attractionAcceleration = 60.0; // How quickly it reaches max speed

  for (const powerUp of powerUps) {
    // Rotate the power-up
    powerUp.rotation.x += powerUp.userData.rotationSpeed;
    powerUp.rotation.y += powerUp.userData.rotationSpeed * 1.5;

    // Floating animation
    const floatOffset =
      performance.now() * 0.001 + powerUp.userData.floatOffset;
    powerUp.position.y =
      powerUp.userData.originalY +
      Math.sin(floatOffset * powerUp.userData.floatSpeed * 5) *
        powerUp.userData.floatAmplitude;

    // Attraction Mechanic
    powerUp.userData.velocity =
      powerUp.userData.velocity || new THREE.Vector3(); // Initialize velocity if needed

    if (ballPosition) {
      const direction = new THREE.Vector3().subVectors(
        ballPosition,
        powerUp.position
      );
      const distance = direction.length();

      if (distance < attractionRadius && distance > 0.1) {
        // Check distance and avoid division by zero
        // Calculate desired velocity towards the ball, stronger when closer
        const speedFactor = 1.0 - distance / attractionRadius;
        const desiredSpeed = maxAttractionSpeed * speedFactor * speedFactor; // Exponential falloff
        const targetVelocity = direction
          .normalize()
          .multiplyScalar(desiredSpeed);

        // Accelerate towards the target velocity
        const acceleration = new THREE.Vector3().subVectors(
          targetVelocity,
          powerUp.userData.velocity
        );
        acceleration.multiplyScalar(attractionAcceleration * deltaTime);
        powerUp.userData.velocity.add(acceleration);

        // Clamp velocity to max speed
        if (powerUp.userData.velocity.length() > maxAttractionSpeed) {
          powerUp.userData.velocity
            .normalize()
            .multiplyScalar(maxAttractionSpeed);
        }
      } else {
        // Dampen velocity when outside radius or too close
        powerUp.userData.velocity.multiplyScalar(1.0 - 5.0 * deltaTime); // Apply damping factor
      }
    }

    // Apply velocity
    powerUp.position.add(
      powerUp.userData.velocity.clone().multiplyScalar(deltaTime)
    );

    // Add pulsing effect for claw powerups
    if (powerUp.userData.type === "SOS" && powerUp.userData.pulseSpeed > 0) {
      powerUp.userData.pulseTime += deltaTime;
      const pulseScale =
        1 +
        Math.sin(
          powerUp.userData.pulseTime * powerUp.userData.pulseSpeed * 10
        ) *
          0.3; // Increased pulse scale amplitude
      powerUp.scale.set(pulseScale, pulseScale, pulseScale);

      // Also pulse the emissive intensity for a glowing effect
      if (powerUp.material) {
        powerUp.material.emissiveIntensity =
          1.5 + // Increased base pulse glow
          Math.sin(
            powerUp.userData.pulseTime * powerUp.userData.pulseSpeed * 15
          ) *
            0.7; // Increased pulse glow amplitude
      }

      // Animate the light intensity if it exists
      if (powerUp.userData.light) {
        powerUp.userData.light.intensity =
          2.5 + // Increased base light intensity
          Math.sin(
            powerUp.userData.pulseTime * powerUp.userData.pulseSpeed * 12
          ) *
            1.2; // Increased light pulse amplitude
      }
    }
  }
}

/**
 * Remove power-ups that are too far behind
 * @param {THREE.Vector3} ballPosition - The ball position
 * @param {number} removeDistance - Distance threshold for removal
 * @param {THREE.Scene} scene - The scene
 */
export function cleanupPowerUps(ballPosition, removeDistance, scene) {
  powerUps = powerUps.filter((powerUp) => {
    if (powerUp.position.z > ballPosition.z + removeDistance) {
      scene.remove(powerUp);
      return false;
    }
    return true;
  });
}

/**
 * Get all power-ups
 * @returns {Array} Array of power-ups
 */
export function getPowerUps() {
  return powerUps;
}

/**
 * Reset power-ups
 * @param {THREE.Scene} scene - The scene
 */
export function resetPowerUps(scene) {
  // Remove all power-ups
  powerUps.forEach((powerUp) => scene.remove(powerUp));
  powerUps = [];
}

/**
 * Show the game over screen with statistics
 * @param {object} stats - Game statistics object
 */
export function showGameOver(stats) {
  // Use helper functions to update text content
  setText(ELEMENT_IDS.finalScore, stats.score !== undefined ? stats.score : 0);
  setText(
    ELEMENT_IDS.statMaxLevel,
    stats.maxLevelReached !== undefined ? stats.maxLevelReached : 1
  );
  // Format distance to integer
  setText(
    ELEMENT_IDS.statMaxDistance,
    stats.maxDistanceTraveled !== undefined
      ? Math.floor(stats.maxDistanceTraveled)
      : 0
  );
  setText(
    ELEMENT_IDS.statJumps,
    stats.jumpsMade !== undefined ? stats.jumpsMade : 0
  );
  setText(
    ELEMENT_IDS.statJetpacks,
    stats.jetpacksCollected !== undefined ? stats.jetpacksCollected : 0
  );
  setText(
    ELEMENT_IDS.statExtraJumps,
    stats.extraJumpsCollected !== undefined ? stats.extraJumpsCollected : 0
  );
  setText(
    ELEMENT_IDS.statSosCollected,
    stats.sosCollected !== undefined ? stats.sosCollected : 0
  );
  setText(
    ELEMENT_IDS.statSosUsed,
    stats.sosUses !== undefined ? stats.sosUses : 0
  );

  // Make the game over screen visible
  showElement(ELEMENT_IDS.gameOver);
}
