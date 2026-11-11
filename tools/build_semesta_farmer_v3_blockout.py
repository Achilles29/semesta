"""Create an implementable V3 character blockout from the existing rig.

The review images are renders of exactly the meshes exported to the candidate
GLB, not AI illustrations. This script never replaces the live game asset.
Run: blender -b -t 4 --python tools/build_semesta_farmer_v3_blockout.py
"""

import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE_IN = ROOT / "assets/avatar-v2/source/semesta_farmer_male_v2-authored.blend"
SOURCE_OUT = ROOT / "assets/avatar-v2/source/semesta_farmer_v3-blockout.blend"
GLB_OUT = ROOT / "assets/avatar-v2/source/semesta_farmer_v3-blockout.glb"
PREVIEW = ROOT / "ilustrasi/avatar-v2/semesta_farmer_v3-blockout"
REPORT = ROOT / "assets/avatar-v2/reports/semesta_farmer_v3-blockout.json"
PREVIEW.mkdir(parents=True, exist_ok=True)
REPORT.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(SOURCE_IN))
rig = bpy.data.objects["SemestaV2_Rig"]
bpy.context.scene.frame_set(1)

# Remove the V2's flat stuck-on face, segmented hair, and boxy closed shirt.
remove = [
    "SemestaV2_Button_Amber", "SemestaV2_Canvas_Seams",
    "SemestaV2_Canvas_Work_Blue", "SemestaV2_Eye_Dark_Brown",
    "SemestaV2_Eye_Glint", "SemestaV2_Eye_Pupil",
    "SemestaV2_Eye_Sclera", "SemestaV2_Face_Line",
    "SemestaV2_Hair_Chestnut", "SemestaV2_Hair_Chestnut_Highlight",
]
for name in remove:
    bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)


def material(name, rgb, roughness=.86):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


INDIGO = material("V3 Indigo work cotton", (.145, .205, .355))
INDIGO_EDGE = material("V3 Indigo worn edge", (.215, .275, .425))
CREAM = material("V3 Cream inner shirt", (.78, .70, .54))
HAIR = material("V3 Deep umber hair", (.105, .055, .034), .78)
HAIR_LIT = material("V3 Warm umber hair planes", (.160, .085, .051), .80)
EYE = material("V3 Brown eye", (.055, .034, .026), .49)
EYE_HIGHLIGHT = material("V3 Eye highlight", (.86, .78, .61), .42)
MOUTH = material("V3 Warm mouth line", (.27, .105, .071))
BELT = material("V3 Amber leather belt", (.31, .17, .075), .68)
BUCKLE = material("V3 Belt buckle", (.58, .43, .20), .55)


