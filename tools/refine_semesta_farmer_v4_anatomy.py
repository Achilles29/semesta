"""Repair V3 anatomy as real, rigged Blender geometry; keep live V2 untouched.

Fuses the head/neck, shoulders, wrists/fingers and pelvis/legs; then renders
the exact candidate GLB mesh from neutral and gameplay viewpoints.
Run: blender -b -t 4 --python tools/refine_semesta_farmer_v4_anatomy.py
"""

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
IN_BLEND = ROOT / "assets/avatar-v2/source/semesta_farmer_v3-blockout.blend"
OUT_BLEND = ROOT / "assets/avatar-v2/source/semesta_farmer_v4-anatomy.blend"
OUT_GLB = ROOT / "assets/avatar-v2/source/semesta_farmer_v4-anatomy.glb"
PREVIEW = ROOT / "ilustrasi/avatar-v2/semesta_farmer_v4-anatomy"
REPORT = ROOT / "assets/avatar-v2/reports/semesta_farmer_v4-anatomy.json"
PREVIEW.mkdir(parents=True, exist_ok=True)
REPORT.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(IN_BLEND))
rig = bpy.data.objects["SemestaV2_Rig"]
bpy.context.scene.frame_set(1)


def select_only(objects, active):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active


def smooth_shape(obj, factor=.33, iterations=2):
    mod = obj.modifiers.new("V4 silhouette smoothing", "SMOOTH")
    mod.factor = factor
    mod.iterations = iterations
    select_only([obj], obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def fuse(name, members, voxel, smooth=.30, thickness=0):
    objects = [bpy.data.objects[item] for item in members]
    active = objects[0]
    for obj in objects:
        for mod in list(obj.modifiers):
            if mod.type == "ARMATURE":
                obj.modifiers.remove(mod)
    select_only(objects, active)
    if len(objects) > 1:
        bpy.ops.object.join()
    active.name = name
    if thickness:
        solid = active.modifiers.new("V4 cloth thickness", "SOLIDIFY")
        solid.thickness = thickness
        solid.offset = -1
        select_only([active], active)
        bpy.ops.object.modifier_apply(modifier=solid.name)
    active.data.remesh_voxel_size = voxel
    select_only([active], active)
    bpy.ops.object.voxel_remesh()
    smooth_shape(active, smooth, 2)
    armature = active.modifiers.new("V4 skin", "ARMATURE")
    armature.object = rig
    return active


def material(name, rgb, roughness=.75):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


SKIN = bpy.data.materials["Skin Warm Brown"]
PANTS = bpy.data.materials["Denim Olive"]
PANTS.node_tree.links.remove(PANTS.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].links[0])
PANTS.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (.17,.23,.10,1)


def skinned_mesh(name, vertices, faces, mat, bone):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(vertices))), 1.0, "REPLACE")
    obj.parent = rig
    mod = obj.modifiers.new("V4 skin", "ARMATURE")
    mod.object = rig
    for face in data.polygons:
        face.use_smooth = True
    return obj


def tube(name, sections, mat, bone, segments=10):
    centers=[Vector(c) for c,r in sections]
    verts,faces=[],[]
    for row,(center,radius) in enumerate(sections):
        tangent=(centers[min(row+1,len(centers)-1)]-centers[max(0,row-1)]).normalized()
        basis=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((1,0,0))
        u=tangent.cross(basis).normalized()
        v=tangent.cross(u).normalized()
        for j in range(segments):
            angle=2*math.pi*j/segments
            verts.append(tuple(centers[row]+radius*(math.cos(angle)*u+math.sin(angle)*v)))
    for row in range(len(sections)-1):
        for j in range(segments):
            a=row*segments+j
            faces.append((a,row*segments+(j+1)%segments,(row+1)*segments+(j+1)%segments,a+segments))
    faces.extend((tuple(reversed(range(segments))),tuple((len(sections)-1)*segments+j for j in range(segments))))
    return skinned_mesh(name,verts,faces,mat,bone)


def shoulder_volume(name, center, radii, mat, bone):
    verts,faces=[],[]
    rows,segments=8,16
    for i in range(rows+1):
        phi=.04+(math.pi-.08)*i/rows
        for j in range(segments):
            theta=2*math.pi*j/segments
            verts.append((center[0]+radii[0]*math.sin(phi)*math.cos(theta),
                          center[1]+radii[1]*math.sin(phi)*math.sin(theta),
                          center[2]+radii[2]*math.cos(phi)))
    for i in range(rows):
        for j in range(segments):
            a=i*segments+j
            faces.append((a,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,a+segments))
    return skinned_mesh(name,verts,faces,mat,bone)


