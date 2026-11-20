"""Render editable source, exact reimported GLB, or V13 in the same studio."""
import sys, argparse, json, math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v14_common import *
parser=argparse.ArgumentParser();parser.add_argument('--export',action='store_true');parser.add_argument('--baseline',action='store_true');parser.add_argument('--demo',action='store_true');parser.add_argument('--only',default='');parser.add_argument('--start',type=int,default=0);parser.add_argument('--end',type=int,default=168)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.ops.wm.open_mainfile(filepath=str(OUT/'arka-v14.blend'));scene=bpy.context.scene
if args.export or args.baseline:
    for obj in list(scene.objects):
        if obj.type=='ARMATURE' or obj.type=='MESH' and obj.name!='ReviewFloor':bpy.data.objects.remove(obj,do_unlink=True)
    for action in list(bpy.data.actions):bpy.data.actions.remove(action)
    path=ROOT/'ilustrasi/avatar-v2/farmer-v13-body/farmer-v13-body.glb' if args.baseline else OUT/'arka-v14.glb'
    bpy.ops.import_scene.gltf(filepath=str(path))
rig=next(o for o in scene.objects if o.type=='ARMATURE')
actions={t.name:t.strips[0].action for t in rig.animation_data.nla_tracks if t.strips}
if not actions:actions={a.name:a for a in bpy.data.actions}
prefix='v13' if args.baseline else 'export' if args.export else 'v14'
if args.baseline:
    from avatar_v13_common import configure
    configure(rig)

def clip(name,time=0):
    rest(rig);rig.animation_data.action=actions[name]
    start,end=actions[name].frame_range;frame=start+(time*24)%max(1,end-start)
    scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()

def prop():
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.014,depth=.19)
    obj=bpy.context.object;obj.name='ReviewGripProp';obj.data.materials.append(material('Review wood',(.24,.10,.025),.75))
    data=json.loads(rig['avatarGripOffsets'])['handL'];obj.parent=rig;obj.parent_type='BONE';obj.parent_bone='hand.L'
    from mathutils import Euler
    obj.matrix_world=rig.matrix_world@rig.pose.bones['hand.L'].matrix@Matrix.Translation(Vector(data['position']))@Euler(data['rotation'],'XYZ').to_matrix().to_4x4()
    return obj

if args.demo:
    (OUT/'demo-frames').mkdir(exist_ok=True);scene.render.resolution_x=400;scene.render.resolution_y=520
    stages=[('turn',3),('Walk',2),('Run',1),('Wave',1),('Sit',1),('Point',1),('Hold',1),('face',2),('hands',2)]
    index=0;timings=[]
    for name,duration in stages:
        timings.append(dict(start=index/12,end=index/12+duration,label=name));item=None
        for i in range(duration*12):
            if not args.start<=index<args.end:index+=1;continue
            t=i/12;view='body';angle=.35
            if name=='turn':clip('Idle',t);angle=t/duration*math.tau
            elif name=='face':
                clip('Idle',t);view='face';expression(rig,'happy' if t<1 else 'angry',viseme=['rest','AA','EE','OH'][int(t*4)%4],blink=max(0,1-abs(t-.70)/.10))
            elif name=='hands':clip('Idle',t);rig.animation_data.action=None;view='hand';angle=1.3;hand_pose(rig,'point' if t<1 else 'grip')
            else:
                clip(name,t)
                if name=='Hold' and item is None:item=prop()
            render('demo-frames/'+f'{index:04}',view,angle,samples=6,rig=rig);index+=1
        if item:bpy.data.objects.remove(item,do_unlink=True)
    (OUT/'demo-timing.json').write_text(json.dumps(dict(seconds=14,fps=12,audio=False,source='Blender source',stages=timings),indent=2))
else:
    requests=[('front','body',0,'Idle'),('side','body',math.pi/2,'Idle'),('back','body',math.pi,'Idle'),('three-quarter','body',.5,'Idle'),('face','face',0,'Idle'),('face-side','face',1.2,'Idle'),('torso','torso',.25,'Idle'),('feet','feet',.35,'Idle'),('hand','hand',1.3,'Idle')]
    if not args.baseline:
        requests += [('pose-'+n.lower(),'body',.60,n) for n in ['Walk','Run','Wave','Sit','Point','Hold']]
        requests += [('hand-'+n,'hand',1.3,'Idle') for n in ['open','point','grip','fist']]
        requests += [('face-'+n,'face',.12,'Idle') for n in ['happy','angry','sad','blink','AA','OH']]
    for name,view,angle,animation in requests:
        if args.only and name not in args.only.split(','):continue
        clip(animation,.20 if animation in ['Walk','Run'] else 0)
        if name.startswith('hand-'):rig.animation_data.action=None;hand_pose(rig,name[5:])
        if name.startswith('face-') and name!='face-side':
            n=name[5:];expression(rig,n,viseme=n if n in ['AA','OH'] else 'rest',blink=1 if n=='blink' else 0)
        item=prop() if animation=='Hold' else None
        render(prefix+'-'+name,view,angle,samples=24,rig=rig)
        if item:bpy.data.objects.remove(item,do_unlink=True)
print('V14_REVIEW_COMPLETE',prefix,flush=True)
