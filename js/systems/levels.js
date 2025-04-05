/**
 * Levels System
 * Handles level generation, progression, and management
 */

import { GAME_SETTINGS, BACKGROUND_COLORS } from "../config.js";
import { generateNewLevel } from "../entities/platform.js";
import { getBall } from "../entities/ball.js";
import { updateLevel } from "./ui.js";

/**
 * Initialize a new level
 * @param {number} level - Current level
 * @param {number} speed - Current speed
 * @param {THREE.Scene} scene - The scene
 * @param {Function} updateBackgroundColor - Function to update background color
 * @returns {Object} Updated game state
 */
export function initLevel(level, speed, scene, updateBackgroundColor) {
  // Update level display with animation
  updateLevel(level);

  // Change background color based on level
  const backgroundColorIndex = (level - 1) % BACKGROUND_COLORS.length;
  updateBackgroundColor(backgroundColorIndex);

  return {
    level,
    speed,
    redFlagPlatformReached: false,
  };
}

/**
 * Progress to the next level
 * @param {number} level - Current level
 * @param {number} speed - Current speed
 * @param {THREE.Scene} scene - The scene
 * @param {Function} updateBackgroundColor - Function to update background color
 * @returns {Object} Updated game state
 */
export function progressToNextLevel(
  level,
  speed,
  scene,
  updateBackgroundColor
) {
  // Increment level
  level++;

  // Update level display with animation
  updateLevel(level);

  // Generate new level platforms - this now removes all existing platforms
  const levelState = generateNewLevel(level, speed, scene);

  // Change background color based on level
  const backgroundColorIndex = (level - 1) % BACKGROUND_COLORS.length;
  updateBackgroundColor(backgroundColorIndex);

  // Reset the ball's position to be above the first platform of the new level
  const ball = getBall();
  if (ball) {
    // Position the ball above the red flag platform (which is now the first platform)
    ball.position.set(0, 5, -15); // Slightly ahead of the red platform
  }

  return {
    level,
    speed: levelState.speed,
    redFlagPlatformReached: false,
  };
}

/**
 * Check if the player has reached the end of the level
 * @param {boolean} redFlagPlatformReached - Whether the red flag platform has been reached
 * @param {number} level - Current level
 * @param {number} speed - Current speed
 * @param {THREE.Scene} scene - The scene
 * @param {Function} updateBackgroundColor - Function to update background color
 * @returns {Object} Updated game state
 */
export function checkLevelCompletion(
  redFlagPlatformReached,
  level,
  speed,
  scene,
  updateBackgroundColor
) {
  if (redFlagPlatformReached) {
    return progressToNextLevel(level, speed, scene, updateBackgroundColor);
  }

  return {
    level,
    speed,
    redFlagPlatformReached,
  };
}

/**
 * Update level difficulty based on score
 * @param {number} score - Current score
 * @param {number} speed - Current speed
 * @returns {number} Updated speed
 */
export function updateDifficulty(score, speed) {
  // Increase speed as score increases, but with a more gradual curve
  // This makes the game get harder more gradually
  return 0.2 + Math.min(0.5, score / 2000);
}
