"""Summarize measured BR01-B geometry and check the recorded linkage transforms."""
import json
import math
import struct
from pathlib import Path

folder = Path("docs/_active/br01/evidence/BR01-B")
poses = json.loads((folder / "samples.json").read_text())
live = json.loads((folder / "live.json").read_text())
raw = Path("assets/br01/locomotive.glb").read_bytes()
size, = struct.unpack_from("<I", raw, 12)
glb = json.loads(raw[20:20+size])
bounds = {}
for node in glb["nodes"]:
    p = glb["meshes"][node["mesh"]]["primitives"][0]
    bounds[node["name"]] = glb["accessors"][p["attributes"]["POSITION"]]

scale = 149.625 / (20.066135 + 19.735239)
joint = -5.55
dimensions = {}
for kind, rear, front, a, b, width in [
    ("engine", joint, 20.066135, "engine_haus", "engine_rader", 5.784),
    ("tender", -19.735239, joint, "tender_rader", "tender_kohletender", 5.23)
]:
    length = (front-rear)*scale
    origin = (front+rear)/2
    rigid = [(bounds[a]["min"][0]-origin)*scale, (bounds[b]["max"][0]-origin)*scale]
    dimensions[kind] = {"originSourceX": origin, "lengthMm": length, "widthMm": width*scale,
                        "couplerXmm": [-length/2, length/2], "couplerYmm": 8,
                        "rigidExtentXmm": rigid, "rigidSpanMm": rigid[1]-rigid[0],
                        "extentWitnessMeshes": [a, b]}

error = {"wheelRadians": 0, "crankPinMm": 0, "rodCenterMm": 0, "pistonCenterMm": 0}
for state in live:
    angle = -state["d"]/(1.632*scale)
    error["wheelRadians"] = max(error["wheelRadians"], abs(state["angle"]-angle))
    # First two unnamed body meshes are headlamps. Each side then has 15
    # linkage meshes, in the construction order of src/br01.js.
    for offset, phase in [(2, angle), (17, angle-math.pi/2)]:
        pin = (6.675+.62*math.cos(phase), -.775+.62*math.sin(phase))
        slider = pin[0]+math.sqrt(6.05**2-(-.62-pin[1])**2)
        for key, index, expected in [
            ("crankPinMm", 2, pin), ("rodCenterMm", 4, ((pin[0]+slider)/2, (pin[1]-.62)/2)),
            ("pistonCenterMm", 7, (slider+1.4, -.62))
        ]:
            error[key] = max(error[key], math.dist(expected, state["linkage"][offset+index][:2])*scale)

stopped = [s for s in live if s["label"] in ("stop", "dwell", "reverse at rest")]
held = len(stopped)==3 and all((s["d"], s["angle"], s["linkage"]) ==
                              (stopped[0]["d"], stopped[0]["angle"], stopped[0]["linkage"]) for s in stopped)
assert held and max(error.values()) < 1e-8
a = json.loads((folder.parent/"BR01-A/clearance-final.json").read_text())
assert abs(a["maximum"]-poses["reference"]["union"]["max"]) < 1e-8
summary = {"status": "BLOCKED", "geometryGate": "FAIL", "toleranceMm": .05,
           "runtimeChanged": False, "dimensionUnits": "mm unless labelled source", "sourceToMm": scale,
           "beforeDimensions": dimensions, "afterDimensions": dimensions,
           "sumRigidSpansMm": sum(p["rigidSpanMm"] for p in dimensions.values()),
           "BR01_A_at89_25": a, "BR01_B_at89_25": poses["reference"], "worstSample": poses["worst"],
           "sampleCount": len(poses["samples"]), "unavailable": poses["unavailable"],
           "allVerticesInsideOwnEnvelope": all(b["max"]<=.05 for s in poses["samples"] for b in s["bodies"]),
           "liveKinematicError": error, "stopAndReversalHeld": held}
(folder/"comparison.json").write_text(json.dumps(summary, indent=2)+"\n")
