"""Rebuild citizen cosmetics while preserving V15 rig and motion contracts."""
import sys,argparse,shutil,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v14_common import *
from avatar_v15_citizen_beauty import build_beauty
from avatar_v15_citizen_fashion import build_fashion
from avatar_v15_citizen_professions import build_professions

p=argparse.ArgumentParser()
p.add_argument('--profiles',default='female-balanced')
p.add_argument('--fashion-only',action='store_true',help='Compatibility alias for --parts fashion')
p.add_argument('--parts',default='beauty,fashion,professions',help='Comma-separated modules to rebuild')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
builders={'beauty':build_beauty,'fashion':build_fashion,'professions':build_professions}
parts=['fashion'] if a.fashion_only else a.parts.split(',')
if not parts or len(set(parts))!=len(parts) or any(part not in builders for part in parts):
    p.error('--parts must contain unique names from beauty,fashion,professions')
out=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'
for profile in a.profiles.split(','):
    folder=out/profile
    backup=Path('C:/tmp/republik-citizens-before-art-revision')/profile;backup.mkdir(parents=True,exist_ok=True)
    for name in ['avatar.blend','avatar.glb']:
        if not (backup/name).exists(): shutil.copy2(folder/name,backup/name)
    bpy.ops.wm.open_mainfile(filepath=str(folder/'avatar.blend'))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    import avatar_v15_citizen_common
    avatar_v15_citizen_common._cache.clear()
    rest(rig)
    bones={b.name:[list(b.head_local),list(b.tail_local),list(map(list,b.matrix_local))] for b in rig.data.bones}
    def action_signature():
        data=[]
        for action in bpy.data.actions:
            curves=[]
            for layer in action.layers:
                for strip in layer.strips:
                    for bag in strip.channelbags:
                        for curve in bag.fcurves:
                            curves.append((curve.data_path,curve.array_index,[(list(k.co),list(k.handle_left),list(k.handle_right),k.interpolation) for k in curve.keyframe_points]))
            data.append((action.name,curves))
        return hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest()
    motion_hash=action_signature()
    print('CITIZEN_BUILD_START',profile,flush=True)
    report=folder/'citizen-art-build.json'
    results=json.loads(report.read_text(encoding='utf-8'))['results'] if report.exists() else {}
    if set(parts)!=set(builders) and not all(part in results for part in builders):
        raise RuntimeError('A partial rebuild requires a completed full citizen build')
    for part in parts:
        results[part]=builders[part](rig)
    assert bones=={b.name:[list(b.head_local),list(b.tail_local),list(map(list,b.matrix_local))] for b in rig.data.bones},'Rig rest pose changed'
    assert motion_hash==action_signature(),'Approved animation curves changed'
    rig['avatarVariationRevision']='v15-citizens-2-art'
    rest(rig)
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH' and obj.get('avatarSlot') and not obj.get('authoringOnly'):
            if len(obj.data.materials)==1:
                for poly in obj.data.polygons:poly.material_index=0
            obj.hide_set(False);obj.hide_render=False;obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(folder/'avatar-export.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_morph=True,export_morph_normal=True,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,export_yup=True)
    (folder/'avatar-export.glb').replace(folder/'avatar.glb')
    from avatar_v15_review import default_variants
    default_variants()
    for obj in bpy.context.scene.objects:
        if obj.get('authoringOnly') or obj.get('avatarVisibleFor'):obj.hide_render=True
        if obj.get('avatarVariantGroup') or obj.get('authoringOnly') or obj.get('avatarVisibleFor'):obj.hide_set(obj.hide_render)
    rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1)
    bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(folder/'avatar.blend'),compress=True)
    (folder/'citizen-art-build.json').write_text(json.dumps({'revision':rig['avatarVariationRevision'],'profile':profile,'results':results,'rigUnchanged':True,'animationsUnchanged':True,'animationCurveSha256':motion_hash},indent=2,default=lambda obj:obj.name),encoding='utf-8')
    print('CITIZEN_BUILD_READY',profile,flush=True)
