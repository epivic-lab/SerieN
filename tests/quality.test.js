import test from "node:test";
import assert from "node:assert/strict";
import { QualityController } from "../src/quality.js";
function feed(controller, fps, seconds, visible = true) {
  const changes = [];
  for (let i = 0; i < Math.round(fps * seconds); i++) {
    const value = controller.update(1 / fps, visible);
    if (value) changes.push(value);
  }
  return changes;
}
test("two sustained slow windows reduce high quality, a short spike does not", () => {
  const quality = new QualityController();
  assert.deepEqual(feed(quality, 20, 2), []);
  assert.equal(quality.profile, "high");
  assert.deepEqual(feed(quality, 60, 4), []);
  assert.equal(quality.profile, "high");
  assert.deepEqual(feed(quality, 20, 7), ["low"]);
  assert.equal(quality.profile, "low");
});
test("quality only recovers after sustained fast windows and does not oscillate with mixed load", () => {
  const quality = new QualityController();
  feed(quality, 20, 7);
  assert.equal(quality.profile, "low");
  assert.deepEqual(feed(quality, 60, 9), []);
  assert.equal(quality.profile, "low");
  assert.deepEqual(feed(quality, 20, 7), []);
  assert.deepEqual(feed(quality, 60, 12), []);
  assert.equal(quality.profile, "low");
  assert.deepEqual(feed(quality, 60, 6), ["high"]);
  for (let i = 0; i < 1e3; i++) {
    assert.equal(quality.update(0.016), null);
    assert.equal(quality.update(0.033), null);
  }
});
test("manual profiles including cinema always override automatic adaptation", () => {
  const quality = new QualityController();
  assert.equal(quality.setMode("cinema"), "cinema");
  assert.deepEqual(feed(quality, 10, 40), []);
  assert.equal(quality.profile, "cinema");
  quality.setMode("low");
  assert.deepEqual(feed(quality, 120, 40), []);
  assert.equal(quality.profile, "low");
  quality.setMode("auto");
  assert.deepEqual(feed(quality, 60, 16), ["high"]);
});
test("tab invisibility and first return frame cannot trigger a quality change", () => {
  const quality = new QualityController();
  feed(quality, 20, 5);
  quality.update(40, false);
  assert.equal(quality.update(30, true), null);
  assert.equal(quality.profile, "high");
  assert.deepEqual(feed(quality, 60, 7), []);
  assert.equal(quality.profile, "high");
});
test("invalid timing samples are ignored and mode names are validated", () => {
  const quality = new QualityController();
  for (const dt of [NaN, Infinity, -1, 0]) assert.equal(quality.update(dt), null);
  assert.equal(quality.profile, "high");
  assert.throws(() => quality.setMode("ultra"), RangeError);
});
