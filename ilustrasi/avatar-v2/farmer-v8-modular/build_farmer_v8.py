"""CC0 body refinement + explicit swappable slots, Blender 4.5 LTS.

Run from repository root with Blender --background -t 4 --python <this file>.
No downloads. The V6 authored CC0 topology is preserved; V5 primitive body is not used.
"""
import json
import math
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
NAME = 'farmer-v8-modular'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'ilustrasi/avatar-v2/farmer-v6-mesh-study/farmer-v6-cc0-base-study.blend'))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rig = bpy.data.objects['SemestaV2_Rig']
body = bpy.data.objects['V6_BlenderStudio_CC0_StylizedBody']
for obj in list(bpy.data.objects):
    if obj not in (rig, body): bpy.data.objects.remove(obj, do_unlink=True)
rig['avatarContract'] = 'semesta-farmer-v8-legacy19'
rig.animation_data.action = None
for track in rig.animation_data.nla_tracks: track.mute = True
for bone in rig.pose.bones: bone.matrix_basis = Matrix.Identity(4)
scene.frame_set(1)

def smooth(a,b,x):
    t = max(0.,min(1.,(x-a)/(b-a)))
    return t*t*(3-2*t)

def morph(p):
    x,y,z = p
    h = smooth(1.39,1.53,z)
    bulk = smooth(.70,.90,z)*(1-smooth(1.30,1.43,z))*(1-smooth(.19,.31,abs(x)))
    x *= (1+.09*bulk)*(1-.08*h)
    y = -.018+(y+.018)*(1+.12*bulk)*(1-.08*h)
    z = 1.43+(z-1.43)*(1-.08*h)
    if .30<z<.81 and abs(x)<.21:
        side=1 if x>=0 else -1
        x=side*.10+(x-side*.10)*1.08
        y*=1.09
        tuck=1-smooth(.30,.40,z)
        x=side*.10+(x-side*.10)*(1-.17*tuck)
        y=.018+(y-.018)*(1-.18*tuck)
    return Vector((x,y,z))

for v in body.data.vertices: v.co = morph(v.co)
body.data.update()

# Match pivots to the approved CC0 body, not the much wider V5 mannequin.
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for side,sign in [('L',1),('R',-1)]:
    coords={
      'clavicle':((.10,0,1.31),(.255,0,1.31)),
      'upper_arm':((.255,0,1.31),(.351,-.02,1.075)),
      'forearm':((.351,-.02,1.075),(.392,-.035,.855)),
      'hand':((.392,-.035,.855),(.40,-.055,.735)),
      'thigh':((.10,0,.78),(.102,-.012,.46)),
      'calf':((.102,-.012,.46),(.10,.015,.145)),
      'foot':((.10,.015,.145),(.10,-.12,.065)),
    }
    for name,(head,tail) in coords.items():
        b=rig.data.edit_bones[f'{name}.{side}']; b.use_connect=False
        b.head=(sign*head[0],head[1],head[2]); b.tail=(sign*tail[0],tail[1],tail[2])
bpy.ops.object.mode_set(mode='OBJECT')

