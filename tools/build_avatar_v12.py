"""Editable V12 candidate, derived from the local V11 CC0 wardrobe.
Run Blender 4.5: blender -b -t 4 --python tools/build_avatar_v12.py
Only writes the new candidate directory. No network or production replacement.
"""
import argparse, ast, json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'ilustrasi/avatar-v2/farmer-v12-expression'
OUT.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--views',default='front,three-quarter,face,side,back,smile,blink,speech')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'ilustrasi/avatar-v2/farmer-v11-body-wardrobe/farmer-v11-body-wardrobe.blend'))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;rig=bpy.data.objects['SemestaV2_Rig'];camera=scene.camera
rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
scene.frame_set(1)
for o in scene.objects:
    o.hide_set(False);o.hide_render=False
    if o.type=='MESH' and o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks:k.value=0

def helpers(file,names):
    tree=ast.parse((ROOT/file).read_text(encoding='utf-8'))
    ns=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names]
    exec(compile(ast.Module(body=ns,type_ignores=[]),file,'exec'),globals())
helpers('ilustrasi/avatar-v2/farmer-v8-modular/build_farmer_v8.py',['smooth','weights','skin_object','mesh'])
tree=ast.parse((ROOT/'ilustrasi/avatar-v2/farmer-v9-friendly-face/build_farmer_v9.py').read_text(encoding='utf-8'))
profile=ast.literal_eval(next(n.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='profile' for t in n.targets)))
helpers('ilustrasi/avatar-v2/farmer-v9-friendly-face/build_farmer_v9.py',['shape','front_y'])
helpers('ilustrasi/avatar-v2/farmer-v10-customization/build_farmer_v10.py',['nose','old_nose','surface'])
SKIN=bpy.data.materials['V8_skin'];HAIR=bpy.data.materials['V8_hair'];SHIRT=bpy.data.materials['V8_shirt']

def material(name,color,rough=.65,channel=None,tint=None):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
    if channel:m['avatarColor']=channel
    if tint:m['avatarTint']=tint
    return m
LIP=material('V12_Lip',(.36,.16,.10),.65,'skin',[.76,.53,.46])
MOUTH=material('V12_MouthInterior',(.045,.011,.009),.98)
WHITE=material('V12_EyeIvory',(.79,.78,.69),.38)
IRIS=material('V12_IrisAmber',(.14,.068,.026),.42)
INK=material('V12_Pupil',(.008,.006,.004),.35)
GLINT=material('V12_Catchlight',(.95,.91,.78),.23)
TEETH=material('V12_Teeth',(.70,.65,.53),.52)
HAIR_LIGHT=material('V12_HairRidge',(.06,.028,.014),.72,'hair',[1.22,1.18,1.12])
TRIM=material('V12_Stitch',(.28,.35,.32),.92,'shirt',[.78,.85,.83])

# Reference image uses the same camera/light as the candidate, not the old render.
DEFAULTS=dict(outfit='tee',bottomStyle='relaxed',footwearStyle='sandals',bodyFrame='male',bodyType='slender',hairStyle='short',headwear='none',accessory='none',gloves='none',faceShape='oval',eyeStyle='almond',noseStyle='defined',mouthStyle='neutral')
body_morphs=json.loads(rig['avatarBodyMorphs']);identity=json.loads(rig['avatarMorphs'])
def configure(**options):
    cfg={**DEFAULTS,**options};body=body_morphs[cfg['bodyFrame']+'/'+cfg['bodyType']]
    for o in scene.objects:
        if o.type!='MESH':continue
        slot=o.get('avatarSlot');field='hairStyle' if slot=='hair' else slot
        visible=not slot or cfg.get(field) in list(o.get('avatarChoices',[o.get('avatarChoice')]))
        if slot=='hair' and cfg['headwear']=='hijab':visible=False
        o.hide_set(not visible);o.hide_render=not visible
        if o.data.shape_keys:
            for k in o.data.shape_keys.key_blocks:k.value=1 if k.name==body else 0
            for field,values in identity.items():
                key=o.data.shape_keys.key_blocks.get(values.get(cfg[field],''))
                if key:key.value=1
    bpy.context.view_layer.update()

scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=720;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
def render(name,close=False,angle=0):
    if name not in args.views.split(',') and args.views!='all':return
    target=Vector((0,-.025,1.67 if close else .96))
    camera.data.type='ORTHO';camera.data.ortho_scale=.64 if close else 2.10
    camera.location=(math.sin(angle)*4,-math.cos(angle)*4,target.z+(.05 if close else .10))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)

