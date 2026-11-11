"""Build an original PS2-era farming-game-styled avatar from editable geometry.

Keeps the existing SEMESTA rig/actions, but replaces V4's unsuccessful head,
hands, shirt and footwear. The candidate is intentionally separate from the
live GLB until rendered art and deformation checks pass.
Run with Blender 4.5: blender -b -t 4 --python tools/build_semesta_farmer_v5_ps2_style.py
"""

import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parents[1]
IN_BLEND = ROOT / "assets/avatar-v2/source/semesta_farmer_v4-anatomy.blend"
OUT_BLEND = ROOT / "assets/avatar-v2/source/semesta_farmer_v5-ps2-style.blend"
EDITABLE_BLEND = ROOT / "assets/avatar-v2/source/semesta_farmer_v5-ps2-style-editable.blend"
OUT_GLB = ROOT / "assets/avatar-v2/source/semesta_farmer_v5-ps2-style.glb"
PREVIEW = ROOT / "ilustrasi/avatar-v2/semesta_farmer_v5-ps2-style"
REPORT = ROOT / "assets/avatar-v2/reports/semesta_farmer_v5-ps2-style.json"
PREVIEW.mkdir(parents=True, exist_ok=True)
REPORT.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(IN_BLEND))
scene = bpy.context.scene
scene.frame_set(1)
rig = bpy.data.objects["SemestaV2_Rig"]
PANTS_OBJ = bpy.data.objects["V4_ContinuousPelvisLegs"]
for obj in list(bpy.data.objects):
    if obj not in (rig, PANTS_OBJ):
        bpy.data.objects.remove(obj, do_unlink=True)


def material(name, color, roughness=.82):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


SKIN = material("V5 Skin amber", (.72, .50, .29), .82)
SKIN_SHADOW = material("V5 Skin ear shade", (.49, .29, .15))
HAIR = material("V5 Hair chestnut", (.25, .105, .046), .78)
HAIR_LIGHT = material("V5 Hair warm planes", (.33, .155, .071), .78)
SHIRT = material("V5 Cotton ivory", (.82, .80, .74), .91)
SHIRT_SEAM = material("V5 Cotton seam", (.49, .43, .31), .93)
CUFF = material("V5 Rolled trouser cuff", (.67, .65, .59), .91)
DENIM = material("V5 Denim cobalt", (.105, .160, .385), .91)
DENIM_LIGHT = material("V5 Denim worn edge", (.150, .215, .470), .91)
DENIM_POCKET = material("V5 Denim pocket panel", (.122, .178, .405), .91)
DENIM_DARK = material("V5 Denim seams", (.040, .067, .195), .93)
CAP = material("V5 Cap blue", (.100, .145, .355), .88)
CAP_BRIM = material("V5 Cap ochre brim", (.58, .43, .10), .85)
GLOVE = material("V5 Gloves rust red", (.38, .022, .018), .92)
GLOVE_DARK = material("V5 Glove cuffs", (.27, .18, .16), .89)
BOOT = material("V5 Boots warm leather", (.285, .160, .072), .77)
BOOT_LIGHT = material("V5 Boots toe light", (.355, .213, .102), .80)
SOLE = material("V5 Boot sole", (.07, .035, .017), .92)
LEATHER = material("V5 Satchel leather", (.17, .065, .028), .84)
LEATHER_LIGHT = material("V5 Satchel flap", (.26, .11, .045), .83)
BRASS = material("V5 Brass buckles", (.62, .43, .18), .58)
EYE = material("V5 Eyes umber", (.18, .082, .040), .44)
EYE_HIGHLIGHT = material("V5 Eye highlights", (.97, .91, .77), .35)
MOUTH = material("V5 Mouth warm dark", (.08, .008, .012), .94)
TONGUE = material("V5 Tongue coral", (.48, .075, .082), .87)


def add_surface_texture(mat, base, kind):
    """Pack a tiny hand-coded weave/grain; never borrow game texture pixels."""
    rng=random.Random(sum(ord(c) for c in mat.name))
    image=bpy.data.images.new(mat.name+" handpainted grain",width=128,height=128,alpha=True)
    pixels=[]
    for y in range(128):
        for x in range(128):
            if kind=="cloth":
                thread=.965+.027*math.sin(x*math.pi/2)+.019*math.sin(y*math.pi/2)
                noise=rng.uniform(-.020,.020)
            elif kind=="leather":
                thread=.965+.018*math.sin(x*.17+y*.09)+.012*math.cos(y*.24)
                noise=rng.uniform(-.025,.025)
            else:
                thread=.970+.015*math.sin(x*.14+y*.21)
                noise=rng.uniform(-.015,.015)
            value=max(.83,min(1.07,thread+noise))
            pixels.extend((base[0]*value,base[1]*value,base[2]*value,1))
    image.pixels.foreach_set(pixels)
    image.update()
    image.pack()
    tex=mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image=image
    tex.interpolation="Linear"
    bsdf=mat.node_tree.nodes.get("Principled BSDF")
    mat.node_tree.links.new(tex.outputs["Color"],bsdf.inputs["Base Color"])