def mat(name,color):
    m=bpy.data.materials.new('V8_'+name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.82
    m['avatarColor']=name
    return m
SKIN=mat('skin',(.56,.32,.17)); HAIR=mat('hair',(.065,.027,.012))
SHIRT=mat('shirt',(.72,.69,.59)); PANTS=mat('trousers',(.036,.074,.19))
BOOT=mat('footwear',(.16,.074,.028)); SOLE=mat('sole',(.034,.026,.020))
GLOVE=mat('gloves',(.35,.018,.018)); CAP=mat('headwear',(.035,.070,.20))
BRIM=mat('brim',(.42,.29,.06)); BAG=mat('pack',(.19,.078,.026))
BRASS=mat('brass',(.63,.39,.09)); WHITE=mat('sclera',(.84,.80,.70)); EYE=mat('iris',(.042,.022,.012))

def weights(p):
    x,y,z=p; ax=abs(x); side='L' if x>0 else 'R'
    if z>1.40:
        h=smooth(1.39,1.49,z); return {'head':h,'neck':1-h}
    if ax>.22 and z>.64:
        shoulder=smooth(.21,.28,ax)
        elbow=1-smooth(1.01,1.14,z)
        wrist=1-smooth(.815,.895,z)
        return {'chest':1-shoulder,f'upper_arm.{side}':shoulder*(1-elbow),
                f'forearm.{side}':shoulder*elbow*(1-wrist),f'hand.{side}':shoulder*elbow*wrist}
    if z<.86:
        midline=1-(1-smooth(.012,.07,ax))*smooth(.60,.72,z)
        hip=(1-smooth(.70,.87,z))*midline
        knee=1-smooth(.40,.52,z); ankle=1-smooth(.15,.25,z)
        return {'root':1-hip,f'thigh.{side}':hip*(1-knee),f'calf.{side}':hip*knee*(1-ankle),f'foot.{side}':hip*knee*ankle}
    chest=smooth(1.0,1.23,z); neck=smooth(1.32,1.43,z); root=1-smooth(.82,.94,z)
    return {'root':root,'spine':(1-root)*(1-chest),'chest':(1-root)*chest*(1-neck),'neck':(1-root)*chest*neck}

def skin_object(obj,bone=None,weight_fn=None):
    obj.parent=rig
    obj.vertex_groups.clear()
    groups={n:obj.vertex_groups.new(name=n) for n in rig.data.bones.keys()}
    for v in obj.data.vertices:
        w={bone:1.} if bone else (weight_fn or weights)(v.co)
        total=sum(w.values())
        for n,a in w.items():
            if a>1e-7: groups[n].add([v.index],a/total,'REPLACE')
    for mod in list(obj.modifiers): obj.modifiers.remove(mod)
    obj.modifiers.new('Shared skeleton','ARMATURE').object=rig

def mesh(name,verts,faces,material,bone=None,slot=None,choice=None,weight_fn=None):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();data.materials.append(material)
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj)
    for p in data.polygons:p.use_smooth=True
    if slot:obj['avatarSlot']=slot;obj['avatarChoice']=choice
    skin_object(obj,bone,weight_fn)
    return obj

# Cut clean horizontal garment boundaries into the original topology; no jagged
# face-centre paint edge. Hidden feet are not exported under closed boots.
bm=bmesh.new();bm.from_mesh(body.data)
for z in [.30,.82,.86,1.08,1.44]:
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,z),plane_no=(0,0,1))
bm.to_mesh(body.data);bm.free();body.data.update()
regions={'skin':[],'shirt':[],'trousers':[],'hands':[]}
for f in body.data.polygons:
    x,y,z=f.center;ax=abs(x)
    if z<.30:continue
    if ax>.29 and z<.82:region='hands'
    elif z<.86 and ax<.25:region='trousers'
    elif z<1.44 and (ax<.23 or z>1.08):region='shirt'
    else:region='skin'
    regions[region].append(f)

def extract(name,faces,material,slot=None,choice=None):
    ids=sorted({i for f in faces for i in f.vertices});mapping={n:i for i,n in enumerate(ids)}
    verts=[tuple(body.data.vertices[i].co) for i in ids]
    obj=mesh(name,verts,[tuple(mapping[i] for i in f.vertices) for f in faces],material,slot=slot,choice=choice)
    # Preserve authored UVs for future garment textures.
    uvsrc=body.data.uv_layers.active
    if uvsrc:
        uv=obj.data.uv_layers.new(name='UVMap')
        for dst,src in zip(obj.data.polygons,faces):
            for a,b in zip(dst.loop_indices,src.loop_indices):uv.data[a].uv=uvsrc.data[b].uv
    return obj

body_surface=BVHTree.FromPolygons([v.co for v in body.data.vertices],[list(f.vertices) for f in body.data.polygons])

def on_body(p,front=True,offset=.012):
    x,y,z=p;origin=(x,-1 if front else 1,z);direction=(0,1 if front else -1,0)
    hit,normal,_,_=body_surface.ray_cast(Vector(origin),Vector(direction))
    if hit is None:return (x,y,z)
    return (x,hit.y+(-offset if front else offset),z)

def bib_width(z,desired):
    # Stay inside the torso silhouette at its narrow waist. A missing ray is
    # not permission to leave a rectangular floating flap beside the garment.
    width=desired
    while width>.04:
        a=body_surface.ray_cast(Vector((width,-1,z)),Vector((0,1,0)))[0]
        b=body_surface.ray_cast(Vector((-width,-1,z)),Vector((0,1,0)))[0]
        if a is not None and b is not None:break
        width-=.003
    return width*.84

extract('Body_Skin',regions['skin'],SKIN)
extract('Garment_Shirt',regions['shirt'],SHIRT)
extract('Garment_Trousers',regions['trousers'],PANTS)
extract('Hands_Bare',regions['hands'],SKIN,'gloves','none')
extract('Hands_WorkGloves',regions['hands'],GLOVE,'gloves','work')
bpy.data.objects.remove(body,do_unlink=True)