def mesh(name, vertices, faces, mat, weights, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    for face in data.polygons:
        face.use_smooth = smooth
    groups = {bone: obj.vertex_groups.new(name=bone) for bone in sorted({bone for row in weights for bone in row})}
    for i, row in enumerate(weights):
        total = sum(row.values())
        for bone, value in row.items():
            if value:
                groups[bone].add([i], value / total, "REPLACE")
    obj.parent = rig
    mod = obj.modifiers.new("V3 skinned surface", "ARMATURE")
    mod.object = rig
    return obj


def weight(a, b=None, t=0):
    if not b or t <= 0:
        return {a: 1}
    if t >= 1:
        return {b: 1}
    return {a: 1-t, b: t}


def body_weight(z):
    if z < 1.02:
        return weight("root", "spine", (z-.80)/.25)
    if z < 1.28:
        return weight("spine", "chest", (z-1.01)/.27)
    return {"chest": 1}


def oval_loft(name, rings, mat, weight_fn, segments=32, opening=None):
    """Ring sections are (z, rx, ry, center_y); optional open front wedge."""
    verts, faces, weights = [], [], []
    count = segments + 1 if opening is not None else segments
    for z, rx, ry, cy in rings:
        for j in range(count):
            theta = ((-math.pi/2 + opening) + (2*math.pi-2*opening)*j/segments) if opening is not None else 2*math.pi*j/segments
            verts.append((rx*math.cos(theta), cy + ry*math.sin(theta), z))
            weights.append(weight_fn(z))
    for row in range(len(rings)-1):
        for j in range(segments if opening is not None else segments):
            nxt = j+1 if opening is not None else (j+1)%segments
            a = row*count+j
            b = row*count+nxt
            c = (row+1)*count+nxt
            d = (row+1)*count+j
            faces.append((a,b,c,d))
    if opening is None:
        faces.append(tuple(reversed(range(count))))
        faces.append(tuple((len(rings)-1)*count+j for j in range(count)))
    return mesh(name, verts, faces, mat, weights)


def path_loft(name, sections, mat, weight_fn, segments=18):
    centers = [Vector(s[0]) for s in sections]
    verts, faces, weights = [], [], []
    for row, (center, rx, ry) in enumerate(sections):
        tangent = (centers[min(row+1,len(centers)-1)]-centers[max(row-1,0)]).normalized()
        basis = Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((1,0,0))
        u = tangent.cross(basis).normalized()
        v = tangent.cross(u).normalized()
        for j in range(segments):
            theta = 2*math.pi*j/segments
            verts.append(tuple(centers[row]+rx*math.cos(theta)*u+ry*math.sin(theta)*v))
            weights.append(weight_fn(row/(len(sections)-1)))
    for row in range(len(sections)-1):
        for j in range(segments):
            a=row*segments+j
            faces.append((a,row*segments+(j+1)%segments,(row+1)*segments+(j+1)%segments,a+segments))
    faces.append(tuple(reversed(range(segments))))
    faces.append(tuple((len(sections)-1)*segments+j for j in range(segments)))
    return mesh(name, verts, faces, mat, weights)


def flat_patch(name, points, mat, bone="head"):
    return mesh(name, points, [tuple(range(len(points)))], mat, [{bone:1}]*len(points), smooth=False)


def face_oval(name, x, y, z, rx, rz, mat, sections=20):
    # Curved surface, laid just ahead of the sculpted face, never a round disc.
    vertices = [(x, y-.003, z)]
    for j in range(sections):
        t = 2*math.pi*j/sections
        dx = rx*math.cos(t)
        dz = rz*math.sin(t)
        vertices.append((x+dx,y+.009*(dx/rx)**2+.004*(dz/rz)**2,z+dz))
    faces=[(0,j+1,(j+1)%sections+1) for j in range(sections)]
    return mesh(name, vertices, faces, mat, [{"head":1}]*len(vertices))


# Improve the pre-existing head volume while keeping all 19 bone names and
# animation actions. A mild warp avoids tearing at the neck or eyes.
skin = bpy.data.objects["SemestaV2_Skin_Warm_Brown"]
for vertex in skin.data.vertices:
    z = vertex.co.z
    if z > 1.40:
        strength = min(1, max(0, (z-1.40)/.13))
        vertex.co.x *= 1 + .075*strength
        vertex.co.y *= 1 + .050*strength
        vertex.co.z += .032*strength

# The V2 wrist was two intersecting objects and showed a hard split. Replace
# both forearm/hand sections with one connected skinned surface per side.
bm=bmesh.new()
bm.from_mesh(skin.data)
arm_faces=[face for face in bm.faces if abs(sum(v.co.x for v in face.verts)/len(face.verts))>.385
           and .70<sum(v.co.z for v in face.verts)/len(face.verts)<1.14]
bmesh.ops.delete(bm,geom=arm_faces,context="FACES")
bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context="VERTS")
bm.to_mesh(skin.data)
bm.free()
skin.data.update()
for sign,side in ((1,"L"),(-1,"R")):
    path_loft(f"V3_ConnectedForearmHand_{side}",[
        ((sign*.439,-.014,1.108),.066,.065),
        ((sign*.475,-.016,1.056),.069,.064),
        ((sign*.522,-.019,.985),.061,.058),
        ((sign*.567,-.022,.913),.052,.050),
        ((sign*.592,-.026,.865),.048,.047),
        ((sign*.616,-.032,.817),.053,.050),
        ((sign*.637,-.039,.775),.049,.044),
        ((sign*.642,-.042,.750),.037,.035),
        ((sign*.642,-.042,.744),.010,.010),
    ],bpy.data.materials["Skin Warm Brown"],
    lambda t,s=side: weight(f"upper_arm.{s}",f"forearm.{s}",t/.38) if t<.38 else
                     weight(f"forearm.{s}",f"hand.{s}",(t-.62)/.32),20)
    path_loft(f"V3_Thumb_{side}",[
        ((sign*.596,-.075,.824),.021,.022),
        ((sign*.600,-.100,.795),.023,.022),
        ((sign*.606,-.109,.773),.010,.010),
    ],bpy.data.materials["Skin Warm Brown"],lambda t,s=side:{f"hand.{s}":1},12)

