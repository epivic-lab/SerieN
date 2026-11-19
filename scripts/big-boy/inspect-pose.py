"""Render the prepared GLB and inspect interface meshes at selected curve poses.

blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/inspect-pose.py -- EVIDENCE_DIR
"""
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


def apply_poses(frames, rig, poses):
    for name in frames:
        pose = poses[name]
        angle = -math.atan2(pose["sin"], pose["cos"])
        location = (pose["z"], pose["x"], rig["frames"][name]["pivotMm"][1])
        frames[name].matrix_world = Matrix.Translation(location) @ Matrix.Rotation(angle, 4, "Z")
        bpy.context.view_layer.update()


def overlap(a, b):
    def tree(mesh):
        mesh.data.calc_loop_triangles()
        vertices = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
        faces = [t.vertices[:] for t in mesh.data.loop_triangles]
        return BVHTree.FromPolygons(vertices, faces, all_triangles=True)
    return len(tree(a).overlap(tree(b)))


def guide_rails(radius):
    curve = bpy.data.curves.new("R282 reference rails", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = .28
    curve.bevel_resolution = 1
    for offset in (-4.5, 4.5):
        spline = curve.splines.new("POLY")
        spline.points.add(156)
        for point, s in zip(spline.points, range(-156, 157, 2)):
            angle = s / radius
            run, side = (radius - offset) * math.sin(angle), radius - (radius - offset) * math.cos(angle)
            point.co = (side, run, -.36, 1)
    rails = bpy.data.objects.new(curve.name, curve)
    bpy.context.collection.objects.link(rails)
    rails.color = (.31, .43, .52, 1)
    return rails


def render(scene, camera, path, center, offset, width, height, scale):
    camera.location = center + Vector(offset)
    camera.rotation_euler = (-Vector(offset)).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = scale
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def main():
    (evidence,) = map(Path, sys.argv[sys.argv.index("--") + 1:])
    rig = json.loads((evidence / "prototype/rig.json").read_text())
    sweep = json.loads((evidence / "sweep.json").read_text())
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(evidence / "prototype/prototype.glb"))
    scene = bpy.context.scene
    by_name = {name: scene.objects[name] for name in rig["frames"]}
    cases = {"straight": sweep["straight"]}
    for arc in sweep["arcs"]:
        for side in ["left", "right"]:
            cases[f'R{arc["radius"]}-{side}'] = arc[side]
    for name, data in sweep["byScenario"].items():
        for metric in ["halfEnvelope", "axleOffset", "drawbarMin", "drawbarMax"]:
            cases[f"{name}-{metric}"] = data["worst"][metric]

    contacts = {}
    for name, case in cases.items():
        apply_poses(by_name, rig, case["framePoses"])
        contacts[name] = {
            "rearFrameToTenderBody": overlap(by_name["engine_rear"], by_name["tender_body"]),
            "rearFrameToFrontFrame": overlap(by_name["engine_rear"], by_name["engine_front"]),
        }
    (evidence / "interface-overlap.json").write_text(json.dumps(contacts, indent=2) + "\n")

    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.clip_end = 1800
    scene.camera = camera
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.show_cavity = True
    shading.cavity_type = "BOTH"
    shading.show_shadows = True
    shading.background_type = "WORLD"
    scene.world = bpy.data.worlds.new("Inspection background")
    scene.world.color = (.15, .15, .15)

    apply_poses(by_name, rig, cases["straight"]["framePoses"])
    shading.color_type = "TEXTURE"
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        principled = next((n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if principled and principled.inputs["Base Color"].is_linked:
            material.node_tree.nodes.active = principled.inputs["Base Color"].links[0].from_node
    render(scene, camera, evidence / "prototype-profile.png", Vector((0, 0, 14)), (330, 0, 25), 1600, 360, 270)

    apply_poses(by_name, rig, cases["R282-left"]["framePoses"])
    guide_rails(282)
    colors = {
        "engine_rear": (.36, .53, .68, 1),
        "engine_front": (.95, .53, .22, 1),
        "tender_body": (.34, .65, .50, 1),
    }
    for name, obj in by_name.items():
        parent = rig["frames"][name]["parent"]
        color = colors.get(name, colors.get(parent, (.49, .52, .58, 1)))
        obj.color = color
        for axle in rig["frames"][name]["axleNodes"]:
            scene.objects[axle].color = (color[0] * .6, color[1] * .6, color[2] * .6, 1)
    shading.color_type = "OBJECT"
    render(scene, camera, evidence / "r282-articulated.png", Vector((27, 0, 0)), (260, -55, 230), 1600, 560, 340)


if __name__ == "__main__":
    main()
