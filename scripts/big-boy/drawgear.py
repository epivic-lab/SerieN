"""Two rigid telescoping members on separate vertical pin axes, in layout mm."""
import math

import bpy
from mathutils import Matrix


class Member:
    def __init__(self):
        self.vertices = []
        self.faces = []

    def add(self, vertices, faces):
        base = len(self.vertices)
        self.vertices.extend(vertices)
        self.faces.extend([base + i for i in face] for face in faces)

    def block(self, start, end, width, height, side=0, elevation=0):
        positions = [(x, y + side, z + elevation) for z in (-height / 2, height / 2)
                     for y in (-width / 2, width / 2) for x in (start, end)]
        self.add(positions, [(0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3),
                             (0, 4, 6, 2), (1, 3, 7, 5)])

    def pin_cylinder(self, radius, low, high):
        steps = 24
        vertices = [(radius * math.cos(i * math.tau / steps), radius * math.sin(i * math.tau / steps), height)
                    for height in (low, high) for i in range(steps)]
        faces = [(i, (i + 1) % steps, (i + 1) % steps + steps, i + steps) for i in range(steps)]
        faces.extend((tuple(reversed(range(steps))), tuple(range(steps, 2 * steps))))
        self.add(vertices, faces)

    def eye(self):
        steps = 24
        vertices = [(r * math.cos(i * 2 * math.pi / steps), r * math.sin(i * 2 * math.pi / steps), z)
                    for z in (-.16, .16) for r in (.65, .30) for i in range(steps)]
        faces = []
        for i in range(steps):
            j = (i + 1) % steps
            faces.extend([(i, j, j + 48, i + 48), (i + 24, i + 72, j + 72, j + 24),
                          (i, i + 24, j + 24, j), (i + 48, j + 48, j + 72, i + 72)])
        self.add(vertices, faces)

    def object(self, name, color):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.vertices, [], self.faces)
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.color = color
        return obj


def build_drawgear(dimensions):
    sleeve = dimensions["sleeveMm"]
    tongue = dimensions["tongueMm"]
    engine = Member()
    engine.eye()
    engine.block(.50, 1.06, .86, .34)
    for side in (-.45, .45):
        engine.block(.88, sleeve, .16, .60, side=side)
    for elevation in (-.245, .245):
        engine.block(.88, sleeve, 1.06, .11, elevation=elevation)
    for side in (-.315, .315):
        engine.block(sleeve - .16, sleeve, .11, .38, side=side)
    tender = Member()
    tender.eye()
    tender.block(.50, tongue - .18, .42, .22)
    tender.block(tongue - .18, tongue, .62, .26)
    return (engine.object("engine fixed-length sleeve", (.20, .54, .75, 1)),
            tender.object("tender captive tongue", (.83, .54, .20, 1)))


def pose_drawgear(members, drawbar, height):
    for index, key in enumerate(("enginePin", "tenderPin")):
        pin = drawbar[key]
        angle = math.pi / 2 - drawbar["yaw"] + index * math.pi
        members[index].matrix_world = (
            Matrix.Translation((pin["z"], pin["x"], height)) @ Matrix.Rotation(angle, 4, "Z")
        )
    bpy.context.view_layer.update()


def build_mounts(rig, frames):
    """Fixed brackets and captive pins at the existing beam surfaces."""
    height = rig["drawbarPinsMm"]["height"]
    mounts = {}
    for key, spec in rig["drawbarMountsMm"].items():
        frame = spec["frame"]
        station, pivot_height = rig["frames"][frame]["pivotMm"]
        standard = Member()
        standard.pin_cylinder(.22, -.30, .32)
        standard.pin_cylinder(.41, -.30, -.21)
        top = spec["seatHeight"] + .17 - height
        standard.block(-.28, .28, .58, top - .23, elevation=(top + .23) / 2)
        obj = standard.object(f"{key} drawbar mount and captive pin", (.65, .68, .71, 1))
        obj.parent = frames[frame]
        obj.location = (0, rig["drawbarPinsMm"][key] - station, height - pivot_height)
        mounts[key] = obj
    return mounts