for mat,base,kind in [
    (DENIM,(.105,.160,.385),"cloth"),(DENIM_LIGHT,(.150,.215,.470),"cloth"),
    (DENIM_POCKET,(.122,.178,.405),"cloth"),
    (CAP,(.100,.145,.355),"cloth"),(SHIRT,(.82,.80,.74),"cloth"),
    (GLOVE,(.38,.022,.018),"cloth"),(BOOT,(.285,.160,.072),"leather"),
    (BOOT_LIGHT,(.355,.213,.102),"leather"),
    (LEATHER,(.17,.065,.028),"leather"),
]:
    add_surface_texture(mat,base,kind)


def blend(a, b, t):
    t = max(0.0, min(1.0, t))
    return {a: 1-t, b: t} if 0 < t < 1 else ({a: 1} if t <= 0 else {b: 1})


def mesh(name, verts, faces, mat, weights, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    uv=data.uv_layers.new(name="UVMap")
    for poly in data.polygons:
        for li in poly.loop_indices:
            point=data.vertices[data.loops[li].vertex_index].co
            uv.data[li].uv=((point.x*3.7+point.y*.8)%1,
                            (point.z*5.2+point.y*.4)%1)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = smooth
    groups = {bone: obj.vertex_groups.new(name=bone) for bone in sorted({k for row in weights for k in row})}
    for i, row in enumerate(weights):
        total = sum(row.values())
        if total:
            for bone, value in row.items():
                if value > 0:
                    groups[bone].add([i], value/total, "REPLACE")
    obj.parent = rig
    modifier = obj.modifiers.new("V5 Armature", "ARMATURE")
    modifier.object = rig
    return obj


def torso_weight(z):
    if z < 1.00:
        return blend("root", "spine", (z-.78)/.25)
    if z < 1.24:
        return blend("spine", "chest", (z-1.00)/.25)
    return {"chest": 1}


def loft_z(name, rings, mat, weights, segments=32, arc=None):
    """rings=(z,rx,ry,cx,cy); arc=(start,end) for open shells."""
    verts, faces, rows = [], [], []
    count = segments+1 if arc else segments
    for z, rx, ry, cx, cy in rings:
        for j in range(count):
            t = arc[0]+(arc[1]-arc[0])*j/segments if arc else 2*math.pi*j/segments
            verts.append((cx+rx*math.cos(t), cy+ry*math.sin(t), z))
            rows.append(weights(z))
    for i in range(len(rings)-1):
        for j in range(segments):
            nj = j+1 if arc else (j+1)%segments
            faces.append((i*count+j, i*count+nj, (i+1)*count+nj, (i+1)*count+j))
    if not arc:
        faces.extend((tuple(reversed(range(count))), tuple((len(rings)-1)*count+j for j in range(count))))
    return mesh(name, verts, faces, mat, rows)


def path_loft(name, sections, mat, weights, segments=16, caps=True):
    centers = [Vector(s[0]) for s in sections]
    verts, faces, rows = [], [], []
    for i, (center, rx, ry) in enumerate(sections):
        tangent = (centers[min(i+1,len(centers)-1)]-centers[max(i-1,0)]).normalized()
        basis = Vector((0, 1, 0)) if abs(tangent.y) < .90 else Vector((1, 0, 0))
        u = tangent.cross(basis).normalized()
        v = tangent.cross(u).normalized()
        for j in range(segments):
            angle = 2*math.pi*j/segments
            verts.append(tuple(centers[i]+rx*math.cos(angle)*u+ry*math.sin(angle)*v))
            rows.append(weights(i/max(1,len(sections)-1)))
    for i in range(len(sections)-1):
        for j in range(segments):
            faces.append((i*segments+j, i*segments+(j+1)%segments,
                          (i+1)*segments+(j+1)%segments, (i+1)*segments+j))
    if caps:
        faces.extend((tuple(reversed(range(segments))), tuple((len(sections)-1)*segments+j for j in range(segments))))
    return mesh(name, verts, faces, mat, rows)


def flat_strap(name, centers, width, mat, weights):
    """A thin cloth ribbon following the shoulder, not a raised round tube."""
    points=[Vector(p) for p in centers]
    verts,faces,rows=[],[],[]
    for i,point in enumerate(points):
        tangent=(points[min(i+1,len(points)-1)]-points[max(i-1,0)]).normalized()
        normal=-tangent.cross(Vector((1,0,0))).normalized()
        # The top and bottom are close enough to read as fabric at game scale.
        for dz in (0,.006):
            for side in (-1,1):
                verts.append(tuple(point+Vector((side*width/2,0,0))+normal*dz))
                rows.append(weights(i/max(1,len(points)-1)))
        if i:
            a=(i-1)*4
            b=i*4
            faces.extend(((a,b,b+1,a+1),(a+2,a+3,b+3,b+2),
                          (a,a+2,b+2,b),(a+1,b+1,b+3,a+3)))
    faces.extend(((0,1,3,2),tuple(reversed(range(len(verts)-4,len(verts))))))
    return mesh(name,verts,faces,mat,rows,False)


def patch(name, points, mat, bone="chest", smooth=False):
    return mesh(name, points, [tuple(range(len(points)))], mat, [{bone:1}]*len(points), smooth)


def ellipsoid(name, center, radii, mat, bone, rows=12, segments=20):
    verts, faces = [], []
    for i in range(rows+1):
        phi=.001+(math.pi-.002)*i/rows
        for j in range(segments):
            t=2*math.pi*j/segments
            verts.append((center[0]+radii[0]*math.sin(phi)*math.cos(t),
                          center[1]+radii[1]*math.sin(phi)*math.sin(t),
                          center[2]+radii[2]*math.cos(phi)))
    for i in range(rows):
        for j in range(segments):
            a=i*segments+j
            faces.append((a,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,a+segments))
    return mesh(name,verts,faces,mat,[{bone:1}]*len(verts))


def line(name, points, radius, mat, bone="chest"):
    return path_loft(name, [(p,radius,radius) for p in points],mat,lambda t:{bone:1},8)


def bevel_box(name, center, size, mat, bone, bevel=.022):
    x,y,z=center
    sx,sy,sz=(v*.5 for v in size)
    verts=[(x+dx*sx,y+dy*sy,z+dz*sz)
           for dz in (-1,1) for dy in (-1,1) for dx in (-1,1)]
    faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),
           (0,2,6,4),(1,5,7,3)]
    obj=mesh(name,verts,faces,mat,[{bone:1}]*8,False)
    mod=obj.modifiers.new("V5 soft leather edges","BEVEL")
    mod.width=bevel
    mod.segments=3
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_move_up(modifier=mod.name)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in obj.data.polygons:
        poly.use_smooth=True
    return obj


