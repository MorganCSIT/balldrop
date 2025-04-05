/**
 * Jetpack Entity
 * Handles creation and management of the jetpack
 */

import THREE from "../utils/three-wrapper.js";
import { GAME_SETTINGS, MATERIALS } from "../config.js";

// Jetpack references
let jetpack = null;
let jetpackFlames = [];

/**
 * Create jetpack for the ball
 * @param {THREE.Group} ball - The ball to attach the jetpack to
 * @returns {THREE.Group} The jetpack object
 */
export function createJetpack(ball) {
  // Create a jetpack group
  jetpack = new THREE.Group();

  // Create the main jetpack body
  const jetpackBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8),
    new THREE.MeshStandardMaterial({
      color: MATERIALS.jetpack.body.color,
      metalness: MATERIALS.jetpack.body.metalness,
      roughness: MATERIALS.jetpack.body.roughness,
    })
  );
  jetpack.add(jetpackBody);

  // Create the nozzles
  const nozzleGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.3, 8);
  const nozzleMaterial = new THREE.MeshStandardMaterial({
    color: MATERIALS.jetpack.nozzle.color,
    metalness: MATERIALS.jetpack.nozzle.metalness,
    roughness: MATERIALS.jetpack.nozzle.roughness,
  });

  // Left nozzle
  const leftNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
  leftNozzle.position.set(-0.2, -0.5, 0);
  jetpack.add(leftNozzle);

  // Right nozzle
  const rightNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
  rightNozzle.position.set(0.2, -0.5, 0);
  jetpack.add(rightNozzle);

  // Create flame particles
  const flameGeometry = new THREE.ConeGeometry(0.1, 0.4, 8);
  const flameMaterial = new THREE.MeshBasicMaterial({
    color: MATERIALS.jetpack.flame.color,
    transparent: true,
    opacity: 0.8,
  });

  // Clear previous flames array
  jetpackFlames = [];

  // Left flame
  const leftFlame = new THREE.Mesh(flameGeometry, flameMaterial);
  leftFlame.position.set(-0.2, -0.7, 0);
  leftFlame.rotation.x = Math.PI; // Point downward
  leftFlame.visible = false; // Hidden by default
  jetpack.add(leftFlame);
  jetpackFlames.push(leftFlame);

  // Right flame
  const rightFlame = new THREE.Mesh(flameGeometry, flameMaterial);
  rightFlame.position.set(0.2, -0.7, 0);
  rightFlame.rotation.x = Math.PI; // Point downward
  rightFlame.visible = false; // Hidden by default
  jetpack.add(rightFlame);
  jetpackFlames.push(rightFlame);

  // Position the jetpack on the ball's back
  jetpack.position.set(0, 0, 1);
  jetpack.rotation.x = Math.PI / 2; // Rotate to be on the back

  // Add the jetpack to the ball
  ball.add(jetpack);

  // Hide the jetpack initially
  jetpack.visible = false;

  return jetpack;
}

import { setJumpingState, setDoubleJumpedState } from "./ball.js";

/**
 * Update jetpack flames and physics
 * @param {boolean} isJetpackActive - Whether the jetpack is active
 * @param {number} jetpackFuel - Current jetpack fuel
 * @param {Object} ballVelocity - The ball velocity
 * @param {Function} updateJetpackFuel - Function to update jetpack fuel
 * @returns {Object} Updated ball velocity
 */
export function updateJetpack(
  isJetpackActive,
  jetpackFuel,
  ballVelocity,
  updateJetpackFuel
) {
  if (!jetpack) return ballVelocity;

  // Show/hide jetpack based on fuel
  jetpack.visible = jetpackFuel > 0;

  // Update flames visibility based on jetpack activation
  for (const flame of jetpackFlames) {
    flame.visible = isJetpackActive && jetpackFuel > 0;

    // Animate flames if visible
    if (flame.visible) {
      // Random scale for flame flicker effect
      const scaleVariation = 0.7 + Math.random() * 0.6;
      flame.scale.set(scaleVariation, 1 + Math.random() * 0.5, scaleVariation);

      // Random color variation between orange and yellow
      const hue = 0.05 + Math.random() * 0.05; // Between orange-red and yellow
      flame.material.color.setHSL(hue, 1, 0.5);
    }
  }

  // Apply jetpack physics if active
  if (isJetpackActive && jetpackFuel > 0) {
    // Apply upward force
    ballVelocity.y += GAME_SETTINGS.jetpackBoostForce;

    // Check if this will be the last fuel point
    const willDepleteFuel = jetpackFuel === 1;

    // Consume fuel
    updateJetpackFuel(jetpackFuel - 1);

    // If fuel is now depleted, set jump state to allow a double jump
    if (willDepleteFuel) {
      // Set jumping state to true (as if player did first jump)
      // but double jumped state to false (so they can still do a double jump)
      setJumpingState(true);
      setDoubleJumpedState(false);
    }

    // Return updated velocity
    return { ...ballVelocity };
  }

  return ballVelocity;
}

/**
 * Get the jetpack object
 * @returns {THREE.Group} The jetpack object
 */
export function getJetpack() {
  return jetpack;
}

/**
 * Get the jetpack flames
 * @returns {Array} Array of jetpack flames
 */
export function getJetpackFlames() {
  return jetpackFlames;
}

/**
 * Reset the jetpack
 */
export function resetJetpack() {
  if (jetpack) {
    jetpack.visible = false;
  }
  jetpackFlames = [];
}
