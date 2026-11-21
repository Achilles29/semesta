"""Fit the peci to measured scalp sections instead of an oversized fixed oval."""
from avatar_v14_common import *
from mathutils.bvhtree import BVHTree

def fit_peci(rig):
    skin=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('avatarSlot')=='skin' and not o.get('authoringOnly'))
    eyes=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('avatarSlot')=='eyes')
    eye_z=sum(v.co.z for v in eyes.data.vertices)/len(eyes.data.vertices)
    top=max(v.co.z for v in skin.data.vertices);scale=(top-rig.data.bones['head'].head_local.z)/.176471
    bottom=eye_z+.039*scale
    scalp=[v.co for v in skin.data.vertices if v.co.z>=bottom]
    center_y=(max(v.y for v in scalp)+min(v.y for v in scalp))/2
    surface=BVHTree.FromPolygons([v.co for v in skin.data.vertices],[tuple(p.vertices) for p in skin.data.polygons])
    for o in list(bpy.context.scene.objects):
        if o.get('avatarVariantGroup')=='headAccessory' and o.get('avatarVariant')=='peci':bpy.data.objects.remove(o,do_unlink=True)
    points=[];faces=[];radii=[]
    for i in range(64):
        angle=i*2*math.pi/64;direction=Vector((math.cos(angle),math.sin(angle),0));distances=[]
        for z in [bottom,bottom+.012*scale,bottom+.025*scale]:
            origin=Vector((0,center_y,z));hit,_,_,distance=surface.ray_cast(origin,direction,.3*scale)
            if hit is not None:distances.append(distance)
        if not distances:raise ValueError('Scalp section missing at peci band')
        radii.append(max(distances)+.0045*scale)
    # Three rings keep a snug band, subtle taper and a gently rounded crown.
    for j,t in enumerate([0,.88,1]):
        for i,radius in enumerate(radii):
            angle=i*2*math.pi/64;r=radius*(1-.035*t)
            points.append((r*math.cos(angle),center_y+r*math.sin(angle),bottom+(top+.009*scale-bottom)*t))
            if j:faces.append((j*64+i,j*64+(i+1)%64,(j-1)*64+(i+1)%64,(j-1)*64+i))
    faces.append(tuple(range(128,192)))
    cloth=material('V15 peci black felt',(.006,.007,.009),.98)
    bsdf=cloth.node_tree.nodes.get('Principled BSDF')
    if 'Specular IOR Level' in bsdf.inputs:bsdf.inputs['Specular IOR Level'].default_value=.15
    obj=mesh('V15 fitted black peci',points,faces,cloth);finish(obj,0,.002*scale)
    obj['avatarSlot']='headAccessory';obj['avatarVariantGroup']='headAccessory';obj['avatarVariant']='peci'
    obj['avatarFixedColor']=True;obj['v15Variation']=True;obj['v15Uniform']=True
    obj['avatarFitRevision']='scalp-peci-1';obj['avatarFitClearance']=.0045*scale
    obj.parent=rig;group=obj.vertex_groups.new(name='head');group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    modifier=obj.modifiers.new('Peci follows head','ARMATURE');modifier.object=rig
    return obj