# Keep V4's one-piece skinned pelvis/legs, reshaped into cuffed work overalls.
PANTS_OBJ.name = "V5_ConnectedOverallPants"
PANTS_OBJ.data.materials.clear()
PANTS_OBJ.data.materials.append(DENIM)
for v in PANTS_OBJ.data.vertices:
    x,y,z=v.co
    if z<.82:
        # Soft taper at ankles and a gentler, less columnar knee.
        side=1 if x>=0 else -1
        center=side*.16
        ankle=math.exp(-((z-.20)/.10)**2)
        knee=math.exp(-((z-.49)/.16)**2)
        leg_spacing=max(0,min(1,(.84-z)/.16))
        v.co.x=(center+(x-center)*(1-.10*ankle-.10*knee
                                  -.07*math.exp(-((z-.70)/.14)**2))
                -side*.024*leg_spacing)
        v.co.y=y*(1-.06*ankle)
        if z<.46:
            t=max(0,min(1,(z-.18)/.28))
            smooth=t*t*(3-2*t)
            v.co.z=z+.115*(1-smooth)
PANTS_OBJ.data.update()
while PANTS_OBJ.data.uv_layers:
    PANTS_OBJ.data.uv_layers.remove(PANTS_OBJ.data.uv_layers[0])
uv=PANTS_OBJ.data.uv_layers.new(name="UVMap")
for poly in PANTS_OBJ.data.polygons:
    for li in poly.loop_indices:
        point=PANTS_OBJ.data.vertices[PANTS_OBJ.data.loops[li].vertex_index].co
        uv.data[li].uv=((point.x*3.7+point.y*.8)%1,
                        (point.z*5.2+point.y*.4)%1)
smooth=PANTS_OBJ.modifiers.new("V5 smooth denim silhouette","SMOOTH")
smooth.factor=.55
smooth.iterations=3
bpy.context.view_layer.objects.active=PANTS_OBJ
bpy.ops.object.select_all(action="DESELECT")
PANTS_OBJ.select_set(True)
bpy.ops.object.modifier_apply(modifier=smooth.name)
pants_surface=BVHTree.FromPolygons(
    [v.co.copy() for v in PANTS_OBJ.data.vertices],
    [tuple(poly.vertices) for poly in PANTS_OBJ.data.polygons])


def trousers_back_sample(x,z):
    hit,normal,face,distance=pants_surface.ray_cast(Vector((x,1,z)),Vector((0,-1,0)))
    if hit is None:
        raise ValueError(f"Pocket coordinate missed trousers: {(x,z)}")
    polygon=PANTS_OBJ.data.polygons[face]
    weights={}
    for vi in polygon.vertices:
        source=PANTS_OBJ.data.vertices[vi]
        influence=1/max(.00001,(source.co-hit).length_squared)
        for group in source.groups:
            name=PANTS_OBJ.vertex_groups[group.group].name
            weights[name]=weights.get(name,0)+group.weight*influence
    return (x,hit.y+.004,z),weights


# Distinct exposed neck, then a shaped head with cheeks, jaw, and crown.
loft_z("V5_Neck",[(1.335,.081,.077,0,.018),(1.39,.081,.076,0,.020),
                    (1.445,.094,.083,0,.021),(1.486,.116,.091,0,.019)],SKIN,
       lambda z:blend("neck","head",(z-1.39)/.10),28)
head=loft_z("V5_SculptedFace",[
    (1.400,.061,.066,0,.014),(1.435,.145,.123,0,.014),
    (1.475,.200,.157,0,.013),(1.525,.233,.183,0,.011),
    (1.600,.247,.202,0,.009),(1.685,.248,.207,0,.014),
    (1.750,.234,.194,0,.019),(1.807,.195,.170,0,.025),
    (1.845,.105,.100,0,.028),(1.856,.009,.009,0,.028),
],SKIN,lambda z:{"head":1},48)
sub=head.modifiers.new("V5 gentle facial subdivision","SUBSURF")
sub.levels=1
sub.render_levels=1


FACE_RINGS=[(1.435,.145,.123,.014),(1.475,.200,.157,.013),
            (1.525,.233,.183,.011),(1.600,.247,.202,.009),
            (1.685,.248,.207,.014),(1.750,.234,.194,.019),
            (1.807,.195,.170,.025)]


