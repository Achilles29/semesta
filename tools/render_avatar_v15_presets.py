"""Render shipped GLBs with the same catalog selections used by the game."""
import sys,json,argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import avatar_v14_common as c
from avatar_v14_common import *
p=argparse.ArgumentParser();p.add_argument('--ids',default='');p.add_argument('--face',action='store_true');p.add_argument('--clip',default='Idle');p.add_argument('--angle',type=float,default=.1);p.add_argument('--bottoms',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
presets=json.loads((ROOT/'game-src/avatar-v15-presets.json').read_text(encoding='utf-8'));catalog=json.loads((ROOT/'game-src/avatar-v15-catalog.json').read_text(encoding='utf-8'))
out=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions/presets';out.mkdir(exist_ok=True);c.OUT=out
if a.bottoms:
    import copy
    seed=copy.deepcopy(presets[0]);seed['config']['appearance'].update(topStyle='linen',outerwearStyle='none',accessoryChest='off',accessoryWaist='off',headAccessory='none',faceAccessory='none',handAccessory='none',palette='indigo',shoeStyle='sneakers')
    presets=[]
    for style in catalog['fields']['bottomStyle']['options']:
        item=copy.deepcopy(seed);item['id']='wardrobe-bottom-'+style;item['config']['appearance']['bottomStyle']=style;presets.append(item)
morphs={'faceShape':{'round':'faceRound','angular':'faceAngular'},'eyeShape':{'almond':'eyeAlmond','round':'eyeRound'},'noseShape':{'broad':'noseBroad','defined':'noseDefined'},'mouthShape':{'wide':'mouthWide','full':'mouthFull'},'earShape':{'prominent':'earProminent','tapered':'earTapered'}}
loaded_profile=None
for preset in sorted(presets,key=lambda p:p['config']['profileId']):
    if a.ids and preset['id'] not in a.ids.split(','):continue
    config=preset['config'];appearance=config['appearance']
    if config['profileId']!=loaded_profile:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'/config['profileId']/'avatar.glb'))
        rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
        avatar_objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
        source_materials={o.name:list(o.data.materials) for o in avatar_objects}
        stage();loaded_profile=config['profileId']
    rest(rig)
    rig.animation_data.action=next(t.strips[0].action for t in rig.animation_data.nla_tracks if t.name==a.clip);bpy.context.scene.frame_set(1 if a.clip=='Idle' else 6)
    for o in avatar_objects:
        slot=o.get('avatarSlot');group=o.get('avatarVariantGroup');variant=o.get('avatarVariant')
        visible=appearance.get(group)==variant if group else appearance.get(slot)=='on' if slot in ['accessoryChest','accessoryWaist'] else True
        if slot=='hair' and appearance['headAccessory'] in catalog['hairCoveringHeadwear']:visible=False
        if appearance['topStyle'] in catalog['coveredTopStyles'] and slot in ['outerwear','accessoryChest','accessoryWaist']:visible=False
        o.hide_render=not visible
        if o.data.shape_keys:
            fit=o.data.shape_keys.key_blocks.get('Id_OuterwearFit')
            if fit:fit.value=int(appearance['outerwearStyle']=='longVest')
            for field,options in morphs.items():
                key=o.data.shape_keys.key_blocks.get('Id_'+options.get(appearance[field],''))
                if key:key.value=1
        for i,original in enumerate(source_materials[o.name]):
            mat=original.copy();o.data.materials[i]=mat
            factor=catalog['skinTones'][appearance['skinTone']]['factor'] if slot=='skin' else catalog['hairColors'][appearance['hairColor']]['factor'] if slot in ['hair','brows'] else None if o.get('avatarFixedColor') else catalog['palettes'][appearance['palette']].get(slot)
            if not factor:continue
            bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');socket=bsdf.inputs['Base Color']
            if socket.is_linked:
                link=socket.links[0];source=link.from_socket;mat.node_tree.links.remove(link)
                multiply=mat.node_tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=(*factor,1)
                mat.node_tree.links.new(source,multiply.inputs[1]);mat.node_tree.links.new(multiply.outputs[0],socket)
            else:socket.default_value=tuple(socket.default_value[j]*factor[j] for j in range(3))+(1,)
    scene=bpy.context.scene;scene.render.resolution_x=360;scene.render.resolution_y=460
    suffix=('-face' if a.face else '')+('-'+a.clip.lower() if a.clip!='Idle' else '')+('-back' if a.angle>2 else '-side' if a.angle>1 else '')
    render(preset['id']+suffix,'face' if a.face else 'body',a.angle,samples=8,rig=rig)
    print('PRESET_RENDERED',preset['id'],flush=True)
