"""V13: fitted silhouette, articulated CC0 hands, soft joint weights and new poses.
Retains the 19 original bone rest matrices and adds 30 finger bones. No V12 writes.
"""
import sys, ast, math, json, argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v13_common import *
import bmesh
from mathutils import Quaternion
parser=argparse.ArgumentParser();parser.add_argument('--views',default='all')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'ilustrasi/avatar-v2/farmer-v12-expression/farmer-v12-expression.blend'))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.render.fps=24;rig=bpy.data.objects['SemestaV2_Rig'];rest(rig)

def smooth(a,b,x):
    t=max(0.,min(1.,(x-a)/(b-a)));return t*t*(3-2*t)

def gaussian(x,c,s):return math.exp(-((x-c)/s)**2)

def sculpt(p, obj):
    x,y,z=p;ax=abs(x);sign=1 if x>=0 else -1
    # A single deformation field fits skin, garment panels and trim together.
    torso=(1-smooth(.21,.34,ax))*smooth(.80,.92,z)*(1-smooth(1.38,1.48,z))
    shoulder=gaussian(z,1.32,.12)
    waist=gaussian(z,1.01,.13)
    p.x*=1+torso*(.075*shoulder-.055*waist)
    p.y*=1+torso*(.045*shoulder-.045*waist)
    p.z-=.018*smooth(.10,.23,ax)*gaussian(z,1.44,.055)
    # Gentle back contour / sternum, without separate anatomical primitives.
    p.y+=.008*torso*gaussian(z,1.15,.17)*smooth(0,.10,y)
    if .82<z<1.34 and ax>.26:
        arm=smooth(.26,.32,ax)*smooth(.82,.88,z)
        cx=.351+(1.075-z)*.041/.22 if z<1.075 else .255+(1.31-z)*.096/.235
        cy=-.02-(1.075-z)*.015/.22
        bulge=.15*gaussian(z,.995,.065)+.07*gaussian(z,1.22,.075)-.04*gaussian(z,.88,.035)
        p.x+=sign*(ax-cx)*bulge*arm;p.y+=(y-cy)*bulge*arm
    # Keep independent skirt/sarong envelopes; taper trousers and boots together.
    slot=obj.get('avatarSlot');choice=obj.get('avatarChoice')
    trouser=(obj.name in ['Garment_Trousers','Bottom_Cargo'] or (slot=='bottomStyle' and choice in ['relaxed','cargo']))
    if z<.84 and ax<.27 and (trouser or slot in ['footwear','footwearStyle']):
        t=(1-smooth(.60,.80,z))*smooth(.08,.12,z)
        taper=.26*gaussian(z,.18,.17)+.10*gaussian(z,.46,.08)
        p.x=sign*.101+(p.x-sign*.101)*(1-taper*t)
        p.y=.01+(p.y-.01)*(1-.18*gaussian(z,.18,.16)*t)
        p.y-=.009*gaussian(z,.47,.075)*smooth(.25,.4,z)*(1-smooth(.60,.70,z))
        if trouser:
            p.y+=.0035*math.sin((z-.14)*31+ax*9)*gaussian(z,.27,.16)
    if slot in ['footwear','footwearStyle'] and z<.20:
        factor=1-smooth(.11,.20,z)
        p.x=sign*.101+(p.x-sign*.101)*(1-.075*factor)
        p.y=-.035+(p.y+.035)*(1-.045*factor)
    # Keep the authored cut boundaries: the source omits skin hidden by clothing.
    return p

for obj in scene.objects:
    if obj.type!='MESH':continue
    if obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:
            for v in key.data:v.co=sculpt(v.co.copy(),obj)
        for v,b in zip(obj.data.vertices,obj.data.shape_keys.key_blocks[0].data):v.co=b.co
    else:
        for v in obj.data.vertices:v.co=sculpt(v.co.copy(),obj)
    obj.data.update()

