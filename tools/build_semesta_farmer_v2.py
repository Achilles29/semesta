"""Build an original, skinned SEMESTA farmer candidate with authored surface topology.

Run with Blender 4.5: blender -b -t 4 --python tools/build_semesta_farmer_v2.py
The script writes versioned source, GLB, and neutral review renders. It does not
replace the live character. Geometry is constructed from lofted cross sections,
with blended weights at the deforming joints; no body-part primitive operators.
"""

import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "assets/avatar-v2"
SOURCE = ASSET / "source/semesta_farmer_male_v2-authored.blend"
GLB = ASSET / "source/semesta_farmer_male_v2-authored-candidate.glb"
PREVIEW = ASSET / "previews/semesta_farmer_male_v2-authored"
REPORT = ASSET / "reports/semesta_farmer_male_v2-authored.json"
for path in (SOURCE.parent, PREVIEW, REPORT.parent):
    path.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for collection in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials):
    for item in list(collection):
        if item.users == 0:
            collection.remove(item)


def material(name, color, roughness=0.82, textured=False):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    if textured:
        rng = random.Random(sum(ord(c) for c in name))
        image = bpy.data.images.new(name + " weave", width=128, height=128, alpha=True)
        pixels = []
        for y in range(128):
            for x in range(128):
                thread = 0.96 + 0.025 * math.sin(x * math.pi / 2) + 0.019 * math.sin(y * math.pi / 2)
                value = max(0.83, min(1.0, thread + rng.uniform(-0.015, 0.015)))
                pixels.extend((color[0] * value, color[1] * value, color[2] * value, 1.0))
        image.pixels.foreach_set(pixels)
        image.update()
        image.filepath_raw = str(SOURCE.parent / (name.lower().replace(" ", "-") + "-weave.png"))
        image.file_format = "PNG"
        image.save()
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.interpolation = "Linear"
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        # Color is baked into the weave map so the glTF exporter can embed it.
    return mat


SKIN = material("Skin Warm Brown", (0.62, 0.32, 0.20), 0.74)
SKIN_SHADE = material("Skin Ear Shadow", (0.43, 0.20, 0.13), 0.83)
SHIRT = material("Canvas Work Blue", (0.20, 0.36, 0.55), textured=True)
SHIRT_DARK = material("Canvas Seams", (0.11, 0.23, 0.38))
PANTS = material("Denim Olive", (0.29, 0.34, 0.18), textured=True)
PANTS_DARK = material("Denim Seams", (0.17, 0.22, 0.12))
LEATHER = material("Leather Umber", (0.32, 0.18, 0.10), 0.65, textured=True)
SOLE = material("Leather Sole", (0.15, 0.10, 0.08), 0.86)
HAIR = material("Hair Chestnut", (0.27, 0.12, 0.075), 0.68)
HAIR_LIGHT = material("Hair Chestnut Highlight", (0.34, 0.16, 0.095), 0.72)
EYE_WHITE = material("Eye Sclera", (0.91, 0.87, 0.76), 0.48)
EYE_IRIS = material("Eye Dark Brown", (0.16, 0.09, 0.05), 0.46)
EYE_PUPIL = material("Eye Pupil", (0.035, 0.025, 0.020), 0.35)
EYE_GLINT = material("Eye Glint", (0.99, 0.96, 0.84), 0.35)
FACE_LINE = material("Face Line", (0.24, 0.10, 0.07), 0.92)
BUTTON = material("Button Amber", (0.48, 0.28, 0.12), 0.54)