# The cream underlayer is genuine 3D geometry. The indigo overshirt is an
# open, continuous shell rather than a painted panel on a closed cylinder.
oval_loft("V3_CreamUndershirt", [
    (.775,.177,.111,.009),(.85,.188,.112,.008),(.98,.183,.110,.004),
    (1.11,.191,.118,0),(1.25,.209,.125,0),(1.34,.115,.084,0),
], CREAM, body_weight, 32)
oval_loft("V3_IndigoOpenOvershirt", [
    (.77,.222,.139,.008),(.815,.230,.143,.008),(.96,.215,.135,.005),
    (1.10,.220,.139,.003),(1.23,.251,.153,0),(1.30,.258,.150,0),
    (1.345,.116,.086,0),
], INDIGO, body_weight, 36, opening=.34)

# Collar and placket have real silhouette/thickness at gameplay distance.
for sign, side in ((1,"L"),(-1,"R")):
    flat_patch(f"V3_Collar_{side}", [
        (sign*.044,-.130,1.338),(sign*.133,-.130,1.326),
        (sign*.164,-.160,1.279),(sign*.073,-.151,1.291),
    ], INDIGO_EDGE, "chest")
    flat_patch(f"V3_FrontEdge_{side}", [
        (sign*.074,-.144,1.288),(sign*.087,-.145,1.288),
        (sign*.085,-.149,.818),(sign*.072,-.150,.818),
    ], INDIGO_EDGE, "chest")
    flat_patch(f"V3_ChestPocket_{side}", [
        (sign*.123,-.152,1.147),(sign*.204,-.118,1.147),
        (sign*.200,-.114,1.075),(sign*.160,-.145,1.056),
        (sign*.121,-.151,1.075),
    ], INDIGO_EDGE, "chest")
    path_loft(f"V3_ShapedSleeve_{side}", [
        ((sign*.254,0,1.300),.087,.092),
        ((sign*.315,-.003,1.259),.098,.091),
        ((sign*.369,-.010,1.193),.091,.085),
        ((sign*.418,-.014,1.123),.077,.074),
        ((sign*.444,-.015,1.083),.073,.070),
    ], INDIGO, lambda t,s=side:weight(f"clavicle.{s}",f"upper_arm.{s}",t/.6),20)
    path_loft(f"V3_SleeveTurnup_{side}", [
        ((sign*.424,-.014,1.113),.080,.076),
        ((sign*.447,-.015,1.081),.076,.072),
    ], INDIGO_EDGE, lambda t,s=side:{f"upper_arm.{s}":1},20)

# Small but unmistakable utility belt. It is a blockout of actual hardware,
# not a texture-only promise.
oval_loft("V3_UtilityBelt", [(.822,.211,.139,.006),(.852,.213,.140,.006)], BELT,
          lambda z:{"root":1},32)
flat_patch("V3_BeltBuckle", [(-.028,-.148,.854),(.028,-.148,.854),(.028,-.151,.818),(-.028,-.151,.818)], BUCKLE,"root")

# Original face design: dark almond-like eyes nested into the face plane,
# restrained highlights, asymmetric hairline and a small curved mouth.
for sign, side in ((1,"L"),(-1,"R")):
    x=sign*.112
    face_oval(f"V3_Eye_{side}",x,-.235,1.603,.036,.057,EYE)
    face_oval(f"V3_EyeCatch_{side}",x-sign*.011,-.242,1.628,.008,.012,EYE_HIGHLIGHT,12)
    flat_patch(f"V3_Brow_{side}",[
        (x-.047,-.224,1.704),(x-.016,-.239,1.715),
        (x+.026,-.238,1.712),(x+.052,-.218,1.697),
    ],HAIR)
flat_patch("V3_Smile",[
    (-.048,-.218,1.481),(-.026,-.226,1.468),(0,-.230,1.465),
    (.027,-.226,1.469),(.049,-.217,1.482),
    (.027,-.226,1.474),(0,-.230,1.470),(-.026,-.226,1.473),
],MOUTH)

# Close-fitting dark hair shell with broad swept locks; front and back are
# actually modeled, avoiding the V2 bald patch and pale disconnected clumps.
oval_loft("V3_HairCrown", [
    (1.688,.259,.217,.018),(1.727,.272,.230,.018),
    (1.774,.257,.222,.022),(1.820,.199,.177,.024),
    (1.856,.104,.099,.024),(1.866,.017,.019,.024),
],HAIR,lambda z:{"head":1},40)
rear_verts,rear_faces=[],[]
rear_rows=[(1.495,.246,.228),(1.575,.270,.242),(1.655,.284,.245),
           (1.724,.270,.236),(1.782,.234,.207)]
for row,(z,rx,ry) in enumerate(rear_rows):
    for j in range(25):
        t=math.pi*j/24
        rear_verts.append((rx*math.cos(t),.018+ry*math.sin(t),z+.05*abs(math.cos(t))))
