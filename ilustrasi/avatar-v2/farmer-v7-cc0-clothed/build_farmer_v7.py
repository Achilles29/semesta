"""Dress the editable CC0 base mesh; isolated gameplay candidate, not live asset.

Blender 4.5+ --background -t 4 --python build_farmer_v7.py
"""

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SOURCE = ROOT / "ilustrasi/avatar-v2/farmer-v6-mesh-study/farmer-v6-cc0-base-study.blend"
NAME = "farmer-v7-cc0-clothed"

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.frame_set(1)
rig = bpy.data.objects["SemestaV2_Rig"]
rig.animation_data.action = None
body = bpy.data.objects["V6_BlenderStudio_CC0_StylizedBody"]
body.name = "V7_CC0_Anatomy"
for obj in list(scene.objects):
    if obj not in (body, rig) and obj.type in {"CAMERA", "LIGHT"}:
        bpy.data.objects.remove(obj, do_unlink=True)


def material(name, rgb, roughness=.84):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


SKIN = material("V7 warm skin", (.77, .55, .37))
HAIR = material("V7 dark chestnut", (.115, .045, .020))
SHIRT = material("V7 ivory cotton", (.83, .81, .74))
DENIM = material("V7 cobalt overalls", (.065, .115, .305))
DENIM_DARK = material("V7 denim seam", (.055, .10, .29))
CAP = material("V7 blue cap", (.055, .095, .265))
BRIM = material("V7 ochre back brim", (.58, .42, .12))
RED = material("V7 red work gloves", (.51, .045, .035))
BOOT = material("V7 brown boots", (.30, .18, .095))
SOLE = material("V7 boot sole", (.105, .072, .045))
LEATHER = material("V7 satchel leather", (.27, .13, .065))
BRASS = material("V7 brass buckles", (.72, .52, .22), .55)
EYE = material("V7 warm brown eyes", (.17, .085, .045), .46)
body.data.materials.clear()
body.data.materials.append(SKIN)


def mesh(name, verts, faces, mat, bone=None, source_indices=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    data.materials.append(mat)
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.parent = rig
    obj.modifiers.new("Skin to V7 rig", "ARMATURE").object = rig
    for face in data.polygons:
        face.use_smooth = True
    if source_indices is not None:
        source_groups = {group.index: group.name for group in body.vertex_groups}
        groups = {}
        for new_index, old_index in enumerate(source_indices):
            for entry in body.data.vertices[old_index].groups:
                name = source_groups[entry.group]
                if name not in groups:
                    groups[name] = obj.vertex_groups.new(name=name)
                groups[name].add([new_index], entry.weight, "REPLACE")
    elif bone:
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(verts))), 1., "REPLACE")
    return obj


def surface(name, criterion, mat, offset=.010, inflate=0.):
    """Create cloth from a region of the authored body topology and its weights."""
    chosen = []
    for face in body.data.polygons:
        center = face.center
        if criterion(center.x, center.y, center.z):
            chosen.append(face)
    old_to_new = {}
    source_indices = []
    for face in chosen:
        for vertex_index in face.vertices:
            if vertex_index not in old_to_new:
                old_to_new[vertex_index] = len(source_indices)
                source_indices.append(vertex_index)
    verts = []
    for index in source_indices:
        vertex = body.data.vertices[index]
        p = vertex.co + vertex.normal * offset
        if inflate:
            p.x += math.copysign(inflate, p.x)
            p.y += math.copysign(inflate * .55, p.y)
        verts.append(tuple(p))
    faces = [tuple(old_to_new[index] for index in face.vertices) for face in chosen]
    obj = mesh(name, verts, faces, mat, source_indices=source_indices)
    solidify = obj.modifiers.new("fabric thickness", "SOLIDIFY")
    solidify.thickness = .003
    return obj


# Reweight fingers as one glove-hand mass. V6's formula mixed forearm and hand
# on the outer digits, causing long spikes during the Walk clip.
bone_groups = list(body.vertex_groups)
for vertex in body.data.vertices:
    x, y, z = vertex.co
    if abs(x) > .34 and .47 < z < .88:
        side = "L" if x > 0 else "R"
        for group in bone_groups:
            group.remove([vertex.index])
        body.vertex_groups[f"hand.{side}"].add([vertex.index], 1., "REPLACE")

