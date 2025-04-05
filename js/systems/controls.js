/**
 * Controls System
 * Handles keyboard and touch input and control logic
 */

import {
  isTouchDevice,
  initTouchControls,
  virtualKeys as touchVirtualKeys,
  toggleTouchControlsVisibility,
  resetTouchState,
} from "./touch-controls.js";
import {
  jump,
  applyJumpForce,
  getJumpChargeTime,
  isJumpingState,
  hasDoubleJumpedState,
  getAirEntryMethod,
  getExtraJumps,
} from "../entities/ball.js";
import {
  canUseGrab,
  executeGrab,
  isGrabbingState,
  endGrab,
} from "../entities/abilities.js";
import { releaseBall } from "../entities/claw.js";
import { isOnPlatform } from "./collision.js";
import { GAME_SETTINGS } from "../config.js";
import { updateExtraJumps } from "./ui.js";

// Input state (combines keyboard and touch)
let keys = { left: false, right: false, up: false, down: false, space: false };
let isMobileDevice = false;

// Triple-tap detection variables
let upPressTimes = [0, 0, 0]; // Store the last three press times
let upPressCount = 0; // Count of presses within the window

/**
 * Initialize controls (keyboard and touch)
 * @param {Function} restartGame - Function to restart the game
 */
export function initControls(restartGame) {
  // Check if device supports touch
  isMobileDevice = isTouchDevice();

  // Add keyboard event listeners
  document.addEventListener("keydown", (event) =>
    onKeyDown(event, restartGame)
  );
  document.addEventListener("keyup", onKeyUp);

  // Initialize touch controls if on a touch device
  if (isMobileDevice) {
    console.log("Touch device detected, initializing touch controls");
    initTouchControls();
    toggleTouchControlsVisibility(true);

    // Add mobile instructions to start modal
    updateStartModalForMobile();
  }
}

/**
 * Update the start modal with mobile instructions
 */
function updateStartModalForMobile() {
  const startModal = document.getElementById("start-modal");
  if (!startModal) return;

  const modalContent = startModal.querySelector(".modal-content");
  if (!modalContent) return;

  // Find the paragraph with keyboard instructions
  const instructionsParagraph = Array.from(
    modalContent.querySelectorAll("p")
  ).find(
    (p) =>
      p.textContent.includes("WASD") || p.textContent.includes("Arrow Keys")
  );

  if (instructionsParagraph) {
    // Replace keyboard instructions with touch instructions
    instructionsParagraph.innerHTML =
      "Use the virtual joystick on the left to move, " +
      "tap the JUMP button to jump, and the GRAB button for special abilities.";
  }
}

/**
 * Handle keydown events
 * @param {KeyboardEvent} event - The keyboard event
 * @param {Function} restartGame - Function to restart the game
 * @param {boolean} gameOver - Whether the game is over
 * @param {boolean} ballReleased - Whether the ball has been released
 * @param {number} jetpackFuel - Current jetpack fuel
 * @param {Function} setJetpackActive - Function to set jetpack active state
 * @param {Function} setGameStarted - Function to set game started state
 * @param {Function} setBallReleased - Function to set ball released state
 * @param {THREE.Scene} scene - The scene for visual effects
 * @param {Function} pauseGame - Function to pause the game
 * @param {Function} setClaw - Function to set the claw position
 */