def smooth_surface(obj, strength, region, steps=2):
    neighbors=[set() for v in obj.data.vertices]
    for edge in obj.data.edges:
        a,b=edge.vertices;neighbors[a].add(b);neighbors[b].add(a)
    counts={}
    for face in obj.data.polygons:
        for edge in face.edge_keys:counts[tuple(sorted(edge))]=counts.get(tuple(sorted(edge)),0)+1
    boundary={i for edge,n in counts.items() if n==1 for i in edge}
    keys=list(obj.data.shape_keys.key_blocks) if obj.data.shape_keys else []
    basis=[v.co.copy() for v in obj.data.vertices];points=[p.copy() for p in basis]
    for _ in range(steps):
        result=[]
        for i,p in enumerate(points):
            if i in boundary or not neighbors[i]:result.append(p);continue
            center=sum((points[j] for j in neighbors[i]),Vector())/len(neighbors[i])
            result.append(p.lerp(center,strength*region(p)))
        points=result
    deltas=[a-b for a,b in zip(points,basis)]
    for key in keys:
        for v,delta in zip(key.data,deltas):v.co+=delta
    for v,p in zip(obj.data.vertices,points):v.co=p
    obj.data.update()

for name in ['Hands_Bare','Hands_WorkGloves']:
    smooth_surface(bpy.data.objects[name],.32,lambda p:1-smooth(.79,.82,p.z),3)
smooth_surface(bpy.data.objects['Sandal_Feet'],.30,lambda p:1-smooth(.10,.22,p.z),3)
for name in ['Garment_Trousers','Bottom_Cargo']:
    smooth_surface(bpy.data.objects[name],.22,lambda p:gaussian(p.z,.72,.10),2)

def subdivide_hand(obj):
    """One Catmull-Clark level, identical linear topology for all identity keys."""
    old=obj.data;faces=[list(f.vertices) for f in old.polygons];n=len(old.vertices)
    edges={};incident=[[] for _ in range(n)];connected=[set() for _ in range(n)]
    for fi,face in enumerate(faces):
        for v in face:incident[v].append(fi)
        for a,b in zip(face,face[1:]+face[:1]):
            edge=tuple(sorted((a,b)));edges.setdefault(edge,[]).append(fi);connected[a].add(b);connected[b].add(a)
    edge_index={e:n+i for i,e in enumerate(edges)};face_start=n+len(edges)
    quads=[]
    for fi,face in enumerate(faces):
        for j,v in enumerate(face):quads.append((v,edge_index[tuple(sorted((v,face[(j+1)%len(face)])))],face_start+fi,edge_index[tuple(sorted((face[j-1],v)))]))
    def points(source):
        p=[v.co.copy() for v in source];centers=[sum((p[v] for v in f),Vector())/len(f) for f in faces];result=[]
        for i,v in enumerate(p):
            boundary=[j for j in connected[i] if len(edges[tuple(sorted((i,j)))])==1]
            # The hand is a swappable slot cut from the same forearm. Keep the
            # shared wrist seam exactly fixed instead of shrinking its boundary.
            if boundary:q=v.copy()
            else:
                count=len(incident[i]);f=sum((centers[j] for j in incident[i]),Vector())/count;r=sum(((p[j]+v)*.5 for j in connected[i]),Vector())/len(connected[i]);q=(f+2*r+(count-3)*v)/count
            result.append(q)
        for (a,b),fs in edges.items():result.append((p[a]+p[b]+sum((centers[i] for i in fs),Vector()))/(2+len(fs)) if len(fs)==2 else (p[a]+p[b])*.5)
        return result+centers
    keys={k.name:points(k.data) for k in old.shape_keys.key_blocks} if old.shape_keys else {'Basis':points(old.vertices)}
    data=bpy.data.meshes.new(obj.name+'_refined');data.from_pydata(keys['Basis'],[],quads);data.update()
    for mat in old.materials:data.materials.append(mat)
    obj.data=data
    for name,ps in keys.items():
        key=obj.shape_key_add(name=name)
        for v,p in zip(key.data,ps):v.co=p
    for face in data.polygons:face.use_smooth=True
for name in ['Hands_Bare','Hands_WorkGloves']:subdivide_hand(bpy.data.objects[name])