for row in range(len(rear_rows)-1):
    for j in range(24):
        a=row*25+j
        rear_faces.append((a,a+1,a+26,a+25))
mesh("V3_HairBackShell",rear_verts,rear_faces,HAIR,[{"head":1}]*len(rear_verts))
locks=[
    ([(.092,-.028,1.852),(.022,-.178,1.824),(-.083,-.248,1.748),(-.114,-.258,1.650)],.082,HAIR_LIT),
    ([(.166,.012,1.841),(.143,-.155,1.813),(.090,-.251,1.724),(.068,-.259,1.661)],.077,HAIR),
    ([(-.037,-.030,1.853),(-.161,-.137,1.818),(-.223,-.207,1.753),(-.230,-.226,1.680)],.078,HAIR),
    ([(-.169,.066,1.830),(-.262,-.022,1.785),(-.280,-.097,1.690),(-.267,-.125,1.620)],.060,HAIR),
]
for i,(points,radius,mat) in enumerate(locks):
    path_loft(f"V3_HairSweptLock_{i}",[
        (points[0],radius*.32,radius*.26),
        (points[1],radius,radius*.58),
        (points[2],radius*.75,radius*.48),
        (points[3],.002,.002),
    ],mat,lambda t:{"head":1},12)

# Re-shape the existing trouser silhouette: fuller thigh/knee, noticeably
# gathered ankle. The pre-existing skinned pant topology remains editable.
pants=bpy.data.objects["SemestaV2_Denim_Olive"]
for vertex in pants.data.vertices:
    x,y,z=vertex.co
    if z < .83 and abs(x)>.04:
        side=1 if x>0 else -1
        center=side*.15
        fullness=.11*math.exp(-((z-.52)/.22)**2)
        gather=-.08*math.exp(-((z-.20)/.07)**2)
        vertex.co.x=center+(x-center)*(1+fullness+gather)
        vertex.co.y*=1+fullness+gather

# Save a separate editable source and export ONLY the same skinned geometry.
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_OUT))
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for obj in bpy.context.scene.objects:
    if obj.type=="MESH":
        obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(GLB_OUT),export_format="GLB",use_selection=True,
                          export_animations=True,export_animation_mode="NLA_TRACKS",
                          export_skins=True,export_materials="EXPORT",export_yup=True)

scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE_NEXT"
scene.render.resolution_x=850
scene.render.resolution_y=1050
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
world=bpy.data.worlds.new("V3 review world")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.43,.43,.45,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.8
scene.world=world

def light(name,location,energy,size):
    data=bpy.data.lights.new(name,"AREA")
    data.energy=energy
    data.shape="DISK"
    data.size=size
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=location
    obj.rotation_euler=(Vector((0,0,.95))-obj.location).to_track_quat("-Z","Y").to_euler()

light("V3 Key",(-3.5,-4.0,4.6),460,4)
light("V3 Fill",(3.4,-1.2,3.6),250,3)
light("V3 Rim",(1.2,3.2,3.6),330,3)
camera_data=bpy.data.cameras.new("V3 review camera")
camera=bpy.data.objects.new("V3 review camera",camera_data)
scene.collection.objects.link(camera)
scene.camera=camera
camera_data.type="ORTHO"
for name,location,scale in [
    ("front",(0,-4.8,1.04),2.20),
    ("left",(-4.8,0,1.04),2.20),
    ("back",(0,4.8,1.04),2.20),
    ("three-quarter",(2.9,-4.1,1.48),2.20),
    ("gameplay",(3.2,-4.1,4.2),3.15),
]:
    camera.location=location
    camera.rotation_euler=(Vector((0,0,.94))-camera.location).to_track_quat("-Z","Y").to_euler()
    camera_data.ortho_scale=scale
    scene.render.filepath=str(PREVIEW/(name+".png"))
    bpy.ops.render.render(write_still=True)

summary={
    "kind":"actual Blender mesh blockout; no AI-rendered geometry",
    "source":str(SOURCE_OUT.relative_to(ROOT)),
    "glb":str(GLB_OUT.relative_to(ROOT)),
    "views":[str(p.relative_to(ROOT)) for p in sorted(PREVIEW.glob("*.png"))],
    "meshObjects":len([o for o in scene.objects if o.type=="MESH"]),
    "triangles":sum(len(poly.vertices)-2 for o in scene.objects if o.type=="MESH" for poly in o.data.polygons),
    "bones":len(rig.data.bones),
    "actions":sorted(a.name for a in bpy.data.actions),
    "liveAssetChanged":False,
}
REPORT.write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
print("SEMESTA_V3_BLOCKOUT",json.dumps(summary))
