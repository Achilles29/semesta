"""V14 native Blender helpers. Metres, Z up, character faces -Y."""
import json, math
from pathlib import Path
import bpy
from mathutils import Vector, Matrix, Quaternion
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'ilustrasi/avatar-v2/farmer-v14-jrpg'
SOURCE=OUT/'source'
MH=SOURCE/'makehuman/makehuman/data'
SYSTEM=SOURCE/'system'

def obj_data(path):
    vertices=[];uv=[];faces=[];group=''
    for line in Path(path).read_text().splitlines():
        a=line.split()
        if not a:continue
        if a[0]=='v':vertices.append(Vector(tuple(map(float,a[1:4]))))
        elif a[0]=='vt':uv.append(tuple(map(float,a[1:3])))
        elif a[0]=='g':group=' '.join(a[1:])
        elif a[0]=='f':
            corners=[s.split('/') for s in a[1:]]
            faces.append((group,[int(s[0])-1 for s in corners],[int(s[1])-1 if len(s)>1 and s[1] else 0 for s in corners]))
    return vertices,uv,faces

def target(path,count):
    delta=[Vector() for _ in range(count)]
    for line in Path(path).read_text().splitlines():
        a=line.split()
        if len(a)==4 and a[0].isdigit():delta[int(a[0])]=Vector(tuple(map(float,a[1:])))
    return delta

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

def mesh(name,points,faces,material,uv=None):
    data=bpy.data.meshes.new(name);data.from_pydata(points,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    if material:data.materials.append(material)
    for p in data.polygons:p.use_smooth=True
    if uv:
        layer=data.uv_layers.new(name='UVMap')
        for poly,coords in zip(data.polygons,uv):
            for loop,co in zip(poly.loop_indices,coords):layer.data[loop].uv=co
    return obj

def material(name,color,rough=.6,metal=0,texture=None,alpha=False,normal=None,tint=None):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    n=m.node_tree.nodes;links=m.node_tree.links;b=n.get('Principled BSDF')
    b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal
    if texture:
        t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(texture),check_existing=True)
        links.new(t.outputs['Color'],b.inputs['Base Color'])
        if tint:
            multiply=n.new('ShaderNodeMix');multiply.data_type='RGBA';multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[7].default_value=(*tint,1)
            links.new(t.outputs['Color'],multiply.inputs[6]);links.new(multiply.outputs[2],b.inputs['Base Color'])
        if alpha:
            links.new(t.outputs['Alpha'],b.inputs['Alpha']);m.surface_render_method='DITHERED';m.use_backface_culling=False
    if normal:
        t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(normal),check_existing=True);t.image.colorspace_settings.name='Non-Color'
        nm=n.new('ShaderNodeNormalMap');links.new(t.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],b.inputs['Normal'])
    return m

def apply_modifier(obj,modifier):
    bpy.context.view_layer.objects.active=obj;obj.hide_set(False)
    bpy.ops.object.modifier_apply(modifier=modifier.name)

def finish(obj,subdivide=0,thickness=0):
    if subdivide:
        m=obj.modifiers.new('Tailored surface','SUBSURF');m.levels=subdivide;apply_modifier(obj,m)
    if thickness:
        m=obj.modifiers.new('Real garment thickness','SOLIDIFY');m.thickness=thickness;m.offset=0;apply_modifier(obj,m)
    return obj

def rest(rig):
    if rig.animation_data:
        rig.animation_data.action=None
        for track in rig.animation_data.nla_tracks:track.mute=True
    for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH' and obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:key.value=0
    bpy.context.view_layer.update()

def hand_pose(rig,pose,side=None):
    c=json.loads(rig['avatarHandContract']);values=c['poses'][pose]
    for name,info in c['bones'].items():
        if side and info['side']!=side:continue
        bone=rig.pose.bones[name]
        bone.rotation_quaternion=Quaternion(Vector(info['axis']),values.get(info['finger'],values['fingers'])[info['segment']])
    bpy.context.view_layer.update()

def expression(rig,name='neutral',viseme='rest',blink=0,gaze=0):
    c=json.loads(rig['avatarExpressionContract']);values={**c['expressions'].get(name,{}),**c['visemes'].get(viseme,{})}
    values.update(blinkL=blink,blinkR=blink,lookLeft=max(0,-gaze),lookRight=max(0,gaze))
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH' or not obj.data.shape_keys:continue
        for channel,key in c['targets'].items():
            block=obj.data.shape_keys.key_blocks.get(key)
            if block:block.value=values.get(channel,0)

def stage():
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.resolution_x=700;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    scene.world=bpy.data.worlds.new('V14 neutral studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.18,.20,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
    scene.view_settings.view_transform='AgX'
    def light(name,position,power,size,color):
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
        o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=position;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    light('Key',(-3,-4,5),550,4,(1,.92,.83));light('Fill',(3,-2,3),300,3,(.77,.86,1));light('Rim',(1,3,4),650,3,(1,.87,.64))
    ground=material('Studio floor',(.12,.145,.16),.85)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));bpy.context.object.name='ReviewFloor';bpy.context.object.data.materials.append(ground)
    d=bpy.data.cameras.new('ReviewCamera');o=bpy.data.objects.new('ReviewCamera',d);scene.collection.objects.link(o);scene.camera=o

def frame_camera(view='body',angle=.25,rig=None):
    scene=bpy.context.scene;camera=scene.camera
    point,scale={'body':((0,0,.92),2.07),'face':((0,-.025,1.66),.43),'torso':((0,0,1.30),.85),'hand':((.35,-.03,.87),.33),'feet':((0,-.06,.17),.55)}[view]
    point=Vector(point)
    if view=='face' and rig:
        head=rig.pose.bones['head']
        point=rig.matrix_world@((head.head+head.tail)*.5)
        point.z+=.015
        point.y-=.025
    if view=='hand' and rig:
        point=(rig.matrix_world@rig.pose.bones['hand.L'].matrix@Vector((0,.065,0)))
    camera.data.type='ORTHO';camera.data.ortho_scale=scale
    camera.location=point+Vector((math.sin(angle)*4,-math.cos(angle)*4,.12 if view!='feet' else 1.8))
    camera.rotation_euler=(point-camera.location).to_track_quat('-Z','Y').to_euler()

def render(name,view='body',angle=.25,samples=24,rig=None):
    scene=bpy.context.scene;frame_camera(view,angle,rig)
    scene.cycles.samples=samples;scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
