"""Build the L02-B inspection GLB from the original Footloose asset.

blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/prepare.py -- SOURCE OUTPUT_DIR
"""
from collections import defaultdict
import hashlib
import math
import json
from pathlib import Path
import sys

import bpy
import bmesh
from mathutils import Vector
import numpy as np

SOURCE_SHA256 = "a8a1fd651ef9d5f0a90d3c18d362cf9a23d0a7c03e04380a3a1fa0b78c36fbe5"
LENGTH_MM = (132 * 12 + 9 + 7 / 8) * 25.4 / 160
SOURCE_LENGTH = 39.94842
SCALE = LENGTH_MM / SOURCE_LENGTH
RAIL_TOP = 0.06
IMAGE_LIMIT = 1024
DECIMATION = .22
# Position in the source, measured at each rim. +Y is towards the pilot.
AXLES = {
    "tender_rear_bogie": ([-18.0026, -16.5026, -15.0026, -13.5026, -12.0026], .61195),
    "tender_front_bogie": ([-10.0151, -7.98495], .61195),
    "trailing_truck": ([-4, -2.35625], .61195),
    "engine_rear": ([0, 1.9, 3.8, 5.7], .9252),
    "engine_front": ([8.735, 10.635, 12.535, 14.435], .92515),
    "leading_truck": ([15.8487, 18.02385], .55045),
}
# Hinge, truck and drawbar pins are prototype dimensions in the same frame.
# They are independent of parent origins in the original FBX/GLB.
FRAME_PIVOTS = {
    "engine_rear": (2.85, 0),
    "engine_front": (8.10, 1.45),
    "tender_body": (-12.0013, 0),
    "trailing_truck": (-2.01, 1.30),
    "leading_truck": (16.94, 1.10),
    "tender_rear_bogie": (-15.0026, 1.25),
    "tender_front_bogie": (-9.0, 1.25),
}
FRAME_PARENTS = {
    "engine_front": "engine_rear", "trailing_truck": "engine_rear", "leading_truck": "engine_front",
    "tender_rear_bogie": "tender_body", "tender_front_bogie": "tender_body",
}


def position(s, h):
    return Vector((0, s * SCALE, (h - RAIL_TOP) * SCALE))


def axis_name(frame, index):
    return f"{frame}_axle_{index + 1:02}"


def assign(group, material, low, high, revised=False, wheel_revision=False):
    """Assign a connected island as a whole, including UV-seam duplicates."""
    center = (low + high) / 2
    y = center[1]
    if group in {"1", "5"}:
        frames = ("tender_rear_bogie", "tender_front_bogie") if group == "1" else (
            "trailing_truck", "engine_rear", "engine_front", "leading_truck")
        _, frame, index = min((abs(y - axle), frame, index)
                              for frame in frames for index, axle in enumerate(AXLES[frame][0]))
        return axis_name(frame, index)
    if group == "2":
        if material == "Mat_One":
            return "tender_rear_bogie"
        if material == "Mat_Four" or (-11.3 < low[1] and high[1] < -7 and high[2] <= 1.22):
            return "tender_front_bogie"
        return "tender_body"
    if group == "3":
        return "tender_body"
    # The pilot handrails and front-step details share an atlas with boiler fittings.
    if group == "8" and material == "Mat_Five" and low[1] > 16.9 and high[2] <= 3.22:
        return "engine_front"
    if wheel_revision and group == "7":
        # Boiler lines and their clamps share an attachment to the boiler.
        if material == "Mat_One" or (material == "Mat_Seven" and low[1] > 14.5 and high[2] < 2.3):
            return "engine_rear"
    if revised:
        # Mount the pilot deck and its low fittings on the frame that carries
        # its stairs. The span below the boiler stays with the rear frame.
        if group == "7" and material == "Mat_Six" and low[1] > 9.4 and high[2] < 2.40:
            return "engine_front"
        if group == "7" and material == "Mat_One" and low[1] > 13.7 and high[2] < 2.5:
            return "engine_front"
        if group == "7" and material == "Mat_Seven" and low[1] > 14.5 and high[2] < 2.3:
            return "engine_front"
        if group == "8" and low[1] > 16.7 and high[2] < 2.43:
            return "engine_front"
        if group == "15" and material == "Mat_Six" and low[1] < 3 and high[1] > 13:
            return "engine_rear"
    if group in {"4", "7", "8"}:
        return "engine_rear"
    if group in {"6a", "6b"}:
        return "trailing_truck"
    if group == "12" and high[2] < 1.04:
        return "leading_truck"
    if group in {"12", "13"}:
        return "engine_front"
    if group in {"9", "10a", "10b", "11", "14", "15"}:
        return "engine_front" if y > FRAME_PIVOTS["engine_front"][0] else "engine_rear"
    raise ValueError(f"Unmapped source group {group}")