export function onKeyDown(
  event,
  restartGame,
  gameOver = false,
  ballReleased = false,
  jetpackFuel = 0,
  setJetpackActive = null,
  setGameStarted = null,
  setBallReleased = null,
  scene = null,
  pauseGame = null,
  setClaw = null
) {
  if (gameOver) {
    // Allow restarting with 'R' key when game is over
    if (event.key.toLowerCase() === "r") {
      restartGame();
      return;
    }
    return;
  }

  // Set game started when any key is pressed
  if (setGameStarted) {
    setGameStarted(true);
  }

  switch (event.key) {
    case "ArrowLeft":
      keys.left = true;
      break;
    case "ArrowRight":
      keys.right = true;
      break;
    case "ArrowUp":
      // Check for triple-tap grab
      const upNow = performance.now();
      console.log("Up arrow pressed at:", upNow);

      // Shift the array to make room for the new press time
      upPressTimes.shift();
      upPressTimes.push(upNow);

      // Check if we have three presses within the window
      const firstPress = upPressTimes[0];
      const secondPress = upPressTimes[1];
      const thirdPress = upPressTimes[2];

      console.log("Press times:", upPressTimes);

      // Check if all three presses are within the window
      if (
        firstPress > 0 &&
        secondPress - firstPress < GAME_SETTINGS.grabDoubleTapWindow &&
        thirdPress - secondPress < GAME_SETTINGS.grabDoubleTapWindow
      ) {
        console.log("Triple-tap detected! Checking if grab is available...");

        if (canUseGrab() && ballReleased) {
          console.log("Executing grab!");
          // Use the global scene if available, otherwise use the passed scene parameter
          const grabScene = window.gameScene || scene;
          executeGrab(grabScene, pauseGame, null, setClaw);
        } else {
          console.log("Cannot grab: grab not available or ball not released");
        }
      }

      keys.up = true;
      break;
    case "ArrowDown":
      keys.down = true;
      break;
    case " ":
    case "Spacebar":
      // If the ball is in grab mode, release it with the current trajectory
      if (isGrabbingState()) {
        console.log("Releasing ball from grab mode");
        if (pauseGame) {
          pauseGame(false); // Unpause the game
        }
        endGrab(); // End the grab state
        // The ball will continue with its current velocity
        return;
      }

      // If the ball is still in the claw, release it
      if (!ballReleased) {
        releaseBall();
        keys.space = true;
        // Update the ballReleased flag in the main game
        if (setBallReleased) {
          setBallReleased(true);
        }
        return;
      }

      // Activate jetpack if we have fuel
      if (jetpackFuel > 0 && setJetpackActive) {
        setJetpackActive(true);
        return;
      }

      // Regular jump if on platform
      if (!keys.space && !isJumpingState() && isOnPlatform()) {
        keys.space = true;
        const remainingJumps = jump(false);
        updateExtraJumps(remainingJumps);
      }
      // Handle jumps in the air
      else if (!keys.space && !isOnPlatform()) {
        const airEntryMethod = getAirEntryMethod();

        // If the player fell off a platform (didn't jump or bounce), allow one jump in the air
        if (!isJumpingState() && airEntryMethod === "fell") {
          keys.space = true;
          const remainingJumps = jump(false); // First jump
          updateExtraJumps(remainingJumps);
        }
        // If the player is already jumping (either from a regular jump or after falling)
        // and hasn't double jumped yet
        else if (!hasDoubleJumpedState()) {
          // Allow double jump only if player jumped off, bounced off, or rolled off a platform
          if (
            airEntryMethod === "jumped" ||
            airEntryMethod === "bounced" ||
            airEntryMethod === "rolled"
          ) {
            keys.space = true;
            const remainingJumps = jump(true); // Double jump
            updateExtraJumps(remainingJumps);
          }
          // If the player has done their first jump after falling, allow a double jump
          else if (airEntryMethod === "fell" && isJumpingState()) {
            keys.space = true;
            const remainingJumps = jump(true); // Double jump after falling and doing first jump
            updateExtraJumps(remainingJumps);
          }
        }
        // If the player has already double jumped but has extra jumps available
        else if (hasDoubleJumpedState() && getExtraJumps() > 0) {
          keys.space = true;
          const remainingJumps = jump(false, true); // Use an extra jump
          updateExtraJumps(remainingJumps);
        }
      }
      break;
    case "r":
    case "R":
      // Also allow restart during gameplay
      restartGame();
      break;
  }
}

/**
 * Handle keyup events
 * @param {KeyboardEvent} event - The keyboard event
 * @param {Function} setJetpackActive - Function to set jetpack active state
 */
export function onKeyUp(event, setJetpackActive = null) {
  switch (event.key) {
    case "ArrowLeft":
      keys.left = false;
      break;
    case "ArrowRight":
      keys.right = false;
      break;
    case "ArrowUp":
      keys.up = false;
      break;
    case "ArrowDown":
      keys.down = false;
      break;
    case " ":
    case "Spacebar":
      // Deactivate jetpack when spacebar is released
      if (setJetpackActive) {
        setJetpackActive(false);
      }

      // When spacebar is released, if we're still in the "charging" phase
      // add extra force based on how long it was held
      if (keys.space && isJumpingState()) {
        // Calculate additional force based on how long the spacebar was held
        // Clamp between 0 and maximum additional force
        const additionalForce = Math.min(
          GAME_SETTINGS.maxJumpForce - GAME_SETTINGS.jumpForce, // Maximum additional force
          getJumpChargeTime() * 0.8 // Increase force based on charge time (faster rate)
        );

        // Add the additional force to current velocity
        applyJumpForce(additionalForce);
      }
      keys.space = false;
      break;
  }
}

/**
 * Get the current input state (combines keyboard and touch)
 * @returns {Object} The input state
 */
export function getKeys() {
  if (isMobileDevice) {
    // Combine keyboard and touch inputs
    return {
      left: keys.left || touchVirtualKeys.left,
      right: keys.right || touchVirtualKeys.right,
      up: keys.up || touchVirtualKeys.up,
      down: keys.down || touchVirtualKeys.down,
      space: keys.space || touchVirtualKeys.space,
    };
  }
  return keys;
}

/**
 * Reset the input state
 */
export function resetKeys() {
  keys = { left: false, right: false, up: false, down: false, space: false };
  upPressTimes = [0, 0, 0];
  upPressCount = 0;

  // Also reset touch state if on mobile
  if (isMobileDevice) {
    resetTouchState();
  }
}

/**
 * Add button event listeners
 * @param {string} startButtonId - ID of the start button
 * @param {string} restartButtonId - ID of the restart button
 * @param {Function} startGame - Function to start the game
 * @param {Function} restartGame - Function to restart the game
 */
export function addButtonListeners(
  startButtonId,
  restartButtonId,
  startGame,
  restartGame
) {
  document
    .getElementById(restartButtonId)
    .addEventListener("click", restartGame);
  document.getElementById(startButtonId).addEventListener("click", startGame);
}
