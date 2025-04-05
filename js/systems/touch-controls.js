/**
 * Touch Controls System
 * Handles touch input for mobile devices
 */

import { GAME_SETTINGS } from "../config.js";
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
import { updateExtraJumps } from "./ui.js";

// Touch state
let touchState = {
  joystickActive: false,
  joystickStartX: 0,
  joystickCurrentX: 0,
  joystickId: null,
  jumpActive: false,
  doubleTapTime: 0,
  lastTapTime: 0,
  tapCount: 0,
  leftArrowActive: false,
  rightArrowActive: false,
};

// Virtual keys state (to integrate with existing keyboard controls)
export let virtualKeys = {
  left: false,
  right: false,
  up: false,
  down: false,
  space: false,
};

// DOM elements for touch controls
let leftArrowElement;
let rightArrowElement;
let jumpButtonElement;
let grabButtonElement;

/**
 * Initialize touch controls
 */
export function initTouchControls() {
  // Create touch control elements
  createTouchControls();

  // Initialize button states based on current game state
  setTimeout(() => {
    if (window.gameState) {
      updateDirectionalButtons();
    }
  }, 100);

  // Add specific event listeners for control elements
  if (leftArrowElement) {
    leftArrowElement.addEventListener(
      "touchstart",
      (event) => {
        event.preventDefault();
        touchState.leftArrowActive = true;
        // If in grab mode or ball not released yet, use this button for down movement
        if (
          isGrabbingState() ||
          (window.gameState && !window.gameState.ballReleased)
        ) {
          virtualKeys.down = true;
          // Update visual appearance to show it's now "down"
          leftArrowElement.innerHTML = "↓";
        } else {
          virtualKeys.left = true;
        }
      },
      {
        passive: false,
      }
    );
    leftArrowElement.addEventListener(
      "touchend",
      (event) => {
        event.preventDefault();
        touchState.leftArrowActive = false;
        // Reset both left and down keys
        virtualKeys.left = false;
        virtualKeys.down = false;
      },
      {
        passive: false,
      }
    );
  }

  if (rightArrowElement) {
    rightArrowElement.addEventListener(
      "touchstart",
      (event) => {
        event.preventDefault();
        touchState.rightArrowActive = true;
        // If in grab mode or ball not released yet, use this button for up movement
        if (
          isGrabbingState() ||
          (window.gameState && !window.gameState.ballReleased)
        ) {
          virtualKeys.up = true;
          // Update visual appearance to show it's now "up"
          rightArrowElement.innerHTML = "↑";
        } else {
          virtualKeys.right = true;
        }
      },
      {
        passive: false,
      }
    );
    rightArrowElement.addEventListener(
      "touchend",
      (event) => {
        event.preventDefault();
        touchState.rightArrowActive = false;
        // Reset both right and up keys
        virtualKeys.right = false;
        virtualKeys.up = false;
      },
      {
        passive: false,
      }
    );
  }

  if (jumpButtonElement) {
    jumpButtonElement.addEventListener(
      "touchstart",
      (event) => {
        if (window.gameState) {
          handleJumpTouchStart(
            event,
            window.gameState.gameOver,
            window.gameState.ballReleased,
            window.gameState.jetpackFuel,
            window.gameState.setJetpackActive,
            window.gameState.setBallReleased
          );
        }
      },
      {
        passive: false,
      }
    );
    jumpButtonElement.addEventListener(
      "touchend",
      (event) => {
        if (window.gameState) {
          handleJumpTouchEnd(event, window.gameState.setJetpackActive);
        }
      },
      {
        passive: false,
      }
    );
  }

  if (grabButtonElement) {
    grabButtonElement.addEventListener(
      "touchstart",
      (event) => {
        if (window.gameState) {
          handleGrabTouch(
            event,
            window.gameState.ballReleased,
            window.gameState.pauseGame,
            window.gameState.scene,
            window.gameState.setClawPosition
          );
        }
      },
      {
        passive: false,
      }
    );
  }
}

/**
 * Create touch control elements
 */
function createTouchControls() {
  // Create container for touch controls
  const touchControlsContainer = document.createElement("div");
  touchControlsContainer.id = "touch-controls";
  touchControlsContainer.className = "touch-controls";
  document.getElementById("game-container").appendChild(touchControlsContainer);

  // Create left arrow button
  leftArrowElement = document.createElement("div");
  leftArrowElement.id = "left-arrow";
  leftArrowElement.className = "control-button left-button";
  leftArrowElement.innerHTML = "←";
  touchControlsContainer.appendChild(leftArrowElement);

  // Create right arrow button
  rightArrowElement = document.createElement("div");
  rightArrowElement.id = "right-arrow";
  rightArrowElement.className = "control-button right-button";
  rightArrowElement.innerHTML = "→";
  touchControlsContainer.appendChild(rightArrowElement);

  // Create jump button
  jumpButtonElement = document.createElement("div");
  jumpButtonElement.id = "jump-button";
  jumpButtonElement.className = "control-button jump-button";
  jumpButtonElement.innerHTML = "JUMP";
  touchControlsContainer.appendChild(jumpButtonElement);

  // Create grab button
  grabButtonElement = document.createElement("div");
  grabButtonElement.id = "grab-button";
  grabButtonElement.className = "control-button grab-button";
  grabButtonElement.innerHTML = "GRAB";
  touchControlsContainer.appendChild(grabButtonElement);
}