def face_y(x,z,lift=.003):
    """Surface-following face detail; negative Y is the character's front."""
    for i in range(len(FACE_RINGS)-1):
        lo,hi=FACE_RINGS[i:i+2]
        if z<=hi[0]:
            t=max(0,min(1,(z-lo[0])/(hi[0]-lo[0])))
            rx=lo[1]*(1-t)+hi[1]*t
            ry=lo[2]*(1-t)+hi[2]*t
            cy=lo[3]*(1-t)+hi[3]*t
            return cy-ry*math.sqrt(max(.02,1-(x/rx)**2))-lift
    z0,rx,ry,cy=FACE_RINGS[-1]
    return cy-ry*math.sqrt(max(.02,1-(x/rx)**2))-lift


def face_patch(name,coords,mat,lift=.004):
    return patch(name,[(x,face_y(x,z,lift),z) for x,z in coords],mat,"head",True)


def face_oval(name,x,z,rx,rz,mat,lift=.004):
    coords=[(x+rx*math.cos(i*2*math.pi/28),
             z+rz*math.sin(i*2*math.pi/28)) for i in range(28)]
    return face_patch(name,coords,mat,lift)


def face_line(name,coords,radius,mat):
    return line(name,[(x,face_y(x,z,.003),z) for x,z in coords],
                radius,mat,"head")

for sign,side in ((1,"L"),(-1,"R")):
    ellipsoid(f"V5_Ear_{side}",(sign*.235,.000,1.606),(.043,.027,.055),SKIN,"head")
    ellipsoid(f"V5_EarInset_{side}",(sign*.262,-.021,1.608),(.012,.004,.023),SKIN_SHADOW,"head",8,14)

# The eyes sit on the face surface, with raised lid and large coherent iris.
for sign,side in ((1,"L"),(-1,"R")):
    x=sign*.105
    face_oval(f"V5_Eye_{side}",x,1.641,.037,.060,EYE)
    face_oval(f"V5_EyeGlint_{side}",x-sign*.012,1.666,.006,.010,
              EYE_HIGHLIGHT,.006)
    face_line(f"V5_UpperLid_{side}",[(x-.039,1.688),(x-.014,1.704),
                                       (x+.014,1.703),(x+.039,1.686)],.0035,HAIR)
    face_line(f"V5_Eyebrow_{side}",[(x-.040,1.737),(x,1.747),
                                      (x+.040,1.735)],.004,HAIR)
# A small actual 3D nose is necessary for the side view; the earlier flat
# skin-colored polygon disappeared against the round cheek.
nose_verts=[(0,face_y(0,1.619,.003),1.619),
            (-.013,face_y(-.013,1.583,.003),1.583),
            (.013,face_y(.013,1.583,.003),1.583),
            (0,-.212,1.575),(0,-.199,1.562)]
mesh("V5_SculptedNose",nose_verts,
     [(0,1,3),(0,3,2),(1,4,3),(2,3,4)],SKIN,
     [{"head":1}]*len(nose_verts))
face_patch("V5_OpenSmile",[(-.065,1.533),(-.039,1.535),(0,1.532),
                            (.039,1.535),(.065,1.533),(.039,1.492),
                            (0,1.485),(-.039,1.492)],MOUTH,.006)
face_patch("V5_Tongue",[(-.032,1.500),(0,1.501),(.032,1.500),
                          (.022,1.489),(0,1.487),(-.022,1.489)],TONGUE,.008)


# Hair grows around the cap rather than being replaced by a brown helmet.
loft_z("V5_HairCrown",[(1.690,.248,.211,0,.032),(1.755,.257,.220,0,.031),
                        (1.815,.228,.200,0,.032),(1.866,.142,.134,0,.033),
                        (1.888,.014,.014,0,.034)],HAIR,lambda z:{"head":1},40)
for i,(start,mid,end,width,mat) in enumerate([
    ((.040,-.05,1.858),(-.015,-.199,1.777),(-.069,-.224,1.668),.059,HAIR_LIGHT),
    ((.159,.000,1.844),(.117,-.182,1.790),(.074,-.215,1.700),.046,HAIR),
    ((-.103,.012,1.850),(-.168,-.157,1.789),(-.220,-.189,1.706),.052,HAIR),
    ((-.190,.062,1.798),(-.244,-.050,1.746),(-.254,-.093,1.686),.033,HAIR_LIGHT),
]):
    path_loft(f"V5_HairLock_{i}",[(start,width*.60,width*.40),(mid,width,width*.48),
                                  (((mid[0]+end[0])*.5,(mid[1]+end[1])*.5,
                                    (mid[2]+end[2])*.5),width*.48,width*.30),
                                  (end,.003,.003)],mat,lambda t:{"head":1},12)
# One deliberately asymmetrical cowlick clears the cap, as in the reference.
path_loft("V5_Cowlick",[((-.085,-.100,1.855),.038,.027),
                         ((-.108,-.088,1.946),.035,.024),
                         ((-.160,-.058,2.013),.023,.016),
                         ((-.213,-.035,2.047),.002,.002)],
          HAIR_LIGHT,lambda t:{"head":1},10)