configure()
if args.views!='none' and not (OUT/'baseline.png').exists():
    old=args.views;args.views='baseline,baseline-face';render('baseline');render('baseline-face',True);args.views=old

for o in list(scene.objects):
    if o.type=='MESH' and o.name.startswith('Face_') and not o.name.startswith('Face_Ear'):
        bpy.data.objects.remove(o,do_unlink=True)

def key(obj,name,fn):
    if not obj.data.shape_keys:obj.shape_key_add(name='Basis')
    k=obj.shape_key_add(name=name)
    for v,p in zip(k.data,obj.data.shape_keys.key_blocks[0].data):v.co=fn(p.co.copy())
    return k

def recalc(obj):
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()

# Open the actual skin mesh at the mouth, retaining weights and every identity
# key. The surrounding face, lips and cavity share a deforming opening.
body=bpy.data.objects['Body_Skin'];old_mesh=body.data
points=[v.co.copy() for v in old_mesh.vertices]
removed={p.index for p in old_mesh.polygons if p.center.y<-.07 and abs(p.center.x)<.052 and 1.539<p.center.z<1.575}
edge_counts={}
for p in old_mesh.polygons:
    if p.index not in removed:continue
    for a,b in p.edge_keys:edge_counts[(a,b)]=edge_counts.get((a,b),0)+1
boundary=sorted({i for e,n in edge_counts.items() if n==1 for i in e},key=lambda i:math.atan2((points[i].z-1.556)/.020,points[i].x/.055))
assert len(boundary)>6,'Mouth cut must produce a boundary'
angles=[math.atan2((points[i].z-1.556)/.020,points[i].x/.055) for i in boundary]
replacement={}
for idx,a in zip(boundary,angles):
    x=.063*math.cos(a);z=1.556+.020*math.sin(a)
    replacement[idx]=Vector((x,surface(x,z),z))
data=bpy.data.meshes.new('V12_ContinuousFace');data.from_pydata([replacement.get(i,p) for i,p in enumerate(points)],[],[tuple(p.vertices) for p in old_mesh.polygons if p.index not in removed]);data.update()
for m in old_mesh.materials:data.materials.append(m)
old_keys={k.name:[v.co.copy() for v in k.data] for k in old_mesh.shape_keys.key_blocks}
groups=[[(g.group,g.weight) for g in v.groups] for v in old_mesh.vertices]
group_names=[g.name for g in body.vertex_groups]
body.data=data
body.vertex_groups.clear()
for name in group_names:body.vertex_groups.new(name=name)
for i,gs in enumerate(groups):
    for gi,w in gs:body.vertex_groups[gi].add([i],w,'REPLACE')
for name,ps in old_keys.items():
    k=body.shape_key_add(name=name)
    for i,(v,p) in enumerate(zip(k.data,ps)):v.co=p+(replacement[i]-points[i] if i in replacement else Vector())
for p in data.polygons:p.use_smooth=True

def ring_mesh(name,rings,mat):
    n=64;vs=[]
    for row,(rx,rz,offset) in enumerate(rings):
        for j in range(n):
            a=-math.pi+2*math.pi*j/n
            x=rx*math.cos(a);z=1.556+rz*math.sin(a)+.004*math.cos(a)**2
            p=Vector((x,surface(x,z)-offset,z))
            if name=='V12_Perioral' and row==0:
                aa=angles+[angles[0]+2*math.pi];bb=boundary+[boundary[0]]
                angle=a if a>=angles[0] else a+2*math.pi
                for k in range(len(angles)):
                    if aa[k]<=angle<=aa[k+1]:
                        p=replacement[bb[k]].lerp(replacement[bb[k+1]],(angle-aa[k])/(aa[k+1]-aa[k]));break
            vs.append(p)
    fs=[(r*n+i,r*n+(i+1)%n,(r+1)*n+(i+1)%n,(r+1)*n+i) for r in range(len(rings)-1) for i in range(n)]
    o=mesh(name,vs,fs,mat,'head');recalc(o);o['mouthRingRows']=len(rings);return o
