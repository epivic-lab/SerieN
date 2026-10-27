import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
const root = new URL("../assets/kenney/", import.meta.url);
test("Kenney assets include the CC0 license and all referenced local textures", () => {
  assert.match(readFileSync(new URL("License.txt", root), "utf8"), /Creative Commons Zero, CC0/);
  const paths = readdirSync(root).filter((p) => p.endsWith(".glb"));
  assert.equal(paths.length, 6);
  for (const path of paths) {
    const file = new URL(path, root), buffer = readFileSync(file);
    assert.equal(buffer.toString("utf8", 0, 4), "glTF");
    assert.equal(buffer.readUInt32LE(8), buffer.length);
    const json = JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
    for (const image of json.images || []) if (image.uri && !image.uri.startsWith("data:")) assert.ok(existsSync(new URL(image.uri, file)));
    assert.ok(json.nodes.length > 0);
  }
});
