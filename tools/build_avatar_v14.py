"""Build Arka V14: a new adult base, tailored costume and independent rig.
Graphical inputs are pinned CC0 MakeHuman assets. No MakeHuman program code is used.
Run with Blender 4.5 LTS --background --python tools/build_avatar_v14.py.
"""
import sys, math, json, argparse, collections
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v14_common import *
from mathutils.kdtree import KDTree
parser=argparse.ArgumentParser();parser.add_argument('--views',default='front,face');parser.add_argument('--no-export',action='store_true');parser.add_argument('--profile',default='')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.render.fps=24
original,uv,faces=obj_data(MH/'3dobjs/base.obj');points=[v.copy() for v in original]
ETHNICITY={'asian':.55,'caucasian':.30,'african':.15}
PROFILE=None
if args.profile:
    from avatar_v15_profiles import PROFILES,fit_profile
    PROFILE=PROFILES[args.profile]
sex=PROFILE['sex'] if PROFILE else 'male'
macro=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions/source' if sex=='female' else MH/'targets/macrodetails'
for ethnicity,weight in ETHNICITY.items():
    delta=target(macro/f'{ethnicity}-{sex}-young.target',len(points))
    points=[p+d*weight for p,d in zip(points,delta)]
delta=target(macro/f'universal-{sex}-young-maxmuscle-averageweight.target',len(points))
points=[p+d*(.22 if sex=='female' else .38) for p,d in zip(points,delta)]
# One adult design; do not carry wardrobe/body variants into this benchmark.
body_ids=sorted({i for group,ids,_ in faces if group=='body' for i in ids})
bottom=min(points[i].y for i in body_ids);top=max(points[i].y for i in body_ids)
SCALE=1.78/(top-bottom)
def transform(p):return Vector((p.x*SCALE,-p.z*SCALE,(p.y-bottom)*SCALE+.025))
def delta_transform(p):return Vector((p.x*SCALE,-p.z*SCALE,p.y*SCALE))
coords=[transform(p) for p in points]
definition=json.loads((MH/'rigs/default.mhskel').read_text())
joints={name:sum((coords[i] for i in ids),Vector())/len(ids) for name,ids in definition['joints'].items()}
def head(name):return joints[definition['bones'][name]['head']]
def tail(name):return joints[definition['bones'][name]['tail']]
rigdata=bpy.data.armatures.new('Arka_V14_Skeleton');rig=bpy.data.objects.new('Arka_V14_Rig',rigdata);scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
spec={
 'root':(head('root'),tail('spine05'),None),
 'spine':(tail('spine05'),head('spine01'),'root'),
 'chest':(head('spine01'),tail('spine01'),'spine'),
 'neck':(head('neck01'),head('head'),'chest'),
 'head':(head('head'),tail('head'),'neck'),
}
mapping={'root':'root','spine05':'root','spine04':'spine','spine03':'spine','spine02':'spine','spine01':'chest','neck01':'neck','neck02':'neck','neck03':'neck','head':'head'}
for side in ['L','R']:
    spec.update({
      'clavicle.'+side:(head('clavicle.'+side),head('upperarm01.'+side),'chest'),
      'upper_arm.'+side:(head('upperarm01.'+side),head('lowerarm01.'+side),'clavicle.'+side),
      'forearm.'+side:(head('lowerarm01.'+side),head('wrist.'+side),'upper_arm.'+side),
      'hand.'+side:(head('wrist.'+side),tail('wrist.'+side),'forearm.'+side),
      'thigh.'+side:(head('upperleg01.'+side),head('lowerleg01.'+side),'root'),
      'calf.'+side:(head('lowerleg01.'+side),head('foot.'+side),'thigh.'+side),
      'foot.'+side:(head('foot.'+side),tail('foot.'+side),'calf.'+side),
    })
    for old,new in [('pelvis','root'),('breast','chest'),('clavicle','clavicle'),('shoulder01','clavicle'),('upperarm01','upper_arm'),('upperarm02','upper_arm'),('lowerarm01','forearm'),('lowerarm02','forearm'),('wrist','hand'),('upperleg01','thigh'),('upperleg02','thigh'),('lowerleg01','calf'),('lowerleg02','calf'),('foot','foot')]:mapping[old+'.'+side]=new if new in ['root','chest'] else new+'.'+side
    for i,finger in enumerate(['thumb','index','middle','ring','little'],1):
        for j in range(1,4):
            old=f'finger{i}-{j}.{side}';name=f'{finger}.{j:02}.{side}'
            spec[name]=(head(old),tail(old),'hand.'+side if j==1 else f'{finger}.{j-1:02}.{side}');mapping[old]=name
