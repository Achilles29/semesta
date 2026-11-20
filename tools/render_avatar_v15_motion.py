"""Inspect the exported locomotion at real clip speed, front and side."""
import sys,argparse,math,json,shutil
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import avatar_v14_common as c
from avatar_v14_common import *
p=argparse.ArgumentParser();p.add_argument('--profile',default='male-balanced');p.add_argument('--sheet',action='store_true');p.add_argument('--start',type=int,default=0);p.add_argument('--end',type=int,default=92)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
folder=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions';c.OUT=folder
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(folder/a.profile/'avatar.glb'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
from avatar_v15_review import default_variants
default_variants()
actions={t.name:t.strips[0].action for t in rig.animation_data.nla_tracks if t.strips}
stage();scene=bpy.context.scene;scene.render.resolution_x=280;scene.render.resolution_y=400
target=folder/('motion-sheet' if a.sheet else 'motion-cmu')/a.profile;target.mkdir(exist_ok=True,parents=True)
for i in (range(12) if a.sheet else range(a.start,a.end)):
    name='Walk' if i<(6 if a.sheet else 52) else 'Run'
    action=actions[name];rest(rig);rig.animation_data.action=action;start,end=action.frame_range
    frame=start+(i%6)/6*(end-start) if a.sheet else start+((i if name=='Walk' else i-52)%(end-start))
    scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
    for view,angle in [('front',0),('side',math.pi/2)]:
        previous=i-26 if 26<=i<52 else i-20 if i>=72 else -1
        if not a.sheet and previous>=a.start:
            shutil.copyfile(target/f'{previous:04}-{view}.png',target/f'{i:04}-{view}.png');continue
        render(str(target.relative_to(folder)/f'{i:04}-{view}'),'body',angle,samples=4,rig=rig)
print('MOTION_REVIEW_COMPLETE',a.profile)
