"""Sample the actual optimized wheel mesh around its axle at the rail plane.

blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/wheel-profile.py -- PROTOTYPE_DIR
"""
from itertools import groupby
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

PHASES = 72
STEP_MM = .025
MIN_LATERAL_MM = 3.30
MAX_LATERAL_MM = 5.85
TREAD_TOLERANCE_MM = .10


def intervals(samples, predicate):
    ranges = []
    for matches, group in groupby(samples, key=predicate):
        if matches:
            points = list(group)
            if len(points) > 1:
                ranges.append([points[0][0], points[-1][0]])
    return ranges


def extract(obj, height):
    mesh = obj.data
    mesh.calc_loop_triangles()
    tree = BVHTree.FromPolygons([v.co for v in mesh.vertices],
                                 [t.vertices[:] for t in mesh.loop_triangles], all_triangles=True)
    rays = [Vector((0, math.sin(i * math.tau / PHASES), math.cos(i * math.tau / PHASES)))
            for i in range(PHASES)]
    profile = {}
    for side in [-1, 1]:
        samples = []
        for index in range(round((MAX_LATERAL_MM - MIN_LATERAL_MM) / STEP_MM) + 1):
            x = round(side * (MIN_LATERAL_MM + STEP_MM * index), 5)
            gaps = []
            for radial in rays:
                hit, *_ = tree.ray_cast(Vector((x, 0, 0)) - 12 * radial, radial, 12)
                if hit is not None:
                    gaps.append(height + radial.dot(hit))
            samples.append((x, len(gaps), min(gaps, default=100), max(gaps, default=100)))
        samples.sort()
        tread = intervals(samples, lambda q: q[1] == PHASES and
                          q[2] >= -TREAD_TOLERANCE_MM and q[3] <= TREAD_TOLERANCE_MM)
        flange = intervals(samples, lambda q: q[2] < -TREAD_TOLERANCE_MM)
        profile[str(side)] = {"tread": tread, "belowHead": flange,
                              "minGapMm": round(min(q[2] for q in samples), 5)}
    return profile


def main():
    (directory,) = map(Path, sys.argv[sys.argv.index("--") + 1:])
    rig = json.loads((directory / "rig.json").read_text())
    path = directory / "prototype.glb"
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    report = {
        "modelSha256": digest, "phaseCount": PHASES, "phaseStepDegrees": 360 / PHASES, "lateralStepMm": STEP_MM,
        "treadToleranceMm": TREAD_TOLERANCE_MM, "lateralSamplingMm": [MIN_LATERAL_MM, MAX_LATERAL_MM],
        "axles": {name: extract(bpy.data.objects[name], axle["heightMm"]) for name, axle in rig["axles"].items()},
    }
    (directory / "wheel-profile.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