for name,(a,b,parent) in spec.items():
    bone=rigdata.edit_bones.new(name);bone.head=a;bone.tail=b
    # Deterministic roll; gesture axes are encoded relative to these rest matrices.
    bone.align_roll(Vector((0,-1,0)) if abs((b-a).normalized().y)<.95 else Vector((0,0,1)))
for name,(_,_,parent) in spec.items():
    if parent:rigdata.edit_bones[name].parent=rigdata.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for bone in rig.pose.bones:bone.rotation_mode='QUATERNION'
raw_weights=json.loads((MH/'rigs/default_weights.mhw').read_text())['weights']
weights=[collections.defaultdict(float) for _ in points]
for old,entries in raw_weights.items():
    name=mapping.get(old)
    if not name:
        name='foot.'+old[-1] if old.startswith('toe') else 'hand.'+old[-1] if old.startswith('metacarpal') else 'head'
    for index,weight in entries:weights[index][name]+=weight
for i,w in enumerate(weights):
    values=sorted(w.items(),key=lambda kv:-kv[1])[:4];total=sum(v for _,v in values)
    weights[i]={n:v/total for n,v in values} if total else {'head' if coords[i].z>1.5 else 'root':1}
kd=KDTree(len(body_ids))
for i in body_ids:kd.insert(coords[i],i)
kd.balance()

def skin(obj,source_ids=None,bone=None):
    groups={name:obj.vertex_groups.new(name=name) for name in spec}
    for v in obj.data.vertices:
        w={bone:1} if bone else weights[source_ids[v.index] if source_ids is not None else kd.find(v.co)[1]]
        for name,value in w.items():groups[name].add([v.index],value,'REPLACE')
    mod=obj.modifiers.new('Arka skin','ARMATURE');mod.object=rig;obj.parent=rig
    return obj

def source_mesh(name,selected,mat,offset=0,shape=None):
    indices=sorted({i for _,ids,_ in selected for i in ids});local={v:i for i,v in enumerate(indices)}
    obj=mesh(name,[coords[i] for i in indices],[[local[i] for i in ids] for _,ids,_ in selected],mat,[[uv[i] for i in us] for _,_,us in selected])
    for v in obj.data.vertices:
        if offset:v.co+=v.normal*offset
        if shape:v.co=shape(v.co)
    obj.data.update();return obj,indices

SKIN=material('Arka skin · CC0 diffuse',(.56,.32,.19),.62,texture=SYSTEM/'skins/young_asian_male/young_lightskinned_male_diffuse3.png',tint=(.76,.64,.52))
SKIN.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value=.055
IVORY=material('Linen · warm ivory',(.60,.52,.38),.83)
TEAL=material('Woven indigo teal',(.025,.085,.095),.78)
PANTS=material('Charcoal twill',(.045,.055,.066),.89)
LEATHER=material('Oiled chestnut leather',(.10,.040,.018),.60)
DARK=material('Boot sole and bindings',(.019,.015,.012),.78)
BRASS=material('Brushed aged brass',(.40,.25,.095),.32,.78)
THREAD=material('Linen topstitch',(.40,.29,.13),.86)
from avatar_v14_materials import costume_textures
costume_textures({'linen':IVORY,'vest':TEAL,'pants':PANTS,'leather':LEATHER})

# Body is continuous at head/neck/arms/hands. Hidden skin under this single outfit
# is removed from the export only; the full anatomical source is kept separately.
full,ids=source_mesh('Anatomy_Source', [f for f in faces if f[0]=='body'],SKIN)
full['authoringOnly']=True;full.hide_render=True;full.hide_set(True)
def visible_skin(face):
    c=sum((coords[i] for i in face[1]),Vector())/len(face[1])
    # Neck/head and distal arm including hands. All other skin is inside costume.
    arm=sum(sum(w for n,w in weights[i].items() if n.startswith(('forearm.','hand.','thumb.','index.','middle.','ring.','little.'))) for i in face[1])/len(face[1])
    return c.z>1.54 or arm>.10
body,body_map=source_mesh('Arka_Skin',[f for f in faces if f[0]=='body' and visible_skin(f)],SKIN)
skin(body,body_map)