def adjust_clearance(xyz, index, group, material, low, high):
    """Relieve specific source interfaces identified by the L02-C triangle probe."""
    if group == "10a" and material == "Mat_Six" and 7.7 < low[1] < 7.9 and high[1] > 12:
        # Rear horns of the swinging bracket pass under the fixed saddle.
        y = xyz[index, 1]
        xyz[index, 2] = np.minimum(1.76, xyz[index, 2])
        xyz[index, 1] = np.where(y < 8.6, 8.38 + .24 * (y - 7.79), y)
    if group == "8" and material == "Mat_Seven" and low[1] < 3 and high[1] > 17.7:
        # Stop the boiler-mounted running board before the moving pilot steps.
        y = xyz[index, 1]
        xyz[index, 1] -= np.maximum(0, y - 12) * .31
        xyz[index, 2] += .24 * np.clip((y - 11.5) / 1.8, 0, 1)
    if group == "7" and material == "Mat_One" and low[1] > 13.7 and high[2] < 2.5:
        # Route the front end of the boiler pipe above the cylinder and pilot
        # instead of through their swept path.
        y = xyz[index, 1]
        xyz[index, 2] += .78 * np.clip((y - 15.75) / .95, 0, 1)
        xyz[index, 1] -= .61 * np.maximum(0, y - 16)
    if group == "7" and material == "Mat_Seven" and low[1] > 14.5 and high[2] < 2.3:
        # Preserve the fixed link above the front cylinder sweep near ±6°.
        xyz[index, 2] = np.maximum(2.10, xyz[index, 2] + .26)


def split_mesh(obj, group, revised=False, wheel_revision=False):
    mesh = obj.data
    mesh.calc_loop_triangles()
    xyz = np.empty((len(mesh.vertices), 3), dtype=np.float32)
    mesh.vertices.foreach_get("co", xyz.ravel())
    transform = np.array(obj.matrix_world)
    xyz = xyz @ transform[:3, :3].T + transform[:3, 3]
    _, same_point = np.unique(np.rint(xyz / .00005).astype(np.int64), axis=0, return_inverse=True)
    corners = np.array([triangle.vertices[:] for triangle in mesh.loop_triangles])
    weld = same_point[corners]
    parent = list(range(int(same_point.max()) + 1))

    def root(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    for a, b, c in weld.tolist():
        i = root(a)
        parent[root(b)] = i
        parent[root(c)] = i
    islands = defaultdict(list)
    for index, a in enumerate(weld[:, 0].tolist()):
        islands[root(a)].append(index)

    material = mesh.materials[0]
    assert len(mesh.materials) == 1 and len(mesh.uv_layers) == 1, obj.name
    uv = np.empty((len(mesh.loops), 2), dtype=np.float32)
    mesh.uv_layers[0].data.foreach_get("uv", uv.ravel())
    loops = np.array([triangle.loops[:] for triangle in mesh.loop_triangles])
    uv = uv[loops]
    normals = np.empty((len(mesh.loops), 3), dtype=np.float32)
    mesh.corner_normals.foreach_get("vector", normals.ravel())
    normals = normals @ np.linalg.inv(transform[:3, :3])
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-20)
    normals = normals[loops]
    partitions = defaultdict(list)
    relief_vertices = []
    brace_vertices = []
    for indices in islands.values():
        points = xyz[corners[indices].ravel()]
        low, high = points.min(axis=0), points.max(axis=0)
        part = assign(group, material.name, low, high, revised, wheel_revision)
        if wheel_revision:
            adjust_clearance(xyz, np.unique(corners[indices]), group, material.name, low, high)
        if revised and group == "7" and material.name == "Mat_Seven" and low[1] < -5 and high[1] > 16.9:
            relief_vertices.extend(corners[indices].ravel())
        if revised and group == "15" and material.name == "Mat_Six" and low[1] < 3 and high[1] > 13:
            brace_vertices.extend(corners[indices].ravel())
        partitions[part].extend(indices)

    if relief_vertices:
        # The narrow central web in the source continues through both engine
        # groups. Give its underside room above the swinging front assembly.
        index = np.unique(relief_vertices)
        blend = np.clip((xyz[index, 1] - 6.1) / 1.2, 0, 1)
        xyz[index, 2] += blend * np.maximum(0, 2.40 - xyz[index, 2])

    if brace_vertices:
        # Recess the internal cross-frame strip above the articulated gear.
        xyz[np.unique(brace_vertices), 2] += .85

    for part, indices in partitions.items():
        remap, faces = np.unique(corners[indices], return_inverse=True)
        yield part, material, xyz[remap], faces.reshape(-1, 3), uv[indices], normals[indices]