outer=ring_mesh('V12_Perioral',[(.063,.020,0),(.054,.008,.0005),(.047,.0035,.0015)],SKIN)
lips=ring_mesh('V12_Lips',[(.047,.0035,.0015),(.044,.0006,.001)],LIP)
cavity=ring_mesh('V12_OralCavity',[(.044,.0006,.0005),(.035,.002,-.025),(.001,.001,-.040)],MOUTH)
vs=[]
for i in range(17):
    x=-.034+i*.068/16
    for z in [1.550,1.564]:vs.append((x,surface(x,z)+.010,z))
teeth=mesh('V12_UpperTeeth',vs,[(2*i,2*i+2,2*i+3,2*i+1) for i in range(16)],TEETH,'head');recalc(teeth)

def mouth_delta(p,kind):
    x,y,z=p;near=math.exp(-((x/.074)**4))*smooth(1.48,1.525,z)*(1-smooth(1.58,1.62,z))
    if y>-.06:return p
    # Lower lip opens downward and pulls the chin; upper lip rises slightly.
    lower=1-smooth(1.553,1.558,z)
    if kind=='jawOpen':p.z+=near*(.005*(1-lower)-.038*lower);p.y+=.007*near*lower
    elif kind=='mouthWide':p.x*=1+.16*near;p.z-=.004*near*lower
    elif kind=='mouthRound':p.x*=1-.34*near;p.y-=.009*near;p.z+=near*(.007*(1-lower)-.010*lower)
    elif kind=='smile':p.z+=.008*near*(min(1,abs(x)/.044)**1.5);p.x*=1+.06*near
    elif kind=='frown':p.z-=.007*near*(min(1,abs(x)/.044)**1.5)
    return p

