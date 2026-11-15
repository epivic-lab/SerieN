"""Build the SerieN rig from the original Zimmermann GLB (NumPy and Pillow)."""
import hashlib
import io
import json
from pathlib import Path
import struct
import sys

import numpy as np
from PIL import Image

source = Path(sys.argv[1]).read_bytes()
if hashlib.sha256(source).hexdigest() != "39551a52be63db4e85973f5586b5f6d4b23c229e9c158d7376904766b73df086":
    raise ValueError("Unexpected original BR 01")
size = struct.unpack_from("<I", source, 12)[0]
original = json.loads(source[20:20 + size])
binary = memoryview(source)[28 + size:]
out = {"asset": original["asset"].copy(), "scene": 0, "scenes": [{"nodes": []}],
       "nodes": [], "meshes": [], "materials": [], "textures": [], "images": [],
       "accessors": [], "bufferViews": [], "buffers": []}
out["asset"]["generator"] = "SerieN prepare-br01.py"
payload = bytearray()


def buffer_view(data):
    payload.extend(bytes(-len(payload) % 4))
    out["bufferViews"].append({"buffer": 0, "byteOffset": len(payload), "byteLength": len(data)})
    payload.extend(data)
    return len(out["bufferViews"]) - 1


def read_accessor(index):
    a = original["accessors"][index]
    view = original["bufferViews"][a["bufferView"]]
    dtype = np.dtype({5126: "<f4", 5125: "<u4", 5123: "<u2"}[a["componentType"]])
    dim = {"VEC2": 2, "VEC3": 3, "SCALAR": 1}[a["type"]]
    return np.ndarray((a["count"], dim), dtype, binary, view.get("byteOffset", 0) + a.get("byteOffset", 0),
                      strides=(view.get("byteStride", dtype.itemsize * dim), dtype.itemsize))


def add_accessor(data, kind, component):
    a = {"bufferView": buffer_view(data.tobytes()), "componentType": component, "count": len(data), "type": kind}
    if kind == "VEC3":
        a.update(min=data.min(0).tolist(), max=data.max(0).tolist())
    out["accessors"].append(a)
    return len(out["accessors"]) - 1


def components(points, triangles):
    # Weld UV and hard-normal seams only for connectivity, retaining original
    # indices and UVs for rendering.
    _, welded = np.unique(points.round(5), axis=0, return_inverse=True)
    parent = list(range(int(welded.max()) + 1))

    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for a, b, c in welded[triangles]:
        parent[root(b)] = parent[root(c)] = root(a)
    labels = np.array([root(i) for i in welded[triangles[:, 0]]])
    for label in np.unique(labels):
        yield triangles[labels == label]


# Local modelling coordinates. Axle centres measured from the circular rims.
axles = [(-17.03, -1.76, .80), (-13.88, -1.76, .80), (-10.36, -1.76, .80), (-7.21, -1.76, .80),
         (-3.52, -1.44, 1.13), (2.865, -.775, 1.805), (6.675, -.775, 1.805), (10.605, -.775, 1.805),
         (13.61, -1.76, .80), (17.32, -1.76, .80)]


def group_for(material, lo, hi):
    x, y, z = (lo + hi) / 2
    if material == "rader":
        for i, (cx, cy, radius) in enumerate(axles):
            if abs(x-cx) < .08 and abs(y-cy) < .08 and hi[2] < 1.37 and lo[2] > -1.37:
                return f"axle_{i}"
        # Original rods, crosshead and eccentric linkage are fixed at a
        # single crank angle. Their moving members are rebuilt at runtime.
        if x > 2 and x < 14 and lo[0] > 2 and max(abs(lo[2]), abs(hi[2])) > 1.36 and hi[2]*lo[2] > 0:
            return None
        if x < -5.5 and y < -1.15:
            return "truck_0" if x < -12 else "truck_1"
    if material in ("kohletender", "cole") or (material in ("emission", "rader") and x < -5.5):
        return "tender"
    return "engine"


materials = {}
for mesh in original["meshes"]:
    part = mesh["primitives"][0]
    mat = original["materials"][part["material"]]
    name = mat["name"]
    if name in ("holzschiene", "eisen", "boden"):
        continue
    attributes = part["attributes"]
    points = read_accessor(attributes["POSITION"])
    triangles = read_accessor(part["indices"]).reshape(-1, 3)
    groups = {}
    for tris in components(points, triangles):
        verts = points[np.unique(tris)]
        group = group_for(name, verts.min(0), verts.max(0))
        if group:
            groups.setdefault(group, []).append(tris)
    # Base colour is kept for every textured surface. Metallic and roughness
    # factors replace the additional source maps in the small N-scale view.
    pbr = mat.get("pbrMetallicRoughness", {})
    runtime = {"name": name, "doubleSided": mat.get("doubleSided", False),
               "pbrMetallicRoughness": {"metallicFactor": .23, "roughnessFactor": .72}}
    tex = pbr.get("baseColorTexture")
    if tex:
        img = original["images"][original["textures"][tex["index"]]["source"]]
        v = original["bufferViews"][img["bufferView"]]
        pic = Image.open(io.BytesIO(binary[v["byteOffset"]:v["byteOffset"] + v["byteLength"]])).convert("RGB")
        pic.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        data = io.BytesIO()
        pic.save(data, "JPEG", quality=88, optimize=True)
        idx = len(out["images"])
        out["images"].append({"mimeType": "image/jpeg", "bufferView": buffer_view(data.getvalue())})
        out["textures"].append({"source": idx})
        runtime["pbrMetallicRoughness"]["baseColorTexture"] = {"index": idx}
    if "baseColorFactor" in pbr:
        runtime["pbrMetallicRoughness"]["baseColorFactor"] = pbr["baseColorFactor"]
    if "alphaMode" in mat:
        runtime["alphaMode"] = mat["alphaMode"]
    out["materials"].append(runtime)
    for group, pieces in groups.items():
        used, indices = np.unique(np.concatenate(pieces).ravel(), return_inverse=True)
        attrs = {key: add_accessor(read_accessor(attributes[key])[used], kind, 5126)
                 for key, kind in (("POSITION", "VEC3"), ("NORMAL", "VEC3"), ("TEXCOORD_0", "VEC2"))}
        idx = add_accessor(indices.astype("<u2"), "SCALAR", 5123) if len(used) <= 65535 else add_accessor(indices.astype("<u4"), "SCALAR", 5125)
        node = len(out["nodes"])
        out["nodes"].append({"mesh": node, "name": f"{group}_{name}", "extras": {"rigPart": group}})
        out["scenes"][0]["nodes"].append(node)
        out["meshes"].append({"primitives": [{"material": len(out["materials"])-1, "attributes": attrs, "indices": idx}]})

out["buffers"] = [{"byteLength": len(payload)}]
meta = json.dumps(out, separators=(",", ":")).encode()
meta += b" " * (-len(meta) % 4)
payload.extend(bytes(-len(payload) % 4))
dest = Path(sys.argv[2])
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_bytes(struct.pack("<4sII", b"glTF", 2, 28 + len(meta) + len(payload)) +
                 struct.pack("<I4s", len(meta), b"JSON") + meta + struct.pack("<I4s", len(payload), b"BIN\0") + payload)
