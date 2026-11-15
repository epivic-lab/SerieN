"""Compare the C browser gate to the unchanged B evidence and check live motion."""
import json
import math
from pathlib import Path

base = Path("docs/_active/br01/evidence")
folder = base / "BR01-C"
def load(path):
    return json.loads(path.read_text())

before = load(base / "BR01-B/comparison.json")
baseline = load(base / "BR01-B/samples.json")
after = load(folder / "samples.json")
sizing = load(folder / "sizing.json")
legacy = load(folder / "sizing-legacy.json")
traffic = load(folder / "traffic.json")
frames = load(folder / "live.json")
manifest = load(Path("assets/rolling-stock-sides/manifest.json"))
dimensions = {}
for kind in ("engine", "tender"):
    m = manifest[f"native-br01-{kind}"]
    front, rear = m["couplers"]["front"]["x"], m["couplers"]["back"]["x"]
    dimensions[kind] = {"frontMm": front, "backMm": rear, "lengthMm": front-rear, "widthMm": m["stock"]["width"]}
pitch = manifest["native-br01-engine"]["stock"]["tenderPitch"]

def key(p):
    return (p["edge"], p["fraction"], p["sign"])

lookup = {key(s): s for s in after["samples"]}
paired = [lookup[key(old)] for old in baseline["samples"]]
assert len(paired) == 522
assert after["reference"]["pose"] == baseline["reference"]["pose"]
checks = ["bodyHit", "plateHit", "carriageHit", "runningGearHit", "oppositeMountHit"]
rows = after["samples"]+[after["reference"]]
assert all(all(s["gear"][k] is None for k in checks) for s in rows)
assert not sizing["hits"] and not legacy["hits"]
outside = max(b["max"] for row in rows for b in row["bodies"])
assert outside < .05
for row in rows+frames:
    gear = row["gear"]
    assert gear["insideStops"] and gear["axisError"] < 1e-8 and max(gear["eyeErrors"]) < 1e-8
assert traffic["stop"]["reason"] == "train" and traffic["held"]["d"] == traffic["stop"]["d"]
assert traffic["stop"]["gap"] > 0 and not traffic["stop"]["conflict"]
dwell = [r for r in frames if r["label"] in ("stop", "dwell", "reverse at rest")]
assert len(dwell)==3 and all(r["d"]==dwell[0]["d"] and r["linkage"]==dwell[0]["linkage"] and
                            r["gear"]==dwell[0]["gear"] for r in dwell)
assert any(r["v"]>0 for r in frames) and any(r["v"]<0 for r in frames)
scale = 149.625/39.801374
error = 0
for r in frames:
    angle = -r["d"]/(1.632*scale)
    assert abs(angle-r["angle"]) < 1e-8
    for start, phase in [(2,angle),(17,angle-math.pi/2)]:
        x, y = 6.675+.62*math.cos(phase), -.775+.62*math.sin(phase)
        slide = x+math.sqrt(6.05**2-(-.62-y)**2)
        for i, expected in [(2,(x,y)),(4,((x+slide)/2,(y-.62)/2)),(7,(slide+1.4,-.62))]:
            error = max(error,scale*math.dist(expected,r["linkage"][start+i][:2]))
assert error < 1e-8
summary = {
    "gate": "PASS", "originalCheckpoint": "9bbe397847e936c7d6d302caa98199445353fd97",
    "before": {"dimensions":before["beforeDimensions"], "lengthMm":149.625,
               "originalCurve":baseline["reference"], "R216":baseline["worst"]},
    "after": {"dimensions":dimensions, "ribbonPitchMm":pitch, "trainLengthMm":pitch+dimensions["engine"]["frontMm"]-dimensions["tender"]["backMm"],
              "originalCurve":after["reference"], "sameR216":lookup[key(baseline["worst"])],
              "extraMm":sizing["extra"],"straightCabTenderMm":sizing["straightCabTenderMm"],
              "membersPinToTipMm":[4.79,4.79],"pinSpacingObservedMm":[sizing["pins"]["min"],sizing["pins"]["max"]],
              "mechanicalPinSpacingLimitsMm":[5.29,9.23],"overlapObservedMm":[sizing["minOverlap"],sizing["maxOverlap"]]},
    "verification":{"allBCasesRepeated":len(paired),"browserGeometricSamples":len(after["samples"]),
                    "otherUnavailableRequests":len(after["unavailable"]),"V06IndependentPoses":sizing["distinctPathPoses"],
                    "legacyIndependentPoses":legacy["distinctPathPoses"],"maximumOwnedExcessMm":outside,
                    "outsideToleranceVertices":sum(b["count"] for s in rows for b in s["bodies"]),
                    "detectedIntersections":0,"maxLiveLinkageErrorMm":error,"stopPhaseHeld":True,
                    "guardedStopGapMm":traffic["stop"]["gap"], "guardedStopDistanceMm":traffic["stop"]["d"]-traffic["before"]["d"]}
}
(folder/"comparison.json").write_text(json.dumps(summary,indent=2)+"\n")
print(json.dumps(summary["verification"]))
