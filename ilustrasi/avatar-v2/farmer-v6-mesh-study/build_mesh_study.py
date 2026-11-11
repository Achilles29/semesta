"""Build an isolated, editable V6 anatomy study; never replaces the live avatar.

This is deliberately a single fused deformation surface, not V5's collection
of visible rigid lofts. It is a *sculpting foundation*, not approved final art.
Run with Blender 4.5: blender -b -t 4 --python build_mesh_study.py
"""

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SOURCE = ROOT / "assets/avatar-v2/source/semesta_farmer_v5-ps2-style.blend"
BLEND = HERE / "farmer-v6-anatomy-study.blend"
GLB = HERE / "farmer-v6-anatomy-study.glb"

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rig = bpy.data.objects["SemestaV2_Rig"]
rig.animation_data.action = None
scene.frame_set(1)
for obj in list(bpy.data.objects):
    if obj != rig:
        bpy.data.objects.remove(obj, do_unlink=True)


def material(name, color, roughness=0.83):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


CLAY = material("V6 neutral sculpt clay", (.71, .64, .55))


def make_mesh(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for p in data.polygons:
        p.use_smooth = True
    return obj


def ellipsoid(name, center, radii, lat=16, lon=24):
    """A sculptable volume; adjacent volumes are fused before skinning."""
    verts = []
    faces = []
    for i in range(lat + 1):
        phi = math.pi * i / lat
        for j in range(lon):
            theta = 2 * math.pi * j / lon
            x = center[0] + radii[0] * math.sin(phi) * math.cos(theta)
            y = center[1] + radii[1] * math.sin(phi) * math.sin(theta)
            z = center[2] + radii[2] * math.cos(phi)
            verts.append((x, y, z))
    for i in range(lat):
        for j in range(lon):
            a = i * lon + j
            b = i * lon + (j + 1) % lon
            faces.append((a, b, b + lon, a + lon))
    return make_mesh(name, verts, faces, CLAY)


def tapered_link(name, start, end, r_start, r_end, sides=20):
    a, b = Vector(start), Vector(end)
    direction = (b - a).normalized()
    tangent = direction.cross(Vector((0, 1, 0))).normalized()
    if tangent.length < .001:
        tangent = direction.cross(Vector((1, 0, 0))).normalized()
    bitangent = direction.cross(tangent).normalized()
    verts = []
    for point, radius in ((a, r_start), (b, r_end)):
        for j in range(sides):
            angle = 2 * math.pi * j / sides
            verts.append(tuple(point + radius * (math.cos(angle) * tangent + math.sin(angle) * bitangent)))
    faces = []
    for j in range(sides):
        k = (j + 1) % sides
        faces.append((j, k, k + sides, j + sides))
    faces.extend([tuple(reversed(range(sides))), tuple(range(sides, 2 * sides))])
    return make_mesh(name, verts, faces, CLAY)


# Art-directed anatomical volumes. The separate construction pieces are only
# an intermediate implicit sculpt; the saved mesh has no exposed body seams.
parts = [
    ellipsoid("head crown", (0, .014, 1.645), (.253, .213, .224)),
    ellipsoid("cheek and jaw", (0, -.034, 1.548), (.227, .202, .147)),
    ellipsoid("chin", (0, -.067, 1.470), (.126, .134, .060)),
    ellipsoid("neck", (0, .011, 1.394), (.086, .080, .125)),
    ellipsoid("ribcage", (0, .004, 1.105), (.235, .148, .257)),
    ellipsoid("lower torso", (0, .006, .875), (.205, .137, .174)),
    ellipsoid("pelvis", (0, .008, .778), (.215, .141, .124)),
    ellipsoid("nose", (0, -.211, 1.596), (.024, .037, .031), 12, 20),
]
for side, sign in (("L", 1), ("R", -1)):
    parts.extend([
        ellipsoid(f"ear {side}", (sign * .245, -.006, 1.589), (.050, .034, .060), 12, 16),
        ellipsoid(f"deltoid {side}", (sign * .245, .002, 1.253), (.076, .085, .090)),
        tapered_link(f"upper arm {side}", (sign * .282, -.005, 1.256),
                     (sign * .454, -.017, 1.069), .084, .062),
        ellipsoid(f"elbow {side}", (sign * .454, -.017, 1.069), (.068, .068, .072), 12, 16),
        tapered_link(f"forearm {side}", (sign * .455, -.017, 1.070),
                     (sign * .586, -.029, .866), .066, .046),
        ellipsoid(f"palm {side}", (sign * .617, -.033, .798), (.066, .047, .085)),
        tapered_link(f"thumb {side}", (sign * .574, -.051, .818),
                     (sign * .550, -.071, .747), .031, .025, 12),
        ellipsoid(f"hip {side}", (sign * .144, .007, .752), (.104, .137, .115)),
        tapered_link(f"thigh {side}", (sign * .153, .005, .752),
                     (sign * .164, -.002, .468), .108, .082),
        ellipsoid(f"knee {side}", (sign * .164, -.009, .475), (.082, .086, .086)),
        tapered_link(f"shin {side}", (sign * .164, -.007, .463),
                     (sign * .166, .013, .167), .086, .062),
        ellipsoid(f"foot {side}", (sign * .166, -.071, .096), (.090, .139, .069)),
    ])
    for finger in range(3):
        x = sign * (.594 + finger * .028)
        parts.append(tapered_link(f"finger {side} {finger}", (x, -.064, .773),
                                  (x + sign * .004, -.070, .713), .019, .014, 12))

bpy.ops.object.select_all(action="DESELECT")
for part in parts:
    part.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
body = parts[0]
body.name = "V6_OnePiece_Sculptable_Anatomy"
body.data.name = "V6 continuous clay surface"
body.data.remesh_voxel_size = .012
bpy.ops.object.voxel_remesh()
smooth = body.modifiers.new("V6 relaxed sculpt surface", "SMOOTH")
smooth.factor = 1.35
smooth.iterations = 12
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_apply(modifier=smooth.name)


def clamp(v):
    return max(0., min(1., v))


def smoothstep(lo, hi, value):
    t = clamp((value - lo) / (hi - lo))
    return t * t * (3 - 2 * t)


groups = {b.name: body.vertex_groups.new(name=b.name) for b in rig.data.bones}
for vertex in body.data.vertices:
    x, y, z = vertex.co
    ax = abs(x)
    side = "L" if x >= 0 else "R"
    weights = {}
    if z > 1.375:
        head_w = smoothstep(1.355, 1.480, z)
        weights = {"neck": 1 - head_w, "head": head_w}
    elif ax > .242 and z > .705:
        shoulder_w = smoothstep(.225, .358, ax)
        elbow_w = smoothstep(.395, .508, ax)
        wrist_w = smoothstep(.555, .632, ax)
        weights = {
            "chest": 1 - shoulder_w,
            f"clavicle.{side}": shoulder_w * (1 - smoothstep(.278, .372, ax)),
            f"upper_arm.{side}": shoulder_w * (1 - elbow_w),
            f"forearm.{side}": elbow_w * (1 - wrist_w),
            f"hand.{side}": wrist_w,
        }
    elif z < .87:
        hip_w = 1 - smoothstep(.69, .88, z)
        knee_w = 1 - smoothstep(.43, .56, z)
        ankle_w = 1 - smoothstep(.14, .24, z)
        midline = smoothstep(.015, .105, ax)
        weights = {
            "root": 1 - hip_w * midline,
            f"thigh.{side}": hip_w * midline * (1 - knee_w),
            f"calf.{side}": hip_w * midline * knee_w * (1 - ankle_w),
            f"foot.{side}": hip_w * midline * knee_w * ankle_w,
        }
    else:
        chest_w = smoothstep(.98, 1.22, z)
        neck_w = smoothstep(1.29, 1.39, z)
        weights = {
            "root": 1 - smoothstep(.81, .94, z),
            "spine": (1 - chest_w) * smoothstep(.81, .94, z),
            "chest": chest_w * (1 - neck_w),
            "neck": neck_w,
        }
    total = sum(max(0., w) for w in weights.values())
    if total < 1e-7:
        weights = {"root": 1.}
        total = 1.
    for bone_name, weight in weights.items():
        if weight > 1e-5:
            groups[bone_name].add([vertex.index], weight / total, "REPLACE")

body.parent = rig
armature = body.modifiers.new("V6 skeletal deformation", "ARMATURE")
armature.object = rig
body.data.materials.clear()
body.data.materials.append(CLAY)


bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for obj in scene.objects:
    if obj.type == "MESH":
        obj.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=str(GLB), export_format="GLB", use_selection=True,
                          export_animations=True, export_animation_mode="NLA_TRACKS",
                          export_skins=True, export_materials="EXPORT", export_yup=True)