# 1. Head-neck: separate disconnected source components, then fuse only the
# head and neck. Nose and ears stay as their authored shapes; fusing all five
# parts made the cheeks lumpy in the first V4 test.
skin = bpy.data.objects["SemestaV2_Skin_Warm_Brown"]
select_only([skin],skin)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.separate(type="LOOSE")
bpy.ops.object.mode_set(mode="OBJECT")
skin_parts=[obj for obj in bpy.context.selected_objects if obj.type=="MESH"]
head_part=max((obj for obj in skin_parts if abs(sum(v.co.x for v in obj.data.vertices)/len(obj.data.vertices))<.1),
              key=lambda obj:sum(v.co.z for v in obj.data.vertices)/len(obj.data.vertices))
neck_part=min((obj for obj in skin_parts if abs(sum(v.co.x for v in obj.data.vertices)/len(obj.data.vertices))<.1),
              key=lambda obj:sum(v.co.z for v in obj.data.vertices)/len(obj.data.vertices))
head_part.name="V4_HeadSurface"
neck_part.name="V4_NeckSurface"
for vertex in neck_part.data.vertices:
    x,y,z=vertex.co
    if 1.33<z<1.49:
        t=math.sin(math.pi*min(1,max(0,(z-1.33)/.16)))
        vertex.co.x *= 1+.16*t
        vertex.co.y *= 1+.13*t
head = fuse("V4_ContinuousHeadNeck", [head_part.name,neck_part.name], .012, .22)
# Expose a short neck rather than burying the jaw inside the shirt collar.
for vertex in head.data.vertices:
    z=vertex.co.z
    if z>1.42:
        vertex.co.z += .033*min(1,max(0,(z-1.42)/.11))
head.data.update()
for obj in bpy.context.scene.objects:
    if obj.type!="MESH" or obj==head:
        continue
    if obj.name.startswith(("V3_Eye","V3_Brow","V3_Hair","V3_Smile")) or obj in skin_parts:
        if obj in skin_parts and obj==neck_part:
            continue
        for vertex in obj.data.vertices:
            vertex.co.z+=.033
        obj.data.update()

# 2. A single cloth shell joins both sleeves to the torso. The separate
# edge/collar pieces remain as tailoring accents, not load-bearing seams.
shoulder_parts=[]
for sign,side in ((1,"L"),(-1,"R")):
    part=shoulder_volume(f"V4_ShoulderBlend_{side}",(sign*.248,-.003,1.281),
                         (.064,.070,.046),bpy.data.materials["V3 Indigo work cotton"],f"clavicle.{side}")
    shoulder_parts.append(part.name)
shirt = fuse("V4_JoinedShirtShoulders", [
    "V3_IndigoOpenOvershirt", "V3_ShapedSleeve_L", "V3_ShapedSleeve_R",
    *shoulder_parts,
], .016, .24, thickness=.023)

# 3. Palm with four small but separated digits. Their roots overlap the
# existing palm; voxel union removes the old pasted-on look. Hand-size
# fingers matter at portrait distance, while the silhouette still reads at
# the isometric gameplay camera.
arms=[]
for sign,side in ((1,"L"),(-1,"R")):
    palm=bpy.data.objects[f"V3_ConnectedForearmHand_{side}"]
    for vertex in palm.data.vertices:
        if vertex.co.z<.85:
            vertex.co.z=.820+(vertex.co.z-.744)*.40
    palm.data.update()
    palm_volume=shoulder_volume(f"V4_PalmShape_{side}",(sign*.640,-.042,.809),
                                (.047,.040,.049),SKIN,f"hand.{side}")
    parts=[f"V3_ConnectedForearmHand_{side}", f"V3_Thumb_{side}",palm_volume.name]
    offsets=(-.033,-.011,.011,.033)
    lengths=(.055,.068,.063,.050)
    for index,(offset,length) in enumerate(zip(offsets,lengths)):
        x=sign*(.640+offset)
        z=.792
        part=tube(f"V4_Finger_{side}_{index}",[
            ((x,-.041,z),.0105),
            ((x+sign*.007,-.045,z-length*.52),.0090),
            ((x+sign*.010,-.049,z-length),.0065),
        ],SKIN,f"hand.{side}",8)
        parts.append(part.name)
    arm=fuse(f"V4_ContinuousArmHand_{side}",parts,.0065,.16)
    arms.append(arm)

# 4. Hip geometry: reshape knee/calf centerlines, then union pelvis and both
# trouser legs into a single manifold, removing the separate crotch bridge.
pants=bpy.data.objects["SemestaV2_Denim_Olive"]
for vertex in pants.data.vertices:
    x,y,z=vertex.co
    if z<.84 and abs(x)>.045:
        side=1 if x>0 else -1
        knee=math.exp(-((z-.48)/.16)**2)
        calf=math.exp(-((z-.31)/.13)**2)
        ankle=math.exp(-((z-.20)/.06)**2)
        vertex.co.x += side*(.014*knee+.009*ankle)
        vertex.co.y += -.023*knee+.014*calf
        center=side*.16
        vertex.co.x=center+(vertex.co.x-center)*(1+.045*knee-.085*ankle)
        vertex.co.y*=1+.035*knee-.055*ankle