/**
 * Handle jump button touch start
 * @param {TouchEvent} event - The touch event
 * @param {boolean} gameOver - Whether the game is over
 * @param {boolean} ballReleased - Whether the ball has been released
 * @param {number} jetpackFuel - Current jetpack fuel
 * @param {Function} setJetpackActive - Function to set jetpack active state
 * @param {Function} setBallReleased - Function to set ball released state
 */
function handleJumpTouchStart(
  event,
  gameOver = false,
  ballReleased = true,
  jetpackFuel = 0,
  setJetpackActive = null,
  setBallReleased = null
) {
  // Prevent default behavior
  event.preventDefault();

  if (gameOver) {
    return;
  }

  // Start the game with the first jump
  if (
    window.gameState &&
    !window.gameState.gameStarted &&
    window.gameState.setGameStarted
  ) {
    console.log("Starting game from jump button");
    window.gameState.setGameStarted(true);
  }

  // If the ball is in grab mode, release it
  if (isGrabbingState()) {
    console.log("Releasing ball from grab mode");

    // Unpause the game when ending grab mode
    if (window.gameState && window.gameState.pauseGame) {
      window.gameState.pauseGame(false); // Unpause the game
    }

    endGrab();

    // Update directional buttons back to normal mode
    setTimeout(updateDirectionalButtons, 100);
    return;
  }

  // If the ball is still in the claw, release it
  if (!ballReleased) {
    releaseBall();
    virtualKeys.space = true;
    // Update the ballReleased flag in the main game
    if (setBallReleased) {
      setBallReleased(true);

      // Update directional buttons back to normal mode after a delay
      setTimeout(() => {
        // Force update controls appearance after ball is released
        if (window.gameState) {
          console.log("Updating controls after ball release");
          updateDirectionalButtons();
        }
      }, 100);
    }
    return;
  }

  // Activate jetpack if we have fuel
  if (jetpackFuel > 0 && setJetpackActive) {
    setJetpackActive(true);
    return;
  }

  // Regular jump if on platform
  if (!touchState.jumpActive && !isJumpingState() && isOnPlatform()) {
    touchState.jumpActive = true;
    virtualKeys.space = true;
    const remainingJumps = jump(false);
    updateExtraJumps(remainingJumps);
  }
  // Handle jumps in the air
  else if (!touchState.jumpActive && !isOnPlatform()) {
    const airEntryMethod = getAirEntryMethod();

    // If the player fell off a platform (didn't jump or bounce), allow one jump in the air
    if (!isJumpingState() && airEntryMethod === "fell") {
      touchState.jumpActive = true;
      virtualKeys.space = true;
      const remainingJumps = jump(false); // First jump
      updateExtraJumps(remainingJumps);
    }
    // If the player is already jumping and hasn't double jumped yet
    else if (!hasDoubleJumpedState()) {
      // Allow double jump only if player jumped off, bounced off, or rolled off a platform
      if (
        airEntryMethod === "jumped" ||
        airEntryMethod === "bounced" ||
        airEntryMethod === "rolled"
      ) {
        touchState.jumpActive = true;
        virtualKeys.space = true;
        const remainingJumps = jump(true); // Double jump
        updateExtraJumps(remainingJumps);
      }
      // If the player has done their first jump after falling, allow a double jump
      else if (airEntryMethod === "fell" && isJumpingState()) {
        touchState.jumpActive = true;
        virtualKeys.space = true;
        const remainingJumps = jump(true); // Double jump after falling and doing first jump
        updateExtraJumps(remainingJumps);
      }
    }
    // If the player has already double jumped but has extra jumps available
    else if (hasDoubleJumpedState() && getExtraJumps() > 0) {
      touchState.jumpActive = true;
      virtualKeys.space = true;
      const remainingJumps = jump(false, true); // Use an extra jump
      updateExtraJumps(remainingJumps);
    }
  }
}

/**
 * Handle jump button touch end
 * @param {TouchEvent} event - The touch event
 * @param {Function} setJetpackActive - Function to set jetpack active state
 */
