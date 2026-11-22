"""Offline camera/contact-sheet review; does not substitute for browser MP4 QA."""
import bpy,sys,pathlib,math
from mathutils import Vector
folder=pathlib.Path(sys.argv[sys.argv.index('--')+1])
for source in sorted(folder.glob('*.glb')):
    target=source.with_suffix('.png')
    if target.exists() and target.stat().st_mtime>source.stat().st_mtime:
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene=bpy.context.scene
    scene.camera=next(o for o in scene.objects if o.type=='CAMERA')
    for o in list(scene.objects):
        if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
    data=bpy.data.lights.new('ReviewSun','SUN');data.energy=2.2;data.angle=.18
    light=bpy.data.objects.new('ReviewSun',data);scene.collection.objects.link(light)
    light.rotation_euler=Vector((5,6,-9)).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='CYCLES';scene.cycles.samples=12
    scene.render.resolution_x=540;scene.render.resolution_y=960;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('ReviewSky');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.52,.64,.65,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    scene.view_settings.view_transform='AgX'
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(target)
    bpy.ops.render.render(write_still=True);print('RENDERED',source.stem,flush=True)
