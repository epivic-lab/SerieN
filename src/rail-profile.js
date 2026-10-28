import * as THREE from "three";
import {railColor} from "./graphic-foundations.js";
const RAIL_PROFILE = [[-0.9, 3.55], [0.9, 3.55], [0.9, 3.85], [0.28, 3.85], [0.28, 5.3], [0.57, 5.3], [0.65, 5.65], [0.5, 5.95], [-0.5, 5.95], [-0.65, 5.65], [-0.57, 5.3], [-0.28, 5.3], [-0.28, 3.85], [-0.9, 3.85]];
const PROFILE_COLORS=RAIL_PROFILE.map(([,y])=>railColor(y));
function railGeometry(path, side) {
  const verts = [], indices = [], uv = [], colors=[], count = Math.max(2, Math.ceil(path.length / 4));
  function point(s) {
    const ds = path.distance;
    let lo = 0, hi = ds.length - 1;
    s = Math.max(0, Math.min(path.length, s));
    while (hi - lo > 1) {
      const m = lo + hi >> 1;
      if (ds[m] < s) lo = m;
      else hi = m;
    }
    const a = path.points[lo], b = path.points[hi], t = (s - ds[lo]) / (ds[hi] - ds[lo] || 1);
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  }
  for (let i = 0; i <= count; i++) {
    const s = path.length * i / count, p = point(s), a = point(s - 0.3), b = point(s + 0.3), len = Math.hypot(b.x - a.x, b.z - a.z) || 1, nx = -(b.z - a.z) / len, nz = (b.x - a.x) / len;
    for (let profile=0;profile<RAIL_PROFILE.length;profile++) {
      const [u,y]=RAIL_PROFILE[profile];
      verts.push(p.x + nx * (side * 4.5 + u), y, p.z + nz * (side * 4.5 + u));
      uv.push((y-3.55)/(5.95-3.55), s / 12);
      const c=PROFILE_COLORS[profile];colors.push(c.r,c.g,c.b);
    }
    if (i) for (let j = 0; j < RAIL_PROFILE.length; j++) {
      const k = i * RAIL_PROFILE.length + j, n = i * RAIL_PROFILE.length + (j + 1) % RAIL_PROFILE.length;
      indices.push(k - RAIL_PROFILE.length, n - RAIL_PROFILE.length, k, n - RAIL_PROFILE.length, n, k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export {
  RAIL_PROFILE,
  railGeometry
};