function handleJumpTouchEnd(event, setJetpackActive = null) {
  // Prevent default behavior
  event.preventDefault();

  // Deactivate jetpack
  if (setJetpackActive) {
    setJetpackActive(false);
  }

  // When jump button is released, if we're still in the "charging" phase
  // add extra force based on how long it was held
  if (touchState.jumpActive && isJumpingState()) {
    // Calculate additional force based on how long the button was held
    // Clamp between 0 and maximum additional force
    const additionalForce = Math.min(
      GAME_SETTINGS.maxJumpForce - GAME_SETTINGS.jumpForce, // Maximum additional force
      getJumpChargeTime() * 0.8 // Increase force based on charge time (faster rate)
    );

    // Add the additional force to current velocity
    applyJumpForce(additionalForce);
  }

  touchState.jumpActive = false;
  virtualKeys.space = false;
}

/**
 * Handle grab button touch
 * @param {TouchEvent} event - The touch event
 * @param {boolean} ballReleased - Whether the ball has been released
 * @param {Function} pauseGame - Function to pause the game
 * @param {THREE.Scene} scene - The scene for visual effects
 * @param {Function} setClaw - Function to set the claw position
 */
function handleGrabTouch(
  event,
  ballReleased = true,
  pauseGame = null,
  scene = null,
  setClaw = null
) {
  // Prevent default behavior
  event.preventDefault();

  if (canUseGrab() && ballReleased) {
    console.log("Executing grab from touch!");
    // Use the global scene if available, otherwise use the passed scene parameter
    const grabScene = window.gameScene || scene;
    executeGrab(grabScene, pauseGame, null, setClaw);

    // Update directional buttons for grab mode
    setTimeout(updateDirectionalButtons, 100); // Small delay to ensure grab state is updated
  } else {
    console.log("Cannot grab: grab not available or ball not released");
  }
}

/**
 * Check for changes in grab state and update controls accordingly
 * This should be called regularly from the game update loop
 */
export function updateTouchControlsState() {
  // Update directional buttons based on current grab state
  updateDirectionalButtons();
}

/**
 * Update directional buttons based on game state
 */
function updateDirectionalButtons() {
  if (!leftArrowElement || !rightArrowElement) return;

  // Change button appearance for grab mode OR when ball is still in the claw
  if (
    isGrabbingState() ||
    (window.gameState && !window.gameState.ballReleased)
  ) {
    // In grab mode, show up/down arrows
    leftArrowElement.innerHTML = "↓";
    rightArrowElement.innerHTML = "↑";

    // Also update the style to indicate different function
    leftArrowElement.style.backgroundColor = "rgba(138, 43, 226, 0.8)"; // BlueViolet
    rightArrowElement.style.backgroundColor = "rgba(138, 43, 226, 0.8)"; // BlueViolet

    // Also update jump button to indicate it will release the grab
    if (jumpButtonElement) {
      // Show appropriate text based on state
      jumpButtonElement.innerHTML = isGrabbingState() ? "RELEASE" : "DROP";
      jumpButtonElement.style.backgroundColor = "rgba(255, 165, 0, 0.8)"; // Orange
    }
  } else {
    // Normal mode, show left/right arrows
    leftArrowElement.innerHTML = "←";
    rightArrowElement.innerHTML = "→";

    // Restore original style
    leftArrowElement.style.backgroundColor = "rgba(30, 144, 255, 0.8)"; // DodgerBlue
    rightArrowElement.style.backgroundColor = "rgba(30, 144, 255, 0.8)"; // DodgerBlue

    // Restore jump button
    if (jumpButtonElement) {
      jumpButtonElement.innerHTML = "JUMP";
      jumpButtonElement.style.backgroundColor = "rgba(76, 175, 80, 0.8)"; // Green
    }
  }
}

/**
 * Reset touch state
 */
export function resetTouchState() {
  touchState = {
    joystickActive: false,
    joystickStartX: 0,
    joystickCurrentX: 0,
    joystickId: null,
    jumpActive: false,
    doubleTapTime: 0,
    lastTapTime: 0,
    tapCount: 0,
    leftArrowActive: false,
    rightArrowActive: false,
  };

  virtualKeys = {
    left: false,
    right: false,
    up: false,
    down: false,
    space: false,
  };

  // Reset directional buttons display
  updateDirectionalButtons();
}

/**
 * Check if device is touch-enabled
 * @returns {boolean} Whether the device supports touch
 */
export function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Show or hide touch controls based on device type
 * @param {boolean} show - Whether to show the controls
 */
export function toggleTouchControlsVisibility(show) {
  const touchControls = document.getElementById("touch-controls");
  if (touchControls) {
    touchControls.style.display = show ? "block" : "none";
  }
}
