import THREE from "../utils/three-wrapper.js";

export const GRAVITY_DIRECTIONS = ["down", "right", "up", "left"];

const CONFIGS = {
  down: {
    gravity: new THREE.Vector3(0, -1, 0),
    normal: new THREE.Vector3(0, 1, 0),
    side: new THREE.Vector3(1, 0, 0),
    cameraOffset: new THREE.Vector3(0, 5, 10),
    cameraUp: new THREE.Vector3(0, 1, 0),
    platformSize: (width, thickness, depth) => [width, thickness, depth],
  },
  up: {
    gravity: new THREE.Vector3(0, 1, 0),
    normal: new THREE.Vector3(0, -1, 0),
    side: new THREE.Vector3(1, 0, 0),
    cameraOffset: new THREE.Vector3(0, -5, 10),
    cameraUp: new THREE.Vector3(0, -1, 0),
    platformSize: (width, thickness, depth) => [width, thickness, depth],
  },
  left: {
    gravity: new THREE.Vector3(-1, 0, 0),
    normal: new THREE.Vector3(1, 0, 0),
    side: new THREE.Vector3(0, 1, 0),
    cameraOffset: new THREE.Vector3(5, 0, 10),
    cameraUp: new THREE.Vector3(1, 0, 0),
    platformSize: (width, thickness, depth) => [thickness, width, depth],
  },
  right: {
    gravity: new THREE.Vector3(1, 0, 0),
    normal: new THREE.Vector3(-1, 0, 0),
    side: new THREE.Vector3(0, 1, 0),
    cameraOffset: new THREE.Vector3(-5, 0, 10),
    cameraUp: new THREE.Vector3(-1, 0, 0),
    platformSize: (width, thickness, depth) => [thickness, width, depth],
  },
};

export function getGravityConfig(direction = "down") {
  return CONFIGS[direction] || CONFIGS.down;
}

export function getNextGravityDirection(currentDirection = "down") {
  const currentIndex = GRAVITY_DIRECTIONS.indexOf(currentDirection);
  const nextIndex =
    currentIndex === -1 ? 0 : (currentIndex + 1) % GRAVITY_DIRECTIONS.length;
  return GRAVITY_DIRECTIONS[nextIndex];
}

export function getPositionAlong(vector, axis) {
  return vector.x * axis.x + vector.y * axis.y + vector.z * axis.z;
}

export function setPositionAlong(vector, axis, value) {
  if (axis.x) vector.x = value * axis.x;
  if (axis.y) vector.y = value * axis.y;
  if (axis.z) vector.z = value * axis.z;
}

export function addScaledAxis(target, axis, amount) {
  target.x += axis.x * amount;
  target.y += axis.y * amount;
  target.z += axis.z * amount;
}
