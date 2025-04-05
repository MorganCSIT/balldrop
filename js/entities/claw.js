/**
 * Spaceship Entity (Formerly Claw)
 * Handles creation and movement of the starting spaceship holding the ball
 */

import THREE from "../utils/three-wrapper.js";
import { GAME_SETTINGS, MATERIALS } from "../config.js";

// Spaceship references
let spaceship = null; // Renamed from claw
let ballHeld = true; // Renamed from clawOpen (inverted logic)
let originalGrabHeight = 0; // Track the original height when grab starts

/**
 * Create the spaceship that holds the ball at the start
 * @param {THREE.Scene} scene - The scene to add the spaceship to
 * @returns {Object} The spaceship object
 */
export function createClaw(scene) {
  // Keep function name for compatibility unless refactored everywhere
  // Create a group to hold all spaceship parts
  spaceship = new THREE.Group();

  // Create the spaceship parts
  const shipMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa, // Light gray metallic color
    metalness: 0.7,
    roughness: 0.3,
  });

  // Main body (e.g., a saucer shape)
  const bodyRadius = 1.8;
  const bodyHeight = 0.8;
  const bodyGeometry = new THREE.CylinderGeometry(
    bodyRadius,
    bodyRadius * 0.7,
    bodyHeight,
    16
  );
  const bodyMesh = new THREE.Mesh(bodyGeometry, shipMaterial);
  bodyMesh.position.y = 0; // Center of the ship
  spaceship.add(bodyMesh);

  // Cockpit (dome on top)
  const cockpitRadius = bodyRadius * 0.4;
  const cockpitGeometry = new THREE.SphereGeometry(
    cockpitRadius,
    16,
    8,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2
  ); // Half sphere
  const cockpitMaterial = new THREE.MeshStandardMaterial({
    color: 0x87ceeb, // Sky blue glass
    transparent: true,
    opacity: 0.7,
    emissive: 0x507080,
    emissiveIntensity: 0.5,
  });
  const cockpitMesh = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
  cockpitMesh.position.y = bodyHeight / 2; // Place on top of the body
  spaceship.add(cockpitMesh);

  // Underside structure (maybe to suggest where the ball is held)
  const underGeometry = new THREE.TorusGeometry(bodyRadius * 0.5, 0.15, 8, 16);
  const underMesh = new THREE.Mesh(underGeometry, shipMaterial);
  underMesh.rotation.x = Math.PI / 2;
  underMesh.position.y = -bodyHeight / 2 + 0.1;
  spaceship.add(underMesh);

  // Position the spaceship initially (e.g., higher up)
  spaceship.position.set(0, 15, 0); // Adjust starting height as needed
  spaceship.castShadow = true;
  scene.add(spaceship);

  // Reset state
  ballHeld = true;

  return { claw: spaceship }; // Return using 'claw' key for compatibility
}

/**
 * Update the spaceship position
 * @param {Object} keys - The keyboard state
 * @param {THREE.Vector3} ballPosition - The ball position (not used directly here anymore)
 * @param {boolean} ballReleased - Whether the ball has been released
 * @param {boolean} isGrabbing - Whether the grab powerup is active
 */
