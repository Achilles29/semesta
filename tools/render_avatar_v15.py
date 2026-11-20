"""Review exact exported profiles, plus matched V14/V15 locomotion renders."""
import sys,argparse,json,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import avatar_v14_common as c
from avatar_v14_common import bpy,Vector,rest,stage,render
p=argparse.ArgumentParser();p.add_argument('--profile',default='male-balanced');p.add_argument('--baseline',action='store_true');p.add_argument('--demo',action='store_true');p.add_argument('--only',default='');p.add_argument('--start',type=int,default=0);p.add_argument('--end',type=int,default=92)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
folder=c.ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions';c.OUT=folder
bpy.ops.wm.read_factory_settings(use_empty=True)
path=c.ROOT/'ilustrasi/avatar-v2/farmer-v14-jrpg/arka-v14.glb' if a.baseline else folder/a.profile/'avatar.glb'
bpy.ops.import_scene.gltf(filepath=str(path));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
from avatar_v15_review import default_variants
default_variants()
actions={t.name:t.strips[0].action for t in rig.animation_data.nla_tracks if t.strips}
stage();scene=bpy.context.scene
def pose(name,time):
    rest(rig);action=actions[name];rig.animation_data.action=action;start,end=action.frame_range
    frame=start+(time*24)%(end-start);scene.frame_set(int(frame),subframe=frame-int(frame))
    bpy.context.view_layer.update()
prefix='v14' if a.baseline else a.profile
if a.demo:
    scene.render.resolution_x=336;scene.render.resolution_y=448
    target=folder/('demo-v14' if a.baseline else 'demo-v15');target.mkdir(exist_ok=True)
    for i in range(a.start,min(a.end,92)):
        name='Walk' if i<56 else 'Run';t=i/24 if i<56 else (i-56)/24
        pose(name,t);render(str(target.relative_to(folder)/f'{i:04}'),'body',.65,samples=4,rig=rig)
else:
    for name,clip,time,angle in [('front','Idle',0,0),('side','Idle',0,math.pi/2),('back','Idle',0,math.pi),('walk','Walk',.22,.65),('run','Run',.18,.65),('run-side','Run',.2,math.pi/2)]:
        if a.only and name not in a.only.split(','):continue
        pose(clip,time);render(f'{prefix}-{name}','body',angle,samples=12,rig=rig)
    if not a.only or 'face' in a.only.split(','):
        pose('Idle',0);render(f'{prefix}-face','face',0,samples=12,rig=rig)
print('V15_REVIEW_COMPLETE',prefix)
