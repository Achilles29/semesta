"""V8 body + a gameplay-scale JRPG face. No commercial model extraction.

Blender 4.5 LTS --background -t 4 --python <this file>
"""
import json
import math
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector, Matrix

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
NAME='farmer-v9-friendly-face'
bpy.ops.wm.open_mainfile(filepath=str(HERE.parent/'farmer-v8-modular/farmer-v8-modular.blend'))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene
rig=bpy.data.objects['SemestaV2_Rig']
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=True
for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
scene.frame_set(1)
rig['faceRevision']='v9-jrpg-friendly'

# Keep the entire approved body, hands, outfit, boots, hair and attachment slots.
# Only the old adult head/neck and protruding eyeballs are replaced.
body=bpy.data.objects['Body_Skin']
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,
    plane_co=(0,0,1.480),plane_no=(0,0,1),clear_outer=True)
bm.to_mesh(body.data);bm.free();body.data.update()
for o in list(bpy.data.objects):
    if o.name.startswith(('Eye_White_','Eye_Iris_')):bpy.data.objects.remove(o,do_unlink=True)
SKIN=bpy.data.materials['V8_skin'];HAIR=bpy.data.materials['V8_hair']

def material(name,rgb):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Roughness'].default_value=.86
    return m
WHITE=material('Face_SoftIvory',(.87,.89,.84))
OUTLINE=material('Face_WarmInk',(.040,.025,.025))
IRIS=material('Face_TealIris',(.035,.25,.28))
IRISLIGHT=material('Face_IrisLowerLight',(.10,.44,.45))
PUPIL=material('Face_Pupil',(.009,.019,.023))
HIGHLIGHT=material('Face_EyeCatchlight',(.98,.99,.97))
MOUTH=material('Face_Smile',(.20,.081,.047))

def mesh(name,vertices,faces,mat,neck=False):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update();data.materials.append(mat)
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.parent=rig
    obj.modifiers.new('Shared V8 skeleton','ARMATURE').object=rig
    head=obj.vertex_groups.new(name='head');neckgroup=obj.vertex_groups.new(name='neck')
    for v in data.vertices:
        h=max(0,min(1,(v.co.z-1.44)/.06)) if neck else 1
        if h:head.add([v.index],h,'REPLACE')
        if h<1:neckgroup.add([v.index],1-h,'REPLACE')
    uv=data.uv_layers.new(name='FaceProjection')
    for poly in data.polygons:
        poly.use_smooth=True
        for loop in poly.loop_indices:
            p=data.vertices[data.loops[loop].vertex_index].co
            uv.data[loop].uv=(.5+p.x/.48,(p.z-1.43)/.49)
    return obj

# Continuous neck/chin/cheek/cranium surface, not a sphere with eyes glued on.
# z, width, front depth, back depth. Smaller jaw and nose; no adult lip folds.
profile=[(1.431,.083,.078,.078),(1.455,.072,.071,.076),
  (1.478,.061,.086,.085),(1.495,.079,.109,.100),
  (1.525,.119,.140,.119),(1.570,.157,.162,.138),
  (1.620,.179,.173,.150),(1.680,.186,.180,.158),
  (1.740,.185,.181,.165),(1.795,.181,.178,.164),
  (1.835,.146,.141,.130),(1.865,.087,.082,.079),(1.887,.005,.005,.005)]

def shape(z):
    z=max(profile[0][0],min(profile[-1][0],z))
    for i in range(len(profile)-1):
        a,b=profile[i],profile[i+1]
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0]);p=profile[max(i-1,0)];q=profile[min(i+2,len(profile)-1)]
            # Cubic Hermite using neighbouring z-aware secants.
            out=[]
            for j in range(1,4):
                m0=(b[j]-p[j])/(b[0]-p[0])*(b[0]-a[0]);m1=(q[j]-a[j])/(q[0]-a[0])*(b[0]-a[0])
                out.append((2*t**3-3*t*t+1)*a[j]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[j]+(t**3-t*t)*m1)
            return out
    return profile[-1][1:]

def front_y(x,z):
    width,depth,_=shape(z)
    curved=math.sqrt(max(.001,1-(x/width)**2))
    # Integrated small wedge/button nose, without dark nostrils or realistic lips.
    nose=.019*math.exp(-(x/.022)**2-((z-1.617)/.026)**2)
    cheek=.004*math.exp(-((abs(x)-.085)/.065)**2-((z-1.60)/.045)**2)
    return -depth*curved-nose-cheek