# Smooth transitions across joints for garments and skin. Do not overwrite skirts,
# rigid pocket pieces, or facial weights. Keep at most four influences per vertex.
def limb_weights(p):
    x,y,z=p;ax=abs(x);side='L' if x>0 else 'R'
    if ax>.25 and .82<=z<1.39:
        shoulder=smooth(.23,.30,ax);elbow=1-smooth(.985,1.165,z);wrist=1-smooth(.82,.90,z)
        return {'chest':1-shoulder,'upper_arm.'+side:shoulder*(1-elbow),'forearm.'+side:shoulder*elbow*(1-wrist),'hand.'+side:shoulder*elbow*wrist}
    if z<.86 and ax<.27:
        hip=(1-smooth(.64,.81,z))*(1-(1-smooth(.012,.07,ax))*smooth(.60,.72,z))
        knee=1-smooth(.375,.545,z);ankle=1-smooth(.14,.24,z)
        return {'root':1-hip,'thigh.'+side:hip*(1-knee),'calf.'+side:hip*knee*(1-ankle),'foot.'+side:hip*knee*ankle}
    return None

for obj in scene.objects:
    if obj.type!='MESH':continue
    eligible=obj.name in ['Body_Skin','Garment_Shirt','Garment_Trousers','Bottom_Cargo','Sandal_Feet'] or obj.get('avatarSlot')=='outfit' and len(obj.data.vertices)>2000
    if not eligible:continue
    groups={g.name:g for g in obj.vertex_groups}
    for v in obj.data.vertices:
        w=limb_weights(v.co)
        if not w:continue
        for g in obj.vertex_groups:g.remove([v.index])
        for name,value in w.items():
            if value>1e-7:
                if name not in groups:groups[name]=obj.vertex_groups.new(name=name)
                groups[name].add([v.index],value,'REPLACE')

# Bone centers measured from the CC0 finger topology, not primitive replacement hands.
FINGERS={
 'index':[(.415,-.051,.751),(.409,-.052,.713),(.393,-.054,.685),(.381,-.055,.661)],
 'middle':[(.423,-.021,.748),(.418,-.023,.706),(.405,-.024,.671),(.396,-.025,.648)],
 'ring':[(.425,.009,.746),(.420,.009,.708),(.410,.009,.677),(.400,.008,.655)],
 'little':[(.418,.035,.750),(.415,.035,.725),(.407,.034,.703),(.396,.034,.681)],
 'thumb':[(.389,-.060,.795),(.371,-.079,.777),(.360,-.087,.757),(.363,-.086,.742)],
}
original_matrices={b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}
bpy.context.view_layer.objects.active=rig;rig.hide_set(False)
bpy.ops.object.mode_set(mode='EDIT')
for side,sign in [('L',1),('R',-1)]:
    for name,points in FINGERS.items():
        parent=rig.data.edit_bones['hand.'+side]
        for segment in range(3):
            bone=rig.data.edit_bones.new(f'{name}.{segment+1:02}.{side}')
            bone.head=(sign*points[segment][0],*points[segment][1:]);bone.tail=(sign*points[segment+1][0],*points[segment+1][1:])
            bone.parent=parent;bone.use_connect=segment>0;parent=bone
bpy.ops.object.mode_set(mode='OBJECT')

def nearest_segment(p,points):
    best=(1e9,0,0)
    for i,(a,b) in enumerate(zip(points,points[1:])):
        a=Vector(a);b=Vector(b);t=max(0,min(1,(p-a).dot(b-a)/(b-a).length_squared));d=(p-a.lerp(b,t)).length
        if d<best[0]:best=(d,i,t)
    return best

