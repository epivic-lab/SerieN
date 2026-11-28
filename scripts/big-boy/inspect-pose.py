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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from drawgear import build_drawgear, build_mounts, pose_drawgear


def apply_poses(frames, rig, poses, axle_slides=None):
    for name in frames:
        pose = poses[name]
        angle = -math.atan2(pose["sin"], pose["cos"])
        location = (pose["z"], pose["x"], rig["frames"][name]["pivotMm"][1])
        frames[name].matrix_world = Matrix.Translation(location) @ Matrix.Rotation(angle, 4, "Z")
        bpy.context.view_layer.update()
    for name, slide in (axle_slides or {}).items():
        bpy.context.scene.objects[name].location.x = slide
    bpy.context.view_layer.update()


def triangle_tree(obj):
    obj.data.calc_loop_triangles()
    vertices = [obj.matrix_world @ v.co for v in obj.data.vertices]
    faces = [t.vertices[:] for t in obj.data.loop_triangles]
    return BVHTree.FromPolygons(vertices, faces, all_triangles=True)


def overlaps(a, b):
    return len(a.overlap(b))


def sweep_hinge(frames, rig, sweep):
    """Sweep the rigid relative hinge independently of route points."""
    sample_degrees = .25
    maximum_on_route = max(d["worst"]["hingeDegrees"]["hingeDegrees"] for d in sweep["byScenario"].values())
    ticks = math.ceil(maximum_on_route / sample_degrees)
    apply_poses(frames, rig, sweep["straight"]["framePoses"])
    fixed = triangle_tree(frames["engine_rear"])
    swing = frames["engine_front"]
    original = swing.matrix_basis.copy()
    fixed_pivot = swing.matrix_world.translation.copy()
    forward = Vector((0, 1, 0))
    initial_heading = swing.matrix_world.to_3x3() @ forward
    results = []
    for tick in range(-ticks, ticks + 1):
        angle = tick * sample_degrees
        swing.matrix_basis = original @ Matrix.Rotation(math.radians(angle), 4, "Z")
        bpy.context.view_layer.update()
        heading = swing.matrix_world.to_3x3() @ forward
        actual = math.degrees(math.atan2(initial_heading.cross(heading).z, initial_heading.dot(heading)))
        if abs(actual - angle) > 1e-4 or (swing.matrix_world.translation - fixed_pivot).length > 1e-4:
            raise ValueError(f"Failed to apply relative hinge angle {angle}: {actual}")
        results.append({"angleDegrees": angle, "pairs": overlaps(fixed, triangle_tree(swing))})
    swing.matrix_basis = original
    bpy.context.view_layer.update()
    return {"stepDegrees": sample_degrees, "maximumOnRouteDegrees": maximum_on_route, "samples": results}


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
    args = sys.argv[sys.argv.index("--") + 1:]
    if len(args) not in (1, 2) or (len(args) == 2 and args[1] != "--checks-only"):
        raise ValueError("Expected EVIDENCE_DIR [--checks-only]")
    evidence = Path(args[0])
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
        metrics = ["halfEnvelope", "axleOffset", "drawbarMin", "drawbarMax"]
        if "kinematics" in rig:
            metrics.extend(("hingeDegrees", "leadingOffset", "guideTravel", "drawbarMargin"))
        if "trailingGuide" in rig.get("kinematics", {}):
            metrics.extend(("trailingOffset", "trailingTravel", "worstTread", "worstFlange"))
        for metric in metrics:
            cases[f"{name}-{metric}"] = data["worst"][metric]

    revised = "kinematics" in rig
    members = build_drawgear(rig["kinematics"]["drawbar"]) if revised else None
    mounts = build_mounts(rig, by_name) if "drawbarMountsMm" in rig else {}
    contacts = {}
    for name, case in cases.items():
        apply_poses(by_name, rig, case["framePoses"], case.get("axleSlides"))
        trees = {name: triangle_tree(by_name[name]) for name in ("engine_rear", "engine_front", "tender_body")}
        contacts[name] = {
            "rearFrameToTenderBody": overlaps(trees["engine_rear"], trees["tender_body"]),
            "rearFrameToFrontFrame": overlaps(trees["engine_rear"], trees["engine_front"]),
        }
        if members:
            pose_drawgear(members, case["drawbar"], rig["drawbarPinsMm"]["height"])
            for part in ("tender_front_bogie", "trailing_truck"):
                trees[part] = triangle_tree(by_name[part])
                for axle in rig["frames"][part]["axleNodes"]:
                    trees[axle] = triangle_tree(scene.objects[axle])
            sleeve, tongue = map(triangle_tree, members)
            gear_contacts = {
                member: {part: count for part, shape in trees.items() if (count := overlaps(gear, shape))}
                for member, gear in (("sleeve", sleeve), ("tongue", tongue))
            }
            contacts[name]["drawgear"] = {"members": overlaps(sleeve, tongue), **gear_contacts}
            if mounts:
                results = {}
                for key, mount in mounts.items():
                    owner = rig["drawbarMountsMm"][key]["frame"]
                    tree = triangle_tree(mount)
                    pin = case["drawbar"][f"{key}Pin"]
                    expected = Vector((pin["z"], pin["x"], rig["drawbarPinsMm"]["height"]))
                    origin_error = (mount.matrix_world.translation - expected).length
                    foreign = {part: count for part, shape in trees.items()
                               if part != owner and (count := overlaps(tree, shape))}
                    results[key] = {
                        "pinErrorMm": origin_error, "attachmentPairs": overlaps(tree, trees[owner]),
                        "foreign": foreign, "movingSleevePairs": overlaps(tree, sleeve),
                        "movingTonguePairs": overlaps(tree, tongue),
                    }
                contacts[name]["mounts"] = results
    (evidence / "interface-overlap.json").write_text(json.dumps(contacts, indent=2) + "\n")
    if mounts:
        hinge = sweep_hinge(by_name, rig, sweep)
        (evidence / "hinge-sweep.json").write_text(json.dumps(hinge, indent=2) + "\n")
    if len(args) == 2:
        return

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

    apply_poses(by_name, rig, cases["straight"]["framePoses"], cases["straight"].get("axleSlides"))
    if members:
        pose_drawgear(members, cases["straight"]["drawbar"], rig["drawbarPinsMm"]["height"])
    shading.color_type = "TEXTURE"
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        principled = next((n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if principled and principled.inputs["Base Color"].is_linked:
            material.node_tree.nodes.active = principled.inputs["Base Color"].links[0].from_node
    render(scene, camera, evidence / "prototype-profile.png", Vector((0, 0, 14)), (330, 0, 25), 1600, 360, 270)

    apply_poses(by_name, rig, cases["R282-left"]["framePoses"], cases["R282-left"].get("axleSlides"))
    if members:
        pose_drawgear(members, cases["R282-left"]["drawbar"], rig["drawbarPinsMm"]["height"])
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
    if members:
        drawbar = cases["v06-drawbarMax"]["drawbar"]
        apply_poses(by_name, rig, cases["v06-drawbarMax"]["framePoses"], cases["v06-drawbarMax"]["axleSlides"])
        pose_drawgear(members, drawbar, rig["drawbarPinsMm"]["height"])
        for rails in scene.objects:
            if rails.type == "CURVE":
                rails.hide_render = True
        center = (members[0].matrix_world.translation + members[1].matrix_world.translation) / 2
        direction = members[0].matrix_world.to_3x3() @ Vector((0, -1, 0))
        render(scene, camera, evidence / "drawbar-extended.png", center,
               direction * 60 + Vector((0, 0, -25)), 1100, 570, 29)


if __name__ == "__main__":
    main()