expression_files={'blinkL':'eye-left-closure','blinkR':'eye-right-closure','browUpL':'eyebrows-left-up','browUpR':'eyebrows-right-up','browAngryL':'eyebrows-left-down','browAngryR':'eyebrows-right-down','browSadL':'eyebrows-left-inner-up','browSadR':'eyebrows-right-inner-up','smile':'mouth-corner-puller','frown':'mouth-depression','jawOpen':'mouth-open','mouthRound':'mouth-pursing','mouthWide':'mouth-part-later','mouthClosed':'mouth-compression'}
expr_deltas={}
for channel,file in expression_files.items():
    data=[Vector() for _ in points]
    for ethnicity,weight in ETHNICITY.items():
        ds=target(MH/f'targets/expression/units/{ethnicity}/{file}.target',len(points))
        for i,d in enumerate(ds):data[i]+=delta_transform(d)*weight
    expr_deltas[channel]=data

def expressions(obj,ids):
    obj.shape_key_add(name='Basis')
    for channel,data in expr_deltas.items():
        key=obj.shape_key_add(name='Expr_'+channel)
        for v,i in zip(key.data,ids):v.co+=data[i]
expressions(body,body_map)

def proxy(name,folder,stem,mat,expressive=False):
    verts,tex,polys=obj_data(folder/(stem+'.obj'));lines=(folder/(stem+'.mhclo')).read_text().splitlines()
    scaling=[1,1,1];bindings=[];reading=False
    for line in lines:
        a=line.split()
        if not a or a[0].startswith('#'):continue
        if a[0] in ['x_scale','y_scale','z_scale']:
            axis={'x_scale':0,'y_scale':1,'z_scale':2}[a[0]];scaling[axis]=abs(points[int(a[1])][axis]-points[int(a[2])][axis])/float(a[3])
        if a[0]=='verts':reading=True;continue
        if reading:
            if len(a)==1 and a[0].isdigit():bindings.append(([int(a[0])],[1.],Vector()))
            elif len(a)==9 and a[0].isdigit():bindings.append((list(map(int,a[:3])),list(map(float,a[3:6])),Vector(tuple(map(float,a[6:9])))))
            else:break
    assert len(bindings)==len(verts),(name,len(bindings),len(verts))
    adapted=[]
    for indices,ws,off in bindings:
        p=sum((points[i]*w for i,w in zip(indices,ws)),Vector())+Vector(tuple(off[j]*scaling[j] for j in range(3)))
        adapted.append(transform(p))
    obj=mesh(name,adapted,[ids for _,ids,_ in polys],mat,[[tex[i] for i in us] for _,_,us in polys]);skin(obj,bone='head')
    if expressive:
        obj.shape_key_add(name='Basis')
        for channel,data in expr_deltas.items():
            key=obj.shape_key_add(name='Expr_'+channel)
            for v,(indices,ws,_) in zip(key.data,bindings):v.co+=sum((data[i]*w for i,w in zip(indices,ws)),Vector())
    return obj

EYES=material('Amber iris and sclera',(.6,.6,.5),.36,texture=SYSTEM/'eyes/materials/brown_eye.png')
# A single sclera surface with controlled UV projection. The core high-poly eye
# includes corneal geometry intended for MakeHuman's custom shader; using it as
# an opaque glTF shell produces black eyes. This native mesh needs no such shader.
ep=[];ef=[];euv=[];eye_centers={}
for side in ['L','R']:
    center=head('eye.'+side)+Vector((0,-.004,0));eye_centers[side]=center
    offset=len(ep);n=48;rows=24;r=.0129
    atlas=(.735,.700) if side=='L' else (.292,.302)
    for row in range(rows+1):
        theta=math.pi*row/rows
        for j in range(n):
            phi=j/n*math.tau;ep.append(center+Vector((r*math.sin(theta)*math.cos(phi),-r*math.cos(theta),r*math.sin(theta)*math.sin(phi))))
    for row in range(rows):
        for j in range(n):
            ids=[offset+row*n+j,offset+row*n+(j+1)%n,offset+(row+1)*n+(j+1)%n,offset+(row+1)*n+j]
            ef.append(list(reversed(ids)))
            euv.append([(atlas[0]+(ep[i].x-center.x)/r*.29,atlas[1]+(ep[i].z-center.z)/r*.29) for i in reversed(ids)])