def hand_weights(p):
    side='L' if p.x>0 else 'R';p=Vector((abs(p.x),p.y,p.z))
    thumb=smooth(-.061,-.079,p.y)*(1-smooth(.383,.406,p.x))*smooth(.725,.754,p.z)
    if thumb>.35:
        name='thumb';blend=thumb*smooth(.804,.778,p.z)
    else:
        name=min(['index','middle','ring','little'],key=lambda n:abs(p.y-FINGERS[n][0][1]))
        blend=1-smooth(.739,.770,p.z)
    _,segment,t=nearest_segment(p,FINGERS[name])
    # A feathered transition around each phalanx, not a hard ring assignment.
    weights={f'{name}.{segment+1:02}.{side}':1.}
    if t<.22 and segment>0:
        q=.5*(1-smooth(0,.22,t));weights={f'{name}.{segment:02}.{side}':q,f'{name}.{segment+1:02}.{side}':1-q}
    elif t>.78 and segment<2:
        q=.5*smooth(.78,1,t);weights={f'{name}.{segment+1:02}.{side}':1-q,f'{name}.{segment+2:02}.{side}':q}
    weights={k:v*blend for k,v in weights.items()};weights['hand.'+side]=1-blend
    return weights

for name in ['Hands_Bare','Hands_WorkGloves']:
    obj=bpy.data.objects[name];obj.vertex_groups.clear()
    groups={b.name:obj.vertex_groups.new(name=b.name) for b in rig.data.bones}
    for v in obj.data.vertices:
        for bone,w in hand_weights(v.co).items():
            if w>1e-7:groups[bone].add([v.index],w,'REPLACE')

# Swappable meshes share wrist positions but otherwise compute different edge
# normals. Blend their shading normals across the seam without joining the slots.
skin=bpy.data.objects['Body_Skin'];bare=bpy.data.objects['Hands_Bare']
skin_edge=[v for v in skin.data.vertices if abs(v.co.z-.82)<1e-5 and abs(v.co.x)>.29]
hand_edge=[v for v in bare.data.vertices if abs(v.co.z-.82)<1e-5]
seam=[]
for v in skin_edge:
    match=min(hand_edge,key=lambda h:(h.co-v.co).length_squared)
    seam.append((v.co.copy(),(v.normal+match.normal).normalized()))
for obj in [skin,bare,bpy.data.objects['Hands_WorkGloves']]:
    normals=[]
    for v in obj.data.vertices:
        normal=v.normal.copy()
        if abs(v.co.x)>.29 and .79<v.co.z<.85:
            near,n=min(seam,key=lambda item:(v.co-item[0]).length_squared)
            normal=normal.lerp(n,1-smooth(0,.03,abs(v.co.z-.82))).normalized()
        normals.append(normal)
    obj.data.normals_split_custom_set_from_vertices(normals)

# Joint axis is encoded per bone in local space; runtime never guesses handedness.
finger_contract={'version':1,'bones':{},'poses':{
 'open':{'fingers':[0,0,0],'thumb':[0,0,0]},
 'relaxed':{'fingers':[.10,.14,.09],'thumb':[.04,.07,.06]},
 'point':{'fingers':[.85,1.1,.7],'index':[0,0,0],'thumb':[.30,.42,.30]},
 'grip':{'fingers':[.70,1.00,.64],'thumb':[.40,.55,.35]},
 'fist':{'fingers':[1.05,1.30,.85],'thumb':[.50,.65,.40]},
}}
for side,sign in [('L',1),('R',-1)]:
    for finger in FINGERS:
        for j in range(3):
            name=f'{finger}.{j+1:02}.{side}';bone=rig.data.bones[name]
            axis=Vector((0,sign,0)) if finger!='thumb' else Vector((.8,sign*.6,sign*-.2)).normalized()
            local=bone.matrix_local.to_3x3().inverted()@axis
            nearest=sorted(bare.data.vertices,key=lambda v:(v.co-bone.head_local).length_squared)[:8]
            body_offsets={}
            for key in bare.data.shape_keys.key_blocks:
                if not key.name.startswith('Body_'):continue
                delta=sum((key.data[v.index].co-v.co for v in nearest),Vector())/len(nearest)
                body_offsets[key.name]=list(bone.matrix_local.to_3x3().inverted()@delta)
            finger_contract['bones'][name]={'side':side,'finger':finger,'segment':j,'axis':list(local.normalized()),'bodyOffsets':body_offsets}
rig['avatarHandContract']=json.dumps(finger_contract)

