import bpy, sys, os, json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/avatar-v2/source/semesta_farmer_male_v2_mpfb-candidate.blend'
PREVIEW=ROOT/'assets/avatar-v2/previews'
REPORT=ROOT/'assets/avatar-v2/reports/semesta_farmer_male_v2_mpfb-candidate.json'
from mathutils import Vector
sys.path.insert(0, '/root/.config/blender/4.5/extensions/user_default')
import bl_ext.user_default.mpfb as mpfb
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.mpfb')
from bl_ext.user_default.mpfb.services import AssetService, HumanService, LocationService
AssetService.update_all_asset_lists()
scene=bpy.context.scene
# Do not inherit Blender startup cube/camera/light.
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
# MPFB sliders: naturally proportioned young adult, medium build and Asian phenotype.
settings={
 'MPFB_NH_scale_factor':'METER','MPFB_NH_add_phenotype':True,
 'MPFB_NH_phenotype_gender':'male','MPFB_NH_phenotype_age':'young',
 'MPFB_NH_phenotype_muscle':'averagemuscle','MPFB_NH_phenotype_weight':'averageweight',
 'MPFB_NH_phenotype_height':'average','MPFB_NH_phenotype_proportions':'average',
 'MPFB_NH_phenotype_race':'asian','MPFB_NH_phenotype_influence':0.65,
 'MPFB_NH_add_breast':False,'MPFB_NH_detailed_helpers':True,
 'MPFB_NH_extra_vertex_groups':True,'MPFB_NH_mask_helpers':True,
 'MPFB_NH_preselect_group':'body',
}
for k,v in settings.items():
    if hasattr(scene,k): setattr(scene,k,v)
print('SETTINGS', {k:getattr(scene,k,None) for k in settings})
print('ASSET_ROOT',LocationService.get_user_data())
print('PACKS',AssetService.get_pack_names())
res=bpy.ops.mpfb.create_human(); print('CREATE',res)
human=bpy.context.view_layer.objects.active
# Give the base realistic Indonesian brown skin via the official CC0 skin pack.
skin=AssetService.find_asset_absolute_path('young_asian_male.mhmat','skins')
print('SKIN',skin)
HumanService.set_character_skin(skin,human,skin_type='MAKESKIN',material_instances=False)
# Standard source rig. Its mapping to Semesta humanoid v2 still requires retarget validation.
scene.MPFB_ADR_standard_rig='game_engine'
scene.MPFB_ADR_import_weights=True
print('RIG',bpy.ops.mpfb.add_standard_rig())
# Community CC0 clothes. Attach after rig so MPFB transfers/interpolates weights.
assets={
 'shirt':AssetService.find_asset_absolute_path('namuhekam_male_polo_shirt.mhclo','clothes'),
 'pants':AssetService.find_asset_absolute_path('toigo_wool_pants.mhclo','clothes'),
 'boots':AssetService.find_asset_absolute_path('shoes03.mhclo','clothes'),
 'hair':AssetService.find_asset_absolute_path('short02.mhclo','hair'),
 'eyes':AssetService.find_asset_absolute_path('high-poly.mhclo','eyes'),
}
print('OUTFIT_ASSETS',assets)
for slot,path in assets.items():
    if not path: raise RuntimeError('Asset not found for '+slot)
    obj=HumanService.add_mhclo_asset(path,human,asset_type='Hair' if slot=='hair' else 'Clothes',subdiv_levels=1,material_type='MAKESKIN',set_up_rigging=True,interpolate_weights=True,import_subrig=True,import_weights=True)
    obj.name='FarmerV2_'+slot.title()
    print('ADDED',slot,obj.name,len(obj.data.vertices),[m.name if m else None for m in obj.data.materials])
# Tint outfit to the approved blue/olive/brown palette while retaining texture detail.
def tint_objects(prefixes,color):
    count=0
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH' or not any(obj.name.startswith(p) for p in prefixes): continue
        for mat in obj.data.materials:
            if not mat: continue
            mat.diffuse_color=(*color,1)
            if mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type=='BSDF_PRINCIPLED':
                        node.inputs['Base Color'].default_value=(*color,1)
                        node.inputs['Roughness'].default_value=.78
            count+=1
    return count