eyes=mesh('Arka_Eyes',ep,ef,EYES,euv);skin(eyes,bone='head')
eyes.shape_key_add(name='Basis')
for channel,angle in [('lookLeft',-.22),('lookRight',.22)]:
    key=eyes.shape_key_add(name='Expr_'+channel)
    for v,basis in zip(key.data,eyes.data.vertices):
        center=eye_centers['L' if basis.co.x>0 else 'R'];v.co=center+Quaternion(Vector((0,0,1)),angle)@(basis.co-center)
HAIR=material('Dark swept hair',(.025,.015,.01),.75,texture=SYSTEM/'hair/short02/short02_diffuse.png',alpha=True,normal=SYSTEM/'hair/short02/short02_normal.png',tint=(.22,.19,.16))
hair=proxy('Arka_Hair',SYSTEM/'hair/short02','short02',HAIR)
BROW=material('Eyebrow strands',(.04,.02,.01),.8,texture=SYSTEM/'eyebrows/eyebrow001/eyebrow001.png',alpha=True)
brows=proxy('Arka_Brows',SYSTEM/'eyebrows/eyebrow001','eyebrow001',BROW,True)
TEETH=material('Teeth enamel',(.65,.59,.46),.39,texture=SYSTEM/'teeth/teeth_base/teeth.png')
teeth=proxy('Arka_Teeth',SYSTEM/'teeth/teeth_base','teeth_base',TEETH,True)

def center(face):return sum((coords[i] for i in face[1]),Vector())/len(face[1])
# Tailored garment envelopes originate from the core clothing helper topology,
# then receive thickness, hems and an original open-front waistcoat.
tights=[f for f in faces if f[0]=='helper-tights']
def pants_shape(p):
    sign=1 if p.x>0 else -1;cx=sign*(.11+.10*(1-smooth(.25,1,p.z)))
    p.x=cx+(p.x-cx)*1.085;p.y*=1.12
    p.y+=.003*math.sin(p.z*58+p.x*17)*math.exp(-((p.z-.55)/.21)**2)
    if p.z>.88:
        fitted_back=-.025+.145*math.sqrt(max(.05,1-(p.x/.19)**2))-.014
        back=.105+(fitted_back-.105)*smooth(.90,.97,p.z)
        p.y=max(-.143,min(back,p.y))
    if PROFILE and sex=='female' and p.z<.40:
        ankle=head('foot.L' if p.x>0 else 'foot.R');blend=1-smooth(.30,.40,p.z)
        p.x=p.x*(1-blend)+(ankle.x*.94+max(-.050,min(.050,p.x-ankle.x*.94)))*blend
        p.y=p.y*(1-blend)+(ankle.y+max(-.053,min(.053,p.y-ankle.y)))*blend
        p.z=max(.294,p.z)
    return p
pants,_=source_mesh('Travel_Trousers',[f for f in tights if .25<center(f).z<1.04],PANTS,.008,pants_shape)
finish(pants,1,.003);skin(pants)

def loft(name,rings,mat,n=48,close=False):
    # Rings are (z, centreX, centreY, radiusX, radiusY).
    ps=[];uvs=[];fs=[]
    for z,x,y,rx,ry in rings:
        for j in range(n):
            a=j/n*math.tau;ps.append((x+rx*math.sin(a),y-ry*math.cos(a),z))
    for k in range(len(rings)-1):
        for j in range(n):
            fs.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
            uvs.append([(j/n,k/(len(rings)-1)),((j+1)/n,k/(len(rings)-1)),((j+1)/n,(k+1)/(len(rings)-1)),(j/n,(k+1)/(len(rings)-1))])
    if close:
        fs.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+i for i in range(n))]);uvs.extend([[(.5,.5)]*n]*2)
    return mesh(name,ps,fs,mat,uvs)

def tube(name,path,radius,mat,n=8,bone=None):
    ps=[];fs=[];uvs=[]
    for i,p in enumerate(path):
        p=Vector(p);direction=Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)])
        direction.normalize();u=direction.cross(Vector((0,0,1)))
        if u.length<.01:u=direction.cross(Vector((0,1,0)))
        u.normalize();v=direction.cross(u).normalized()
        for j in range(n):ps.append(p+radius*(u*math.cos(j/n*math.tau)+v*math.sin(j/n*math.tau)))
        if i:
            for j in range(n):
                fs.append(((i-1)*n+j,(i-1)*n+(j+1)%n,i*n+(j+1)%n,i*n+j));uvs.append([(j/n,(i-1)/len(path)),((j+1)/n,(i-1)/len(path)),((j+1)/n,i/len(path)),(j/n,i/len(path))])
    obj=mesh(name,ps,fs,mat,uvs);skin(obj,bone=bone);return obj