def hand_pose(pose,side=None):
    values=finger_contract['poses'][pose]
    for name,info in finger_contract['bones'].items():
        if side and info['side']!=side:continue
        angle=values.get(info['finger'],values['fingers'])[info['segment']]
        bone=rig.pose.bones[name];bone.rotation_mode='QUATERNION';bone.rotation_quaternion=Quaternion(Vector(info['axis']),angle)

def world_rotation(name,axis,angle):
    bone=rig.pose.bones[name];r=rig.data.bones[name].matrix_local.to_quaternion()
    bone.rotation_mode='XYZ';bone.rotation_euler=(r.inverted()@Quaternion(Vector(axis),angle)@r).to_euler('XYZ')

# Keep old clips and add authored presentation poses. Finger keys in every clip
# prevent residual poses when switching from Point/Hold back to legacy actions.
old_tracks=list(rig.animation_data.nla_tracks)
for track in old_tracks:
    for strip in track.strips:
        rest(rig);rig.animation_data.action=strip.action
        for frame in strip.action.frame_range:
            hand_pose('open' if strip.action.name=='Wave' else 'relaxed')
            for name in finger_contract['bones']:rig.pose.bones[name].keyframe_insert(data_path='rotation_quaternion',frame=frame,group='Fingers')
rest(rig)
# Contact-aware in-place locomotion: bake two-bone leg IK, no runtime IK solver.
# During stance the foot stays level and moves backward at constant speed; the
# matching forward actor speed is recorded for consumers that move the character.
def aim_bone(name,head,tail):
    bone=rig.pose.bones[name];source=rig.data.bones[name]
    rotation=(source.tail_local-source.head_local).rotation_difference(tail-head)@source.matrix_local.to_quaternion()
    bone.matrix=Matrix.Translation(head)@rotation.to_matrix().to_4x4()
    bpy.context.view_layer.update()

gait_report={}
for name,frames,stride,stance,lift in [('Walk',24,.28,.60,.085),('Run',16,.40,.42,.14)]:
    for track in list(rig.animation_data.nla_tracks):
        if track.name==name:rig.animation_data.nla_tracks.remove(track)
    prior=bpy.data.actions.get(name)
    if prior:bpy.data.actions.remove(prior)
    action=bpy.data.actions.new(name);rig.animation_data.action=action
    gait_report[name]={'duration':frames/24,'stanceFraction':stance,'strideDistance':stride,'recommendedForwardSpeed':stride/(frames/24*stance),'floor':0}
    for frame in range(frames+1):
        scene.frame_set(frame)
        for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
        t=frame/frames
        dz=(-.042 if name=='Walk' else -.075)+(.008 if name=='Walk' else .024)*(1-math.cos(4*math.pi*t))
        root=rig.pose.bones['root'];root.location=root.bone.matrix_local.to_3x3().inverted()@Vector((0,0,dz))
        bpy.context.view_layer.update()
        for side,offset in [('L',0),('R',.5)]:
            phase=(t+offset)%1
            if phase<stance:
                y=-stride/2+stride*phase/stance;z=.133
            else:
                q=(phase-stance)/(1-stance)
                y=stride/2-stride*smooth(0,1,q);z=.133+lift*math.sin(math.pi*q)
            thigh=rig.data.bones['thigh.'+side];calf=rig.data.bones['calf.'+side]
            h=thigh.head_local+Vector((0,0,dz));a=Vector((h.x,y,z));delta=a-h;distance=delta.length;u=delta.normalized()
            l1=thigh.length;l2=calf.length
            assert distance<l1+l2-.001, f'Unreachable foot target {name} {frame} {side}'
            along=(l1*l1-l2*l2+distance*distance)/(2*distance)
            pole=Vector((0,-1,0));pole=(pole-u*pole.dot(u)).normalized()
            knee=h+u*along+pole*math.sqrt(max(0,l1*l1-along*along))
            aim_bone('thigh.'+side,h,knee);aim_bone('calf.'+side,knee,a)
            foot=rig.pose.bones['foot.'+side]
            foot.matrix=Matrix.Translation(a)@rig.data.bones[foot.name].matrix_local.to_quaternion().to_matrix().to_4x4()
            swing=math.sin((t+offset)*math.tau)*(.20 if name=='Walk' else .40)
            world_rotation('upper_arm.'+side,(1,0,0),swing)
            world_rotation('forearm.'+side,(1,0,0),-.15 if name=='Walk' else -.70)
        hand_pose('relaxed')
        for bone in rig.pose.bones:
            bone.keyframe_insert(data_path='rotation_quaternion' if bone.name in finger_contract['bones'] else 'rotation_euler',frame=frame,group=bone.name)
            bone.keyframe_insert(data_path='location',frame=frame,group=bone.name)
        for curve in action.fcurves:
            for key in curve.keyframe_points:key.interpolation='LINEAR'
    track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
    rest(rig)
