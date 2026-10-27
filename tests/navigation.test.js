import test from "node:test";
import assert from "node:assert/strict";
import { EventDispatcher, OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import { navigation, safeView, followingView, CAMERA_PRESETS } from "../src/navigation.js";
class Controls extends EventDispatcher {
  constructor() {
    super();
    this.target = new Vector3(750, 0, 350);
    this.minZoom = 0.65;
    this.maxZoom = 3.4;
  }
}
function setup() {
  const camera = new OrthographicCamera(-1e3, 1e3, 600, -600, 1, 6500);
  camera.position.set(1580, 1150, 1570);
  const controls = new Controls();
  return { camera, controls, nav: navigation(camera, controls, { height: () => 0.35 }) };
}
test("station and yard presets converge without touching the railway", () => {
  const { camera, controls, nav } = setup();
  for (const preset of ["station", "yard", "overview"]) {
    nav.select(preset);
    for (let i = 0; i < 240; i++) nav.update(1 / 60);
    const expected = CAMERA_PRESETS[preset];
    assert.ok(camera.position.distanceTo(new Vector3(...expected.position)) < 0.2);
    assert.ok(controls.target.distanceTo(new Vector3(...expected.target)) < 0.2);
    assert.ok(Math.abs(camera.zoom - expected.zoom) < 1e-3);
  }
});
test("camera transitions use elapsed real time, independent of frame frequency", () => {
  const a = setup(), b = setup();
  a.nav.select("station");
  b.nav.select("station");
  for (let i = 0; i < 30; i++) a.nav.update(1 / 30);
  for (let i = 0; i < 60; i++) b.nav.update(1 / 60);
  assert.ok(a.camera.position.distanceTo(b.camera.position) < 1e-8);
  assert.ok(Math.abs(a.camera.zoom - b.camera.zoom) < 1e-8);
});
test("follow changes target for the selected train; a manual orbit cancels it", () => {
  const { camera, controls, nav } = setup();
  nav.select("follow");
  for (let i = 0; i < 120; i++) nav.update(1 / 60, { x: 430, y: 3.5, z: 101, angle: 0 });
  assert.ok(Math.abs(controls.target.x - 430) < 1);
  for (let i = 0; i < 120; i++) nav.update(1 / 60, { x: 1070, z: 599, angle: Math.PI });
  assert.ok(Math.abs(controls.target.x - 1070) < 1);
  controls.dispatchEvent({ type: "start" });
  const before = controls.target.clone();
  nav.update(0.1, { x: 700, z: 300, angle: 0 });
  assert.equal(nav.preset, "manual");
  assert.ok(controls.target.equals(before));
  assert.ok(Number.isFinite(camera.position.y));
  nav.dispose();
});
test("eye stays above terrain and rotated building footprints, while target pan is bounded", () => {
  const view = safeView({ x: 740, y: 4, z: 350 }, { x: 750, y: 0, z: 350 }, { height: () => 32, buildings: [{ x: 750, z: 350, w: 80, d: 50, h: 62, rotation: Math.PI / 4 }] });
  assert.ok(view.position.y >= 102);
  const panned = safeView({ x: 4e3, y: -20, z: -3e3 }, { x: 4e3, y: 0, z: -3e3 }, { height: () => 32 });
  assert.equal(panned.target.x, 1620);
  assert.equal(panned.target.z, -120);
  assert.ok(panned.position.y >= 72);
});
test("invalid poses cannot produce NaNs, and dispose removes gesture handling", () => {
  assert.equal(followingView({ x: NaN, z: 2 }), null);
  const { camera, controls, nav } = setup();
  nav.select("follow");
  nav.update(NaN, { x: NaN, z: 2 });
  assert.ok(Number.isFinite(camera.position.x));
  nav.dispose();
  controls.dispatchEvent({ type: "start" });
  assert.equal(nav.preset, "follow");
});
test("perspective camera supports all presets and follow with finite projections", () => {
  const camera = new PerspectiveCamera(35, 1.6, 1, 6500);
  camera.position.set(1580, 1150, 1570);
  const controls = new Controls(), nav = navigation(camera, controls, { height: () => 84 });
  for (const preset of ["station", "yard", "follow", "overview"]) {
    nav.select(preset);
    for (let i = 0; i < 100; i++) nav.update(1 / 60, { x: 1300, y: 3.5, z: 170, angle: 0.7 });
    assert.ok(camera.projectionMatrix.elements.every(Number.isFinite));
    assert.ok(camera.position.y >= 124);
  }
  nav.dispose();
});
test("minimap focus centres once on the clicked locomotive and preserves manual control",()=>{
  const {camera,controls,nav}=setup();
  assert.equal(nav.focus({x:420,z:284,angle:.3}),true);
  for(let i=0;i<240;i++)nav.update(1/60,{x:1200,z:600,angle:0});
  assert.equal(nav.preset,"manual");
  assert.ok(Math.abs(controls.target.x-420)<.01);
  assert.ok(Math.abs(controls.target.z-284)<.01);
  assert.equal(nav.focus({x:NaN,z:200}),false);
  assert.ok(camera.position.toArray().every(Number.isFinite));
  nav.dispose();
});