# One connected hair mass replaces eight exposed cone-shaped teeth. The lower
# edge has five staggered, broad locks; thickness keeps the side view solid.
hair_verts=[]
hair_faces=[]
hair_weights=[]
hair_steps=40
hair_row_count=hair_steps+1
for layer in range(2):
    for row in range(4):
        for j in range(hair_row_count):
            t=j/hair_steps
            theta=.10+(math.pi-.20)*t
            tip=1.515+.072*(.5+.5*math.cos(10*math.pi*t+.35))
            if row==0:
                z,rx,ry,cy=1.784,.245,.205,.033
            elif row==1:
                z,rx,ry,cy=1.670,.258,.238,.027
            elif row==2:
                z,rx,ry,cy=1.601,.238,.229,.022
            else:
                z,rx,ry,cy=tip,.207,.185,.016
            y=cy+ry*math.sin(theta)-(.024 if layer else 0)
            hair_verts.append((rx*math.cos(theta),y,z))
            hair_weights.append({"head":1})
    base=layer*4*hair_row_count
    for row in range(3):
        for j in range(hair_steps):
            a=base+row*hair_row_count+j
            hair_faces.append((a,a+1,a+1+hair_row_count,a+hair_row_count))
inner=4*hair_row_count
for j in range(hair_steps):
    hair_faces.append((j,inner+j,inner+j+1,j+1))
    a=3*hair_row_count+j
    b=inner+a
    hair_faces.append((a,a+1,b+1,b))
for j in (0,hair_steps):
    for row in range(3):
        a=row*hair_row_count+j
        b=a+hair_row_count
        hair_faces.append((a,b,inner+b,inner+a))
mesh("V5_LayeredRearHair",hair_verts,hair_faces,HAIR,hair_weights)
for i,(x,tip,lean,shade) in enumerate([
    (-.174,1.530,-.016,HAIR_LIGHT),(-.083,1.506,.009,HAIR),
    (.004,1.522,-.015,HAIR_LIGHT),(.092,1.500,.012,HAIR),
    (.174,1.535,.016,HAIR_LIGHT),
]):
    path_loft(f"V5_OverlappingHairLayer_{i}",[
        ((x,.241,1.724),.039,.014),
        ((x+lean*.45,.273,1.641),.050,.018),
        ((x+lean,.246,1.578),.035,.013),
        ((x+lean*1.25,.215,tip),.002,.002),
    ],shade,lambda t:{"head":1},10)
for sign,side in ((1,"L"),(-1,"R")):
    path_loft(f"V5_SideHairLayer_{side}",[
        ((sign*.230,.082,1.720),.027,.022),
        ((sign*.250,.107,1.625),.030,.023),
        ((sign*.238,.103,1.556),.002,.002),
    ],HAIR_LIGHT,lambda t:{"head":1},10)

# The backwards cap has a small forehead opening; a closed dome covered the
# signature swept forelock and made the front view read like a plain helmet.
cap_rings=[(1.748,.240,.197,.061),(1.791,.267,.225,.051),
           (1.846,.258,.221,.046),(1.896,.208,.184,.040),
           (1.929,.127,.119,.039),(1.937,.006,.006,.039)]
cap_vertices=[]
cap_faces=[]
cap_segments=40
for z,rx,ry,cy in cap_rings:
    for j in range(cap_segments):
        theta=2*math.pi*j/cap_segments
        cap_vertices.append((rx*math.cos(theta),cy+ry*math.sin(theta),z))
for row in range(len(cap_rings)-1):
    for j in range(cap_segments):
        theta=2*math.pi*(j+.5)/cap_segments
        front_gap=abs(math.atan2(math.sin(theta+math.pi/2),
                                  math.cos(theta+math.pi/2)))<.40
        if row in (0,1) and front_gap:
            continue
        nxt=(j+1)%cap_segments
        cap_faces.append((row*cap_segments+j,row*cap_segments+nxt,
                          (row+1)*cap_segments+nxt,(row+1)*cap_segments+j))
mesh("V5_BackwardCap",cap_vertices,cap_faces,CAP,
     [{"head":1}]*len(cap_vertices))
# Raised cap panel seam and a short ochre bill projecting behind the head.
line("V5_CapCenterSeam",[(0,-.174,1.850),(0,-.145,1.900),(0,-.015,1.936),
                          (0,.160,1.888)],.003,DENIM_LIGHT,"head")
bill_top=[(-.18,.215,1.781),(.18,.215,1.781),(.215,.345,1.762),
          (.105,.395,1.748),(-.105,.395,1.748),(-.215,.345,1.762)]
bill_bottom=[(x,y,z-.018) for x,y,z in bill_top]
bill_faces=[tuple(range(6)),tuple(reversed(range(6,12)))]
bill_faces.extend((i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6))
mesh("V5_CapBill",bill_top+bill_bottom,bill_faces,CAP_BRIM,[{"head":1}]*12,False)
brim_verts=[]
brim_faces=[]
for layer in range(2):
    for row in range(2):
        for j in range(25):
            theta=.30+(math.pi-.60)*j/24
            curve=math.cos(theta)**2
            z=(1.687+.048*curve) if row==0 else (1.781-.010*curve)
            x=(.195 if row==0 else .204)*math.cos(theta)
            y=.030+(.282 if row==0 else .277)*math.sin(theta)-layer*.012
            brim_verts.append((x,y,z))
    base=layer*50
    for j in range(24):
        brim_faces.append((base+j,base+j+1,base+26+j,base+25+j))
for j in range(24):
    brim_faces.append((j,50+j,51+j,j+1))
    brim_faces.append((25+j,26+j,76+j,75+j))
mesh("V5_CurvedOchreBackVisor",brim_verts,brim_faces,CAP_BRIM,
     [{"head":1}]*len(brim_verts))