def make_mesh(name, verts, faces, mat, uvs=None, weights=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    if uvs:
        layer = mesh.uv_layers.new(name="UVMap")
        for polygon in mesh.polygons:
            for li in polygon.loop_indices:
                layer.data[li].uv = uvs[mesh.loops[li].vertex_index]
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    if weights:
        names = sorted({bone for row in weights for bone in row})
        groups = {name: obj.vertex_groups.new(name=name) for name in names}
        for index, row in enumerate(weights):
            total = sum(row.values())
            for bone, value in row.items():
                if value > 0 and total > 0:
                    groups[bone].add([index], value / total, "REPLACE")
    return obj


def blend(a, b, t):
    t = min(1.0, max(0.0, t))
    return {a: 1 - t, b: t} if 0 < t < 1 else ({a: 1} if t <= 0 else {b: 1})


def torso_weights(z):
    if z < 1.08:
        return blend("root", "spine", (z - 0.81) / 0.32)
    if z < 1.30:
        return blend("spine", "chest", (z - 1.05) / 0.26)
    return {"chest": 1}


def loft_z(name, rings, mat, weight_fn, segments=32, phase=0):
    verts, faces, uvs, weights = [], [], [], []
    for i, (z, rx, ry, cx, cy) in enumerate(rings):
        for j in range(segments):
            theta = 2 * math.pi * j / segments + phase
            verts.append((cx + rx * math.cos(theta), cy + ry * math.sin(theta), z))
            uvs.append((j / segments, i / max(1, len(rings) - 1)))
            weights.append(weight_fn(z))
    for i in range(len(rings) - 1):
        for j in range(segments):
            a = i * segments + j
            b = i * segments + (j + 1) % segments
            c = (i + 1) * segments + (j + 1) % segments
            d = (i + 1) * segments + j
            faces.append((a, b, c, d))
    faces.extend((tuple(reversed(tuple(range(segments)))), tuple((len(rings) - 1) * segments + j for j in range(segments))))
    return make_mesh(name, verts, faces, mat, uvs, weights)


def loft_path(name, sections, mat, weight_fn, segments=20):
    """Sections are (center xyz, radius 1, radius 2); true connected swept mesh."""
    centers = [Vector(section[0]) for section in sections]
    verts, faces, uvs, weights = [], [], [], []
    for i, (center, rx, ry) in enumerate(sections):
        tangent = (centers[min(i + 1, len(centers) - 1)] - centers[max(i - 1, 0)]).normalized()
        basis = Vector((0, 1, 0))
        if abs(tangent.dot(basis)) > 0.92:
            basis = Vector((1, 0, 0))
        u = tangent.cross(basis).normalized()
        v = tangent.cross(u).normalized()
        for j in range(segments):
            theta = 2 * math.pi * j / segments
            p = centers[i] + rx * math.cos(theta) * u + ry * math.sin(theta) * v
            verts.append(tuple(p))
            uvs.append((j / segments, i / max(1, len(sections) - 1)))
            weights.append(weight_fn(i / max(1, len(sections) - 1), p))
    for i in range(len(sections) - 1):
        for j in range(segments):
            a = i * segments + j
            faces.append((a, i * segments + (j + 1) % segments, (i + 1) * segments + (j + 1) % segments, a + segments))
    faces.extend((tuple(reversed(tuple(range(segments)))), tuple((len(sections) - 1) * segments + j for j in range(segments))))
    return make_mesh(name, verts, faces, mat, uvs, weights)


def single(bone):
    return lambda *_: {bone: 1}


def ribbon(name, points, width, mat, bone):
    """A shaped stitched strip or facial line as a slender connected mesh."""
    p = [Vector(v) for v in points]
    verts, faces, uvs, weights = [], [], [], []
    for i, center in enumerate(p):
        tangent = (p[min(i + 1, len(p) - 1)] - p[max(0, i - 1)]).normalized()
        side = tangent.cross(Vector((0, 1, 0))).normalized()
        if side.length < 0.1:
            side = Vector((1, 0, 0))
        for sign in (-1, 1):
            verts.append(tuple(center + side * sign * width / 2))
            uvs.append(((sign + 1) / 2, i / max(1, len(p) - 1)))
            weights.append({bone: 1})
    for i in range(len(p) - 1):
        faces.append((i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2))
    obj = make_mesh(name, verts, faces, mat, uvs, weights)
    obj.data.materials[0].use_backface_culling = False
    return obj


# Rig: Blender +Z up, -Y forward. The glTF exporter converts to +Y up.
rig_data = bpy.data.armatures.new("SEMESTA humanoid v2 rig")
rig = bpy.data.objects.new("SemestaV2_Rig", rig_data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")


def bone(name, head, tail, parent=None):
    b = rig_data.edit_bones.new(name)
    b.head, b.tail = head, tail
    if parent:
        b.parent = rig_data.edit_bones[parent]
    return b


bone("root", (0, 0, 0.84), (0, 0, 0.94))
bone("spine", (0, 0, 0.93), (0, 0, 1.18), "root")
bone("chest", (0, 0, 1.18), (0, 0, 1.34), "spine")
bone("neck", (0, 0, 1.34), (0, 0, 1.43), "chest")
bone("head", (0, 0, 1.43), (0, 0, 1.69), "neck")
for side, sign in (("L", 1), ("R", -1)):
    bone(f"clavicle.{side}", (sign * .13, 0, 1.31), (sign * .28, 0, 1.30), "chest")
    bone(f"upper_arm.{side}", (sign * .27, 0, 1.30), (sign * .44, -.015, 1.11), f"clavicle.{side}")
    bone(f"forearm.{side}", (sign * .44, -.015, 1.11), (sign * .57, -.02, .91), f"upper_arm.{side}")
    bone(f"hand.{side}", (sign * .57, -.02, .91), (sign * .62, -.03, .77), f"forearm.{side}")
    bone(f"thigh.{side}", (sign * .135, 0, .84), (sign * .16, -.005, .49), "root")
    bone(f"calf.{side}", (sign * .16, -.005, .49), (sign * .16, .015, .17), f"thigh.{side}")
    bone(f"foot.{side}", (sign * .16, .015, .17), (sign * .16, -.13, .07), f"calf.{side}")
bpy.ops.object.mode_set(mode="OBJECT")
rig.select_set(False)


objects = []


def add(obj):
    objects.append(obj)
    return obj


# Continuous tailored torso shell and sculpted volume transitions.
add(loft_z("SemestaV2_ShirtBody", [
    (.77, .205, .125, 0, .012), (.80, .225, .135, 0, .012),
    (.91, .213, .127, 0, .005), (1.05, .207, .125, 0, .005),
    (1.17, .237, .139, 0, 0), (1.25, .267, .153, 0, 0),
    (1.31, .25, .147, 0, 0), (1.35, .13, .095, 0, -.005),
], SHIRT, torso_weights))

# Neck enters the head and shirt with a soft blend across chest, neck, head.
add(loft_z("SemestaV2_Neck", [
    (1.315, .086, .073, 0, -.006), (1.34, .082, .073, 0, -.005),
    (1.39, .079, .071, 0, -.006), (1.43, .083, .074, 0, -.006),
    (1.48, .105, .09, 0, -.004),
], SKIN, lambda z: blend("neck", "head", (z - 1.38) / .09)))

# Head is an asymmetric quad-ring sculpt, with jaw, cheeks and crown encoded
# in its changing cross section. This is one mesh rather than a UV sphere.
head_rings = [
    (1.350, .052, .071, 0, -.004), (1.365, .125, .117, 0, -.009),
    (1.400, .183, .165, 0, -.009), (1.445, .219, .192, 0, -.002),
    (1.500, .251, .213, 0, .003), (1.555, .265, .223, 0, .004),
    (1.615, .271, .227, 0, .006), (1.670, .267, .225, 0, .010),
    (1.725, .239, .209, 0, .017), (1.765, .172, .153, 0, .025),
    (1.785, .083, .080, 0, .025), (1.793, .015, .016, 0, .025),
]
add(loft_z("SemestaV2_Head", head_rings, SKIN, single("head"), segments=40))

# Ears with an inset shaded bowl, both attached to the head bone.
for side, sign in (("L", 1), ("R", -1)):
    add(loft_path(f"SemestaV2_Ear_{side}", [
        ((sign * .248, .010, 1.59), .035, .045),
        ((sign * .276, .004, 1.585), .043, .055),
        ((sign * .285, -.014, 1.585), .033, .049),
        ((sign * .277, -.028, 1.58), .012, .025),
    ], SKIN, single("head"), 16))

# Facial patches are deliberately restrained for isometric readability.
def face_disc(name, x, y, z, rx, rz, mat):
    verts = [(x, y, z)]
    for j in range(24):
        t = 2 * math.pi * j / 24
        verts.append((x + rx * math.cos(t), y + .007 * math.cos(t) ** 2, z + rz * math.sin(t)))
    faces = [(0, j + 1, (j + 1) % 24 + 1) for j in range(24)]
    return add(make_mesh(name, verts, faces, mat, None, [{"head": 1}] * len(verts)))


for side, sign in (("L", 1), ("R", -1)):
    x = sign * .112
    face_disc(f"SemestaV2_EyeWhite_{side}", x, -.215, 1.590, .060, .073, EYE_WHITE)
    face_disc(f"SemestaV2_Iris_{side}", x - sign * .004, -.222, 1.582, .034, .051, EYE_IRIS)
    face_disc(f"SemestaV2_Pupil_{side}", x - sign * .004, -.228, 1.582, .022, .037, EYE_PUPIL)
    face_disc(f"SemestaV2_Glint_{side}", x - sign * .014, -.232, 1.603, .012, .014, EYE_GLINT)
    add(ribbon(f"SemestaV2_Brow_{side}", [
        (x - .053, -.219, 1.686), (x - .020, -.232, 1.696),
        (x + .021, -.229, 1.695), (x + .055, -.212, 1.683),
    ], .014, HAIR, "head"))
    add(ribbon(f"SemestaV2_UpperLid_{side}", [
        (x - .057, -.221, 1.615), (x - .026, -.233, 1.644),
        (x + .023, -.230, 1.642), (x + .059, -.214, 1.611),
    ], .009, FACE_LINE, "head"))
add(loft_path("SemestaV2_Nose", [
    ((0, -.215, 1.555), .028, .025), ((0, -.240, 1.536), .026, .024),
    ((0, -.247, 1.523), .018, .015),
], SKIN, single("head"), 12))
add(ribbon("SemestaV2_Smile", [
    (-.052, -.198, 1.460), (-.029, -.212, 1.451), (0, -.217, 1.447),
    (.029, -.212, 1.451), (.052, -.198, 1.460),
], .006, FACE_LINE, "head"))

# Hairline shell and sculpted pointed clumps. The cap clears the brows.
add(loft_z("SemestaV2_HairMass", [
    (1.673, .247, .205, 0, .047), (1.703, .268, .224, 0, .039),
    (1.755, .266, .219, 0, .034), (1.803, .223, .191, 0, .034),
    (1.835, .135, .130, 0, .038), (1.845, .016, .020, 0, .039),
], HAIR, single("head"), 40))
# A broad rear shell is essential: individual locks alone leave the back of
# the head looking bald when the avatar walks away from the camera.
rear_sections = [
    (1.555, .269, .227), (1.620, .277, .233),
    (1.680, .275, .233), (1.735, .250, .218),
    (1.785, .187, .171), (1.826, .105, .105),
]
rear_verts, rear_faces, rear_uvs = [], [], []
rear_segments = 24
for row, (z, rx, ry) in enumerate(rear_sections):
    for column in range(rear_segments + 1):
        theta = math.pi * column / rear_segments
        edge = abs(math.cos(theta))
        rear_verts.append((rx * math.cos(theta), .012 + ry * math.sin(theta), z + (1 - row / (len(rear_sections) - 1)) * .065 * edge))
        rear_uvs.append((column / rear_segments, row / (len(rear_sections) - 1)))
for row in range(len(rear_sections) - 1):
    for column in range(rear_segments):
        a = row * (rear_segments + 1) + column
        rear_faces.append((a, a + 1, a + rear_segments + 2, a + rear_segments + 1))
add(make_mesh("SemestaV2_HairRearShell", rear_verts, rear_faces, HAIR, rear_uvs, [{"head": 1}] * len(rear_verts)))
hair_paths = [
    ([(-.05, -.025, 1.83), (-.105, -.139, 1.80), (-.181, -.235, 1.72), (-.185, -.249, 1.660)], .073),
    ([(.05, -.025, 1.84), (.055, -.154, 1.80), (.045, -.253, 1.73), (.005, -.259, 1.662)], .080),
    ([(.105, .025, 1.835), (.182, -.109, 1.80), (.235, -.183, 1.73), (.239, -.212, 1.675)], .071),
    ([(-.13, .05, 1.824), (-.245, -.020, 1.78), (-.275, -.110, 1.70), (-.255, -.152, 1.630)], .063),
    ([(.14, .08, 1.827), (.265, .055, 1.78), (.280, -.015, 1.70), (.264, -.078, 1.642)], .060),
]
for index, (points, radius) in enumerate(hair_paths):
    add(loft_path(f"SemestaV2_HairClump_{index}", [
        (points[0], radius * .38, radius * .34),
        (points[1], radius, radius * .62),
        (points[2], radius * .72, radius * .48),
        (points[3], .002, .002),
    ], HAIR_LIGHT if index in (1, 3) else HAIR, single("head"), 12))
for index, x in enumerate((-.17, -.09, .02, .12, .20)):
    add(loft_path(f"SemestaV2_HairBack_{index}", [
        ((x, .148, 1.78), .055, .04), ((x * 1.08, .223, 1.72), .067, .045),
        ((x * 1.13, .238, 1.62), .051, .035), ((x * 1.17, .221, 1.545), .003, .003),
    ], HAIR, single("head"), 10))

# Distinct shirt collar, placket, pocket flaps and restrained stitching.
for side, sign in (("L", 1), ("R", -1)):
    add(ribbon(f"SemestaV2_Collar_{side}", [
        (sign * .085, -.071, 1.344), (sign * .130, -.112, 1.324),
        (sign * .101, -.156, 1.277), (sign * .031, -.161, 1.302),
    ], .050, SHIRT_DARK, "chest"))
    z = 1.175
    x = sign * .115
    add(ribbon(f"SemestaV2_Pocket_{side}", [
        (x - .045, -.147, z + .015), (x - .043, -.155, z - .075),
        (x, -.159, z - .096), (x + .043, -.155, z - .075),
        (x + .045, -.147, z + .015),
    ], .008, SHIRT_DARK, "chest"))
    add(ribbon(f"SemestaV2_PocketFlap_{side}", [
        (x - .055, -.151, z + .020), (x, -.166, z - .010),
        (x + .055, -.151, z + .020),
    ], .022, SHIRT_DARK, "chest"))
add(ribbon("SemestaV2_Placket", [(0, -.159, 1.316), (0, -.150, 1.15), (0, -.132, .925)], .018, SHIRT_DARK, "chest"))
for i, z in enumerate((1.275, 1.209, 1.143, 1.077, 1.011, .945)):
    face_disc(f"SemestaV2_Button_{i}", 0, -.16 + .013 * i, z, .010, .010, BUTTON)
add(ribbon("SemestaV2_Hem", [(-.205, -.089, .797), (-.105, -.132, .795), (0, -.141, .793), (.105, -.132, .795), (.205, -.089, .797)], .011, SHIRT_DARK, "spine"))

# Arms are lofted along the actual rig axis. Blended deformation spans the
# shoulder, elbow and wrist rather than assigning one solid part per bone.
for side, sign in (("L", 1), ("R", -1)):
    prefix = f"SemestaV2_{side}"
    arm_weight = lambda t, p, s=side: (
        blend(f"clavicle.{s}", f"upper_arm.{s}", t / .18) if t < .18 else
        blend(f"upper_arm.{s}", f"forearm.{s}", (t - .42) / .23) if t < .65 else
        blend(f"forearm.{s}", f"hand.{s}", (t - .82) / .18) if t > .82 else
        {f"upper_arm.{s}": 1} if t < .42 else {f"forearm.{s}": 1}
    )
    add(loft_path(prefix + "_Sleeve", [
        ((sign * .256, 0, 1.305), .100, .104),
        ((sign * .307, -.004, 1.265), .115, .109),
        ((sign * .368, -.012, 1.195), .105, .100),
        ((sign * .421, -.015, 1.125), .088, .086),
        ((sign * .450, -.016, 1.082), .079, .079),
    ], SHIRT, lambda t, p, s=side: blend(f"clavicle.{s}", f"upper_arm.{s}", t / .55), 24))
    add(loft_path(prefix + "_SleeveCuff", [
        ((sign * .433, -.016, 1.106), .088, .087),
        ((sign * .450, -.016, 1.080), .082, .082),
    ], SHIRT_DARK, single(f"upper_arm.{side}"), 24))
    add(loft_path(prefix + "_Forearm", [
        ((sign * .440, -.014, 1.105), .067, .066),
        ((sign * .479, -.016, 1.052), .071, .067),
        ((sign * .522, -.019, .985), .064, .061),
        ((sign * .570, -.023, .910), .054, .053),
        ((sign * .592, -.025, .865), .050, .048),
    ], SKIN, lambda t, p, s=side: blend(f"upper_arm.{s}", f"forearm.{s}", (t - .10) / .55) if t < .7 else blend(f"forearm.{s}", f"hand.{s}", (t - .7) / .3), 20))
    add(loft_path(prefix + "_Hand", [
        ((sign * .589, -.025, .868), .051, .048),
        ((sign * .610, -.030, .825), .060, .052),
        ((sign * .632, -.039, .780), .058, .047),
        ((sign * .640, -.044, .751), .045, .036),
        ((sign * .637, -.043, .742), .015, .014),
    ], SKIN, single(f"hand.{side}"), 16))
    # Thumb has a separately shaped gripping silhouette.
    add(loft_path(prefix + "_Thumb", [
        ((sign * .583, -.078, .825), .024, .025),
        ((sign * .593, -.110, .796), .023, .022),
        ((sign * .598, -.119, .774), .013, .012),
    ], SKIN, single(f"hand.{side}"), 10))

# Trousers, ankle folds, boots, soles and stitch strips.
add(loft_z("SemestaV2_Waist", [
    (.71, .195, .124, 0, .006), (.77, .213, .131, 0, .005),
    (.83, .219, .135, 0, .005), (.88, .211, .130, 0, .005),
], PANTS, lambda z: blend("root", "spine", (z - .78) / .12), 32))
for side, sign in (("L", 1), ("R", -1)):
    x = sign * .130
    leg_weight = lambda t, p, s=side: (
        blend("root", f"thigh.{s}", t / .17) if t < .17 else
        blend(f"thigh.{s}", f"calf.{s}", (t - .45) / .20) if t < .65 else
        {f"calf.{s}": 1} if t < .9 else blend(f"calf.{s}", f"foot.{s}", (t - .9) / .1)
    )
    add(loft_path(f"SemestaV2_PantLeg_{side}", [
        ((x, 0, .845), .123, .136), ((x * 1.07, -.002, .77), .138, .145),
        ((x * 1.14, -.004, .65), .127, .133), ((x * 1.20, -.006, .53), .118, .121),
        ((x * 1.22, -.004, .44), .121, .120), ((x * 1.23, .004, .32), .112, .109),
        ((x * 1.22, .010, .22), .100, .101), ((x * 1.22, .009, .175), .107, .102),
    ], PANTS, leg_weight, 24))
    add(loft_path(f"SemestaV2_PantCuff_{side}", [
        ((x * 1.22, .010, .206), .106, .105),
        ((x * 1.22, .010, .178), .109, .105),
    ], PANTS_DARK, lambda t, p, s=side: blend(f"calf.{s}", f"foot.{s}", t * .25), 24))
    add(loft_path(f"SemestaV2_Boot_{side}", [
        ((x * 1.22, .010, .188), .095, .095),
        ((x * 1.22, .006, .135), .104, .104),
        ((x * 1.22, -.045, .099), .120, .151),
        ((x * 1.22, -.074, .063), .128, .178),
        ((x * 1.22, -.073, .030), .130, .180),
    ], LEATHER, single(f"foot.{side}"), 28))
    add(loft_path(f"SemestaV2_Sole_{side}", [
        ((x * 1.22, -.072, .033), .134, .183),
        ((x * 1.22, -.072, .014), .137, .186),
        ((x * 1.22, -.072, .006), .136, .184),
    ], SOLE, single(f"foot.{side}"), 28))
    add(ribbon(f"SemestaV2_BootStitch_{side}", [
        (x * 1.22 - .069, -.178, .077), (x * 1.22, -.192, .083),
        (x * 1.22 + .069, -.178, .077),
    ], .007, SOLE, f"foot.{side}"))


# Bind all authored surfaces to the same armature, then combine by material.
for obj in objects:
    modifier = obj.modifiers.new("Semesta V2 skin", "ARMATURE")
    modifier.object = rig
    obj.parent = rig

by_material = {}
for obj in objects:
    by_material.setdefault(obj.data.materials[0].name, []).append(obj)
for name, group in by_material.items():
    if len(group) == 1:
        group[0].name = "SemestaV2_" + name.replace(" ", "_")
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for obj in group:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = group[0]
    bpy.ops.object.join()
    group[0].name = "SemestaV2_" + name.replace(" ", "_")
    bpy.ops.object.select_all(action="DESELECT")


def animate(name, length, keys):
    action = bpy.data.actions.new(name=name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    for frame, rotations in keys:
        for pb in rig.pose.bones:
            pb.rotation_mode = "XYZ"
            angles = rotations.get(pb.name, (0, 0, 0))
            pb.rotation_euler = angles
            pb.keyframe_insert("rotation_euler", frame=frame, group=pb.name)
    for fcurve in action.fcurves:
        for key in fcurve.keyframe_points:
            key.interpolation = "BEZIER"
    rig.animation_data.action = None
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 1, action)
    strip.action_frame_start = 1
    strip.action_frame_end = length
    track.mute = True
    return action


zero = {}
animate("Idle", 49, [
    (1, zero), (13, {"chest": (.016, 0, .010), "head": (-.012, .005, -.009)}),
    (25, {"chest": (0, 0, -.010), "head": (.008, -.005, .012)}),
    (37, {"chest": (-.014, 0, .007), "head": (.004, .004, -.006)}), (49, zero),
])
for action_name, frames, amp in (("Walk", 25, .38), ("Run", 17, .60)):
    keys = []
    for frame in (1, 1 + (frames - 1) // 4, 1 + (frames - 1) // 2, 1 + 3 * (frames - 1) // 4, frames):
        phase = (frame - 1) / (frames - 1) * 2 * math.pi
        swing = math.sin(phase) * amp
        keys.append((frame, {
            "thigh.L": (swing, 0, 0), "thigh.R": (-swing, 0, 0),
            "calf.L": (max(0, -swing) * .45, 0, 0),
            "calf.R": (max(0, swing) * .45, 0, 0),
            "upper_arm.L": (-swing * .75, 0, 0),
            "upper_arm.R": (swing * .75, 0, 0),
            "spine": (0, 0, .018 * math.cos(phase)),
        }))
    animate(action_name, frames, keys)
animate("Interact", 33, [
    (1, zero), (12, {"upper_arm.R": (-.45, -.22, 0), "forearm.R": (-.50, 0, 0), "head": (-.10, 0, 0)}),
    (22, {"upper_arm.R": (-.43, -.22, 0), "forearm.R": (-.58, 0, 0), "head": (-.07, 0, 0)}),
    (33, zero),
])
animate("Wave", 41, [
    (1, zero),
    (9, {"upper_arm.R": (-.22, -.10, -.85), "forearm.R": (-.95, 0, -.22), "hand.R": (-.15, 0, 0)}),
    (17, {"upper_arm.R": (-.22, -.10, -.85), "forearm.R": (-.95, 0, .25), "hand.R": (-.15, 0, 0)}),
    (25, {"upper_arm.R": (-.22, -.10, -.85), "forearm.R": (-.95, 0, -.25), "hand.R": (-.15, 0, 0)}),
    (33, {"upper_arm.R": (-.22, -.10, -.85), "forearm.R": (-.95, 0, .20), "hand.R": (-.15, 0, 0)}),
    (41, zero),
])
animate("Hoe", 41, [
    (1, zero),
    (11, {"spine": (.10, 0, 0), "upper_arm.L": (-.68, .10, -.20), "upper_arm.R": (-.68, -.10, .20), "forearm.L": (-.42, 0, 0), "forearm.R": (-.42, 0, 0)}),
    (23, {"spine": (.29, 0, 0), "upper_arm.L": (-.32, .10, -.20), "upper_arm.R": (-.32, -.10, .20), "forearm.L": (-.70, 0, 0), "forearm.R": (-.70, 0, 0)}),
    (31, {"spine": (.15, 0, 0), "upper_arm.L": (-.62, .10, -.20), "upper_arm.R": (-.62, -.10, .20)}),
    (41, zero),
])
animate("Watering", 49, [
    (1, zero),
    (13, {"upper_arm.R": (-.56, -.12, .05), "forearm.R": (-.42, 0, 0), "hand.R": (.10, 0, 0)}),
    (27, {"upper_arm.R": (-.66, -.12, .05), "forearm.R": (-.61, 0, 0), "hand.R": (.35, 0, 0)}),
    (37, {"upper_arm.R": (-.56, -.12, .05), "forearm.R": (-.42, 0, 0), "hand.R": (.10, 0, 0)}),
    (49, zero),
])
animate("Harvest", 45, [
    (1, zero),
    (13, {"spine": (.32, 0, 0), "head": (-.09, 0, 0), "upper_arm.R": (-.43, -.18, 0), "forearm.R": (-.55, 0, 0)}),
    (23, {"spine": (.38, 0, 0), "upper_arm.R": (-.61, -.18, 0), "forearm.R": (-.79, 0, 0), "hand.R": (-.20, 0, 0)}),
    (33, {"spine": (.14, 0, 0), "upper_arm.R": (-.20, -.18, 0), "forearm.R": (-.38, 0, 0)}),
    (45, zero),
])

# Save editable source before review stage, and export only character meshes.
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        obj.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(
    filepath=str(GLB), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="NLA_TRACKS",
    export_skins=True, export_materials="EXPORT", export_yup=True,
    export_texcoords=True, export_normals=True,
)

# Render the same asset from four neutral cameras for visual approval.
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 820
scene.render.resolution_y = 1020
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.view_settings.view_transform = "AgX"
world = bpy.data.worlds.new("Semesta review world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.36, .39, .43, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .8
scene.world = world

def light(name, loc, energy, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0, 0, .90)) - obj.location).to_track_quat("-Z", "Y").to_euler()


light("Key", (-3.5, -4, 4.5), 450, 4)
light("Fill", (3.0, -1, 3.4), 310, 3)
light("Rim", (1.5, 3.0, 3.8), 380, 3)
camera_data = bpy.data.cameras.new("Review camera")
camera = bpy.data.objects.new("Review camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type = "ORTHO"
camera_data.ortho_scale = 2.19
for view, location in (
    ("front", (0, -4.6, 1.05)), ("left", (-4.6, 0, 1.05)),
    ("back", (0, 4.6, 1.05)), ("three-quarter", (2.7, -4.0, 1.45)),
):
    camera.location = location
    camera.rotation_euler = (Vector((0, 0, .92)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(PREVIEW / (view + ".png"))
    bpy.ops.render.render(write_still=True)

summary = {
    "status": "authored-source-candidate-needs-visual-review",
    "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
    "glb": str(GLB.relative_to(ROOT)).replace("\\", "/"),
    "preview": [str(p.relative_to(ROOT)).replace("\\", "/") for p in PREVIEW.glob("*.png")],
    "meshObjects": len([o for o in bpy.context.scene.objects if o.type == "MESH"]),
    "triangles": sum(len(poly.vertices) - 2 for o in bpy.context.scene.objects if o.type == "MESH" for poly in o.data.polygons),
    "bones": [b.name for b in rig_data.bones],
    "actions": [a.name for a in bpy.data.actions],
    "materials": [m.name for m in bpy.data.materials],
    "note": "Original procedural surface model. Human visual and deformation review still required before live installation.",
}
REPORT.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print("SEMESTA_V2_DONE", json.dumps(summary))
