"""Render reproducible stills and a silent facial demonstration from the source.
This is an offline Blender review, not a screenshot or browser FPS measurement.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'ilustrasi/avatar-v2/farmer-v12-expression'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'farmer-v12-expression.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['SemestaV2_Rig'];camera=scene.camera
contract=json.loads(rig['avatarExpressionContract']);identity=json.loads(rig['avatarMorphs']);bodies=json.loads(rig['avatarBodyMorphs'])
defaults=dict(outfit='tee',bottomStyle='relaxed',footwearStyle='sandals',bodyFrame='male',bodyType='slender',hairStyle='short',headwear='none',accessory='none',gloves='none',faceShape='oval',eyeStyle='almond',noseStyle='defined',mouthStyle='neutral')
def config(**options):
 cfg={**defaults,**options}
 for o in scene.objects:
  if o.type!='MESH':continue
  slot=o.get('avatarSlot');field='hairStyle' if slot=='hair' else slot
  vis=not slot or cfg.get(field) in list(o.get('avatarChoices',[o.get('avatarChoice')]))
  if slot=='hair' and cfg['headwear']=='hijab':vis=False
  o.hide_set(not vis);o.hide_render=not vis
  if o.data.shape_keys:
   for k in o.data.shape_keys.key_blocks:k.value=1 if k.name==bodies[cfg['bodyFrame']+'/'+cfg['bodyType']] else 0
   for field,values in identity.items():
    k=o.data.shape_keys.key_blocks.get(values.get(cfg[field],''))
    if k:k.value=1
def face(values):
 for o in scene.objects:
  if o.type=='MESH' and o.data.shape_keys:
   for k in o.data.shape_keys.key_blocks:
    if k.name.startswith('expr_'):k.value=values.get(k.name[5:],0)
def rest():
 rig.animation_data.action=None;rig.location.z=0
 for t in rig.animation_data.nla_tracks:t.mute=True
 for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
 scene.frame_set(1)
def render(name,close=False,angle=.45):
 target=Vector((0,-.025,1.65 if close else .96));camera.data.type='ORTHO';camera.data.ortho_scale=.64 if close else 2.1
 camera.location=(math.sin(angle)*4,-math.cos(angle)*4,target.z+.08);camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=560;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for name,options in [('variant-female-plus',dict(bodyFrame='female',bodyType='plus',outfit='kebaya',bottomStyle='skirt',headwear='hijab')),('variant-male-muscular',dict(bodyType='muscular',outfit='work-shirt',bottomStyle='cargo',footwearStyle='boots',accessory='satchel')),('variant-female-slim',dict(bodyFrame='female',bodyType='skinny',hairStyle='bob',outfit='tunic',bottomStyle='sarong'))]:
 rest();config(**options);render(name)
for clip,frame in [('Walk',7),('Run',7),('Wave',14),('Interact',10)]:
 rest();config();rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame);render('pose-'+clip.lower())
rest();config()
for side in ['L','R']:
 rig.pose.bones['thigh.'+side].rotation_mode='XYZ';rig.pose.bones['thigh.'+side].rotation_euler.x=-1.35
 rig.pose.bones['calf.'+side].rotation_mode='XYZ';rig.pose.bones['calf.'+side].rotation_euler.x=1.35
bpy.context.view_layer.update()
feet=bpy.data.objects.get('Sandal_Feet')
if feet:
 evaluated=feet.evaluated_get(bpy.context.evaluated_depsgraph_get());rig.location.z=-min((evaluated.matrix_world@v.co).z for v in evaluated.data.vertices)
render('pose-seated')
rest();config()
# 6-second demonstration, 12 fps. Deterministic blink / expression / visemes.
# No generated speech and no claim of synchronized dialogue.
scene.render.resolution_x=400;scene.render.resolution_y=500;scene.cycles.samples=6
frames=OUT/'demo-frames';frames.mkdir(exist_ok=True)
for frame in range(72):
 t=frame/12;stage=int(t)
 values={}
 if stage==0:values={'blinkL':max(0,1-abs(t-.5)/.14),'blinkR':max(0,1-abs(t-.5)/.14)}
 elif stage==1:values={'smile':math.sin((t-1)*math.pi)*.8}
 elif stage==2:values={'browUpL':.7,'lookLeft':.5}
 elif stage==3:values={'browAngry':.7,'frown':.5}
 else:
  names=['AA','EE','OH','MBP'];values=contract['visemes'][names[int(t*4)%4]].copy();values['browUp']=.2
 face(values);render('demo-frames/'+f'{frame:03}',True,.2)
(OUT/'review-scenes.json').write_text(json.dumps({'offlineRenderer':'Blender Cycles','demoSeconds':6,'demoFps':12,'audio':False,'poses':['Walk','Run','Wave','Interact','manual seated'],'variants':3,'limitations':['Offline frames do not certify browser lighting or GPU performance','Manual seated pose is a review pose, not an exported animation clip','Inherited nineteen-bone skeleton has no articulated fingers']},indent=2),encoding='utf-8')
print('V12_REVIEW_COMPLETE')