def loft(name,rings,material,bone=None,slot=None,choice=None,weight_fn=None,n=32):
    # rings are (cx,cy,z,rx,ry); open upper cuff is intentional.
    verts=[(cx+rx*math.cos(j*2*math.pi/n),cy+ry*math.sin(j*2*math.pi/n),z) for cx,cy,z,rx,ry in rings for j in range(n)]
    faces=[tuple(reversed(range(n)))]+[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(rings)-1) for j in range(n)]
    return mesh(name,verts,faces,material,bone,slot,choice,weight_fn)

def boot_weights(p):
    side='L' if p.x>0 else 'R'; calf=smooth(.15,.25,p.z)
    return {f'calf.{side}':calf,f'foot.{side}':1-calf}

for side,sign in [('L',1),('R',-1)]:
    x=sign*.101
    loft('Boot_Upper_'+side,[(x,-.047,.035,.076,.125),(x,-.047,.065,.076,.125),
      (x,-.045,.10,.074,.118),(x,-.020,.145,.065,.09),(x,.014,.20,.063,.065),
      (x,.018,.285,.069,.076),(x,.018,.333,.071,.079),
      (x,.018,.333,.065,.073),(x,.018,.315,.065,.073)],BOOT,weight_fn=boot_weights)
    loft('Boot_Sole_'+side,[(x,-.047,.012,.077,.126),(x,-.047,.030,.079,.128),
      (x,-.047,.043,.076,.125)],SOLE,weight_fn=boot_weights)
    loft('Trouser_Cuff_'+side,[(x,.018,.326,.063,.071),(x,.018,.345,.063,.070),
      (x,.018,.357,.062,.069)],PANTS,weight_fn=boot_weights)

def ribbon(name,path,width,material,bone=None,slot=None,choice=None,project=False):
    verts=[]
    if project:
        path=[tuple(Vector(a).lerp(Vector(b),i/6)) for a,b in zip(path,path[1:]) for i in range(6)]+[path[-1]]
    for x,y,z in path:verts.extend([(x-width/2,y,z),(x+width/2,y,z)])
    if project:verts=[on_body(p,front=p[1]<0,offset=.017) for p in verts]
    obj=mesh(name,verts,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(path)-1)],material,bone,slot,choice)
    sol=obj.modifiers.new('Fabric thickness','SOLIDIFY');sol.thickness=.004
    return obj

# Real removable overall bib, following the widened chest rather than floating
# straps. Removing this slot reveals a complete T-shirt, not a hole in the body.
rows=[(.855+i*.370/24,.145-.017*smooth(1.14,1.225,.855+i*.370/24),-.15) for i in range(25)]
verts=[]
for z,w,y in rows:
    w=bib_width(z,w)
    for j in range(25):
        x=-w+2*w*j/24;verts.append(on_body((x,y,z)))
mesh('Outfit_Overalls_Bib',verts,[(i*25+j,i*25+j+1,(i+1)*25+j+1,(i+1)*25+j) for i in range(len(rows)-1) for j in range(24)],PANTS,slot='outfit',choice='overalls')
for sign,side in [(1,'L'),(-1,'R')]:
    ribbon('Outfit_Overalls_Strap_'+side,[(sign*.116,-.131,1.20),(sign*.15,-.123,1.31),
      (sign*.177,-.075,1.375),(sign*.177,.035,1.39),(sign*.15,.104,1.31),(sign*.12,.111,1.12)],.038,PANTS,slot='outfit',choice='overalls',project=True)
backverts=[on_body(((-1+2*j/24)*bib_width(.855+i*.345/24,.14-.02*smooth(1.1,1.2,.855+i*.345/24)),.1,.855+i*.345/24),front=False) for i in range(25) for j in range(25)]
mesh('Outfit_Overalls_Back',backverts,[(i*25+j,(i+1)*25+j,(i+1)*25+j+1,i*25+j+1) for i in range(24) for j in range(24)],PANTS,slot='outfit',choice='overalls')