def build_mesh(name, pieces, pivot, tire_material=None):
    vertices, faces, uvs, normals, materials, material_indices = [], [], [], [], [], []
    for material, xyz, triangles, uv, corner_normals in pieces:
        if material not in materials:
            materials.append(material)
        material_indices.extend([materials.index(material)] * len(triangles))
        faces.extend((triangles + len(vertices)).tolist())
        local = (xyz - (0, 0, RAIL_TOP)) * SCALE - pivot
        if tire_material:
            # Keep spokes, hubs and pins from the original. Recess the old
            # irregular perimeter below the standardized running ring.
            radius = np.linalg.norm(local[:, 1:], axis=1)
            factor = np.minimum(1, (pivot[2] - .21) / np.maximum(radius, 1e-20))
            local[:, 1:] *= factor[:, None]
        vertices.extend(local.tolist())
        uvs.extend(uv.reshape(-1, 2).tolist())
        normals.extend(corner_normals.reshape(-1, 3).tolist())
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    for material in materials:
        mesh.materials.append(material)
    mesh.polygons.foreach_set("material_index", material_indices)
    mesh.polygons.foreach_set("use_smooth", [True] * len(faces))
    layer = mesh.uv_layers.new(name="UVMap")
    layer.data.foreach_set("uv", np.asarray(uvs, dtype=np.float32).ravel())
    mesh.normals_split_custom_set(normals)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    decimate = obj.modifiers.new("Reduce glTF triangle count", "DECIMATE")
    decimate.ratio = DECIMATION
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    if tire_material:
        add_tires(obj.data, pivot[2], tire_material)
    return obj, len(faces)


def add_tires(mesh, radius, material):
    # x is lateral. Radii are relative to the axle height; the flange sits
    # inside both virtual rail heads while the running ring spans both.
    section = [(3.23, -.26), (3.23, .08), (3.34, .22), (3.43, .22), (3.50, .05),
               (3.62, 0), (5.35, 0), (5.49, -.14), (5.49, -.26)]
    steps = 96
    bm = bmesh.new()
    bm.from_mesh(mesh)
    material_index = len(mesh.materials)
    mesh.materials.append(material)
    for sign in (-1, 1):
        rings = []
        for x, relative_radius in section:
            r = radius + relative_radius
            rings.append([bm.verts.new((sign * x, r * math.sin(i * math.tau / steps),
                                       r * math.cos(i * math.tau / steps))) for i in range(steps)])
        for row, a in enumerate(rings):
            following = rings[(row + 1) % len(rings)]
            for i in range(steps):
                j = (i + 1) % steps
                corners = [a[i], a[j], following[j], following[i]]
                face = bm.faces.new(corners[::-1] if sign > 0 else corners)
                face.material_index = material_index
                face.smooth = True
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()


def simplify_images():
    for image in bpy.data.images:
        width, height = image.size[:]
        if max(width, height) <= IMAGE_LIMIT:
            continue
        scale = IMAGE_LIMIT / max(width, height)
        image.scale(max(1, round(width * scale)), max(1, round(height * scale)))
        image.pack()


