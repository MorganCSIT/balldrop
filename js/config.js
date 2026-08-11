/**
 * Game Configuration
 * Contains all game constants and configuration settings
 */

// Game settings
export const GAME_SETTINGS = {
  initialSpeed: 0.15,
  minSpeed: 0.08,
  maxSpeed: 0.32,
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
  fallOutOfBoundsDistance: 21,
  fallOutOfBoundsLookAhead: 45,
  fallOutOfBoundsLookBehind: 18,
  score: {
    landingBase: 12,
    precisionLanding: 35,
    movingLanding: 22,
    trampolineChain: 18,
    rescueTarget: 250,
    comboMultiplierStep: 0.15,
    clawPenalty: 80,
  },
  powerUpSpawnChance: 0.012,
  powerUpBurstChance: 0.0007,
  clawPowerUpChance: 0.0015,
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

// Background colors (More vibrant, modern palette)
export const BACKGROUND_COLORS = [
  0x1e90ff, // Dodger Blue
  0xff69b4, // Hot Pink
  0x3cb371, // Medium Sea Green
  0xff8c00, // Dark Orange
  0x9370db, // Medium Purple
  0x20b2aa, // Light Sea Green
  0xff7f50, // Coral
  0x00ced1, // Dark Turquoise
];

// Platform colors
export const PLATFORM_COLORS = {
  regular: 0xffffff, // White for regular platforms
  trampoline: 0x00ff00, // Green for trampolines
  diagonal: 0xff9900, // Orange for diagonal trampolines
  redFlag: 0xff3333, // Red for red flag platforms
  moving: 0x9370db, // Medium purple for moving platforms
  crumbling: 0xffd166,
  precision: 0x06d6a0,
  hazard: 0xef476f,
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
    roughness: 0.2, // Smoother platforms
    metalness: 0.1,
    clearcoat: 0.8, // Add a slightly glossy finish
    clearcoatRoughness: 0.2
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
  combo: "combo",
  bestCombo: "best-combo",
  mode: "mode",
  rescue: "rescue",
  rescueContainer: "rescue-container",
  modeClassic: "mode-classic",
  modeRescue: "mode-rescue",
  controlButtons: "control-buttons",
  controlJoystick: "control-joystick",
  gameOver: "game-over",
  finalScore: "final-score",
  restartButton: "restart-button",
  startButton: "start-button",
  startModal: "start-modal",
};
