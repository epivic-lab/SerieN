import { MOUSE, TOUCH } from "three";
const BUTTONS = {
  viewZoomIn: ["zoomIn", "Avvicina il plastico"],
  viewZoomOut: ["zoomOut", "Allontana il plastico"],
  viewHome: ["home", "Ripristina la vista standard"],
  viewFollow: ["follow", "Segui il treno selezionato"],
  viewPan: ["pan", "Trascina per spostare il plastico"],
  viewOrbit: ["orbit", "Trascina per ruotare il plastico"]
};
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
function createViewControls({ camera, controls, navigation, host = null, onViewChange = () => {
} }) {
  if (!camera || !controls?.target || !navigation?.select) throw new TypeError("Camera, OrbitControls and navigation are required");
  const originalMouse = { ...controls.mouseButtons };
  const originalTouches = { ...controls.touches };
  const disposers = [];
  let dragMode = "orbit", disposed = false;
  function button(id) {
    return host?.querySelector?.(`#${id}`) ?? null;
  }
  function pressed(id, value) {
    const element = button(id);
    if (!element) return;
    element.setAttribute("aria-pressed", String(value));
    element.classList?.toggle("active", value);
  }
  function update() {
    if (disposed) return;
    pressed("viewFollow", navigation.preset === "follow");
    pressed("viewPan", dragMode === "pan");
    pressed("viewOrbit", dragMode === "orbit");
  }
  function onManualStart() {
    if (disposed) return;
    onViewChange("manual");
    update();
  }
  controls.addEventListener("start", onManualStart);
  disposers.push(() => controls.removeEventListener("start", onManualStart));
  function manual() {
    controls.dispatchEvent({ type: "start" });
  }
  function zoom(factor) {
    if (disposed) return;
    manual();
    if (camera.isOrthographicCamera) {
      const minimum = finite(controls.minZoom, 0.65), maximum = Math.max(minimum, finite(controls.maxZoom, 3.4));
      camera.zoom = clamp(finite(camera.zoom, 1) / factor, minimum, maximum);
      camera.updateProjectionMatrix();
    } else {
      const offset = camera.position.clone().sub(controls.target);
      let distance = offset.length();
      if (!Number.isFinite(distance) || distance < 1e-6) {
        camera.getWorldDirection(offset).negate();
        if (offset.lengthSq() < 1e-8) offset.set(0, 0.6, 1);
        distance = finite(controls.minDistance, 250);
      }
      const minimum = Math.max(1, finite(controls.minDistance, 250));
      const maximum = Math.max(minimum, finite(controls.maxDistance, 3600));
      offset.normalize().multiplyScalar(clamp(distance * factor, minimum, maximum));
      camera.position.copy(controls.target).add(offset);
      camera.updateMatrixWorld();
    }
    controls.update();
    update();
  }
  function select(preset) {
    if (disposed) return;
    navigation.select(preset);
    onViewChange(preset);
    update();
  }
  function setDragMode(mode) {
    if (!["orbit", "pan"].includes(mode)) throw new RangeError("Unknown drag mode: " + mode);
    if (disposed) return;
    dragMode = mode;
    controls.mouseButtons ??= {};
    controls.touches ??= {};
    controls.mouseButtons.LEFT = mode === "pan" ? MOUSE.PAN : MOUSE.ROTATE;
    controls.mouseButtons.MIDDLE = MOUSE.DOLLY;
    controls.mouseButtons.RIGHT = MOUSE.PAN;
    controls.touches.ONE = mode === "pan" ? TOUCH.PAN : TOUCH.ROTATE;
    controls.touches.TWO = TOUCH.DOLLY_PAN;
    manual();
    update();
  }
  const api = {
    zoomIn: () => zoom(0.85),
    zoomOut: () => zoom(1 / 0.85),
    home: () => select("overview"),
    follow: () => select("follow"),
    setDragMode,
    update,
    get dragMode() {
      return dragMode;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposers.forEach((dispose) => dispose());
      controls.mouseButtons = { ...originalMouse };
      controls.touches = { ...originalTouches };
    }
  };
  controls.mouseButtons ??= {};
  controls.touches ??= {};
  controls.mouseButtons.LEFT = MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = MOUSE.PAN;
  controls.touches.ONE = TOUCH.ROTATE;
  controls.touches.TWO = TOUCH.DOLLY_PAN;
  for (const [id, [action, label]] of Object.entries(BUTTONS)) {
    const element = button(id);
    if (!element) continue;
    element.type = "button";
    if (!element.getAttribute?.("aria-label")) element.setAttribute("aria-label", label);
    if (!element.title) element.title = label;
    const listener = () => action === "pan" || action === "orbit" ? api.setDragMode(action) : api[action]();
    element.addEventListener("click", listener);
    disposers.push(() => element.removeEventListener("click", listener));
  }
  if (host?.addEventListener) {
    const stop = (event) => event.stopPropagation();
    host.addEventListener("pointerdown", stop);
    disposers.push(() => host.removeEventListener("pointerdown", stop));
  }
  update();
  return api;
}
const mountViewControls = createViewControls;
export {
  createViewControls,
  mountViewControls
};
