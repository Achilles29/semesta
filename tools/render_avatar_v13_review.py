"""Review source or round-tripped exported GLB, optionally render the silent demo."""
import sys,json,math,argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v13_common import *
parser=argparse.ArgumentParser();parser.add_argument('--demo',action='store_true');parser.add_argument('--export',action='store_true');parser.add_argument('--quick',action='store_true')
parser.add_argument('--only',default='');parser.add_argument('--start',type=int,default=0);parser.add_argument('--end',type=int,default=144)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.ops.wm.open_mainfile(filepath=str(OUT/'farmer-v13-body.blend'))
scene=bpy.context.scene
if args.export:
    for obj in list(scene.objects):
        if obj.type in ['MESH','ARMATURE']:bpy.data.objects.remove(obj,do_unlink=True)
    for action in list(bpy.data.actions):bpy.data.actions.remove(action)
    bpy.ops.import_scene.gltf(filepath=str(OUT/'farmer-v13-body.glb'))
rig=next(o for o in scene.objects if o.type=='ARMATURE')
prefix='export-' if args.export else 'v13-'
scene.render.resolution_x=600;scene.render.resolution_y=750;scene.render.resolution_percentage=100
rest(rig);configure(rig)
if args.export:
    # glTF import names actions with their target suffix; resolve through NLA strips.
    actions={t.name:t.strips[0].action for t in rig.animation_data.nla_tracks if t.strips}
else:actions={a.name:a for a in bpy.data.actions}
def clip(name,frame=1):
    rest(rig);rig.animation_data.action=actions[name];scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update();fit_hand_pivots(rig)

def prop():
    bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.017,depth=.16)
    obj=bpy.context.object;obj.name='ReviewGripProp'
    mat=bpy.data.materials.new('Review wood');mat.diffuse_color=(.42,.23,.08,1);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=mat.diffuse_color;obj.data.materials.append(mat)
    # Blender source coordinates; same offset as the runtime grip socket.
    obj.parent=rig;obj.parent_type='BONE';obj.parent_bone='hand.L'
    body=next((k.name for k in bpy.data.objects['Hands_Bare'].data.shape_keys.key_blocks if k.name.startswith('Body_') and k.value>.5),None)
    contract=json.loads(rig['avatarHandContract']);delta=Vector(contract['bones']['middle.01.L']['bodyOffsets'].get(body,[0,0,0]))
    palm_delta=rig.data.bones['hand.L'].matrix_local.to_3x3().inverted()@rig.data.bones['middle.01.L'].matrix_local.to_3x3()@delta
    obj.matrix_world=rig.matrix_world@rig.pose.bones['hand.L'].matrix@Matrix.Translation(Vector((-.023,.105,0))+palm_delta)
    return obj

if not args.demo:
    for name,view,angle in [('front','body',0),('side','body',math.pi/2),('back','body',math.pi),('hand','hand',0),('feet','feet',.35),('torso','torso',0),('hand-palm','hand',-math.pi/2)]:
        if args.only and args.only!=name:continue
        if args.quick and name not in ['front','hand-palm']:continue
        render(prefix+name,view,angle)
    for pose in ['relaxed','point','grip','fist']:
        if args.only and args.only!='hand-'+pose:continue
        rest(rig);hands(rig,pose);render(prefix+'hand-'+pose,'hand',-math.pi/2)
    for name,frame in [('Idle',1),('Walk',7),('Run',5),('Wave',14),('Interact',10),('Hoe',8),('Watering',12),('Harvest',12),('Sit',1),('Point',1),('Hold',1)]:
        if args.only and args.only!='pose-'+name.lower():continue
        if args.quick and name not in ['Sit','Hold','Walk']:continue
        configure(rig);clip(name,frame)
        item=prop() if name=='Hold' else None
        render(prefix+'pose-'+name.lower(),'body',.60)
        if item:bpy.data.objects.remove(item,do_unlink=True)
    if not args.quick and not args.only:
        for name,opts in [('female-plus',dict(bodyFrame='female',bodyType='plus',outfit='kebaya',bottomStyle='skirt',headwear='hijab')),('male-muscular',dict(bodyType='muscular',outfit='work-shirt',bottomStyle='cargo',footwearStyle='boots',accessory='satchel')),('female-skinny',dict(bodyFrame='female',bodyType='skinny',outfit='tunic',bottomStyle='sarong',hairStyle='bob')),('work-gloves',dict(gloves='work'))]:
            rest(rig);configure(rig,**opts);hands(rig,'relaxed');render(prefix+'variant-'+name,'body',.35)
else:
    frames=OUT/'demo-frames';frames.mkdir(exist_ok=True)
    scene.render.resolution_x=480;scene.render.resolution_y=600
    # 12 seconds, 12 fps: body turn, gait, wave, new poses and finger detail.
    stages=[('turn',2),('Walk',2),('Run',1),('Wave',1),('Sit',1),('Point',1),('Hold',1),('hands',3)]
    index=0;timings=[]
    for name,seconds in stages:
        timings.append({'start':index/12,'end':index/12+seconds,'label':name})
        configure(rig);rest(rig)
        item=None
        for i in range(seconds*12):
            if index<args.start or index>=args.end:index+=1;continue
            t=i/12
            if name=='turn':rest(rig);hands(rig,'relaxed');view='body';angle=t/seconds*math.tau
            elif name=='hands':
                rest(rig);pose=['open','point','grip'][min(2,int(t))];hands(rig,pose);view='hand';angle=-math.pi/2
            else:
                start=float(actions[name].frame_range[0]);duration=float(actions[name].frame_range[1]-start);clip(name,start+(t*24)%max(1,duration));view='body';angle=.60
                if name=='Hold' and item is None:item=prop()
            render('demo-frames/'+f'{index:04}',view,angle,samples=6);index+=1
        if item:bpy.data.objects.remove(item,do_unlink=True)
    (OUT/'demo-timing.json').write_text(json.dumps({'seconds':12,'fps':12,'audio':False,'stages':timings},indent=2))
print('V13_REVIEW_COMPLETE',prefix,'demo' if args.demo else 'stills')