def hem(obj,name,mat,radius=.0025):
    counts=collections.Counter(tuple(sorted(edge)) for f in obj.data.polygons for edge in f.edge_keys)
    adjacency=collections.defaultdict(list)
    for (a,b),count in counts.items():
        if count==1:adjacency[a].append(b);adjacency[b].append(a)
    while adjacency:
        start=next(iter(adjacency));walk=[start];previous=None;current=start
        while True:
            nexts=[n for n in adjacency.get(current,[]) if n!=previous]
            if not nexts:break
            nxt=nexts[0];previous,current=current,nxt
            if current==start:walk.append(current);break
            walk.append(current)
            if len(walk)>len(obj.data.vertices):break
        for i in walk:adjacency.pop(i,None)
        if len(walk)>3:tube(name,[obj.data.vertices[i].co for i in walk],radius,mat)

# A clean garment topology avoids inflating nipple/lip details from the naked
# body into cloth. Torso panels and shaped sleeves overlap at sewn armholes.
shirt=loft('Tailored linen torso',[(1.0,0,-.025,.175,.130),(1.02,0,-.025,.175,.130),(1.10,0,-.025,.157,.132),(1.23,0,-.025,.172,.133),(1.35,0,-.025,.218,.133),(1.44,0,-.018,.235,.105),(1.49,0,-.010,.209,.093),(1.52,0,-.009,.127,.083),(1.545,0,-.014,.070,.073),(1.56,0,-.014,.068,.073)],IVORY,n=56)
finish(shirt,1);hem(shirt,'Linen sewn hem',IVORY,.002);finish(shirt,0,.003);skin(shirt)
for side in ['L','R']:
    a=head('upperarm01.'+side);elbow=head('lowerarm01.'+side);wrist=head('wrist.'+side)
    ps=[];fs=[];uvs=[];n=32
    for row in range(15):
        t=row/14*1.34-.22
        c=a.lerp(elbow,t) if t<=1 else elbow.lerp(wrist,(t-1)*.7)
        direction=(elbow-a).normalized().lerp((wrist-elbow).normalized(),smooth(.7,1.1,t)).normalized()
        u=direction.cross(Vector((0,-1,0))).normalized();v=direction.cross(u).normalized()
        radius=(.076-.020*max(0,t))*smooth(-.25,.04,t)+.008*smooth(.65,1.12,t);radius+=.0015*math.sin(t*math.pi*7)*math.exp(-((t-.95)/.25)**2)
        for j in range(n):
            theta=j/n*math.tau;ps.append(c+radius*(u*math.cos(theta)+v*math.sin(theta)))
        if row:
            for j in range(n):
                fs.append(((row-1)*n+j,(row-1)*n+(j+1)%n,row*n+(j+1)%n,row*n+j));uvs.append([(j/n,(row-1)/14),((j+1)/n,(row-1)/14),((j+1)/n,row/14),(j/n,row/14)])
    sleeve=mesh('Linen sleeve '+side,ps,fs,IVORY,uvs);finish(sleeve,1);finish(sleeve,0,.003);skin(sleeve)

# Waistcoat: a front opening that widens into a V-neck and real armholes.
profiles=[(.985,.190,.148),(1.00,.190,.148),(1.02,.181,.151),(1.08,.176,.151),(1.21,.178,.150),(1.35,.232,.151),(1.44,.243,.137),(1.51,.187,.108),(1.555,.085,.081)]
ps=[];fs=[];uvs=[];n=64
for row,(z,rx,ry) in enumerate(profiles):
    opening=.12 if z<1.21 else .12+(z-1.21)*2.5
    for j in range(n+1):
        a=opening+(math.tau-2*opening)*j/n
        # Shoulder armhole dips; no polygon spans from chest across upper arm.
        side=math.exp(-((abs(math.sin(a))-1)/.11)**2)
        zz=z-.045*side*smooth(1.40,1.555,z)
        ps.append((rx*math.sin(a),-.025-ry*math.cos(a),zz))
for row in range(len(profiles)-1):
    for j in range(n):
        a=(j+.5)/n*math.tau
        if 5<=row<=6 and abs(math.sin(a))>.83:continue
        fs.append((row*(n+1)+j,row*(n+1)+j+1,(row+1)*(n+1)+j+1,(row+1)*(n+1)+j));uvs.append([(j/n,row/8),((j+1)/n,row/8),((j+1)/n,(row+1)/8),(j/n,(row+1)/8)])
