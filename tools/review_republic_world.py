"""Render exported canonical world geometry for an offline visual review."""
import bpy,sys,pathlib
from mathutils import Vector
folder=pathlib.Path(sys.argv[sys.argv.index('--')+1])
selected=next((arg[8:].split(',') for arg in sys.argv if arg.startswith('--views=')),None)
target_folder=pathlib.Path(next((arg[9:] for arg in sys.argv if arg.startswith('--output=')),'C:/xampp/htdocs/project/ilustrasi/world'))
target_folder.mkdir(parents=True,exist_ok=True)
for source in sorted(folder.glob('*.glb')):
    if selected and source.stem not in selected:continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene=bpy.context.scene
    scene.camera=next(o for o in scene.objects if o.type=='CAMERA')
    data=bpy.data.lights.new('WorldReviewSun','SUN');data.energy=2.2;data.angle=.13
    light=bpy.data.objects.new('WorldReviewSun',data);scene.collection.objects.link(light)
    light.rotation_euler=Vector((4,5,-9)).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='CYCLES';scene.cycles.samples=12
    scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('WorldReviewSky');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.74,.74,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
    scene.view_settings.view_transform='AgX'
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(target_folder/(source.stem+'.png'))
    bpy.ops.render.render(write_still=True);print('RENDERED',source.stem,flush=True)
