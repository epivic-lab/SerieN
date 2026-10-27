import test from "node:test";
import assert from "node:assert/strict";
import { EventDispatcher, PerspectiveCamera, OrthographicCamera, Vector3, MOUSE, TOUCH } from "three";
import { createViewControls, mountViewControls } from "../src/view-controls.js";
import { navigation } from "../src/navigation.js";
class Controls extends EventDispatcher {
  constructor() {
    super();
    this.target = new Vector3(750, 0, 350);
    this.minDistance = 250;
    this.maxDistance = 3600;
    this.minZoom = 0.65;
    this.maxZoom = 3.4;
    this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    this.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
  }
  update() {
    this.updates = (this.updates || 0) + 1;
  }
}
function setup(camera = new PerspectiveCamera(35, 1.6, 1, 6500)) {
  camera.position.set(1580, 1150, 1570);
  const controls = new Controls(), nav = navigation(camera, controls);
  const events = [], views = createViewControls({ camera, controls, navigation: nav, onViewChange: (value) => events.push(value) });
  return { camera, controls, nav, views, events };
}
test("progressive perspective zoom preserves target and viewing direction, with distance limits", () => {
  const { camera, controls, views } = setup(), target = controls.target.clone(), direction = camera.position.clone().sub(target).normalize();
  const before = camera.position.distanceTo(target);
  views.zoomIn();
  assert.ok(Math.abs(camera.position.distanceTo(target) - before * 0.85) < 1e-8);
  assert.ok(camera.position.clone().sub(target).normalize().distanceTo(direction) < 1e-10);
  for (let i = 0; i < 50; i++) views.zoomIn();
  assert.ok(Math.abs(camera.position.distanceTo(target) - 250) < 1e-8);
  for (let i = 0; i < 80; i++) views.zoomOut();
  assert.ok(Math.abs(camera.position.distanceTo(target) - 3600) < 1e-8);
  assert.ok(controls.target.equals(target));
  views.dispose();
});
test("zoom cancels follow while home and follow use the existing navigation presets", () => {
  const { camera, controls, nav, views, events } = setup();
  views.follow();
  assert.equal(nav.preset, "follow");
  views.zoomIn();
  assert.equal(nav.preset, "manual");
  assert.equal(events.at(-1), "manual");
  views.home();
  assert.equal(nav.preset, "overview");
  for (let i = 0; i < 200; i++) nav.update(1 / 60);
  assert.ok(camera.position.distanceTo(new Vector3(1580, 1150, 1570)) < 0.2);
  assert.ok(controls.target.distanceTo(new Vector3(750, 0, 350)) < 0.2);
  views.dispose();
  nav.dispose();
});
test("pan and orbit modes support mouse and single touch while retaining pinch and right-button pan", () => {
  const { controls, views, nav } = setup();
  views.setDragMode("pan");
  assert.equal(controls.mouseButtons.LEFT, MOUSE.PAN);
  assert.equal(controls.touches.ONE, TOUCH.PAN);
  assert.equal(nav.preset, "manual");
  views.setDragMode("orbit");
  assert.equal(controls.mouseButtons.LEFT, MOUSE.ROTATE);
  assert.equal(controls.touches.ONE, TOUCH.ROTATE);
  assert.equal(controls.mouseButtons.RIGHT, MOUSE.PAN);
  assert.equal(controls.touches.TWO, TOUCH.DOLLY_PAN);
  assert.throws(() => views.setDragMode("invalid"), RangeError);
  views.dispose();
});
test("zero distance remains finite and orthographic zoom has equivalent limits", () => {
  const a = setup();
  a.camera.position.copy(a.controls.target);
  a.views.zoomIn();
  assert.ok(a.camera.position.toArray().every(Number.isFinite));
  assert.ok(a.camera.position.distanceTo(a.controls.target) >= 249.999);
  a.views.dispose();
  const b = setup(new OrthographicCamera(-1e3, 1e3, 600, -600, 1, 6500));
  for (let i = 0; i < 100; i++) b.views.zoomIn();
  assert.equal(b.camera.zoom, 3.4);
  for (let i = 0; i < 100; i++) b.views.zoomOut();
  assert.equal(b.camera.zoom, 0.65);
  b.views.dispose();
});
class Element {
  constructor() {
    this.attributes = {};
    this.listeners = /* @__PURE__ */ new Map();
    this.classList = { toggle: (key, on) => {
      this.active = on;
    } };
  }
  setAttribute(key, value) {
    this.attributes[key] = value;
  }
  getAttribute(key) {
    return this.attributes[key] ?? null;
  }
  addEventListener(type, callback) {
    this.listeners.set(type, callback);
  }
  removeEventListener(type, callback) {
    if (this.listeners.get(type) === callback) this.listeners.delete(type);
  }
  click() {
    this.listeners.get("click")?.();
  }
}
test("toolbar buttons mount accessibly, reflect follow state and remove listeners on dispose", () => {
  const camera = new PerspectiveCamera(), controls = new Controls(), nav = navigation(camera, controls), buttons = Object.fromEntries(["viewZoomIn", "viewZoomOut", "viewHome", "viewFollow", "viewPan", "viewOrbit"].map((id) => [id, new Element()]));
  const host = new Element();
  host.querySelector = (selector) => buttons[selector.slice(1)];
  const views = mountViewControls({ camera, controls, navigation: nav, host });
  buttons.viewFollow.click();
  assert.equal(nav.preset, "follow");
  assert.equal(buttons.viewFollow.attributes["aria-pressed"], "true");
  controls.dispatchEvent({ type: "start" });
  views.update();
  assert.equal(buttons.viewFollow.attributes["aria-pressed"], "false");
  assert.equal(buttons.viewZoomIn.type, "button");
  assert.ok(buttons.viewZoomIn.attributes["aria-label"]);
  views.dispose();
  assert.equal(buttons.viewHome.listeners.size, 0);
  assert.equal(host.listeners.size, 0);
  const before = camera.position.clone();
  views.zoomIn();
  assert.ok(camera.position.equals(before));
});