# Ivory shirt with a legible neck opening and relaxed, non-balloon sleeves.
loft_z("V5_ShirtTorso",[(.795,.208,.132,0,.010),(.89,.205,.132,0,.008),
                        (1.055,.204,.129,0,.003),(1.215,.230,.139,0,0),
                        (1.290,.242,.143,0,0),(1.345,.108,.082,0,.006)],
       SHIRT,torso_weight,36)
loft_z("V5_ShirtCollar",[(1.330,.100,.075,0,.003),(1.355,.107,.080,0,.003),
                         (1.378,.089,.069,0,.002)],SHIRT_SEAM,lambda z:{"chest":1},24)
for sign,side in ((1,"L"),(-1,"R")):
    path_loft(f"V5_ShirtSleeve_{side}",[
        ((sign*.218,0,1.290),.081,.084),((sign*.292,-.003,1.260),.087,.081),
        ((sign*.371,-.010,1.186),.080,.076),((sign*.416,-.016,1.128),.070,.068),
    ],SHIRT,lambda t,s=side:blend(f"clavicle.{s}",f"upper_arm.{s}",t/.75),20)
    path_loft(f"V5_SleeveHem_{side}",[
        ((sign*.404,-.015,1.145),.073,.071),((sign*.422,-.016,1.119),.073,.071),
    ],SHIRT_SEAM,lambda t,s=side:{f"upper_arm.{s}":1},20)
    path_loft(f"V5_SkinArm_{side}",[
        ((sign*.417,-.016,1.138),.065,.063),((sign*.453,-.019,1.087),.064,.060),
        ((sign*.505,-.024,1.009),.060,.054),((sign*.556,-.030,.924),.050,.047),
        ((sign*.585,-.033,.878),.044,.043),
    ],SKIN,lambda t,s=side:blend(f"upper_arm.{s}",f"forearm.{s}",t/.8),20)
    # The glove is one strong mitt silhouette; thumb is not a toothpick finger.
    path_loft(f"V5_GloveCuff_{side}",[
        ((sign*.582,-.034,.889),.051,.050),((sign*.602,-.037,.850),.055,.052),
    ],GLOVE_DARK,lambda t,s=side:blend(f"forearm.{s}",f"hand.{s}",t),18)
    path_loft(f"V5_GlovePalm_{side}",[
        ((sign*.601,-.037,.859),.049,.050),((sign*.628,-.040,.815),.054,.054),
        ((sign*.651,-.045,.767),.055,.052),((sign*.654,-.046,.744),.051,.047),
    ],GLOVE,lambda t,s=side:{f"hand.{s}":1},18)
    for finger in range(3):
        fx=sign*(.625+finger*.027)
        path_loft(f"V5_GloveFinger_{side}_{finger}",[
            ((fx,-.072,.758),.021,.026),
            ((fx+sign*.002,-.073,.713),.021,.025),
            ((fx+sign*.003,-.071,.688),.018,.022),
        ],GLOVE,lambda t,s=side:{f"hand.{s}":1},12)
    path_loft(f"V5_GloveThumb_{side}",[
        ((sign*.607,-.010,.802),.025,.024),((sign*.587,-.006,.758),.028,.026),
        ((sign*.583,-.006,.733),.014,.017),
    ],GLOVE,lambda t,s=side:{f"hand.{s}":1},12)


# Overalls: tailored front bib, two continuous shoulder straps, cuffed pants.
loft_z("V5_OverallSideWaist",[(.775,.220,.163,0,-.002),(.935,.214,.151,0,0),
                                (1.065,.204,.146,0,0)],DENIM,torso_weight,36)
front_arc=(-math.pi+.32,-.32)
loft_z("V5_OverallBib",[(.775,.220,.175,0,-.012),(.920,.222,.165,0,-.015),
                         (1.065,.214,.163,0,-.014),(1.205,.175,.155,0,-.014),
                         (1.257,.156,.148,0,-.011)],DENIM,torso_weight,28,arc=front_arc)
back_arc=(.33,math.pi-.33)
loft_z("V5_OverallBack",[(.775,.220,.170,0,.008),(.940,.220,.159,0,.012),
                          (1.085,.204,.153,0,.010),(1.235,.177,.141,0,.010)],
       DENIM,torso_weight,28,arc=back_arc)
for sign,side in ((1,"L"),(-1,"R")):
    # Straps travel visibly from the bib, over the shoulders, to the back.
    strap=[(sign*.132,-.162,1.250),(sign*.145,-.150,1.283),
           (sign*.166,-.108,1.315),(sign*.173,-.045,1.338),
           (sign*.177,.018,1.338),(sign*.179,.082,1.310),
           (sign*.172,.130,1.267),(sign*.159,.151,1.225)]
    flat_strap(f"V5_OverallStrap_{side}",strap,.037,
               DENIM_LIGHT,lambda t:{"chest":1})
    ellipsoid(f"V5_StrapBuckle_{side}",(sign*.134,-.168,1.254),
              (.017,.010,.018),BRASS,"chest",6,12)
    loft_z(f"V5_PantCuff_{side}",[(.294,.102,.096,sign*.140,.013),
                                 (.305,.109,.101,sign*.140,.013),
                                 (.342,.110,.102,sign*.140,.013),
                                 (.357,.105,.098,sign*.140,.013)],
           CUFF,lambda z,s=side:{f"calf.{s}":1},24)
    pocket_verts=[]
    pocket_weights=[]
    for row in range(7):
        t=row/6
        taper=.015*max(0,(t-.46)/.54)
        for col in range(7):
            u=col/6
            z=.720-.113*t+.020*t*t*(abs(2*u-1)**2)
            x=sign*(.087+taper+(.108-2*taper)*u)
            point,weight=trousers_back_sample(x,z)
            pocket_verts.append(point)
            pocket_weights.append(weight)
    pocket_faces=[]
    for row in range(6):
        for col in range(6):
            a=row*7+col
            pocket_faces.append((a,a+1,a+8,a+7))
    mesh(f"V5_ConformingRearPocket_{side}",pocket_verts,pocket_faces,
         DENIM_POCKET,pocket_weights)