# At this stage the body's actual quad faces carry the clothing colors. The
# trial overlay garments split into floating spikes at wrists and knees. Color
# regions keep the approved CC0 anatomy and deform without a second surface.
slots={}
for mat in (SHIRT,DENIM,RED,BOOT,HAIR):
    slots[mat.name]=len(body.data.materials)
    body.data.materials.append(mat)
for face in body.data.polygons:
    x,y,z=face.center
    ax=abs(x)
    if z>1.52 and (y>.07 or (ax>.145 and y>-.055)):
        chosen=HAIR
    elif z<.245:
        chosen=BOOT
    elif ax>.34 and .47<z<.88:
        chosen=RED
    elif z<.86:
        chosen=DENIM
    elif .82<z<1.34 and (ax<.28 or (z>1.075 and ax<.43)):
        chosen=SHIRT
    else:
        chosen=SKIN
    if chosen==SHIRT and .86<z<1.20 and y<-.080 and ax<.18:
        chosen=DENIM
    face.material_index=0 if chosen==SKIN else slots[chosen.name]


def ribbon(name, path, width, mat, bone="chest"):
    verts = []
    for p in path:
        x, y, z = p
        verts.extend([(x-width/2, y, z), (x+width/2, y, z)])
    faces = [(2*i, 2*i+1, 2*i+3, 2*i+2) for i in range(len(path)-1)]
    obj = mesh(name, verts, faces, mat, bone)
    solidify = obj.modifiers.new("strap thickness", "SOLIDIFY")
    solidify.thickness = .006
    return obj


for sign, side in ((1,"L"),(-1,"R")):
    ribbon(f"V7 overall strap {side}",
           [(sign*.137,-.147,1.18),(sign*.147,-.142,1.25),
            (sign*.171,-.095,1.315),(sign*.178,.015,1.33),
            (sign*.163,.105,1.285),(sign*.143,.143,1.13)], .042, DENIM)


def ellipsoid(name, center, radii, mat, bone, lat=12, lon=20):
    verts = []
    faces = []
    for i in range(lat+1):
        phi = math.pi*i/lat
        for j in range(lon):
            theta = 2*math.pi*j/lon
            verts.append((center[0]+radii[0]*math.sin(phi)*math.cos(theta),
                          center[1]+radii[1]*math.sin(phi)*math.sin(theta),
                          center[2]+radii[2]*math.cos(phi)))
    for i in range(lat):
        for j in range(lon):
            a=i*lon+j
            b=i*lon+(j+1)%lon
            faces.append((a,b,b+lon,a+lon))
    return mesh(name,verts,faces,mat,bone)


# Keep the sculpted CC0 face and add game-readable eye ovals.
for sign, side in ((1,"L"),(-1,"R")):
    ellipsoid(f"V7 eye {side}", (sign*.085,-.198,1.668),
              (.026,.007,.044), EYE, "head", 16, 24)

# Layered scalp and broad rear hair, all attached to the head bone.
def hair_clump(name, x, top_z, tip_z, width, y):
    verts = [
        (x-width/2,y,top_z),(x+width/2,y,top_z),
        (x-width*.56,y+.031,top_z-.075),(x+width*.56,y+.031,top_z-.075),
        (x-width*.33,y+.024,tip_z+.045),(x+width*.33,y+.024,tip_z+.045),
        (x+.013,y+.003,tip_z),
    ]
    faces = [(0,1,3,2),(2,3,5,4),(4,5,6)]
    obj = mesh(name,verts,faces,HAIR,"head")
    soft=obj.modifiers.new("soft layered hair","SUBSURF")
    soft.levels=2
    soft.render_levels=2
    solidify=obj.modifiers.new("hair volume","SOLIDIFY")
    solidify.thickness=.018
    return obj


for n,(x,tip,width) in enumerate(((-.175,1.51,.095),(-.095,1.46,.10),
                                  (-.005,1.43,.108),(.087,1.47,.095),(.169,1.52,.084))):
    hair_clump(f"V7 back hair {n}",x,1.68,tip,width,.146)

# Boots are rigid footwear around the authored feet, not painted bare toes.
for sign,side in ((1,"L"),(-1,"R")):
    ellipsoid(f"V7 boot shaft {side}",(sign*.166,.010,.205),
              (.090,.093,.150),BOOT,f"foot.{side}")
    ellipsoid(f"V7 rounded boot toe {side}",(sign*.166,-.103,.085),
              (.105,.156,.077),BOOT,f"foot.{side}")
    ellipsoid(f"V7 boot sole {side}",(sign*.166,-.102,.030),
              (.108,.163,.025),SOLE,f"foot.{side}",8,16)