pants=fuse("V4_ContinuousPelvisLegs",[pants.name],.015,.23)
for vertex in pants.data.vertices:
    x,y,z=vertex.co
    if .19<z<.67 and abs(x)>.02:
        side=1 if x>0 else -1
        knee=math.exp(-((z-.47)/.19)**2)
        center=side*.16
        vertex.co.x=center+(x-center)*(1-.07*knee)+side*.006*knee
pants.data.update()

# The V3 back of the shirt ended in a narrow rectangular tab. Flatten its
# lower edge so it no longer appears to pierce the pelvis from behind.
for vertex in shirt.data.vertices:
    x,y,z=vertex.co
    if y>.07 and z<.805:
        vertex.co.z=.805
shirt.data.update()

# A small stance adjustment prevents the two rigid parallel-pipe legs.
# Foot geometry remains in its own material but is narrowed at the ankle.
for object_name in ("SemestaV2_Leather_Umber","SemestaV2_Leather_Sole"):
    obj=bpy.data.objects[object_name]
    for vertex in obj.data.vertices:
        x,y,z=vertex.co
        if z<.17:
            side=1 if x>0 else -1
            center=side*.16
            vertex.co.x=center+(x-center)*.92+side*.010
            if z<.08 and y<-.10:
                vertex.co.y-=.012
    obj.data.update()

# Dense voxel unions are an intermediate modeling operation, not a runtime
# budget. Collapse hidden tessellation while keeping the corrected silhouette.
for obj,ratio in ((head,.43),(shirt,.38),(pants,.41),(arms[0],.39),(arms[1],.39)):
    dec=obj.modifiers.new("V4 game mesh reduction","DECIMATE")
    dec.ratio=ratio
    select_only([obj],obj)
    bpy.ops.object.modifier_move_up(modifier=dec.name)
    bpy.ops.object.modifier_apply(modifier=dec.name)

# Save a separate editable file and export the same rendered geometry.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for obj in bpy.context.scene.objects:
    if obj.type=="MESH":
        obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT_GLB),export_format="GLB",use_selection=True,
                          export_animations=True,export_animation_mode="NLA_TRACKS",
                          export_skins=True,export_materials="EXPORT",export_yup=True)

scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE_NEXT"
scene.render.resolution_x=850
scene.render.resolution_y=1050
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
world=bpy.data.worlds.new("V4 review world")
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

light("V4 Key",(-3.5,-4,4.6),460,4)
light("V4 Fill",(3.4,-1.2,3.6),250,3)
light("V4 Rim",(1.2,3.2,3.6),330,3)
camera_data=bpy.data.cameras.new("V4 review camera")
camera=bpy.data.objects.new("V4 review camera",camera_data)
scene.collection.objects.link(camera)
scene.camera=camera
camera_data.type="ORTHO"
for name,location,scale in [
    ("front",(0,-4.8,1.04),2.20),("left",(-4.8,0,1.04),2.20),
    ("back",(0,4.8,1.04),2.20),("three-quarter",(2.9,-4.1,1.48),2.20),
    ("gameplay",(3.2,-4.1,4.2),3.15),
]:
    camera.location=location
    camera.rotation_euler=(Vector((0,0,.94))-camera.location).to_track_quat("-Z","Y").to_euler()
    camera_data.ortho_scale=scale
    scene.render.filepath=str(PREVIEW/(name+".png"))
    bpy.ops.render.render(write_still=True)

# One posed review catches obvious skinning tears that a neutral turnaround
# cannot reveal. This pose is not baked into the exported rest geometry.
rig.animation_data.action=bpy.data.actions["Walk"]
scene.frame_set(7)
camera.location=(3.2,-4.1,4.2)
camera.rotation_euler=(Vector((0,0,.94))-camera.location).to_track_quat("-Z","Y").to_euler()
camera_data.ortho_scale=3.15
scene.render.filepath=str(PREVIEW/"walk-pose.png")
bpy.ops.render.render(write_still=True)
rig.animation_data.action=None
scene.frame_set(1)

summary={
    "kind":"actual rigged Blender mesh, anatomical correction candidate",
    "blend":str(OUT_BLEND.relative_to(ROOT)),"glb":str(OUT_GLB.relative_to(ROOT)),
    "views":[str(p.relative_to(ROOT)) for p in sorted(PREVIEW.glob("*.png"))],
    "meshObjects":len([o for o in scene.objects if o.type=="MESH"]),
    "triangles":sum(len(poly.vertices)-2 for o in scene.objects if o.type=="MESH" for poly in o.data.polygons),
    "bones":len(rig.data.bones),"actions":sorted(a.name for a in bpy.data.actions),
    "liveAssetChanged":False,
}
REPORT.write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
print("SEMESTA_V4_ANATOMY",json.dumps(summary))
