"""Render shipped GLBs with the same catalog selections used by the game."""
import sys,json,argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import avatar_v14_common as c
from avatar_v14_common import *
from citizen_accessories import add_citizen_accessories
p=argparse.ArgumentParser();p.add_argument('--ids',default='');p.add_argument('--face',action='store_true');p.add_argument('--faces',action='store_true');p.add_argument('--clip',default='Idle');p.add_argument('--angle',type=float,default=.1);p.add_argument('--bottoms',action='store_true');p.add_argument('--frame',type=int);p.add_argument('--samples',type=int,default=8);p.add_argument('--output-dir');p.add_argument('--presets-json');a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
presets=json.loads((Path(a.presets_json) if a.presets_json else ROOT/'game-src/avatar-v15-presets.json').read_text(encoding='utf-8'));catalog=json.loads((ROOT/'game-src/avatar-v15-catalog.json').read_text(encoding='utf-8'))
out=Path(a.output_dir).resolve() if a.output_dir else ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions/presets';out.mkdir(parents=True,exist_ok=True);c.OUT=out
if a.bottoms:
    import copy
    seed=copy.deepcopy(presets[0]);seed['config']['appearance'].update(topStyle='linen',outerwearStyle='none',accessoryChest='off',accessoryWaist='off',headAccessory='none',faceAccessory='none',handAccessory='none',palette='indigo',shoeStyle='sneakers')
    presets=[]
    for style in catalog['fields']['bottomStyle']['options']:
        item=copy.deepcopy(seed);item['id']='wardrobe-bottom-'+style;item['config']['appearance']['bottomStyle']=style;presets.append(item)
morphs={'faceShape':{'round':'faceRound','angular':'faceAngular','square':'faceSquare','long':'faceLong','senior':'faceSenior','prabowow':'facePrabowow'},'eyeShape':{'almond':'eyeAlmond','round':'eyeRound'},'noseShape':{'broad':'noseBroad','defined':'noseDefined'},'mouthShape':{'wide':'mouthWide','full':'mouthFull'},'earShape':{'prominent':'earProminent','tapered':'earTapered'}}
loaded_profile=None
if a.faces:
    import copy
    seed=next(p for p in presets if p['id']=='v15-prabowo-inspired');presets=[];a.face=True
    for shape in catalog['fields']['faceShape']['options']:
        item=copy.deepcopy(seed);item['id']='identity-'+shape;item['config']['appearance']['faceShape']=shape;presets.append(item)
for preset in sorted(presets,key=lambda p:p['config']['profileId']):
    if a.ids and preset['id'] not in a.ids.split(','):continue
    config=preset['config'];appearance=config['appearance']
    if config['profileId']!=loaded_profile:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'/config['profileId']/'avatar.glb'))
        rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
        avatar_objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
        for obj in avatar_objects:
            parent=obj.parent
            while not obj.get('avatarSlot') and parent:
                if parent.get('avatarSlot'):
                    for key in ['avatarSlot','avatarVariantGroup','avatarVariant','avatarFixedColor','avatarTintMode','avatarVisibleFor','avatarNeutralAlbedo']:
                        if key in parent and key not in obj:obj[key]=parent[key]
                parent=parent.parent
        source_materials={o.name:list(o.data.materials) for o in avatar_objects}
        stage();loaded_profile=config['profileId']
    rest(rig)
    rig.animation_data.action=next(t.strips[0].action for t in rig.animation_data.nla_tracks if t.name==a.clip);bpy.context.scene.frame_set(a.frame if a.frame is not None else 1 if a.clip=='Idle' else 6)
    for o in avatar_objects:
        slot=o.get('avatarSlot');group=o.get('avatarVariantGroup');variant=o.get('avatarVariant')
        visible=appearance.get(group)==variant if group else appearance.get(slot)=='on' if slot in ['accessoryChest','accessoryWaist'] else True
        if o.get('avatarVisibleFor'):
            coverage=json.loads(o['avatarVisibleFor']) if isinstance(o['avatarVisibleFor'],str) else o['avatarVisibleFor']
            visible=any(appearance.get(field) in values for field,values in coverage.items())
        if slot=='hair' and appearance['headAccessory'] in catalog['hairCoveringHeadwear']:visible=False
        if appearance['topStyle'] in catalog['coveredTopStyles'] and slot in ['outerwear','accessoryChest','accessoryWaist']:visible=False
        o.hide_render=not visible
        if o.data.shape_keys:
            for key in o.data.shape_keys.key_blocks:
                if key.name.startswith('Id_'):key.value=0
            fit=o.data.shape_keys.key_blocks.get('Id_OuterwearFit')
            if fit:fit.value=int(appearance['outerwearStyle']=='longVest')
            for field,options in morphs.items():
                key=o.data.shape_keys.key_blocks.get('Id_'+options.get(appearance[field],''))
                if key:key.value=1
        for i,original in enumerate(source_materials[o.name]):
            retired=o.data.materials[i];mat=original.copy();mat['portraitTemporary']=True;o.data.materials[i]=mat
            if retired.get('portraitTemporary') and retired.users==0:bpy.data.materials.remove(retired)
            absolute=slot=='skin' or o.get('avatarTintMode')=='absolute'
            if slot=='skin':factor=catalog['skinTones'][appearance['skinTone']]['factor']
            elif slot in ['hair','brows']:
                color=catalog['hairColors'][appearance['hairColor']]
                factor=color.get('absolute',color['factor']) if absolute else color['factor']
            elif o.get('avatarFixedColor'):factor=None
            else:
                palette=catalog['palettes'][appearance['palette']]
                factor=palette.get('absolute',{}).get(slot,palette.get(slot)) if absolute else palette.get(slot)
            if o.get('avatarFixedColor') and slot not in ['skin','hair','brows']:
                assert factor is None, 'Uniforms, badges and soles must preserve their authored colour'
            if not factor:continue
            bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');socket=bsdf.inputs['Base Color']
            if socket.is_linked:
                link=socket.links[0];source=link.from_socket;mat.node_tree.links.remove(link)
                if absolute:
                    # glTF import may already multiply the albedo by its original
                    # factor. Replace that factor, exactly as Three does.
                    visited=set()
                    def albedo(node):
                        if node in visited:return None
                        visited.add(node)
                        if node.type=='TEX_IMAGE':return node.outputs['Color']
                        for inp in node.inputs:
                            for edge in inp.links:
                                found=albedo(edge.from_node)
                                if found is not None:return found
                        return None
                    image_source=albedo(source.node)
                    if image_source is not None:source=image_source
                multiply=mat.node_tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=(*factor,1)
                mat.node_tree.links.new(source,multiply.inputs[1]);mat.node_tree.links.new(multiply.outputs[0],socket)
            else:socket.default_value=tuple(factor if absolute else [socket.default_value[j]*factor[j] for j in range(3)])+(1,)
    add_citizen_accessories(rig,preset,avatar_objects)
    scene=bpy.context.scene;scene.render.resolution_x=360;scene.render.resolution_y=460
    # Factory settings/import can reset the CLI thread count. Keep batch
    # portrait rendering from consuming every core during asset builds.
    scene.render.threads_mode='FIXED';scene.render.threads=4
    suffix=('-face' if a.face else '')+('-'+a.clip.lower() if a.clip!='Idle' else '')+('-back' if a.angle>2 else '-side' if a.angle>1 else '')
    if a.frame is not None:suffix+='-f'+str(a.frame)
    render(preset['id']+suffix,'face' if a.face else 'body',a.angle,samples=a.samples,rig=rig)
    print('PRESET_RENDERED',preset['id'],flush=True)