# A single bib pocket follows the curved front surface; avoid floating patches.
patch("V5_BibPocket",[(-.070,-.163,1.185),(.070,-.163,1.185),
                       (.068,-.168,1.119),(.044,-.175,1.098),
                       (-.044,-.175,1.098),(-.068,-.168,1.119)],
      DENIM_LIGHT,"chest")

# The bib and back panel extend into the trouser pelvis; a separate raised
# waistband made the overalls look like two stacked boxes.
line("V5_BibTopStitch",[(-.145,-.151,1.254),(0,-.158,1.264),
                         (.145,-.151,1.254)],.003,DENIM_LIGHT,"chest")


# Boots have a planted heel, tapered shaft and forward toe, not a round dome.
for sign,side in ((1,"L"),(-1,"R")):
    shaft_x=sign*.140
    toe_x=sign*.153
    loft_z(f"V5_Boot_{side}",[(.036,.142,.194,toe_x,-.087),
                              (.052,.148,.203,toe_x,-.090),
                              (.080,.148,.198,toe_x,-.089),
                              (.106,.137,.181,toe_x,-.081),
                              (.132,.114,.146,sign*.148,-.062),
                              (.170,.095,.107,shaft_x,-.021),
                              (.215,.087,.091,shaft_x,.004),
                              (.270,.088,.088,shaft_x,.012),
                              (.350,.092,.086,shaft_x,.015),
                              (.369,.088,.083,shaft_x,.015)],
           BOOT,lambda z,s=side:blend(f"foot.{s}",f"calf.{s}",(z-.14)/.20),28)
    loft_z(f"V5_Sole_{side}",[(.018,.148,.204,toe_x,-.090),
                              (.035,.151,.207,toe_x,-.091),
                              (.048,.150,.203,toe_x,-.090)],
           SOLE,lambda z,s=side:{f"foot.{s}":1},28)
    loft_z(f"V5_BootCuff_{side}",[(.342,.093,.087,shaft_x,.015),
                                  (.365,.093,.087,shaft_x,.015)],
           BOOT,lambda z,s=side:{f"calf.{s}":1},24)


# Original utility bag gives rear/side silhouette a useful visual anchor.
strap_points=[(.310,-.095,.760),(.235,-.129,.785),(.105,-.177,.835),
              (-.018,-.191,.980),(-.115,-.174,1.157),
              (-.156,-.119,1.282),(-.168,-.060,1.337),
              (-.169,.015,1.348),(-.167,.083,1.329),
              (-.155,.123,1.282),(-.105,.157,1.157),
              (-.010,.180,.977),(.108,.165,.833),
              (.245,.086,.775),(.310,.067,.760)]
flat_strap("V5_BagContinuousStrap",strap_points,.028,LEATHER,
           lambda t:torso_weight(1.29-.55*abs(2*t-1)))
bevel_box("V5_SatchelBody",(.310,-.006,.674),(.200,.145,.235),LEATHER,"root",.038)
bevel_box("V5_SatchelFlap",(.310,-.091,.713),(.207,.024,.085),LEATHER_LIGHT,"root",.020)
ellipsoid("V5_BagStud",(.310,-.108,.690),(.011,.007,.011),BRASS,"root",6,10)


# Keep an individually editable source, then atlas/merge for the actual game
# asset. Both sources are regenerated by this script.
bpy.ops.wm.save_as_mainfile(filepath=str(EDITABLE_BLEND))
bpy.ops.object.select_all(action="DESELECT")
head.select_set(True)
bpy.context.view_layer.objects.active=head
bpy.ops.object.modifier_apply(modifier=sub.name)


