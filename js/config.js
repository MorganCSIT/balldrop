/**
 * Game Configuration
 * Contains all game constants and configuration settings
 */

// Game settings
export const GAME_SETTINGS = {
  initialSpeed: 0.15,
  gravity: 0.02, // Increased gravity for faster falling
  jumpForce: 0.3,
  maxJumpForce: 0.4,
  platformsPerLevel: 20,
  platformSpawnZ: -1000,
  cameraOffset: { x: 0, y: 5, z: 10 },
  jetpackBoostForce: 0.015,
  clawSwingSpeed: 0.5,
  clawSwingAmount: 0.05,
  distanceForNextLevel: 500, // Distance to travel before generating a new level
  // Grab ability settings
  grabForce: 0.8, // Horizontal force applied during grab
  grabDuration: 0.2, // Duration of grab effect in seconds
  grabCooldown: 5000, // Cooldown time in milliseconds (5 seconds)
  grabDoubleTapWindow: 300, // Time window for double-tap detection in milliseconds
};

// Platform types
export const PLATFORM_TYPES = [
  "far-far-left",
  "far-left",
  "left",
  "center-left",
  "center",
  "center-right",
  "right",
  "far-right",
  "far-far-right",
];

// Background colors
export const BACKGROUND_COLORS = [
  0x87ceeb, // Default sky blue
  0xffb6c1, // Light pink
  0x98fb98, // Pale green
  0xffd700, // Gold
  0xe6e6fa, // Lavender
  0x20b2aa, // Light sea green
  0xffa07a, // Light salmon
  0x87cefa, // Light sky blue
];

// Platform colors
export const PLATFORM_COLORS = {
  regular: 0xffffff, // White for regular platforms
  trampoline: 0x00ff00, // Green for trampolines
  diagonal: 0xff9900, // Orange for diagonal trampolines
  redFlag: 0xff3333, // Red for red flag platforms
  moving: 0x9370db, // Medium purple for moving platforms
};

// Movement settings for moving platforms
export const PLATFORM_MOVEMENT = {
  // Base movement speeds (will scale with level)
  baseSpeed: 0.02,

  // Movement ranges
  horizontalRange: 10,
  verticalRange: 5,
  diagonalRange: 7,
  orbitalRadius: 8,
  figure8Scale: { x: 10, y: 5 },
  pendulumLength: 12,

  // Movement types
  types: [
    "horizontal",
    "vertical",
    "diagonal",
    "orbital",
    "figure8",
    "pendulum",
  ],

  // Visual indicators
  indicatorSize: 0.2,
};

// Material properties
export const MATERIALS = {
  platform: {
    roughness: 0.7,
    metalness: 0.1,
  },
  flagPole: {
    color: 0x8b4513, // Brown color for pole
    roughness: 0.8,
  },
  jetpack: {
    body: {
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2,
    },
    nozzle: {
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.1,
    },
    flame: {
      color: 0xff6600,
    },
  },
  powerUp: {
    jetpack: 0xffff00, // Yellow for jetpack
    extraJump: 0x00ff88, // Teal for extra jump
    colorChange: 0xff00ff, // Magenta for color change
    grab: 0x00ffff, // Cyan for grab ability
  },
  rope: {
    color: 0x8b4513, // Brown color for rope
    roughness: 0.8,
  },
};

// Element IDs
export const ELEMENT_IDS = {
  gameContainer: "game-container",
  score: "score",
  level: "level",
  jetpackFuel: "jetpack-fuel",
  extraJumps: "extra-jumps",
  grabMeter: "sos-meter", // UI element ID is still "sos-meter" in HTML
  gameOver: "game-over",
  finalScore: "final-score",
  restartButton: "restart-button",
  startButton: "start-button",
  startModal: "start-modal",
};
