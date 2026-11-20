"""Small reproducible PBR tiles for the original V14 costume (no external service)."""
import math
import numpy as np
import bpy
from avatar_v14_common import OUT

def costume_textures(materials):
    folder=OUT/'textures';folder.mkdir(exist_ok=True)
    n=512;y,x=np.mgrid[0:n,0:n];rng=np.random.default_rng(1401)
    noise=rng.normal(0,1,(n,n));weave=np.sin(x*math.tau/8)*np.sin(y*math.tau/8)
    specs=[(materials['linen'],'linen',(.60,.52,.38),.83,.018),
           (materials['vest'],'indigo',(.025,.085,.095),.78,.020),
           (materials['pants'],'twill',(.045,.055,.066),.89,.014),
           (materials['leather'],'leather',(.10,.040,.018),.46,.024)]
    for mat,name,color,rough,amplitude in specs:
        field=(noise*.22+weave*.50) if name!='leather' else (noise*.5+np.sin(x*.12+np.sin(y*.04))*np.cos(y*.17)*.25)
        def image(suffix,values,color_space):
            im=bpy.data.images.new(name+'_'+suffix,n,n,alpha=False)
            im.colorspace_settings.name=color_space
            rgba=np.ones((n,n,4),dtype=np.float32)
            rgba[:,:,:3]=values[:,:,None] if values.ndim==2 else values
            im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(folder/(name+'_'+suffix+'.png'));im.file_format='PNG';im.save();return im
        albedo=np.clip(np.array(color)[None,None,:]*(1+field[:,:,None]*.035),0,1)
        base=image('basecolor',albedo,'Linear Rec.709')
        rmap=image('roughness',np.clip(rough+field*.07,0,1),'Non-Color')
        gy,gx=np.gradient(field);norm=np.stack((-gx*amplitude,-gy*amplitude,np.ones_like(gx)),axis=-1);norm/=np.linalg.norm(norm,axis=-1,keepdims=True)
        normal=image('normal',norm*.5+.5,'Non-Color')
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;b=nodes['Principled BSDF']
        texcoord=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs['Scale'].default_value=10 if name!='leather' else 6
        links.new(texcoord.outputs['UV'],mapping.inputs[0])
        # KHR_texture_transform supports Mapping node; VectorMath cannot export.
        nodes.remove(mapping);mapping=nodes.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(10,10,1) if name!='leather' else (6,6,1)
        links.new(texcoord.outputs['UV'],mapping.inputs['Vector'])
        for im,socket in [(base,'Base Color'),(rmap,'Roughness'),(normal,None)]:
            t=nodes.new('ShaderNodeTexImage');t.image=im;links.new(mapping.outputs['Vector'],t.inputs['Vector'])
            if socket:links.new(t.outputs['Color'],b.inputs[socket])
            else:
                nm=nodes.new('ShaderNodeNormalMap');links.new(t.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],b.inputs['Normal'])
