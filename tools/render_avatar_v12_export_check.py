"""Round-trip the exact public GLB into the source light rig for visual QA."""
from pathlib import Path
import bpy,json
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1];out=root/'ilustrasi/avatar-v2/farmer-v12-expression'
bpy.ops.wm.open_mainfile(filepath=str(out/'farmer-v12-expression.blend'))
scene=bpy.context.scene;camera=scene.camera
for o in list(scene.objects):
 if o.type in ['MESH','ARMATURE']:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(root/'public/models/characters/semesta-farmer-v12.glb'))
rig=next(o for o in scene.objects if o.type=='ARMATURE')
if rig.animation_data:
 rig.animation_data.action=None
 for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
scene.frame_set(1)
cfg=dict(outfit='tee',bottomStyle='relaxed',footwearStyle='sandals',hairStyle='short',headwear='none',accessory='none',gloves='none')
for o in scene.objects:
 if o.type!='MESH':continue
 slot=o.get('avatarSlot');field='hairStyle' if slot=='hair' else slot
 o.hide_render=bool(slot and cfg.get(field) not in list(o.get('avatarChoices',[o.get('avatarChoice')])))
 if o.data.shape_keys:
  o.data.shape_keys.animation_data_clear()
  for k in o.data.shape_keys.key_blocks:k.value=1 if k.name in ['Body_male_slender','Mouth_Neutral'] else 0
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=600;scene.render.resolution_y=750;scene.render.resolution_percentage=100
camera.data.type='ORTHO';camera.data.ortho_scale=.64;camera.location=(0,-4,1.72)
camera.rotation_euler=(Vector((0,-.025,1.67))-camera.location).to_track_quat('-Z','Y').to_euler()
for name,value in [('export-face',0),('export-speech',.85)]:
 for o in scene.objects:
  if o.type=='MESH' and o.data.shape_keys:
   k=o.data.shape_keys.key_blocks.get('expr_jawOpen')
   if k:k.value=value
 scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
print('PUBLIC_GLB_ROUNDTRIP_RENDERED')
