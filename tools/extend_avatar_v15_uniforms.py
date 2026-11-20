"""Append/rebuild only wardrobe 3; preserve all approved wardrobe 2 assets."""
import argparse,sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v14_common import *
from avatar_v15_uniforms import extend_uniforms
from avatar_v15_review import default_variants
p=argparse.ArgumentParser();p.add_argument('--profile',default='male-balanced');p.add_argument('--camo-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
folder=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'/a.profile
bpy.ops.wm.open_mainfile(filepath=str(folder/'avatar.blend'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');rest(rig)
if a.camo_only:
    from avatar_v15_uniforms import camouflage_pixels
    pixels=camouflage_pixels()
    for image in bpy.data.images:
        if image.name.startswith('V15 original woodland camouflage'):
            image.pixels.foreach_set(pixels.ravel());image.pack()
else:
    for o in list(bpy.context.scene.objects):
        if o.get('v15Uniform'):bpy.data.objects.remove(o,do_unlink=True)
    base=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('avatarSlot') and not o.get('v15Variation') and not o.get('authoringOnly')]
    skin=next(o for o in base if o.get('avatarSlot')=='skin')
    s=(max(v.co.z for v in skin.data.vertices)-rig.data.bones['head'].head_local.z)/.176471
    def tag(o,group,option,slot):
        o['v15Variation']=True;o['v15Uniform']=True;o['avatarVariantGroup']=group;o['avatarVariant']=option;o['avatarSlot']=slot
        return o
    def clone(o,group,option,change):
        n=o.copy();n.data=o.data.copy();bpy.context.collection.objects.link(n);n.name='V15_'+option+'_'+o.name;tag(n,group,option,o['avatarSlot'])
        if n.data.shape_keys:
            for key in n.data.shape_keys.key_blocks:
                for v in key.data:v.co=change(v.co.copy())
        else:
            for v in n.data.vertices:v.co=change(v.co.copy())
        return n
    def bind(o,bone):
        o.parent=rig;g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE')
        m=o.modifiers.new('V15 skin','ARMATURE');m.object=rig;return o
    extend_uniforms(rig,base,s,clone,tag,bind,None)
rig['avatarVariationRevision']='v15-wardrobe-3'
rest(rig);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in bpy.context.scene.objects:
    if o.type=='MESH' and o.get('avatarSlot') and not o.get('authoringOnly'):o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(folder/'avatar-export.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_morph=True,export_morph_normal=True,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,export_yup=True)
(folder/'avatar-export.glb').replace(folder/'avatar.glb')
default_variants()
for o in bpy.context.scene.objects:
    if o.get('avatarVariantGroup'):o.hide_set(o.hide_render)
rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(folder/'avatar-export.blend'))
(folder/'avatar-export.blend').replace(folder/'avatar.blend')
print('V15_UNIFORMS_READY',a.profile,flush=True)