rig['avatarLocomotion']=json.dumps(gait_report)
for name in ['Sit','Point','Hold']:
    action=bpy.data.actions.new(name);rig.animation_data.action=action
    for frame in [1,25,49]:
        for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
        hand_pose('relaxed')
        if name=='Sit':
            # Pelvis descends; thighs point forward and shins stay approximately vertical.
            root=rig.pose.bones['root'];root.location=root.bone.matrix_local.to_3x3().inverted()@Vector((0,0,-.30))
            for side in ['L','R']:
                world_rotation('thigh.'+side,(1,0,0),-1.45)
                world_rotation('calf.'+side,(1,0,0),1.45)
                world_rotation('upper_arm.'+side,(1,0,0),-.30)
                world_rotation('forearm.'+side,(1,0,0),-.55)
        elif name=='Point':
            world_rotation('upper_arm.L',(1,0,0),-1.2)
            world_rotation('forearm.L',(1,0,0),-.30)
            hand_pose('point','L')
        else:
            for side in ['L','R']:
                world_rotation('upper_arm.'+side,(1,0,0),-.18)
                world_rotation('forearm.'+side,(1,0,0),-1.18)
                hand_pose('grip',side)
        for bone in rig.pose.bones:
            bone.keyframe_insert(data_path='rotation_quaternion' if bone.name in finger_contract['bones'] else 'rotation_euler',frame=frame,group=bone.name)
            bone.keyframe_insert(data_path='location',frame=frame,group=bone.name)
    track=rig.animation_data.nla_tracks.new();track.name=name
    track.strips.new(name,1,action);track.mute=True
rest(rig)
rig['avatarRevision']='v13-body-candidate'
rig['avatarSkeletonExtension']=json.dumps({'version':1,'baseBones':19,'fingerBones':30,'legacyRestMatricesPreserved':True})
# A dedicated grip socket can evolve without changing existing hand attachments.
rig['avatarGripOffsets']=json.dumps({'handL':{'position':[-.023,.105,0],'rotation':[0,0,0]},'handR':{'position':[.023,.105,0],'rotation':[0,0,0]}})
configure(rig)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'farmer-v13-body.blend'))
for obj in scene.objects:
    obj.hide_set(False);obj.hide_render=False
    if obj.type=='MESH' and obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:key.value=0
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in scene.objects:
    if obj.type=='MESH':obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'farmer-v13-body.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_morph=True,export_morph_normal=False,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,export_yup=True)
configure(rig);rest(rig)
scene.render.resolution_x=600;scene.render.resolution_y=750;scene.render.resolution_percentage=100
if args.views!='none':
    for name,view,angle in [('front','body',0),('side','body',math.pi/2),('back','body',math.pi),('hand','hand',0),('feet','feet',.35),('torso','torso',0),('hand-palm','hand',-math.pi/2)]:
        if args.views=='all' or name in args.views.split(','):render('v13-'+name,view,angle)
report={'revision':'v13-body-candidate','source':'V12 and inherited Blender Studio CC0 topology','baseBones':19,'fingerBones':30,'clips':[t.name for t in rig.animation_data.nla_tracks],'handContract':finger_contract,'locomotion':gait_report,'defaultGameChanged':False,'legacyRestMatrices':original_matrices,'limitations':['No cloth physics; extreme skirt and sarong poses require review','In-place gait requires matching actor speed; no uneven-terrain IK','Offline render is not browser GPU performance']}
(OUT/'build-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('V13_BUILD_COMPLETE')
