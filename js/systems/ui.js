/**
 * UI System
 * Handles UI updates and management
 */

import THREE from "../utils/three-wrapper.js";
import { ELEMENT_IDS } from "../config.js";
import { setText, showElement, hideElement } from "../utils/helpers.js";

/**
 * Update the score display
 * @param {number} score - Current score
 */
export function updateScore(score) {
  setText(ELEMENT_IDS.score, score);
}

/**
 * Update the level display
 * @param {number} level - Current level
 */
export function updateLevel(level) {
  setText(ELEMENT_IDS.level, level);

  // Add level change animation
  const levelContainer = document.getElementById(ELEMENT_IDS.level);
  if (levelContainer) {
    const container = levelContainer.parentElement;

    // Remove the animation class if it exists
    container.classList.remove("level-change");

    // Trigger a reflow to restart the animation
    void container.offsetWidth;

    // Add the animation class
    container.classList.add("level-change");
  }
}

/**
 * Update the jetpack fuel display
 * @param {number} fuel - Current jetpack fuel
 */
export function updateJetpackFuel(fuel) {
  setText(ELEMENT_IDS.jetpackFuel, fuel);
}

/**
 * Update the extra jumps display
 * @param {number} jumps - Current extra jumps count
 */
export function updateExtraJumps(jumps) {
  setText(ELEMENT_IDS.extraJumps, jumps);
}

/**
 * Show the game over screen
 * @param {number} finalScore - Final score
 */
export function showGameOver(finalScore) {
  setText(ELEMENT_IDS.finalScore, finalScore);
  showElement(ELEMENT_IDS.gameOver);
}

/**
 * Hide the game over screen
 */
export function hideGameOver() {
  hideElement(ELEMENT_IDS.gameOver);
}

/**
 * Show the start modal
 */
export function showStartModal() {
  showElement(ELEMENT_IDS.startModal);
}

/**
 * Hide the start modal
 */
export function hideStartModal() {
  console.log("Hiding start modal");
  const modal = document.getElementById(ELEMENT_IDS.startModal);
  if (modal) {
    modal.style.display = "none";
    console.log("Modal display set to none");
  } else {
    console.log("Modal element not found");
  }
}

/**
 * Initialize UI event listeners
 * @param {Function} startGame - Function to start the game
 * @param {Function} restartGame - Function to restart the game
 */
export function initUIEventListeners(startGame, restartGame) {
  document
    .getElementById(ELEMENT_IDS.startButton)
    .addEventListener("click", startGame);
  document
    .getElementById(ELEMENT_IDS.restartButton)
    .addEventListener("click", restartGame);
}

/**
 * Update the SOS counter
 * @param {number} count - Number of SOS uses available
 */
export function updateSOSCounter(count) {
  const sosMeter = document.getElementById(ELEMENT_IDS.grabMeter);
  if (sosMeter) {
    // Set the text content to the count
    sosMeter.textContent = count;

    // Add or remove the available class based on whether SOS is available
    if (count > 0) {
      sosMeter.classList.add("available");
    } else {
      sosMeter.classList.remove("available");
    }
  }
}

/**
 * Reset UI elements
 */
export function resetUI() {
  updateScore(0);
  updateLevel(1);
  updateJetpackFuel(0);
  updateExtraJumps(0);
  updateSOSCounter(0);
  hideGameOver();
}

/**
 * Update the background color of the game scene
 * @param {THREE.Scene} scene - The scene object
 * @param {number} colorIndex - The index of the new color in the backgroundColors array
 * @param {Array<number>} backgroundColors - Array of available background colors
 */
export function updateBackgroundColor(scene, colorIndex, backgroundColors) {
  const newColor = new THREE.Color(backgroundColors[colorIndex]);
  scene.background = newColor;
}