def main():
    args = sys.argv[sys.argv.index("--") + 1:]
    if len(args) not in (2, 3) or (len(args) == 3 and args[2] not in ("L02-C", "L02-D")):
        raise ValueError("Expected SOURCE OUTPUT_DIR [L02-C|L02-D]")
    source, output = map(Path, args[:2])
    revised = len(args) == 3
    wheel_revision = revised and args[2] == "L02-D"
    with source.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != SOURCE_SHA256:
            raise ValueError("Incorrect source GLB for this measured articulation")
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    bpy.context.view_layer.update()
    source_nodes = list(bpy.context.scene.objects)
    parts = defaultdict(list)
    for group in bpy.data.objects["RootNode"].children:
        if group.name == "Track_low":
            continue
        group_id = group.name.split("_")[1]
        for obj in group.children_recursive:
            if obj.type == "MESH":
                for name, *geometry in split_mesh(obj, group_id, revised, wheel_revision):
                    parts[name].append(geometry)

    pivots = FRAME_PIVOTS.copy()
    if revised:
        # Center the hinge between the closest driving axles of the banks.
        pivots["engine_front"] = ((AXLES["engine_rear"][0][-1] + AXLES["engine_front"][0][0]) / 2, 1.45)
        # Put the leading guide between its two axle centers, under the pilot.
        pivots["leading_truck"] = (sum(AXLES["leading_truck"][0]) / 2, 1.10)
    parents = FRAME_PARENTS.copy()
    for frame, (axles, height) in AXLES.items():
        for index, s in enumerate(axles):
            name = axis_name(frame, index)
            pivots[name], parents[name] = (s, height), frame
    assert parts.keys() == pivots.keys(), (parts.keys() - pivots.keys(), pivots.keys() - parts.keys())

    bpy.data.batch_remove(source_nodes)
    simplify_images()
    root = bpy.data.objects.new("Union Pacific Big Boy", None)
    bpy.context.collection.objects.link(root)
    root["author"] = "Footloose"
    root["license"] = "https://creativecommons.org/licenses/by/4.0/"
    root["source"] = "https://sketchfab.com/3d-models/steam-locomotive-union-pacific-bigboy-dff7f4b67c734d4db430d8c47810a6cd"
    root["units"] = "millimetres on the N scale layout"
    tire_material = None
    if wheel_revision:
        tire_material = bpy.data.materials.new("Turned wheel rim")
        tire_material.diffuse_color = (.18, .19, .20, 1)
        tire_material.metallic = .62
        tire_material.roughness = .43
    objects, counts = {}, {}
    for name, pivot in pivots.items():
        obj, original_count = build_mesh(name, parts[name], np.array(position(*pivot)),
                                         tire_material if "_axle_" in name else None)
        parent = parents.get(name)
        obj.parent = objects.get(parent, root)
        obj.location = position(*pivot) - position(*pivots[parent]) if parent else position(*pivot)
        objects[name] = obj
        obj.data.calc_loop_triangles()
        counts[name] = {"original": original_count, "optimized": len(obj.data.loop_triangles)}
    assert sum(item["original"] for item in counts.values()) == 800596
    bpy.context.view_layer.update()

    bpy.ops.export_scene.gltf(filepath=str(output / "prototype.glb"), export_format="GLB",
                              export_extras=True, export_apply=False, export_animations=False)
    rig = {
        "sourceSha256": SOURCE_SHA256,
        "scaleMmPerSourceUnit": SCALE,
        "sourceLengthMm": LENGTH_MM,
        "axes": "-Z forward, +Y up in GLB, +X lateral",
        "imageLimitPx": IMAGE_LIMIT,
        "decimationRatio": DECIMATION,
        "frames": {
            name: {
                "parent": parents.get(name),
                "pivotMm": [value * SCALE for value in (s, h - RAIL_TOP)],
                "axleNodes": [axis_name(name, i) for i in range(len(AXLES[name][0]))] if name in AXLES else [],
            } for name, (s, h) in pivots.items() if name in FRAME_PIVOTS
        },
        "axles": {
            axis_name(frame, index): {"parent": frame, "sMm": s * SCALE, "heightMm": (h - RAIL_TOP) * SCALE}
            for frame, (axles, h) in AXLES.items() for index, s in enumerate(axles)
        },
        "drawbarPinsMm": {"engine": -5.9 * SCALE, "tender": -6.75 * SCALE, "height": (.88 - RAIL_TOP) * SCALE},
        "trianglesByNode": counts,
    }
    if revised:
        rig["drawbarPinsMm"]["height"] = 1.65
        rig["kinematics"] = {
            "tenderSetbackMm": 4.8,
            "leadingGuide": {"travelMm": 4.5, "swingRad": .35},
            "axlePlayMm": {"engine_rear": .45, "engine_front": .45, "trailing_truck": .45, "tender_rear_bogie": .45},
            "drawbar": {"sleeveMm": 7.75, "tongueMm": 7.75, "minEngagementMm": .95,
                        "maxEngagementMm": 6.0, "pinClearanceMm": .65},
        }
    if wheel_revision:
        rig["kinematics"]["trailingGuide"] = {"travelMm": 2.5, "swingRad": .35}
        del rig["kinematics"]["axlePlayMm"]["trailing_truck"]
        rig["drawbarMountsMm"] = {
            "engine": {"frame": "engine_rear", "seatHeight": 5.50},
            "tender": {"frame": "tender_body", "seatHeight": 2.767},
        }
    (output / "rig.json").write_text(json.dumps(rig, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