# Render the same camera framing for all three views plus two deformation poses.
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 720
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"
world = bpy.data.worlds.new("V6 neutral studio")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.52, .52, .52, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .8
scene.world = world


def light(name, location, energy, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, .96)) - obj.location).to_track_quat("-Z", "Y").to_euler()


light("key", (-3, -4, 4.4), 450, 4)
light("fill", (3, -1, 3.2), 250, 3)
light("rim", (1, 3, 3), 300, 3)
camera_data = bpy.data.cameras.new("orthographic comparison")
camera = bpy.data.objects.new("orthographic comparison", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type = "ORTHO"
camera_data.ortho_scale = 2.20
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))


def render(name, location):
    camera.location = location
    camera.rotation_euler = (Vector((0, 0, .96)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(HERE / f"{name}.png")
    bpy.ops.render.render(write_still=True)


for name, location in (("front", (0, -4.8, 1.04)),
                       ("left", (-4.8, 0, 1.04)),
                       ("back", (0, 4.8, 1.04))):
    render(name, location)

for action_name, frame in (("Walk", 7), ("Hoe", 8)):
    if action_name in bpy.data.actions:
        rig.animation_data.action = bpy.data.actions[action_name]
        scene.frame_set(frame)
        render(f"pose-{action_name.lower()}", (3.0, -4.2, 1.7))
rig.animation_data.action = None
scene.frame_set(1)

report = {
    "status": "anatomy sculpt foundation only; not an approved final character",
    "source": str(SOURCE.relative_to(ROOT)),
    "meshVertices": len(body.data.vertices),
    "meshPolygons": len(body.data.polygons),
    "bones": len(rig.data.bones),
    "actions": sorted(a.name for a in bpy.data.actions),
    "liveAssetChanged": False,
}
(HERE / "build-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report, indent=2))