mouth_objs=[body,outer,lips,cavity]
for o in mouth_objs:
    for name in ['jawOpen','mouthWide','mouthRound','smile','frown']:
        k=key(o,'expr_'+name,lambda p,n=name:mouth_delta(p,n))
        if o==body or name!='jawOpen':continue
        for idx,v in enumerate(k.data):
            p=o.data.shape_keys.key_blocks[0].data[idx].co.copy();a=-math.pi+2*math.pi*(idx%64)/64
            target=p.copy();target.z+=.005*max(0,math.sin(a))-.035*max(0,-math.sin(a));target.y+=.005*max(0,-math.sin(a))
            blend=(idx//64)/(o['mouthRingRows']-1) if o==outer else 1
            v.co=v.co.lerp(target,blend)

# Convex eyes with a thick upper/lower lid instead of a flat white outline.
# Each eye has its own blink and gaze keys; gaze does not move the eyelids.
new_faces=[outer,lips,cavity,teeth]
def eye_point(cx,a,r,rx=.038,rz=.017):
    x=cx+rx*math.cos(a)*r;z=1.680+rz*math.sin(a)*r+.002*math.cos(a)
    return Vector((x,surface(x,z)-.004-.004*(1-r*r),z))
for sign,side in [(-1,'R'),(1,'L')]:
    cx=sign*.071;n=40
    vs=[eye_point(cx,0,0)]+[eye_point(cx,2*math.pi*j/n,r/4) for r in range(1,5) for j in range(n)]
    fs=[(0,1+j,1+(j+1)%n) for j in range(n)]
    fs += [(1+k*n+j,1+k*n+(j+1)%n,1+(k+1)*n+(j+1)%n,1+(k+1)*n+j) for k in range(3) for j in range(n)]
    eye=mesh('V12_Eye_'+side,vs,fs,WHITE,'head');recalc(eye)
    vs=[]
    for layer in range(4):
        for j in range(n):
            a=2*math.pi*j/n;t=layer/3
            p=eye_point(cx,a,1,rx=.038+.005*t,rz=.017+.005*t)
            p.y=surface(p.x,p.z)-(.003*(1-t)+.001*math.sin(math.pi*t));vs.append(p)
    fs=[(r*n+j,r*n+(j+1)%n,(r+1)*n+(j+1)%n,(r+1)*n+j) for r in range(3) for j in range(n)]
    lid=mesh('V12_Lid_'+side,vs,fs,SKIN,'head');recalc(lid)
    def blink(p,lid=False):
        x,y,z=p;factor=max(0,1-abs(z-1.680)/.031) if lid else 1
        p.z=1.680+(z-1.680)*(1-.998*factor);p.y=surface(p.x,p.z)-.001
        return p
    key(eye,'expr_blink'+side,lambda p:blink(p))
    k=key(lid,'expr_blink'+side,lambda p:p)
    for idx,v in enumerate(k.data):
        p=v.co.copy();t=(idx//n)/3;p.z=1.680+(p.z-1.680)*t;p.y=surface(p.x,p.z)-.003*(1-t);v.co=p
    new_faces += [eye,lid]
    for name,rx,rz,mat,dx,dz,depth in [('Iris',.014,.015,IRIS,0,0,.010),('Pupil',.0065,.010,INK,0,0,.011),('Glint',.003,.003,GLINT,-.004,.005,.012)]:
        v=[(cx+dx,surface(cx+dx,1.680+dz)-depth,1.680+dz)]
        for j in range(32):
            a=2*math.pi*j/32;x=cx+dx+rx*math.cos(a);z=1.680+dz+rz*math.sin(a)
            v.append((x,surface(x,z)-depth,z))
        o=mesh('V12_'+name+'_'+side,v,[(0,j+1,(j+1)%32+1) for j in range(32)],mat,'head');recalc(o)
        key(o,'expr_blink'+side,lambda p:blink(p))
        for direction,delta in [('lookLeft',-.009),('lookRight',.009)]:
            def gaze(p,delta=delta):
                y=surface(p.x+delta,p.z)-surface(p.x,p.z);p.x+=delta;p.y+=y;return p
            key(o,'expr_'+direction,gaze)
        new_faces.append(o)
    # Sculpted arched brow, tapered at both ends.
    vs=[]
    for j in range(25):
        t=j/24;x=cx+sign*(-.037+.074*t);z=1.723+.009*math.sin(math.pi*t)-.003*t
        w=.005*(.25+.75*math.sin(math.pi*t)**.4)
        for off in [-w,w]:vs.append((x,surface(x,z+off)-.004,z+off))
    brow=mesh('V12_Brow_'+side,vs,[(2*j,2*j+1,2*j+3,2*j+2) for j in range(24)],HAIR,'head');recalc(brow)
    for kind in ['browUp','browAngry','browSad']:
        def brow_pose(p,kind=kind):
            t=(p.x-cx)*sign/.04
            dz=.015 if kind=='browUp' else (.012*t-.003 if kind=='browAngry' else -.012*t+.004)
            p.y+=surface(p.x,p.z+dz)-surface(p.x,p.z);p.z+=dz;return p
        key(brow,'expr_'+kind,brow_pose)
        if kind=='browUp':key(brow,'expr_browUp'+side,brow_pose)
    new_faces.append(brow)

# New surfaces follow the same saved face identity as the skin mesh.
for o in new_faces:
    if o.name.startswith(('V12_Eye_','V12_Lid_','V12_Iris_','V12_Pupil_','V12_Glint_')):
        for name,factor in [('Eye_Round',1.12),('Eye_Relaxed',.83)]:
            def eye_identity(p,factor=factor):
                z=1.680+(p.z-1.680)*factor;p.y+=surface(p.x,z)-surface(p.x,p.z);p.z=z;return p
            key(o,name,eye_identity)
    for style,factor,dy in [('Round',.12,.007),('Angular',-.12,-.002)]:
        def identity_face(p,factor=factor,dy=dy):
            a=smooth(1.485,1.54,p.z)*(1-smooth(1.69,1.747,p.z));p.x*=1+factor*a;p.y+=dy*a;return p
        key(o,'Face_'+style,identity_face)
    if o in [outer,lips,cavity]:
        key(o,'Mouth_Grin',lambda p:mouth_delta(p,'smile'))
        key(o,'Mouth_Neutral',lambda p:p)

# Hair: a close fitted scalp and overlapping swept ribbons, tapered in width
# and thickness. Existing other hairstyles remain available for compatibility.
for o in list(scene.objects):
    if o.type=='MESH' and o.get('avatarSlot')=='hair' and o.get('avatarChoice')=='short':bpy.data.objects.remove(o,do_unlink=True)
vs=[];fs=[];n=56;rows=20
for i in range(rows+1):
    t=i/rows
    for j in range(n):
        a=2*math.pi*j/n;front=max(0,-math.sin(a));bottom=1.65+.12*front
        z=bottom+(1.907-bottom)*t;r=math.sqrt(max(0,1-((z-1.70)/.207)**2))
        rx,fd,bd=shape(min(z,1.886));blend=smooth(1.86,1.90,z)
        width=max(.198*r,rx+.009)*(1-blend)+.198*r*blend
        depth=max(.185*r,(fd if math.sin(a)<0 else bd)+.009)*(1-blend)+.185*r*blend
        x=width*math.cos(a);y=depth*math.sin(a)
        if i==rows:x=.001*math.cos(a);y=.001*math.sin(a)
        vs.append((x,y,z))
for i in range(rows):
    for j in range(n):fs.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
scalp=mesh('V12_HairScalp',vs,fs,HAIR,'head','hair','short');recalc(scalp)
for j in range(5):
    vs=[];fs=[]
    # Long flat locks sweep across the forehead from a slightly off-centre part.
    for i in range(21):
        t=i/20;x=.105-(.245+j*.006)*t+j*.005*(1-t)
        z=1.846-j*.015-(.060+j*.001)*t+.027*math.sin(math.pi*t)
        width=.023*math.sin(math.pi*t)**.5+.00005
        for k in range(9):
            u=k/4-1;xx=x+width*u*.20;zz=z+width*u
            r=math.sqrt(max(.001,1-((zz-1.70)/.207)**2));rx,fd,bd=shape(min(zz,1.886));blend=smooth(1.86,1.90,zz)
            scalp_width=max(.198*r,rx+.009)*(1-blend)+.198*r*blend
            depth=max(.185*r,fd+.009)*(1-blend)+.185*r*blend
            y=-depth*math.sqrt(max(.001,1-(xx/scalp_width)**2))-.0003-.008*(1-u*u)*math.sin(math.pi*t)
            vs.append((xx,y,zz))
    for i in range(20):
        for k in range(8):fs.append((i*9+k,i*9+k+1,(i+1)*9+k+1,(i+1)*9+k))
    o=mesh('V12_SweptLock_'+str(j),vs,fs,HAIR if j%3 else HAIR_LIGHT,'head','hair','short');recalc(o)

# A modestly narrower/lower head keeps the approved body and skeleton intact.
# Apply identically to every key and every head accessory, preserving fit.
def proportions(p):
    h=smooth(1.43,1.53,p.z);p.x*=1-.075*h;p.y*=1-.035*h;p.z=1.43+(p.z-1.43)*(1-.055*h);return p
for o in scene.objects:
    if o.type!='MESH':continue
    if o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks:
            for v in k.data:v.co=proportions(v.co.copy())
    else:
        for v in o.data.vertices:v.co=proportions(v.co.copy())

# Preserve cloth fits and add subtle cloth folds to all corresponding keys.
def cloth(p):
    x,y,z=p;torso=1-smooth(.15,.23,abs(x))
    if .86<z<1.34:
        fold=.0028*math.sin(36*z+12*x)*smooth(.86,.92,z)*(1-smooth(1.08,1.25,z))*torso
        p.y+=(1 if y>0 else -1)*fold
    return p
for o in scene.objects:
    if o.type=='MESH' and o.get('avatarSlot')=='outfit':
        if o.data.shape_keys:
            for k in o.data.shape_keys.key_blocks:
                for v in k.data:v.co=cloth(v.co.copy())
        else:
            for v in o.data.vertices:v.co=cloth(v.co.copy())

def tee_fit(p):
    return p
shirt=bpy.data.objects['Garment_Shirt']
for k in shirt.data.shape_keys.key_blocks:
    for v in k.data:v.co=tee_fit(v.co.copy())
vs=[];fs=[];n=64
for rx,ry,z in [(.077,.080,1.462),(.075,.078,1.473),(.072,.075,1.473),(.074,.077,1.462)]:
    for j in range(n):
        a=2*math.pi*j/n;vs.append((rx*math.cos(a),ry*math.sin(a),z))
for row in range(4):
    for j in range(n):fs.append((row*n+j,row*n+(j+1)%n,((row+1)%4)*n+(j+1)%n,((row+1)%4)*n+j))
collar=mesh('V12_TeeNeckband',vs,fs,TRIM,slot='outfit',choice='tee');collar['avatarChoices']=['tee','overalls'];recalc(collar)
selected=[p for p in body.data.polygons if 1.438<p.center.z<1.466]
ids=sorted({i for p in selected for i in p.vertices});mapping={old:new for new,old in enumerate(ids)}
def offset_cloth(p):
    p=p.copy();p.x*=1.025;p.y*=1.035;p.z+=.001
    t=smooth(1.455,1.470,p.z);a=math.atan2(p.y,p.x)
    p.x=p.x*(1-t)+.076*math.cos(a)*t;p.y=p.y*(1-t)+.079*math.sin(a)*t;p.z=p.z*(1-t)+1.468*t
    return p
yoke=mesh('V12_TeeYoke',[offset_cloth(body.data.vertices[i].co) for i in ids],[tuple(mapping[i] for i in p.vertices) for p in selected],SHIRT,slot='outfit',choice='tee')
yoke['avatarChoices']=['tee','overalls']
for source_key in body.data.shape_keys.key_blocks:
    if source_key.name.startswith('expr_'):continue
    target_key=yoke.shape_key_add(name=source_key.name)
    for v,i in zip(target_key.data,ids):v.co=offset_cloth(source_key.data[i].co)

# Merge the short hair pieces by material to avoid one draw call per lock.
for mat in [HAIR,HAIR_LIGHT]:
    objects=[o for o in scene.objects if o.type=='MESH' and o.get('avatarSlot')=='hair' and o.get('avatarChoice')=='short' and o.data.materials[0]==mat]
    if len(objects)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()

for m in [SKIN,HAIR,SHIRT]:
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.62 if m==SKIN else .82

# Keep the datablock's base vertices identical to Basis. Both Blender and the
# glTF exporter must start from the same rest surface after editing shape keys.
for o in scene.objects:
    if o.type=='MESH' and o.data.shape_keys:
        for v,basis in zip(o.data.vertices,o.data.shape_keys.key_blocks[0].data):v.co=basis.co
        o.data.update()

expression_names=['blinkL','blinkR','lookLeft','lookRight','browUp','browUpL','browUpR','browAngry','browSad','jawOpen','mouthWide','mouthRound','smile','frown']
rig['avatarRevision']='v12-expression-candidate'
rig['avatarExpressionContract']=json.dumps({'version':1,'targets':{n:'expr_'+n for n in expression_names},'expressions':{'neutral':{},'happy':{'smile':.85},'angry':{'browAngry':.8,'frown':.45},'sad':{'browSad':.8,'frown':.7},'surprised':{'browUp':1,'jawOpen':.65,'mouthRound':.5},'confused':{'browUpL':.8,'browAngry':.15,'mouthRound':.12}},'visemes':{'rest':{},'AA':{'jawOpen':.85},'EE':{'jawOpen':.2,'mouthWide':.8},'OH':{'jawOpen':.55,'mouthRound':.8},'MBP':{}}})
rig['avatarAttachments']=json.dumps({'head':'head','handL':'hand.L','handR':'hand.R','back':'chest'})
configure()
for o in scene.objects:
    if o.type=='MESH' and not o.data.uv_layers:
        uv=o.data.uv_layers.new(name='SurfaceUV')
        for p in o.data.polygons:
            for li in p.loop_indices:
                v=o.data.vertices[o.data.loops[li].vertex_index].co
                uv.data[li].uv=(.5+math.atan2(v.y,v.x)/(2*math.pi),v.z/2)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'farmer-v12-expression.blend'))
