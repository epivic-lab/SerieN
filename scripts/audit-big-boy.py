"""Audit the original Big Boy GLB and render its geometry without the source track.

Run with Blender in background mode. Pass the GLB and evidence directory after --.
"""

import hashlib
import json
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Vector


def inspect_source(source):
    with source.open("rb") as stream:
        magic, version, file_size, json_size, chunk_type = struct.unpack("<4sIII4s", stream.read(20))
        if (magic, version, file_size, chunk_type) != (b"glTF", 2, source.stat().st_size, b"JSON"):
            raise ValueError("Expected a complete glTF 2.0 binary")
        document = json.loads(stream.read(json_size))
        binary_size, binary_type = struct.unpack("<I4s", stream.read(8))
        if binary_type != b"BIN\0" or stream.tell() + binary_size != file_size:
            raise ValueError("Expected a complete embedded binary chunk")
        stream.seek(0)
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    images = document.get("images", [])
    return {
        "name": "steam_locomotive_union_pacific_bigboy.glb",
        "bytes": file_size,
        "sha256": digest,
        "attribution": document["asset"]["extras"],
        "images": len(images),
        "embedded_image_bytes": sum(document["bufferViews"][item["bufferView"]]["byteLength"]
                                    for item in images if "bufferView" in item),
        "animations": len(document.get("animations", [])),
        "skins": len(document.get("skins", [])),
    }


def measure(meshes):
    lower = [float("inf")] * 3
    upper = [float("-inf")] * 3
    triangles = 0
    for mesh in meshes:
        mesh.data.calc_loop_triangles()
        triangles += len(mesh.data.loop_triangles)
        for vertex in mesh.data.vertices:
            point = mesh.matrix_world @ vertex.co
            for axis, value in enumerate(point):
                lower[axis] = min(lower[axis], value)
                upper[axis] = max(upper[axis], value)
    return {
        "meshes": len(meshes),
        "triangles": triangles,
        "min_xyz": [round(value, 5) for value in lower],
        "max_xyz": [round(value, 5) for value in upper],
    }


def render_side(scene, bounds, dest):
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    center = (Vector(bounds["min_xyz"]) + Vector(bounds["max_xyz"])) / 2
    camera.location = center + Vector((65, 0, 0))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = (bounds["max_xyz"][1] - bounds["min_xyz"][1]) * 1.06
    scene.camera = camera
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 1800
    scene.render.resolution_y = 420
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.color_type = "SINGLE"
    shading.single_color = (0.63, 0.66, 0.71)
    shading.show_cavity = True
    shading.cavity_type = "BOTH"
    scene.render.filepath = str(dest)
    bpy.ops.render.render(write_still=True)


def main():
    source, destination = map(Path, sys.argv[sys.argv.index("--") + 1:])
    destination.mkdir(parents=True, exist_ok=True)
    source_info = inspect_source(source)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene = bpy.context.scene
    bpy.context.view_layer.update()
    root = scene.objects["RootNode"]
    groups = {
        group.name: [mesh for mesh in (group, *group.children_recursive) if mesh.type == "MESH"]
        for group in sorted(root.children, key=lambda item: item.name)
    }
    track = groups.pop("Track_low")
    vehicle = measure([mesh for group in groups.values() for mesh in group])
    report = {
        "source": source_info,
        "blender": bpy.app.version_string,
        "coordinates": "Blender world XYZ, longitudinal Y, vertical Z",
        "vehicle": vehicle,
        "source_track": measure(track),
        "vehicle_groups": {name: measure(meshes) for name, meshes in groups.items()},
    }
    (destination / "geometry.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for mesh in track:
        mesh.hide_render = True
    render_side(scene, vehicle, destination / "profile.png")


if __name__ == "__main__":
    main()