for v in body.data.vertices:
    if v.co.z<1.441:continue
    z=v.co.z;rx,fd,bd=shape(z)
    angle=math.atan2(v.co.y,v.co.x)
    target=Vector((rx*math.cos(angle),(fd if v.co.y<0 else bd)*math.sin(angle),z))
    t=max(0,min(1,(z-1.441)/.034));t=t*t*(3-2*t)
    v.co=v.co.lerp(target,t)
    for group in body.vertex_groups:group.remove([v.index])
    h=max(0,min(1,(z-1.44)/.06))
    body.vertex_groups['head'].add([v.index],h,'REPLACE')
    body.vertex_groups['neck'].add([v.index],1-h,'REPLACE')
body.data.update()

boundary=[v.co.copy() for v in body.data.vertices if abs(v.co.z-1.480)<.00001]
rx,fd,bd=shape(1.480)
boundary.sort(key=lambda p:math.atan2(p.y/(fd if p.y<0 else bd),p.x/rx)%(2*math.pi))
angles=[math.atan2(p.y/(fd if p.y<0 else bd),p.x/rx)%(2*math.pi) for p in boundary]
assert len(boundary)>12,'Expected a single authored neck boundary'
verts=[];faces=[];n=len(boundary);rows=48
for i in range(rows+1):
    z=1.480+(1.887-1.480)*i/rows;rx,front,back=shape(z)
    for j in range(n):
        a=angles[j];x=rx*math.cos(a)
        y=front_y(x,z) if math.sin(a)<0 else back*math.sin(a)
        verts.append(tuple(boundary[j]) if i==0 else (x,y,z))
for i in range(rows):
    for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
faces.append(tuple(rows*n+j for j in range(n)))
head=mesh('Face_HeadNeck',verts,faces,SKIN,neck=True)
# Weld the exact shared neck loop: no overlapping surfaces/z-fighting seam.
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);head.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm,verts=[v for v in bm.verts if abs(v.co.z-1.480)<.00001],dist=.00002)
bm.to_mesh(body.data);bm.free();body.data.update()

# The old scalp/cap were fitted to the adult cranium. Fit their inner envelope
# to the new head as well, including the no-hat option (verified in WebGL).
for object_name,clearance in [('Hair_Scalp',1.075),('Headwear_BackwardCap',1.12)]:
    obj=bpy.data.objects[object_name]
    for v in obj.data.vertices:
        x,y,z=v.co
        if not 1.74<z<1.885:continue
        rx,front,back=shape(z);depth=front if y<0 else back
        distance=math.sqrt((x/rx)**2+(y/depth)**2)
        if 0<distance<clearance:
            v.co.x*=clearance/distance;v.co.y*=clearance/distance
    obj.data.update()
cap=bpy.data.objects['Headwear_BackwardCap']
for v in cap.data.vertices:
    v.co.x*=1.06;v.co.y*=1.06;v.co.z+=.005
cap.data.update()

def patch(name,cx,cz,rx,rz,mat,offset=.0015,almond=False,slant=0):
    # A thin conforming surface: eye silhouette follows the cheek curvature.
    n=32;rings=3;v=[(cx,front_y(cx,cz)-offset,cz)]
    for k in range(1,rings+1):
        r=k/rings
        for j in range(n):
            a=2*math.pi*j/n;dx=rx*math.cos(a)*r
            dz=rz*math.sin(a)*r
            if almond:dz*=.73+.27*abs(math.sin(a))
            z=cz+dz+slant*dx/rx;x=cx+dx
            v.append((x,front_y(x,z)-offset,z))
    f=[(0,1+(j+1)%n,1+j) for j in range(n)]
    for k in range(rings-1):
        for j in range(n):
            a=1+k*n+j;b=1+k*n+(j+1)%n
            f.append((a,b,b+n,a+n))
    return mesh(name,v,f,mat)

def stroke(name,path,width,mat,offset=.002):
    v=[]
    for i,(x,z) in enumerate(path):
        # Taper ends; no thick lipstick or deep mouth cavity.
        w=width*(.35+.65*math.sin(math.pi*i/(len(path)-1))**.5)
        for zz in [z-w/2,z+w/2]:v.append((x,front_y(x,zz)-offset,zz))
    return mesh(name,v,[(2*i,2*i+2,2*i+3,2*i+1) for i in range(len(path)-1)],mat)