export function updateClaw(
  keys,
  ballPosition, // Kept for signature compatibility, but not used
  ballReleased,
  isGrabbing = false
) {
  if (!spaceship) return;

  // Store the current position before any movement
  const previousPosition = {
    x: spaceship.position.x,
    y: spaceship.position.y,
    z: spaceship.position.z,
  };

  // Allow movement if ball is still held or if in grab powerup mode
  if (!ballReleased || isGrabbing) {
    // Allow player to control the spaceship position with keys
    const moveSpeed = 0.15; // Slightly faster movement?
    // Remove left/right movement as requested

    // Handle upward movement with appropriate limits
    if (keys.up) {
      spaceship.position.y += moveSpeed;

      // Apply different height limits depending on game state
      if (isGrabbing) {
        // During grab powerup mode: limit to 20 units above the original grab position
        const maxGrabHeight = originalGrabHeight + 20;
        if (spaceship.position.y > maxGrabHeight) {
          spaceship.position.y = maxGrabHeight;
          console.log("Grab height limit reached (y=" + maxGrabHeight + ")");
        }
      } else {
        // Normal game start: use general limit
        if (spaceship.position.y > 20) spaceship.position.y = 20; // General limit
      }
    }

    // For downward movement:
    if (keys.down) {
      const safeDownSpeed = moveSpeed * 0.6; // Slower downward movement

      if (isGrabbing) {
        // During grab mode: prevent going below the original grab position
        const newY = spaceship.position.y - safeDownSpeed;

        // Don't allow going below original grab height
        if (newY >= originalGrabHeight) {
          spaceship.position.y = newY;
        } else {
          spaceship.position.y = originalGrabHeight;
          console.log(
            "Cannot go below original grab height:",
            originalGrabHeight
          );
        }
      } else {
        // Normal game start: apply normal limits
        const newY = spaceship.position.y - safeDownSpeed;

        // Apply position change with a minimum height limit
        const minHeight = 6; // Minimum height for starting position

        if (newY >= minHeight) {
          spaceship.position.y = newY;
        } else {
          spaceship.position.y = minHeight;
          console.log(
            "Spaceship reached minimum allowed height (y=" + minHeight + ")"
          );
        }
      }
    }

    // If position changed significantly (potential teleport detected)
    const distanceY = Math.abs(spaceship.position.y - previousPosition.y);
    if (distanceY > 1.0) {
      console.warn(
        "Large vertical movement detected, limiting to prevent teleport"
      );
      // Limit the movement to a reasonable amount
      if (spaceship.position.y > previousPosition.y) {
        spaceship.position.y = previousPosition.y + 1.0;
      } else {
        spaceship.position.y = previousPosition.y - 1.0;
      }
    }
  }
}

/**
 * Release the ball from the spaceship (conceptually)
 */
export function releaseBall() {
  if (ballHeld) {
    ballHeld = false;
    // No visual change needed on the ship itself, physics takes over ball
    console.log("Ball released from spaceship");
  }
}

/**
 * Get the spaceship object
 * @returns {THREE.Group} The spaceship object
 */
export function getClaw() {
  // Keep function name for compatibility
  return spaceship;
}

// Remove getClawRope function entirely
// Remove isClawOpen function entirely

/**
 * Set the spaceship position (used for grab powerup effect)
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} z - Z position
 */
export function setClawPosition(x, y, z) {
  // Keep function name for compatibility
  if (!spaceship) return;

  // Position the spaceship at the target position (e.g., ball's position)
  spaceship.position.set(x, y + 1.0, z); // Position slightly above the ball center maybe?
  // Or directly at x,y,z depending on desired visual

  // Store original grab height to limit vertical movement
  originalGrabHeight = y + 1.0;
  console.log("Original grab height set to:", originalGrabHeight);

  // Ensure ball is conceptually 'held' if we are setting position for grab
  ballHeld = true; // Or manage this state via isGrabbingState() in main loop

  console.log("Spaceship positioned for grab at:", { x, y, z });
}

/**
 * Reset the spaceship state
 * @param {THREE.Scene} scene - The scene to add the spaceship to
 */
export function resetClaw(scene) {
  // Keep function name for compatibility
  // Remove existing spaceship
  if (spaceship) {
    // Recursively remove children if any complex disposal needed later
    const disposeGroup = (group) => {
      group.children.forEach((child) => {
        if (child instanceof THREE.Group) {
          disposeGroup(child);
        } else if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      scene.remove(group);
    };
    disposeGroup(spaceship);
  }
  spaceship = null; // Clear reference

  // Create a new spaceship
  createClaw(scene);
}