for o in scene.objects:
    o.hide_set(False);o.hide_render=False
    if o.type=='MESH' and o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks:k.value=0
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in scene.objects:
    if o.type=='MESH':o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'farmer-v12-expression.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_morph=True,export_morph_normal=False,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,export_yup=True)
configure()
render('front');render('three-quarter',angle=.55);render('face',True);render('side',angle=-math.pi/2);render('back',angle=math.pi)
def expression(values):
    for o in scene.objects:
        if o.type=='MESH' and o.data.shape_keys:
            for k in o.data.shape_keys.key_blocks:
                if k.name.startswith('expr_'):k.value=values.get(k.name[5:],0)
    bpy.context.view_layer.update()
for name,values in [('smile',{'smile':.9}),('blink',{'blinkL':1,'blinkR':1}),('speech',{'jawOpen':.85}),('angry',{'browAngry':1,'frown':.5}),('sad',{'browSad':.8,'frown':.7}),('surprised',{'browUp':1,'jawOpen':.7,'mouthRound':.5})]:
    expression(values);render(name,True)
expression({})
(OUT/'build-report.json').write_text(json.dumps({'revision':'v12-expression-candidate','source':'V11 CC0 body and wardrobe','contract':json.loads(rig['avatarExpressionContract']),'defaultGameChanged':False,'limitations':['Inherited garments and non-short hairstyles still need individual artistic refinement','No phoneme inference: visemes require timed cues','Legacy nineteen-bone body retains existing finger limitations','Morph normals omitted to reduce download size; inspect extreme expressions in engine']},indent=2),encoding='utf-8')
print('V12_BUILD_COMPLETE',OUT)
