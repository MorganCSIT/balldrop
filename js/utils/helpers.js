/**
 * Helper Utilities
 * Contains utility functions used throughout the game
 */

/**
 * Clamp a value between a minimum and maximum value
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} The clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate a random number between min and max
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} A random number between min and max
 */
export function random(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} A random integer between min and max
 */
export function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

/**
 * Check if a value is between min and max (inclusive)
 * @param {number} value - The value to check
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {boolean} True if the value is between min and max
 */
export function isBetween(value, min, max) {
  return value >= min && value <= max;
}

/**
 * Calculate the distance between two points
 * @param {Object} point1 - The first point with x, y, z coordinates
 * @param {Object} point2 - The second point with x, y, z coordinates
 * @returns {number} The distance between the two points
 */
export function distance(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const dz = point2.z - point1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Get an element by its ID
 * @param {string} id - The ID of the element
 * @returns {HTMLElement} The element with the specified ID
 */
export function getElement(id) {
  return document.getElementById(id);
}

/**
 * Set the text content of an element
 * @param {string} id - The ID of the element
 * @param {string} text - The text to set
 */
export function setText(id, text) {
  const element = getElement(id);
  if (element) {
    element.textContent = text;
  }
}

/**
 * Show an element by removing the 'hidden' class
 * @param {string} id - The ID of the element
 */
export function showElement(id) {
  const element = getElement(id);
  if (element) {
    element.classList.remove("hidden");
  }
}

/**
 * Hide an element by adding the 'hidden' class
 * @param {string} id - The ID of the element
 */
export function hideElement(id) {
  const element = getElement(id);
  if (element) {
    element.classList.add("hidden");
  }
}