for sign,side in [(1,'L'),(-1,'R')]:
    cx=sign*.073;cz=1.680
    patch('Face_EyeOutline_'+side,cx,cz,.047,.034,OUTLINE,almond=True,slant=sign*.005)
    patch('Face_EyeWhite_'+side,cx,cz-.001,.043,.030,WHITE,.002,True,sign*.005)
    patch('Face_Iris_'+side,cx-sign*.003,cz,.021,.028,IRIS,.0025)
    patch('Face_IrisGlow_'+side,cx-sign*.003,cz-.017,.014,.008,IRISLIGHT,.003)
    patch('Face_Pupil_'+side,cx-sign*.003,cz+.001,.009,.021,PUPIL,.0035)
    patch('Face_Highlight_'+side,cx-.007,cz+.013,.006,.007,HIGHLIGHT,.004)
    eyebrow=[(cx+sign*(-.039+.077*t),1.731+.010*math.sin(math.pi*t)+.004*t) for t in [i/16 for i in range(17)]]
    stroke('Face_Brow_'+side,eyebrow,.007,HAIR,.002)
mouth=[(-.047+.094*t,1.551+.009*(2*t-1)**2+.002*t) for t in [i/24 for i in range(25)]]
stroke('Face_Smile',mouth,.0035,MOUTH)

# Small stylized ears use the same skin material, so they cannot retain the old
# skin tone when the player changes complexion.
for sign,side in [(1,'L'),(-1,'R')]:
    v=[];f=[];n=24;m=12
    for i in range(m+1):
        p=math.pi*i/m
        for j in range(n):
            a=2*math.pi*j/n
            v.append((sign*(.182+.026*math.sin(p)*math.cos(a)),.002+.021*math.sin(p)*math.sin(a),1.644+.047*math.cos(p)))
    for i in range(m):
        for j in range(n):f.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    # Mirroring positions also flips winding on the right ear.
    if sign<0:f=[tuple(reversed(p)) for p in f]
    mesh('Face_Ear_'+side,v,f,SKIN)

# One mesh per facial material, retaining skin weights and UVs. The expression
# layers stay editable, but do not each add a separate runtime draw call.
for mat in [SKIN,HAIR,WHITE,OUTLINE,IRIS,IRISLIGHT,PUPIL,HIGHLIGHT,MOUTH]:
    objects=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('Face_')
             and o.name!='Face_HeadNeck' and o.data.materials[0]==mat]
    if len(objects)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()

def rest():
    rig.animation_data.action=None
    for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
    scene.frame_set(1);bpy.context.view_layer.update()

def configure(tee=False):
    for obj in scene.objects:
        slot=obj.get('avatarSlot');choice=obj.get('avatarChoice');visible=True
        if slot=='gloves':visible=choice==('none' if tee else 'work')
        elif slot in ['outfit','headwear','accessory']:visible=not tee
        obj.hide_set(not visible);obj.hide_render=not visible

camera=scene.camera
scene.render.resolution_x=800;scene.render.resolution_y=1000
def render(name,loc,target=(0,0,.95),scale=2.10):
    camera.data.ortho_scale=scale;camera.location=loc
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(HERE/(name+'.png'));bpy.ops.render.render(write_still=True)

rest();configure()
for name,loc in [('front',(0,-5,.95)),('left',(-5,0,.95)),('back',(0,5,.95)),('three-quarter',(2.8,-4.1,1.6))]:render(name,loc)
render('face-front',(0,-4,1.685),(0,0,1.685),.60)
render('face-three-quarter',(2,-4,1.71),(0,0,1.685),.60)
render('face-left',(-4,0,1.685),(0,0,1.685),.60)
configure(tee=True);render('variant-tee-no-accessories',(2.8,-4.1,1.6))
old=tuple(SKIN.diffuse_color);c=(.19,.085,.045,1)
SKIN.diffuse_color=c;SKIN.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=c
render('variant-dark-skin',(0,-5,.95))
SKIN.diffuse_color=old;SKIN.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=old
configure()
for action,frame in [('Walk',7),('Run',7),('Hoe',8),('Wave',14)]:
    rest();rig.animation_data.action=bpy.data.actions[action];scene.frame_set(frame);render('pose-'+action.lower(),(2.8,-4.1,1.6))
rest();configure();camera.data.ortho_scale=2.10
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/(NAME+'.blend')))
for obj in scene.objects:obj.hide_set(False);obj.hide_render=False
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in scene.objects:
    if obj.type=='MESH':obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(HERE/(NAME+'.glb')),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_yup=True)
report={'faceRevision':'v9-jrpg-friendly','contract':'semesta-farmer-v8-legacy19',
 'reference':'Local Zidane FF9 / Cloud FF7 gameplay turnaround sheets; stylistic reference, not extracted meshes',
 'preserved':'V8 CC0 body, torso/head scale envelope, hair, clothes, boots, customization slots, legacy19 rig and eight clips',
 'changed':'Continuous stylized head/neck, small integrated nose, conforming almond eyes, teal irises, brows and subtle smile',
 'defaultGameChanged':False}
(HERE/'build-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