def ellipsoid(name,center,radii,material,bone,slot=None,choice=None,transform=False):
    n=24;m=16
    verts=[(center[0],center[1],center[2]+radii[2])]
    for i in range(1,m):
        p=math.pi*i/m
        for j in range(n):
            a=j*2*math.pi/n;verts.append((center[0]+radii[0]*math.sin(p)*math.cos(a),center[1]+radii[1]*math.sin(p)*math.sin(a),center[2]+radii[2]*math.cos(p)))
    bottom=len(verts);verts.append((center[0],center[1],center[2]-radii[2]))
    faces=[(0,1+j,1+(j+1)%n) for j in range(n)]
    faces += [(1+i*n+j,1+(i+1)*n+j,1+(i+1)*n+(j+1)%n,1+i*n+(j+1)%n) for i in range(m-2) for j in range(n)]
    faces += [(bottom,1+(m-2)*n+(j+1)%n,1+(m-2)*n+j) for j in range(n)]
    if transform:verts=[morph(p) for p in verts]
    return mesh(name,verts,faces,material,bone,slot,choice)

# Eyes remain aligned with the original CC0 sockets, and shrink with the head.
for sign,side in [(1,'L'),(-1,'R')]:
    ellipsoid('Eye_White_'+side,(sign*.085,-.200,1.69),(.032,.012,.021),WHITE,'head',transform=True)
    ellipsoid('Eye_Iris_'+side,(sign*.085,-.212,1.69),(.013,.003,.017),EYE,'head',transform=True)

# A continuous scalp + swept, volumetric locks: no painted ears or row of
# disconnected rear spikes. Hair remains a complete object set with the hat off.
verts=[];faces=[];segments=48;rows=12
for i in range(rows+1):
    for j in range(segments):
        a=2*math.pi*j/segments
        back=(math.sin(a)+1)/2
        phi=(.02+(1.18+1.18*back)*i/rows)
        p=(.224*math.sin(phi)*math.cos(a),-.018+.219*math.sin(phi)*math.sin(a),1.715+.223*math.cos(phi))
        verts.append(morph(p))
for i in range(rows):
    for j in range(segments):
        k=i*segments+j;q=i*segments+(j+1)%segments
        faces.append((k,q,q+segments,k+segments))
mesh('Hair_Scalp',verts,faces,HAIR,'head','hair','short')

def lock(name,path,width,depth):
    verts=[];faces=[];n=8
    for i,p in enumerate(path):
        p=Vector(p);t=i/(len(path)-1)
        tangent=Vector(path[min(i+1,len(path)-1)])-Vector(path[max(i-1,0)])
        tangent.normalize();normal=Vector((p.x,p.y+.01,0)).normalized()
        u=tangent.cross(normal).normalized();v=u.cross(tangent).normalized()
        taper=(1-t)**.6*(.38+.56*math.sin(math.pi*t))+.035
        for j in range(n):
            a=2*math.pi*j/n;verts.append(morph(p+u*(math.cos(a)*width*taper)+v*(math.sin(a)*depth*taper)))
    for i in range(len(path)-1):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    faces.extend([tuple(reversed(range(n))),tuple((len(path)-1)*n+j for j in range(n))])
    mesh(name,verts,faces,HAIR,'head','hair','short')

for j in range(11):
    a=.05+j*math.pi/10; sway=.10*math.sin(j*2.7)
    tip=1.55+.024*math.sin(j*1.9)
    path=[]
    for i in range(7):
        t=i/6;ang=a+sway*t;r=.207+.025*math.sin(t*math.pi)
        path.append((r*math.cos(ang),-.008+r*math.sin(ang),1.79+(tip-1.79)*t))
    lock(f'Hair_BackSweep_{j:02}',path,.047,.023)
for j,(x,end,tip) in enumerate([(-.145,-.08,1.735),(-.06,.035,1.718),(.045,.13,1.748)]):
    path=[(x+(end-x)*t,-.195-.028*math.sin(t*math.pi*.7),1.815+(tip-1.815)*t) for t in [i/7 for i in range(8)]]
    lock(f'Hair_Fringe_{j}',path,.052,.024)
for sign,side in [(1,'L'),(-1,'R')]:
    lock('Hair_Temple_'+side,[(sign*.185,-.07,1.80),(sign*.209,-.084,1.74),(sign*.205,-.081,1.67),(sign*.191,-.064,1.61)],.035,.016)

# Backward cap, independent slot with a real two-dimensional visor.
verts=[];faces=[];n=40
for t,r in [(0,1),(.27,.96),(.55,.80),(.8,.55),(1,.02)]:
    for j in range(n):
        a=j*2*math.pi/n;hem=1.79-.035*math.sin(a)
        verts.append(morph((.224*r*math.cos(a),.204*r*math.sin(a),hem+t*(1.951-hem))))
