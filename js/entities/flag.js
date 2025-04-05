/**
 * Flag Entity
 * Handles creation and animation of the red flag on platforms
 */

import THREE from "../utils/three-wrapper.js";
import { MATERIALS } from "../config.js";

// Reference to the flag model
let flagModel = null;

/**
 * Create a red flag for the final platform
 * @param {THREE.Mesh} platform - The platform to add the flag to
 * @returns {THREE.Group} The flag model
 */
export function createFlag(platform) {
  // Create a flag pole (thicker and taller for better visibility)
  const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: MATERIALS.flagPole.color,
    roughness: MATERIALS.flagPole.roughness,
  });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.set(0, 2, 0); // Position on the platform, taller

  // Create a simpler, larger flag with bright color
  const flagGeometry = new THREE.PlaneGeometry(2.5, 1.5); // Larger flag
  const flagMaterial = new THREE.MeshBasicMaterial({
    // Using MeshBasicMaterial for brighter color
    color: 0xff0000, // Bright red color for flag
    side: THREE.DoubleSide,
    emissive: 0xff0000, // Make it glow
    emissiveIntensity: 0.5,
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(1.25, 3.5, 0); // Position at the top of the pole
  flag.rotation.y = Math.PI / 2; // Rotate to face sideways

  // Create a group for the flag
  flagModel = new THREE.Group();
  flagModel.add(pole);
  flagModel.add(flag);

  // Add the flag to the platform
  platform.add(flagModel);

  // Animate the flag waving
  flagModel.userData = {
    waveSpeed: 0.01,
    waveAmplitude: 0.1,
  };

  return flagModel;
}

/**
 * Update the flag animation
 */
export function updateFlag() {
  if (flagModel) {
    // Get the flag part (second child)
    const flag = flagModel.children[1];

    // Make the flag wave
    flag.rotation.z = Math.sin(performance.now() * 0.003) * 0.2;
  }
}

/**
 * Get the current flag model
 * @returns {THREE.Group} The flag model
 */
export function getFlagModel() {
  return flagModel;
}

/**
 * Reset the flag model reference
 */
export function resetFlag() {
  flagModel = null;
}