# Tint image-textured materials through a multiply node; setting only the
# Principled color is ignored when the asset's image is directly connected.
def tint_materials(prefix, tint, mode='MULTIPLY'):
    touched=0
    for obj in scene.objects:
        if obj.type!='MESH' or not obj.name.startswith(prefix): continue
        for mat in obj.data.materials:
            if not mat or not mat.use_nodes: continue
            bsdf=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if not bsdf: continue
            socket=bsdf.inputs['Base Color']; links=list(socket.links)
            mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type=mode;mix.inputs[0].default_value=1.0
            mix.inputs[2].default_value=(*tint,1);mix.location=(bsdf.location.x-240,bsdf.location.y)
            if links:
                source=links[0].from_socket;mat.node_tree.links.remove(links[0]);mat.node_tree.links.new(source,mix.inputs[1])
            else: mix.inputs[1].default_value=socket.default_value
            mat.node_tree.links.new(mix.outputs[0],socket)
            bsdf.inputs['Roughness'].default_value=.72
            touched+=1
    return touched
print('TINT',tint_materials('Human',(.82,.62,.49)),tint_materials('FarmerV2_Shirt',(.20,.45,.90)),tint_materials('FarmerV2_Pants',(.28,.38,.14)),tint_materials('FarmerV2_Boots',(.32,.15,.06),'MIX'),tint_materials('FarmerV2_Hair',(.22,.095,.04)))
# Apply a natural dark-brown iris texture to the actual eye geometry.
from bl_ext.user_default.mpfb.entities.material.makeskinmaterial import MakeSkinMaterial
eyes=next((o for o in scene.objects if o.name.startswith('FarmerV2_Eyes')),None)
if not eyes: raise RuntimeError('MPFB eye mesh missing')
eye_mat_path=AssetService.find_asset_absolute_path('brown.mhmat','eyes')
print('EYE_MATERIAL',eye_mat_path)
eye_mat=bpy.data.materials.new('SEMESTA dark brown eyes');eye_mat.use_nodes=True
maker=MakeSkinMaterial();maker.populate_from_mhmat(eye_mat_path);maker.apply_node_tree(eye_mat)
eyes.data.materials.clear();eyes.data.materials.append(eye_mat)

# neutral light stage for review render
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.015)); ground=bpy.context.object; ground.name='ReviewGround'
mat=bpy.data.materials.new('Warm neutral ground');mat.diffuse_color=(.36,.42,.33,1);mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.36,.42,.33,1);mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.9;ground.data.materials.append(mat)
world=bpy.data.worlds.new('Review World') if not bpy.data.worlds else bpy.data.worlds[0];scene.world=world;world.color=(.32,.32,.32)
# Facing -Y in Blender; use three-quarter view, soft shadows.
def area(name,loc,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((0,0,0.9))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Key softbox',( -3,-4,5),500,4,(1.0,.83,.68));area('Fill softbox',(4,-1,3),320,3,(.68,.81,1));area('Rim softbox',(1,3,4),450,3,(1,.92,.76))
camdata=bpy.data.cameras.new('ReviewCamera');cam=bpy.data.objects.new('ReviewCamera',camdata);scene.collection.objects.link(cam);scene.camera=cam
cam.location=(2.4,-5.3,2.7);target=Vector((0,0,.9));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=2.25
scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(PREVIEW/'semesta_farmer_male_v2_mpfb-three-quarter.png')
scene.view_settings.view_transform='AgX';scene.camera.data.lens=52
# Preserve the editable MPFB/Blender source, not a production GLB yet.
bpy.ops.file.pack_all()
out=str(SOURCE);bpy.ops.wm.save_as_mainfile(filepath=out)
bpy.ops.render.render(write_still=True)
# Orthographic front, side and back views on the same light stage.
for label,location in [('front',(0,-5,1.25)),('side',(5,0,1.25)),('back',(0,5,1.25))]:
    cam.location=location;target=Vector((0,0,.9));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    camdata.ortho_scale=2.25;scene.render.resolution_x=900;scene.render.resolution_y=1100
    scene.render.filepath=str(PREVIEW/f'semesta_farmer_male_v2_mpfb-{label}.png');bpy.ops.render.render(write_still=True)
# Orthographic face evidence to inspect eyes and facial surface without concealment.
cam.location=(.65,-2.6,1.9);target=Vector((0,-.02,1.58));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=.88
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.filepath=str(PREVIEW/'semesta_farmer_male_v2_mpfb-face-closeup.png');bpy.ops.render.render(write_still=True)
summary=[]
for ob in scene.objects:
    item={'name':ob.name,'type':ob.type}
    if ob.type=='MESH': item['vertices']=len(ob.data.vertices);item['faces']=len(ob.data.polygons);item['materials']=[m.name if m else None for m in ob.data.materials]
    if ob.type=='ARMATURE': item['bones']=len(ob.data.bones);item['bone_names']=[b.name for b in ob.data.bones]
    summary.append(item)
open(REPORT,'w').write(json.dumps({'source':out,'render':scene.render.filepath,'objects':summary},indent=2))
print('SUMMARY',json.dumps(summary))
