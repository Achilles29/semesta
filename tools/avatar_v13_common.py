"""Shared, side-effect-free Blender review helpers for the V13 candidate."""
import json, math
from pathlib import Path
import bpy
from mathutils import Matrix, Vector, Quaternion
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'ilustrasi/avatar-v2/farmer-v13-body'
DEFAULTS = dict(outfit='tee', bottomStyle='relaxed', footwearStyle='sandals', bodyFrame='male', bodyType='slender', hairStyle='short', headwear='none', accessory='none', gloves='none', faceShape='oval', eyeStyle='almond', noseStyle='defined', mouthStyle='neutral')

def rest(rig):
    rig.animation_data.action = None
    for track in rig.animation_data.nla_tracks: track.mute = True
    rig.location = (0,0,0)
    for bone in rig.pose.bones: bone.matrix_basis = Matrix.Identity(4)
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()

def configure(rig, **options):
    cfg = {**DEFAULTS, **options}
    bodies = json.loads(rig['avatarBodyMorphs']); identity = json.loads(rig['avatarMorphs'])
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH': continue
        slot = obj.get('avatarSlot'); field = 'hairStyle' if slot == 'hair' else slot
        visible = not slot or cfg.get(field) in list(obj.get('avatarChoices',[obj.get('avatarChoice')]))
        if slot == 'hair' and cfg['headwear'] == 'hijab': visible = False
        obj.hide_set(not visible); obj.hide_render = not visible
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks: key.value = float(key.name == bodies[cfg['bodyFrame']+'/'+cfg['bodyType']])
            for field, values in identity.items():
                key = obj.data.shape_keys.key_blocks.get(values.get(cfg[field],''))
                if key: key.value = 1
    bpy.context.view_layer.update()

def render(name, view='body', angle=.35, samples=16):
    scene = bpy.context.scene; camera = scene.camera
    target, scale = {'body':((0,0,.93),2.08), 'hand':((.405,-.025,.75),.34), 'feet':((0,-.045,.17),.56), 'torso':((0,0,1.21),.8)}[view]
    target = Vector(target)
    camera.data.type='ORTHO'; camera.data.ortho_scale=scale
    camera.location=target+Vector((math.sin(angle)*4,-math.cos(angle)*4,.08 if view!='feet' else 1.5))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='CYCLES'; scene.cycles.samples=samples; scene.cycles.use_denoising=True
    scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)

def hands(rig, pose, side=None, amount=1):
    contract=json.loads(rig['avatarHandContract']);values=contract['poses'][pose]
    for name,info in contract['bones'].items():
        if side and info['side']!=side:continue
        angle=values.get(info['finger'],values['fingers'])[info['segment']]*amount
        bone=rig.pose.bones[name];bone.rotation_mode='QUATERNION';bone.rotation_quaternion=Quaternion(Vector(info['axis']),angle)
    fit_hand_pivots(rig)
    bpy.context.view_layer.update()

def fit_hand_pivots(rig):
    obj=bpy.data.objects.get('Hands_Bare')
    if not obj or not obj.data.shape_keys:return
    body=next((k.name for k in obj.data.shape_keys.key_blocks if k.name.startswith('Body_') and k.value>.5),None)
    contract=json.loads(rig['avatarHandContract'])
    for name,info in contract['bones'].items():
        bone=rig.pose.bones[name];delta=Vector(info.get('bodyOffsets',{}).get(body,[0,0,0]))
        bone.location=delta-bone.rotation_quaternion@delta
    bpy.context.view_layer.update()

def activate(rig,name,frame=1):
    rest(rig);rig.animation_data.action=bpy.data.actions[name];bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
