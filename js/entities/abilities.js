/**
 * Abilities Module
 * Handles special abilities like grab, time slow, etc.
 */

import THREE from "../utils/three-wrapper.js";
import { GAME_SETTINGS, ELEMENT_IDS } from "../config.js";
import {
  getBall,
  getBallVelocity,
  setBallVelocity,
  jump,
  applyJumpForce,
  getJumpChargeTime,
  isJumpingState,
  hasDoubleJumpedState,
  getAirEntryMethod,
  getExtraJumps,
} from "../entities/ball.js";
import { getClaw } from "../entities/claw.js";
import { getPlatforms } from "../entities/platform.js";

// Grab state
let grabCount = 0;
let isGrabbing = false;
let grabParticles = [];

/**
 * Initialize abilities
 */
export function initAbilities() {
  grabCount = 0;
  isGrabbing = false;
  grabParticles = [];
}

/**
 * Add grab to the counter
 */
export function addGrab() {
  grabCount++;
  updateSOSCounterUI();
}

/**
 * Check if grab is available
 * @returns {boolean} Whether grab is available
 */
export function canUseGrab() {
  return grabCount > 0 && !isGrabbing;
}

/**
 * Get current grab count
 * @returns {number} Current grab count
 */
export function getGrabCount() {
  return grabCount;
}

/**
 * Execute claw grab to reposition the ball
 * @param {THREE.Scene} scene - The scene for visual effects
 * @param {Function} pauseGame - Function to pause the game
 * @param {Function} getBallPosition - Function to get the ball position
 * @param {Function} setClaw - Function to set the claw position
 */
export function executeGrab(scene, pauseGame, getBallPosition, setClaw) {
  console.log(
    "Attempting to execute grab. Can use grab:",
    canUseGrab(),
    "Current grab count:",
    grabCount
  );

  if (!canUseGrab()) return;

  console.log("Executing grab! Scene provided:", !!scene);

  // Set grab state
  isGrabbing = true;
  grabCount--;
  updateSOSCounterUI();

  // Get the current ball position
  const ball = getBall();
  if (!ball) {
    console.error("Ball not found, cannot execute grab");
    isGrabbing = false;
    return;
  }

  // Pause the game to allow aiming
  if (pauseGame) {
    pauseGame(true);
  } else {
    console.warn("pauseGame function not provided, cannot pause game");
  }

  // Store the ball's current position
  const ballPosition = {
    x: ball.position.x,
    y: ball.position.y,
    z: ball.position.z,
  };

  // Position the claw at the ball's position
  if (setClaw) {
    setClaw(ballPosition.x, ballPosition.y, ballPosition.z);
    console.log("Claw positioned at ball's location:", ballPosition);
  } else {
    console.warn("setClaw function not provided, cannot position claw");
  }

  // Create visual effect if scene is provided
  if (scene) {
    createGrabEffect(scene, ball.position);
  } else {
    console.error(
      "No scene provided to executeGrab, cannot create visual effects"
    );
  }

  // We don't automatically end the grab state - it will be ended when the ball is released
  console.log("Grab initiated, game paused for aiming");
}

/**
 * Create visual effect for grab
 * @param {THREE.Scene} scene - The scene to add effects to
 * @param {THREE.Vector3} position - Position to create the effect
 */
function createGrabEffect(scene, position) {
  // Clear any existing particles
  clearGrabParticles(scene);

  // Create new particles
  const particleCount = 20;
  const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const particleMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff, // Cyan color for grab effect
    transparent: true,
    opacity: 0.7,
  });

  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    // Position in a sphere around the ball
    const radius = 1.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    particle.position.set(
      position.x + radius * Math.sin(phi) * Math.cos(theta),
      position.y + radius * Math.sin(phi) * Math.sin(theta),
      position.z + radius * Math.cos(phi)
    );

    scene.add(particle);
    grabParticles.push(particle);

    // Animate particle fade-out
    animateParticle(particle, scene, i * 30);
  }
}

/**
 * Animate a grab particle
 * @param {THREE.Mesh} particle - The particle to animate
 * @param {THREE.Scene} scene - The scene
 * @param {number} delay - Delay before starting animation
 */
function animateParticle(particle, scene, delay) {
  setTimeout(() => {
    const fadeInterval = setInterval(() => {
      if (particle.material.opacity <= 0.1) {
        clearInterval(fadeInterval);
        scene.remove(particle);

        // Remove from array
        const index = grabParticles.indexOf(particle);
        if (index > -1) {
          grabParticles.splice(index, 1);
        }
      } else {
        particle.material.opacity -= 0.05;
      }
    }, 50);
  }, delay);
}

/**
 * Clear all grab particles
 * @param {THREE.Scene} scene - The scene
 */
function clearGrabParticles(scene) {
  grabParticles.forEach((particle) => {
    scene.remove(particle);
  });
  grabParticles = [];
}

/**
 * Update SOS counter UI
 */
function updateSOSCounterUI() {
  const sosCounter = document.getElementById(ELEMENT_IDS.grabMeter); // Element ID is "sos-meter" in HTML
  if (sosCounter) {
    // Update the text to show the SOS count
    sosCounter.textContent = grabCount;

    // Add or remove the available class based on whether SOS is available
    if (grabCount > 0) {
      sosCounter.classList.add("available");
    } else {
      sosCounter.classList.remove("available");
    }

    // Log for debugging
    console.log(`SOS count updated: ${grabCount}`);
  }
}

/**
 * Reset abilities
 * @param {THREE.Scene} scene - The scene
 */
export function resetAbilities(scene) {
  clearGrabParticles(scene);
  grabCount = 0;
  isGrabbing = false;
  updateSOSCounterUI();
}

/**
 * Check if the player is currently grabbing
 * @returns {boolean} Whether the player is grabbing
 */
export function isGrabbingState() {
  return isGrabbing;
}

/**
 * End the grab state
 */
export function endGrab() {
  const ball = getBall();
  const spaceship = getClaw();

  // First ensure we have valid references
  if (ball && spaceship) {
    // Store the current ball position for logging
    const oldPosition = {
      x: ball.position.x,
      y: ball.position.y,
      z: ball.position.z,
    };

    // Make sure we don't change the X and Z position drastically
    // Only copy the Y position from the spaceship if it's a reasonable value
    const newPosition = {
      x: ball.position.x, // Keep current X
      y: spaceship.position.y, // Use spaceship Y
      z: ball.position.z, // Keep current Z
    };

    // Check if this is a reasonable position change (prevent teleporting)
    const distanceY = Math.abs(newPosition.y - oldPosition.y);
    if (distanceY > 5.0) {
      console.warn(
        "Teleport prevented in endGrab - large position change detected"
      );
      // Set a safe minimum height instead
      newPosition.y = Math.max(oldPosition.y, 7); // Ensure at least minimum height
    }

    // Apply the final position
    ball.position.set(newPosition.x, newPosition.y, newPosition.z);

    // Reset velocity to ensure a clean start after grab
    setBallVelocity({ x: 0, y: 0, z: 0 });

    console.log("Grab ended - Ball position updated safely");
  } else {
    // Reset velocity even if ball/spaceship not found
    setBallVelocity({ x: 0, y: 0, z: 0 });
    console.log("Grab ended (no ball/spaceship references)");
  }

  // Always reset the grab state
  isGrabbing = false;
}
