/**
 * Rescue Target Entity
 * Optional mode objective that reuses generated platforms as spawn anchors.
 */

import THREE from "../utils/three-wrapper.js";

let targets = [];
let rescuedCount = 0;
let nextTargetId = 1;
let lastSpawnZ = 0;

export function resetRescueTargets(scene) {
  targets.forEach((target) => scene.remove(target));
  targets = [];
  rescuedCount = 0;
  nextTargetId = 1;
  lastSpawnZ = 0;
}

export function getRescuedCount() {
  return rescuedCount;
}

export function spawnRescueTargets(platforms, scene, ballPosition, level) {
  if (!platforms.length || targets.length >= 6) return;

  const minAheadDistance = 28;
  const spawnInterval = Math.max(24, 58 - level * 3);

  if (Math.abs(ballPosition.z - lastSpawnZ) < spawnInterval) return;

  const candidates = platforms.filter((platform) => {
    if (!platform.userData || platform.userData.isCollapsed) return false;
    if (platform.position.z > ballPosition.z - minAheadDistance) return false;
    if (platform.position.z < ballPosition.z - 180) return false;
    return !targets.some(
      (target) => target.userData.platformId === platform.userData.id
    );
  });

  if (!candidates.length) return;

  const platform = candidates[Math.floor(Math.random() * candidates.length)];
  const target = createRescueTarget(platform);

  scene.add(target);
  targets.push(target);
  lastSpawnZ = ballPosition.z;
}

function createRescueTarget(platform) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0x118ab2,
      emissive: 0x118ab2,
      emissiveIntensity: 0.8,
    })
  );
  body.castShadow = true;
  group.add(body);

  const beacon = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.08, 8, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
    })
  );
  beacon.rotation.x = Math.PI / 2;
  group.add(beacon);

  group.position.set(
    platform.position.x + (Math.random() * 2 - 1),
    platform.position.y + 2.8,
    platform.position.z
  );

  group.userData = {
    id: nextTargetId++,
    platformId: platform.userData.id,
    originalY: group.position.y,
    spin: Math.random() * Math.PI * 2,
  };

  return group;
}

export function updateRescueTargets(deltaTime, ballPosition) {
  for (const target of targets) {
    target.userData.spin += deltaTime * 3;
    target.rotation.y += deltaTime * 2;
    target.position.y =
      target.userData.originalY + Math.sin(target.userData.spin) * 0.45;

    const beacon = target.children[1];
    if (beacon) {
      const scale = 1 + Math.sin(target.userData.spin * 1.5) * 0.15;
      beacon.scale.set(scale, scale, scale);
    }

    if (ballPosition.distanceTo(target.position) < 10) {
      target.scale.lerp(new THREE.Vector3(1.25, 1.25, 1.25), 0.08);
    } else {
      target.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
    }
  }
}

export function checkRescueTargetCollisions(ball, scene) {
  let collected = 0;

  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    if (ball.position.distanceTo(target.position) < 2.25) {
      scene.remove(target);
      targets.splice(i, 1);
      rescuedCount++;
      collected++;
    }
  }

  return collected;
}

export function cleanupRescueTargets(ballPosition, removeDistance, scene) {
  targets = targets.filter((target) => {
    if (target.position.z > ballPosition.z + removeDistance) {
      scene.remove(target);
      return false;
    }
    return true;
  });
}