vest=mesh('Indigo_Waistcoat',ps,fs,TEAL,uvs);finish(vest,1);hem(vest,'Waistcoat bound edge',LEATHER,.004);finish(vest,0,.006);skin(vest)
collar=loft('Standing linen collar',[(1.505,0,-.012,.100,.083),(1.515,0,-.012,.095,.080),(1.555,0,-.014,.063,.073),(1.563,0,-.014,.063,.073)],IVORY)
finish(collar,1,.003);skin(collar)
belt=loft('Wide waist belt',[(1.022,0,-.025,.193,.160),(1.028,0,-.025,.193,.160),(1.073,0,-.025,.188,.163),(1.079,0,-.025,.188,.163)],LEATHER)
finish(belt,1,.006);skin(belt)
for z in [1.032,1.070]:tube('Belt stitched edge',[(.194*math.sin(j/64*math.tau),-.025-.165*math.cos(j/64*math.tau),z) for j in range(65)],.0012,THREAD)

def box(name,position,size,mat,bevel=.005,bone=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=position);o=bpy.context.object;o.name=name;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    m=o.modifiers.new('Soft manufactured edge','BEVEL');m.width=bevel;m.segments=3;apply_modifier(o,m)
    # Apply translation before skinning; all authored mesh coordinates share rig space.
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(mat);skin(o,bone=bone);return o
for x in [-.026,.026]:box('Buckle brass frame',(x,-.194,1.050),(.006,.008,.048),BRASS,.002)
for z in [1.027,1.073]:box('Buckle brass frame',(0,-.194,z),(.055,.008,.006),BRASS,.002)
box('Buckle tongue',(0,-.200,1.05),(.035,.004,.004),BRASS,.001)
box('Belt utility pouch',(.175,-.035,1.02),(.080,.063,.105),LEATHER,.014,bone='root')
box('Pouch folded flap',(.177,-.068,1.054),(.083,.012,.040),LEATHER,.008,bone='root')
box('Pouch clasp',(.177,-.076,1.044),(.014,.006,.017),BRASS,.003,bone='root')
# Fit each strap edge to the actual garment surface, rather than an oversized
# ellipse that would float several centimetres above the chest/back.
bpy.context.view_layer.update()
strap_ends=[]
for front in [True,False]:
    ps=[];fs=[]
    for i in range(28):
        t=i/27;z=1.08+.43*t;x=-.135+.28*t
        for offset in [-.020,.020]:
            xx=x+offset;hits=[]
            for garment in [shirt,vest,collar]:
                hit,loc,normal,index=garment.ray_cast(Vector((xx,-1 if front else 1,z)),Vector((0,1 if front else -1,0)))
                if hit:hits.append(loc.y)
            y=(min(hits) if front else max(hits)) if hits else (-.09 if front else .075)
            ps.append((xx,y+(-.005 if front else .005),z))
        if i:fs.append((2*i-2,2*i-1,2*i+1,2*i))
    for _ in range(4):
        original_ps=[Vector(p) for p in ps]
        for j in range(2,len(ps)-2):
            y=(original_ps[j-2].y+original_ps[j].y*2+original_ps[j+2].y)/4
            p=Vector(ps[j]);p.y=min(p.y,y) if front else max(p.y,y);ps[j]=p
    strap=mesh('Leather shoulder harness',ps,fs,LEATHER);finish(strap,1,.006);skin(strap)
    tube('Harness seam',[Vector(ps[i]) + Vector((0,-.004 if front else .004,0)) for i in range(0,len(ps),2)],.0013,THREAD)
    strap_ends.append(ps[-2:])
ps=[];fs=[]
for i in range(13):
    t=i/12
    for j in range(2):
        p=Vector(strap_ends[0][j]).lerp(Vector(strap_ends[1][j]),t);p.z+=.009*math.sin(t*math.pi);ps.append(p)
    if i:fs.append((i*2-2,i*2-1,i*2+1,i*2))