def atlas_merge(label, materials):
    members=[obj for obj in scene.objects if obj.type=="MESH" and obj.active_material in materials]
    if not members:
        return
    grid=math.ceil(math.sqrt(len(materials)))
    size=256
    image=bpy.data.images.new(label+" color atlas",width=size,height=size,alpha=True)
    pixels=[]
    colors=[tuple(mat.diffuse_color[:3]) for mat in materials]
    rng=random.Random(label)
    for y in range(size):
        for x in range(size):
            idx=(y*grid//size)*grid+(x*grid//size)
            color=colors[idx] if idx<len(colors) else (1,1,1)
            weave=.97+.015*math.sin(x*math.pi/2)+.012*math.sin(y*math.pi/2)
            if label=="Denim":
                # Broad irregular painted folds, not a uniform blue tile.
                weave+=.038*math.sin(x*.061+.9*math.sin(y*.029))*math.sin(y*.083)
                weave+=.019*math.sin(y*.19+.5*math.sin(x*.047))
            elif label in ("Hair","Leather"):
                weave+=.020*math.sin(x*.071+y*.043)*math.sin(y*.089)
            noise=rng.uniform(-.009,.009)
            pixels.extend((*(min(1,c*(weave+noise)) for c in color),1))
    image.pixels.foreach_set(pixels)
    image.update()
    image.pack()
    atlas=material(label,(1,1,1),.83)
    tex=atlas.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image=image
    atlas.node_tree.links.new(tex.outputs["Color"],
                              atlas.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
    pad=3/size
    for obj in members:
        index=materials.index(obj.active_material)
        tx,ty=index%grid,index//grid
        uv=obj.data.uv_layers.active
        if uv is None:
            uv=obj.data.uv_layers.new(name="UVMap")
        for entry in uv.data:
            old=entry.uv.copy()
            entry.uv=((tx/grid)+pad+(old.x%1)*(1/grid-2*pad),
                      (ty/grid)+pad+(old.y%1)*(1/grid-2*pad))
        obj.data.materials.clear()
        obj.data.materials.append(atlas)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in members:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=members[0]
    if len(members)>1:
        bpy.ops.object.join()
    members[0].name="V5_Atlas_"+label.replace(" ","_")


for label,materials in [
    ("Skin",[SKIN,SKIN_SHADOW]),
    ("Hair",[HAIR,HAIR_LIGHT]),
    ("Cotton",[SHIRT,SHIRT_SEAM,CUFF]),
    ("Denim",[DENIM,DENIM_LIGHT,DENIM_POCKET,DENIM_DARK]),
    ("Headwear",[CAP,CAP_BRIM]),
    ("Leather",[BOOT,BOOT_LIGHT,SOLE,LEATHER,LEATHER_LIGHT,BRASS]),
    ("Gloves",[GLOVE,GLOVE_DARK]),
    ("Face",[EYE,EYE_HIGHLIGHT,MOUTH,TONGUE]),
]:
    atlas_merge(label,materials)

# Export the exact eight-material geometry used for the review renders.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for obj in scene.objects:
    if obj.type == "MESH":
        obj.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=str(OUT_GLB),export_format="GLB",use_selection=True,
                          export_animations=True,export_animation_mode="NLA_TRACKS",
                          export_skins=True,export_materials="EXPORT",export_yup=True)

scene.render.engine="BLENDER_EEVEE_NEXT"
scene.render.resolution_x=900
scene.render.resolution_y=1080
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
world=bpy.data.worlds.new("V5 studio world")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.46,.46,.46,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.9
scene.world=world


def light(name, location, energy, size):
    data=bpy.data.lights.new(name,"AREA")
    data.energy=energy
    data.shape="DISK"
    data.size=size
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=location
    obj.rotation_euler=(Vector((0,0,.95))-obj.location).to_track_quat("-Z","Y").to_euler()


light("V5 Key",(-3.5,-4,4.6),500,4)
light("V5 Fill",(3.4,-1.2,3.6),270,3)
light("V5 Rim",(1.2,3.2,3.6),320,3)
cam_data=bpy.data.cameras.new("V5 camera")
cam=bpy.data.objects.new("V5 camera",cam_data)
scene.collection.objects.link(cam)
scene.camera=cam
cam_data.type="ORTHO"


def render(name, location, scale):
    cam.location=location
    cam.rotation_euler=(Vector((0,0,.96))-cam.location).to_track_quat("-Z","Y").to_euler()
    cam_data.ortho_scale=scale
    scene.render.filepath=str(PREVIEW/(name+".png"))
    bpy.ops.render.render(write_still=True)


for name,location,scale in [
    ("front",(0,-4.8,1.04),2.24),("left",(-4.8,0,1.04),2.24),
    ("back",(0,4.8,1.04),2.24),("three-quarter",(2.9,-4.1,1.48),2.24),
    ("gameplay",(3.2,-4.1,4.2),3.12),
]:
    render(name,location,scale)
rig.animation_data.action=bpy.data.actions["Walk"]
scene.frame_set(7)
render("walk-pose",(3.2,-4.1,4.2),3.12)
for action_name in ("Idle","Run","Interact","Wave","Hoe","Watering","Harvest"):
    action=bpy.data.actions[action_name]
    rig.animation_data.action=action
    scene.frame_set(round((action.frame_range[0]+action.frame_range[1])/2))
    render(action_name.lower()+"-pose",(3.2,-4.1,4.2),3.12)
rig.animation_data.action=None
scene.frame_set(1)

summary={
    "kind":"original editable skinned 3D character; PS2-era farming-game style candidate",
    "blend":str(OUT_BLEND.relative_to(ROOT)),
    "editableBlend":str(EDITABLE_BLEND.relative_to(ROOT)),
    "glb":str(OUT_GLB.relative_to(ROOT)),
    "views":[str(p.relative_to(ROOT)) for p in sorted(PREVIEW.glob("*.png"))],
    "meshObjects":len([o for o in scene.objects if o.type=="MESH"]),
    "materialCount":len({o.active_material for o in scene.objects if o.type=="MESH"}),
    "triangles":sum(len(p.vertices)-2 for o in scene.objects if o.type=="MESH" for p in o.data.polygons),
    "bones":len(rig.data.bones),"actions":sorted(a.name for a in bpy.data.actions),
    "liveAssetChanged":False,
}
REPORT.write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
print("SEMESTA_V5_PS2_STYLE",json.dumps(summary))
