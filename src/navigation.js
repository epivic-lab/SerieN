import { Vector3 } from "three";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const CAMERA_PRESETS = Object.freeze({
  overview: { position: [1664, 1150, 1694], target: [834, 0, 474], zoom: 1 },
  station: { position: [990, 650, 1040], target: [750, 20, 525], zoom: 2.8 },
  yard: { position: [955, 720, 1010], target: [690, 12, 245], zoom: 2.2 }
});
function safeView(position, target, { height = () => 0, buildings = [] } = {}) {
  const nextTarget = {
    x: clamp(finite(target.x, 750), -120, 1620),
    y: clamp(finite(target.y, 0), 0, 250),
    z: clamp(finite(target.z, 350), -120, 820)
  };
  const nextPosition = {
    x: finite(position.x, 1580),
    y: finite(position.y, 1150),
    z: finite(position.z, 1570)
  };
  nextPosition.x += nextTarget.x - finite(target.x, nextTarget.x);
  nextPosition.z += nextTarget.z - finite(target.z, nextTarget.z);
  const ground = finite(height(nextPosition.x, nextPosition.z), 0);
  nextPosition.y = Math.max(nextPosition.y, ground + 40);
  for (const b of buildings) {
    const cosine = Math.cos(b.rotation || 0), sine = Math.sin(b.rotation || 0);
    const dx = nextPosition.x - b.x, dz = nextPosition.z - b.z;
    const localX = dx * cosine - dz * sine;
    const localZ = dx * sine + dz * cosine;
    if (Math.abs(localX) <= b.w / 2 + 12 && Math.abs(localZ) <= b.d / 2 + 12) {
      nextPosition.y = Math.max(nextPosition.y, finite(b.y, 0) + b.h + 40);
    }
  }
  return { position: nextPosition, target: nextTarget };
}
const standardElevation = Math.atan2(272, Math.hypot(260, 210));
const followRadius = Math.hypot(260, 210, 272);
const followKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "z"]);

function followingView(pose, azimuthOffset = 0, elevationOffset = 0, radius = followRadius) {
  if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.z)) return null;
  const bearing = finite(pose.angle, 0) + Math.atan2(-260, 210) + azimuthOffset;
  const elevation = standardElevation + elevationOffset;
  const horizontal = radius * Math.cos(elevation);
  const y = finite(pose.y, 3.5);
  return {
    position: { x: pose.x + horizontal * Math.sin(bearing), y: y + 13 + radius * Math.sin(elevation), z: pose.z + horizontal * Math.cos(bearing) },
    target: { x: pose.x, y: y + 13, z: pose.z },
    zoom: 2.7
  };
}
function navigation(camera, controls, options = {}) {
  let mode = "overview", goal = null, disposed = false;
  const held = new Set();
  let azimuth = 0, elevation = 0, radius = followRadius;
  const cancelOnGesture = () => {
    held.clear();
    mode = "manual";
    goal = null;
  };
  controls.addEventListener("start", cancelOnGesture);
  const setGoal = (view) => {
    goal = {
      position: new Vector3(...view.position),
      target: new Vector3(...view.target),
      zoom: view.zoom
    };
  };
  return {
    get preset() {
      return mode;
    },
    select(preset) {
      if (disposed) return;
      if (preset !== "follow" && !CAMERA_PRESETS[preset]) throw new RangeError("Unknown camera preset: " + preset);
      if (mode !== preset) {
        held.clear();
        azimuth = 0;
        elevation = 0;
        radius = followRadius;
      }
      mode = preset;
      if (preset === "follow") goal = null;
      else setGoal(CAMERA_PRESETS[preset]);
    },
    focus(pose) {
      if(disposed)return false;
      const view=followingView(pose);
      if(!view)return false;
      cancelOnGesture();
      setGoal({position:[view.position.x,view.position.y,view.position.z],target:[view.target.x,view.target.y,view.target.z],zoom:view.zoom});
      return true;
    },
    pressFollowKey(key, repeat = false) {
      if (disposed || mode !== "follow" || !followKeys.has(key)) return false;
      if (repeat) return held.has(key);
      held.add(key);
      return true;
    },
    releaseFollowKey(key) { held.delete(key); },
    clearFollowKeys() { held.clear(); },
    update(dt, trainPose) {
      if (disposed) return;
      const elapsed = clamp(finite(dt, 0), 0, 0.2);
      if (mode === "follow") {
        const seconds = Math.max(0, finite(dt, 0));
        azimuth = (azimuth + (held.has("ArrowRight") - held.has("ArrowLeft")) * seconds * 1.2) % (2 * Math.PI);
        elevation = clamp(elevation + (held.has("ArrowUp") - held.has("ArrowDown")) * seconds * 0.7,
          -Math.PI / 2 - standardElevation, 1.28 - standardElevation);
        const dolly = Number(held.has("z")) - Number(held.has("a"));
        radius = clamp(radius * Math.exp(dolly * seconds * 0.9), 30, controls.maxDistance ?? 3600);
        const view = followingView(trainPose, azimuth, elevation, radius);
        if (view) {
          camera.position.copy(view.position);
          controls.target.copy(view.target);
          const zoom = camera.zoom + (view.zoom - camera.zoom) * (1 - Math.exp(-4 * elapsed));
          if (Math.abs(zoom - camera.zoom) > 1e-6) {
            camera.zoom = zoom;
            camera.updateProjectionMatrix();
          }
        } else held.clear();
      }
      if (goal) {
        const blend = 1 - Math.exp(-elapsed * 5);
        camera.position.lerp(goal.position, blend);
        controls.target.lerp(goal.target, blend);
        const zoom = camera.zoom + (goal.zoom - camera.zoom) * blend;
        if (Math.abs(zoom - camera.zoom) > 1e-6) {
          camera.zoom = clamp(zoom, controls.minZoom ?? 0.65, controls.maxZoom ?? 3.4);
          camera.updateProjectionMatrix();
        }
        if (camera.position.distanceToSquared(goal.position) < 0.01 && controls.target.distanceToSquared(goal.target) < 0.01 && Math.abs(camera.zoom - goal.zoom) < 1e-4) {
          camera.position.copy(goal.position);
          controls.target.copy(goal.target);
          camera.zoom=goal.zoom;
          camera.updateProjectionMatrix();
          goal = null;
        }
      }
      if (mode !== "follow") {
        const safe = safeView(camera.position, controls.target, options);
        camera.position.copy(safe.position);
        controls.target.copy(safe.target);
      }
      camera.lookAt(controls.target);
      camera.updateMatrixWorld();
    },
    dispose() {
      if (disposed) return;
      held.clear();
      disposed = true;
      goal = null;
      controls.removeEventListener("start", cancelOnGesture);
    }
  };
}
export {
  CAMERA_PRESETS,
  followingView,
  navigation,
  safeView
};