bridge=mesh('Harness shoulder bridge',ps,fs,LEATHER);finish(bridge,1,.006);skin(bridge)
for side in ['L','R']:
    ankle=head('foot.'+side);x=ankle.x;y=ankle.y
    shoe=loft('Boot_'+side,[(.026,x,y-.065,.061,.141),(.035,x,y-.065,.062,.142),(.065,x,y-.067,.063,.141),(.096,x,y-.057,.060,.130),(.135,x,y-.024,.052,.088),(.190,x,y-.003,.051,.061),(.290,x*.94,y,.058,.064),(.310,x*.94,y,.059,.065)],LEATHER,n=40,close=True)
    finish(shoe,1);skin(shoe)
    sole=loft('Boot_Sole_'+side,[(.004,x,y-.066,.064,.145),(.009,x,y-.066,.065,.146),(.030,x,y-.066,.065,.146),(.035,x,y-.066,.063,.144)],DARK,n=40,close=True);finish(sole,1);skin(sole,bone='foot.'+side)
    cuff=loft('Boot cuff '+side,[(.286,x*.94,y,.062,.069),(.291,x*.94,y,.064,.071),(.310,x*.94,y,.064,.071),(.315,x*.94,y,.062,.069)],DARK,n=32);finish(cuff,1,.004);skin(cuff,bone='calf.'+side)
    for z in [.16,.22]:
        strap=loft('Boot strap '+side,[(z,x,y,.055,.068),(z+.018,x,y,.055,.068)],DARK,n=32);finish(strap,0,.003);skin(strap)
        box('Boot brass fastening '+side,(x+.047,-.064+y,z+.009),(.019,.008,.025),BRASS,.003)

rig['avatarContract']='semesta-arka-v15' if PROFILE else 'semesta-arka-v14';rig['avatarRevision']='v15-proportions' if PROFILE else 'v14-jrpg-candidate'
rig['avatarAttachments']=json.dumps({'head':'head','handL':'hand.L','handR':'hand.R','back':'chest'})
rig['avatarCapabilities']=json.dumps({'fixedAppearance':True,'expressions':True,'hands':True,'wardrobe':False})
rig['avatarExpressionContract']=json.dumps({'version':1,'targets':{k:'Expr_'+k for k in [*expression_files,'lookLeft','lookRight']},'expressions':{'neutral':{},'happy':{'smile':.7,'browUpL':.12,'browUpR':.12},'angry':{'browAngryL':.8,'browAngryR':.8,'mouthClosed':.3},'sad':{'browSadL':.8,'browSadR':.8,'frown':.5},'surprised':{'browUpL':.8,'browUpR':.8,'jawOpen':.45},'confused':{'browUpL':.75,'browAngryR':.3}},'visemes':{'rest':{},'AA':{'jawOpen':.65},'EE':{'jawOpen':.2,'mouthWide':.6},'OH':{'jawOpen':.35,'mouthRound':.65},'MBP':{'mouthClosed':.7}}})
# Tailored torso pieces follow torso bones, never a nearest thigh/upper-arm
# vertex at the hem or an armhole. This also keeps trim and panels together.
for obj in scene.objects:
    if obj.type!='MESH' or obj.get('authoringOnly'):continue
    if not any(s in obj.name for s in ['torso','collar','Waistcoat','Waistcoat bound','belt','Belt stitched','Buckle','harness','Harness']):continue
    groups={g.name:g for g in obj.vertex_groups}
    if not groups:continue
    for v in obj.data.vertices:
        z=v.co.z;chest=smooth(1.22,1.39,z);spine=smooth(1.03,1.22,z)*(1-chest)
        w={'root':1-chest-spine,'spine':spine,'chest':chest}
        for g in obj.vertex_groups:g.remove([v.index])
        for name,value in w.items():
            if value>1e-7:groups[name].add([v.index],value,'REPLACE')

if PROFILE:
    fit_profile(rig,PROFILE)

contract={'version':1,'bones':{},'poses':{'open':{'fingers':[0,0,0],'thumb':[0,0,0]},'relaxed':{'fingers':[.12,.18,.10],'thumb':[.05,.10,.08]},'point':{'fingers':[.85,1.15,.7],'index':[0,0,0],'thumb':[.2,.5,.4]},'grip':{'fingers':[.65,1.05,.7],'thumb':[.35,.65,.4]},'fist':{'fingers':[1.05,1.3,.85],'thumb':[.4,.75,.5]}}}
for side in ['L','R']:
    across=(rigdata.bones['little.01.'+side].head_local-rigdata.bones['index.01.'+side].head_local).normalized()
    palm_center=rigdata.bones['hand.'+side].head_local.lerp(rigdata.bones['middle.01.'+side].head_local,.62)
    for finger in ['thumb','index','middle','ring','little']:
        for j in range(3):
            name=f'{finger}.{j+1:02}.{side}';b=rigdata.bones[name]
            # Curl toward the palm's inside in the measured A-pose.
            direction=(b.tail_local-b.head_local).normalized()
            axis=(across-direction*across.dot(direction)).normalized()
            if side=='R':axis=-axis
            if finger=='thumb':axis=direction.cross(palm_center-b.tail_local).normalized()
            local=b.matrix_local.to_3x3().inverted()@axis
            contract['bones'][name]={'side':side,'finger':finger,'segment':j,'axis':list(local),'bodyOffsets':{}}