# Backward cap: an offset curved shell rather than a full sphere hiding hair.
cap_verts=[]
cap_faces=[]
segments=32
rows=[(0.,1.0),(0.34,.91),(0.67,.66),(.91,.24),(1.,.01)]
for t,radius in rows:
    for j in range(segments):
        angle=2*math.pi*j/segments
        x=.252*radius*math.cos(angle)
        y=.216*radius*math.sin(angle)+.012
        hem=1.785-.057*math.sin(angle)
        z=hem+t*(1.969-hem)
        cap_verts.append((x,y,z))
for i in range(len(rows)-1):
    for j in range(segments):
        a=i*segments+j
        b=i*segments+(j+1)%segments
        cap_faces.append((a,b,b+segments,a+segments))
mesh("V7 blue backwards cap",cap_verts,cap_faces,CAP,"head")
ribbon("V7 rear yellow visor",
       [(-.205,.165,1.738),(-.13,.225,1.729),(0,.255,1.714),
        (.13,.225,1.729),(.205,.165,1.738)],.076,BRIM,"head")

# Cross-body satchel: separate from deforming trousers, anchored at the pelvis.
ribbon("V7 crossbody strap",
       [(-.135,-.153,1.275),(-.09,-.177,1.16),(.01,-.181,1.02),
        (.11,-.184,.88),(.21,-.166,.765)],.028,LEATHER,"chest")
ellipsoid("V7 leather satchel",(.245,-.072,.724),(.095,.067,.116),LEATHER,"root")
ellipsoid("V7 brass satchel button",(.258,-.142,.759),(.012,.008,.012),BRASS,"root",8,12)

scene.render.engine="BLENDER_EEVEE_NEXT"
scene.render.resolution_x=800
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
world=bpy.data.worlds.new("V7 studio")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.48,.48,.48,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.9
scene.world=world


def light(name,location,energy,size):
    data=bpy.data.lights.new(name,"AREA")
    data.energy=energy
    data.shape="DISK"
    data.size=size
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=location
    obj.rotation_euler=(Vector((0,0,.98))-obj.location).to_track_quat("-Z","Y").to_euler()


light("key",(-3,-4,4.5),520,4)
light("fill",(3,-1,3.4),280,3)
light("rim",(1,3,3.7),340,3)
cam_data=bpy.data.cameras.new("V7 orthographic camera")
camera=bpy.data.objects.new("V7 orthographic camera",cam_data)
scene.collection.objects.link(camera)
scene.camera=camera
cam_data.type="ORTHO"
cam_data.ortho_scale=2.23


def render(name,location):
    camera.location=location
    camera.rotation_euler=(Vector((0,0,.97))-camera.location).to_track_quat("-Z","Y").to_euler()
    scene.render.filepath=str(HERE/(name+".png"))
    bpy.ops.render.render(write_still=True)


for name,location in (("front",(0,-4.8,1.05)),("left",(-4.8,0,1.05)),
                      ("back",(0,4.8,1.05)),("three-quarter",(2.8,-4.1,1.6))):
    render(name,location)
for action_name,frame in (("Walk",7),("Hoe",8)):
    rig.animation_data.action=bpy.data.actions[action_name]
    scene.frame_set(frame)
    render("pose-"+action_name.lower(),(2.8,-4.1,1.6))
rig.animation_data.action=None
scene.frame_set(1)

bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for obj in scene.objects:
    if obj.type=="MESH":
        obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/(NAME+".blend")))
bpy.ops.export_scene.gltf(filepath=str(HERE/(NAME+".glb")),
                          export_format="GLB",use_selection=True,
                          export_animations=True,export_animation_mode="NLA_TRACKS",
                          export_skins=True,export_materials="EXPORT",export_yup=True)
report={"status":"V7 clothed CC0-base visual candidate; pending art/deformation approval",
        "source":str(SOURCE.relative_to(ROOT)),
        "meshObjects":len([o for o in scene.objects if o.type=="MESH"]),
        "bones":len(rig.data.bones),"liveAssetChanged":False}
(HERE/"build-report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps(report,indent=2))