for i in range(4):
    for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
mesh('Headwear_BackwardCap',verts,faces,CAP,'head','headwear','cap')
verts=[]
for i in range(17):
    a=math.pi*i/16
    for r in [1,1.43]:verts.append(morph((.203*math.cos(a),.147*math.sin(a)*r+.025,1.758-.017*math.sin(a)*(r-1))))
visor=mesh('Headwear_Visor',verts,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(16)],BRIM,'head','headwear','cap')
visor.modifiers.new('Visor thickness','SOLIDIFY').thickness=.008

ribbon('Accessory_SatchelStrap',[(-.145,-.137,1.34),(-.08,-.182,1.20),(.025,-.172,1.04),(.14,-.149,.86),(.23,-.107,.77)],.028,BAG,slot='accessory',choice='satchel')
ellipsoid('Accessory_Satchel',(.242,-.060,.744),(.086,.055,.104),BAG,'root','accessory','satchel')
ellipsoid('Accessory_Button',(.242,-.116,.77),(.009,.006,.009),BRASS,'root','accessory','satchel')

def configure(outfit='overalls',hat=True,bag=True,gloves=True):
    for obj in scene.objects:
        slot=obj.get('avatarSlot');choice=obj.get('avatarChoice');visible=True
        if slot=='outfit':visible=outfit==choice
        elif slot=='headwear':visible=hat
        elif slot=='accessory':visible=bag
        elif slot=='gloves':visible=choice==('work' if gloves else 'none')
        obj.hide_render=not visible
        obj.hide_set(not visible)

scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=800;scene.render.resolution_y=1000
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('V8 studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.38,.38,.38,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55;scene.world=world
for name,loc,energy,size in [('key',(-3,-4,4.5),400,4),('fill',(3,-1,3),200,3),('rim',(1,3,4),280,3)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('V8 camera');camera=bpy.data.objects.new('V8 camera',cam);scene.collection.objects.link(camera);scene.camera=camera
cam.type='ORTHO';cam.ortho_scale=2.10

def rest():
    rig.animation_data.action=None
    for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
    scene.frame_set(1);bpy.context.view_layer.update()

def render(name,loc):
    camera.location=loc;camera.rotation_euler=(Vector((0,0,.95))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(HERE/(name+'.png'));bpy.ops.render.render(write_still=True)

configure();rest()
for view,loc in [('front',(0,-5,.95)),('left',(-5,0,.95)),('back',(0,5,.95)),('three-quarter',(2.8,-4.1,1.6))]:render(view,loc)
configure(outfit='tee',hat=False,bag=False,gloves=False)
render('variant-tee-no-accessories',(2.8,-4.1,1.6))
saved=[(m,tuple(m.diffuse_color)) for m in [SKIN,SHIRT,PANTS,HAIR]]
for m,c in [(SKIN,(.19,.085,.045,1)),(SHIRT,(.04,.24,.16,1)),(PANTS,(.22,.15,.075,1)),(HAIR,(.021,.013,.009,1))]:
    m.diffuse_color=c;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=c
render('variant-colors',(0,-5,.95))
for m,c in saved:m.diffuse_color=c;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=c
configure()
for action,frame in [('Walk',7),('Run',7),('Hoe',8),('Wave',14)]:
    rest();rig.animation_data.action=bpy.data.actions[action];scene.frame_set(frame);render('pose-'+action.lower(),(2.8,-4.1,1.6))
rest();configure()
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/(NAME+'.blend')))
# Export ALL slots; Blender visibility is not a glTF visibility contract.
for obj in scene.objects:
    obj.hide_set(False);obj.hide_render=False
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in scene.objects:
    if obj.type=='MESH':obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(HERE/(NAME+'.glb')),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_yup=True)
report={'contract':'semesta-farmer-v8-legacy19','source':'Blender Studio CC0 topology from V6',
    'headScale':.92,'torsoWidthScale':1.09,'torsoDepthScale':1.12,'outfits':['overalls','tee'],
    'slots':{'headwear':['cap','none'],'accessory':['satchel','none'],'gloves':['work','none'],'hair':['short','none']},
    'colorChannels':['skin','hair','shirt','trousers','footwear','gloves','headwear','pack'],
    'bones':len(rig.data.bones),'meshes':len([o for o in scene.objects if o.type=='MESH']),
    'note':'Dedicated legacy19 contract, not the draft humanoid-v2 skeleton. Body morphology is fixed; slots and colors are runtime selectable.'}
(HERE/'build-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
