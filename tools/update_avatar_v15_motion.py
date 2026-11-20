"""Rebake locomotion while preserving the existing profile mesh and materials."""
import sys,json,argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v14_common import *
from avatar_v15_animation import rebuild_locomotion,REVISION
p=argparse.ArgumentParser();p.add_argument('--profile',default='male-balanced')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
folder=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'/a.profile
bpy.ops.wm.open_mainfile(filepath=str(folder/'avatar.blend'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
rest(rig);gait=rebuild_locomotion(rig);rig['avatarLocomotion']=json.dumps(gait)
rest(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in bpy.context.scene.objects:
    if o.type=='MESH' and o.name!='ReviewFloor' and not o.get('authoringOnly'):o.hide_set(False);o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(folder/'avatar.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_morph=True,export_morph_normal=True,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,export_yup=True)
rest(rig);rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1)
from avatar_v15_review import default_variants
default_variants()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(folder/'avatar.blend'))
report=json.loads((folder/'build-report.json').read_text());report.update(revision=REVISION,locomotion=gait)
(folder/'build-report.json').write_text(json.dumps(report,indent=2))
print('V15_MOTION_UPDATED',a.profile,flush=True)