rig['avatarHandContract']=json.dumps(contract)
grips={}
for side in ['L','R']:
    wrist=rigdata.bones['hand.'+side];middle=rigdata.bones['middle.01.'+side]
    across=(rigdata.bones['little.01.'+side].head_local-rigdata.bones['index.01.'+side].head_local).normalized()
    long=(middle.head_local-wrist.head_local).normalized();inside=across.cross(long).normalized()*(1 if side=='L' else -1)
    position=wrist.head_local.lerp(middle.head_local,.72)+inside*.012
    local=wrist.matrix_local.inverted()@position;axis=wrist.matrix_local.to_3x3().inverted()@across
    rotation=Vector((0,0,1)).rotation_difference(axis).to_euler('XYZ')
    grips['hand'+side]={'position':list(local),'rotation':list(rotation)}
rig['avatarGripOffsets']=json.dumps(grips)

# The fixed outfit can share one skinned draw primitive per material. Keep facial
# morph objects separate. No wardrobe slots or unnecessary hidden variants ship.
for obj in scene.objects:
    if obj.type!='MESH' or obj.get('authoringOnly') or obj.data.uv_layers:continue
    layer=obj.data.uv_layers.new(name='UVMap')
    for poly in obj.data.polygons:
        axis=max(range(3),key=lambda j:abs(poly.normal[j]));axes=[j for j in range(3) if j!=axis]
        for loop in poly.loop_indices:
            p=obj.data.vertices[obj.data.loops[loop].vertex_index].co;layer.data[loop].uv=(p[axes[0]],p[axes[1]])
merge_groups=[(mat,slot) for mat in [IVORY,TEAL,PANTS,LEATHER,DARK,BRASS,THREAD] for slot in (['top','outerwear','bottom','footwear','accessoryChest','accessoryWaist'] if PROFILE else [None])]
for mat,slot in merge_groups:
    parts=[o for o in scene.objects if o.type=='MESH' and not o.get('authoringOnly') and not o.data.shape_keys and len(o.data.materials)==1 and o.data.materials[0]==mat and (slot is None or o.get('avatarSlot')==slot)]
    if len(parts)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name='Costume_'+mat.name.split(' · ')[0]

# Animation authoring is isolated so source topology/wardrobe can evolve without
# duplicating the production expressions and hand controller.
if PROFILE:
    from avatar_v15_animation import build_animations
else:
    from avatar_v14_animation import build_animations
locomotion=build_animations(rig)
rig['avatarLocomotion']=json.dumps(locomotion)
rest(rig);stage()
full.hide_set(True);full.hide_render=True
for image in bpy.data.images:
    if image.source=='FILE':image.pack()
if not args.no_export:
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for o in scene.objects:
        if o.type=='MESH' and o.name!='ReviewFloor' and not o.get('authoringOnly'):o.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(OUT/('avatar.glb' if PROFILE else 'arka-v14.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_morph=True,export_morph_normal=True,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,export_yup=True)
rest(rig);rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(1)
frame_camera('body',.35,rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('avatar.blend' if PROFILE else 'arka-v14.blend')))
for view in args.views.split(','):
    if view=='none':continue
    render('v14-'+view,'face' if view=='face' else 'body',0 if view in ['front','face'] else math.pi/2,rig=rig)
report={'revision':'v14-jrpg-candidate','name':'Arka · Penjelajah desa','base':'MakeHuman hm08, CC0 pinned in source manifests','profile':PROFILE,'heightMetres':PROFILE['height'] if PROFILE else 1.78,'scaleFromSource':SCALE,'bones':len(rigdata.bones),'sourceBodyVertices':len(body_ids),'exportedSkinVertices':len(body.data.vertices),'expressionTargets':list(expression_files),'clips':[t.name for t in rig.animation_data.nla_tracks],'locomotion':locomotion,'defaultChanged':False}
if PROFILE:report['revision']=rig['avatarRevision'];report['name']=PROFILE['id']
(OUT/'build-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('V14_BUILD_COMPLETE',flush=True)
