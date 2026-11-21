"""Render the actual exported Three scene with its camera, using Blender Eevee."""
import bpy,sys,pathlib
folder=pathlib.Path(sys.argv[sys.argv.index('--')+1])
for source in sorted(folder.glob('*.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene=bpy.context.scene;scene.camera=next(o for o in scene.objects if o.type=='CAMERA')
    # glTF has no hemisphere light; recreate the stage's lighting for offline review.
    from mathutils import Vector
    for o in list(scene.objects):
        if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
    for name,location,energy,size in [('Key',(-5,-6,9),1100,5),('Fill',(5,-4,5),650,5)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
        light=bpy.data.objects.new(name,data);scene.collection.objects.link(light);light.location=location;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='CYCLES';scene.cycles.samples=16
    scene.render.resolution_x=540;scene.render.resolution_y=960;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Review sky');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.52,.64,.65,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
    scene.view_settings.view_transform='AgX'
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(source.with_suffix('.png'))
    bpy.ops.render.render(write_still=True);print('RENDERED',source.stem,flush=True)
