"""Original wardrobe 3 meshes: game haircuts and coordinated uniform separates.

Uniform colours are intentional, independent of casual clothing palettes.
No official insignia or third-party textures. The existing rig/motion is retained.
"""
from avatar_v14_common import *
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree


def camouflage_pixels():
    """Independent overlapping colour fields avoid concentric leopard spots."""
    import numpy as np
    n=256;y,x=np.mgrid[:n,:n]/n;rng=np.random.default_rng(153)
    pixels=np.ones((n,n,4),dtype=np.float32);pixels[:,:,:3]=(.31,.37,.20)
    for color,coverage in [((.48,.43,.27),.38),((.16,.23,.12),.36),((.075,.10,.075),.19)]:
        field=np.zeros((n,n))
        for k in range(12):
            fx=int(rng.integers(1,5));fy=int(rng.integers(0,4))
            field+=np.sin(2*np.pi*(fx*x+fy*y)+rng.uniform(0,6.28))/(1+fx+fy)
        pixels[field>np.quantile(field,1-coverage),:3]=color
    return pixels


def extend_uniforms(rig, base, s, clone, tag, bind, tube):
    profile=json.loads(rig['avatarProfile']);unit=profile['height']/1.78
    body={'slim':.94,'balanced':1,'heavy':1.14}[profile['body']]
    hip=rig.data.bones['pelvis'].head_local if 'pelvis' in rig.data.bones else rig.data.bones['thigh.L'].head_local
    chest=rig.data.bones['chest'].head_local
    source=list(bpy.context.scene.objects)
    mats={key:material('V15 uniform '+key,col,.88) for key,col in {
        'tactical':(.065,.092,.070),'camo':(1,1,1),
        'civilService':(.43,.33,.18),'safariWhite':(.88,.89,.86),
        'trim':(.025,.033,.029),'button':(.34,.32,.25),'dress':(.018,.020,.024)}.items()}
    # An original seamless woodland pattern, exported as a glTF base-colour map.
    pixels=camouflage_pixels();n=len(pixels)
    img=bpy.data.images.new('V15 original woodland camouflage',width=n,height=n,alpha=False)
    img.pixels.foreach_set(pixels.ravel());img.pack()
    tex=mats['camo'].node_tree.nodes.new('ShaderNodeTexImage');tex.image=img
    mats['camo'].node_tree.links.new(tex.outputs['Color'],mats['camo'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

    def dye(obj,mat,camo=False):
        obj['avatarFixedColor']=True;obj.data.materials.clear();obj.data.materials.append(mat)
        for polygon in obj.data.polygons:polygon.material_index=0
        if camo:
            uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UniformUV')
            for poly in obj.data.polygons:
                side=abs(poly.normal.x)>abs(poly.normal.y)
                for index in poly.loop_indices:
                    v=obj.data.vertices[obj.data.loops[index].vertex_index].co
                    uv.data[index].uv=((v.y if side else v.x)/(.46*unit),v.z/(.46*unit))
        return obj

    def weighted(obj,template):
        tree=KDTree(len(template.data.vertices))
        for v in template.data.vertices:tree.insert(v.co,v.index)
        tree.balance();groups={g.index:obj.vertex_groups.new(name=g.name) for g in template.vertex_groups}
        for v in obj.data.vertices:
            _,idx,_=tree.find(v.co)
            for g in template.data.vertices[idx].groups:
                if g.weight>0:groups[g.group].add([v.index],g.weight,'REPLACE')
        obj.parent=rig;mod=obj.modifiers.new('Uniform skin','ARMATURE');mod.object=rig
        return obj

    def panel(name,points,faces,template,style,mat,thickness=.002):
        ob=mesh('V15 '+style+' '+name,points,faces,mat);finish(ob,0,thickness*unit)
        weighted(tag(ob,'topStyle',style,'top'),template);return dye(ob,mat,style=='camo' and mat==mats['camo'])

    shirt=next(o for o in source if o.get('avatarVariantGroup')=='topStyle' and o.get('avatarVariant')=='shirt' and len(o.data.vertices)>1000)
    for style in ['tactical','camo','civilService','safariWhite']:
        mat=mats[style]
        hem=min(v.co.z for v in shirt.data.vertices)
        def tailor(v):
            ease=(1-smooth(hem+.015*unit,hem+.16*unit,v.z)) if style=='safariWhite' else 0
            return Vector((v.x*(1.015+.11*ease),v.y*(1.025+.21*ease),v.z-.10*unit*ease))
        top=dye(clone(shirt,'topStyle',style,tailor),mat,style=='camo');top.data.update()
        top.name='V15 '+style+' tailored shirt'
        sleeve_style='jacket' if style in ['tactical','camo'] else 'shirt'
        for src in source:
            if src.get('avatarVariantGroup')=='topStyle' and src.get('avatarVariant')==sleeve_style and 'sleeve' in src.name:
                dye(clone(src,'topStyle',style,lambda v:v),mat,style=='camo')
        def front(x,z):
            hit,loc,_,_=top.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
            return loc.y-.008*unit if hit else -.14*unit*body
        def patch(name,x,z,w,h,mat,depth=.003):
            points=[(x+dx,front(x+dx,z+dz)-depth*unit,z+dz) for dx,dz in [(-w/2,h/2),(w/2,h/2),(w/2,-h/2),(-w/2,-h/2)]]
            return panel(name,points,[(0,1,2,3)],top,style,mat)
        # Narrow placket and paired, shaped flap pockets read as a real shirt.
        patch('button placket',0,chest.z-.11*unit,.023*unit,.31*unit,mat)
        for sign in [-1,1]:
            x=sign*.10*body*unit;z=chest.z-.045*unit
            patch('chest pocket',x,z,.084*unit,.097*unit,mat,.006)
            points=[(x+dx*unit,front(x+dx*unit,z+dz*unit)-.014*unit,z+dz*unit) for dx,dz in [(-.046,.052),(.046,.052),(.046,.026),(0,.013),(-.046,.026)]]
            panel('pointed pocket flap',points,[(0,1,2,3,4)],top,style,mat)
            # Collar tips point down and out from the measured neck opening.
            z=rig.data.bones['chest'].tail_local.z-.045*unit
            points=[(sign*xx*unit,front(sign*xx*unit,z+zz*unit)-.004*unit,z+zz*unit) for xx,zz in [(.025,.035),(.062,.035),(.098,-.015),(.057,-.035)]]
            panel('pointed collar',points,[(0,1,2,3)],top,style,mat,.003)
            if style in ['tactical','camo']:
                patch('shoulder utility tab',sign*.17*unit*body,chest.z+.015*unit,.040*unit,.055*unit,mats['trim'],.008)
            if style=='civilService':
                patch('epaulette',sign*.145*unit*body,chest.z+.055*unit,.073*unit,.018*unit,mat,.007)
        for i in range(5):
            patch('button',0,chest.z+.005*unit-i*.065*unit,.008*unit,.009*unit,mats['button'],.009)
        if style=='safariWhite':
            for sign in [-1,1]:
                x=sign*.12*unit*body;z=hem+.022*unit
                patch('lower safari pocket',x,z,.10*unit,.10*unit,mat,.006)
                patch('lower pocket flap',x,z+.04*unit,.108*unit,.025*unit,mat,.012)
        if style in ['tactical','camo']:
            # Low-profile reinforcement panels on the sleeves, following arm bones.
            for side in ['L','R']:
                bone=rig.data.bones['upper_arm.'+side];p=bone.head_local.lerp(bone.tail_local,.6)
                ob=mesh('V15 '+style+' arm patch '+side,[(p.x+dx*unit,p.y-.083*unit*body,p.z+dz*unit) for dx,dz in [(-.025,.033),(.025,.033),(.025,-.033),(-.025,-.033)]],[(0,1,2,3)],mats['trim'])
                finish(ob,0,.002*unit);dye(bind(tag(ob,'topStyle',style,'top'),'upper_arm.'+side),mats['trim'])
        # Cargo has loose leg volume and real bellows pockets; formal sets use
        # straight trousers, retaining a substantial cloth-to-calf clearance.
        bottom_source='cargo' if style in ['tactical','camo'] else 'straight'
        for src in source:
            if src.get('avatarVariantGroup')=='bottomStyle' and src.get('avatarVariant')==bottom_source:
                ob=clone(src,'bottomStyle',style,lambda v:v);dye(ob,mat,style=='camo')
                ob.name='V15 '+style+' '+src.name

    # Formal black shoes use the low shoe silhouette and keep ankle coverage.
    for src in source:
        if src.get('avatarVariantGroup')=='shoeStyle' and src.get('avatarVariant')=='sneakers' and 'lace' not in src.name:
            dye(clone(src,'shoeStyle','dress',lambda v:Vector((v.x,v.y*1.035,v.z))),mats['dress'])

    hair=next(o for o in base if o.get('avatarSlot')=='hair')
    eyes=next(o for o in base if o.get('avatarSlot')=='eyes')
    eye_z=sum(v.co.z for v in eyes.data.vertices)/len(eyes.data.vertices)
    top_z=max(v.co.z for v in hair.data.vertices)
    skin=next(o for o in base if o.get('avatarSlot')=='skin')
    scalp=BVHTree.FromPolygons([v.co for v in skin.data.vertices],[tuple(p.vertices) for p in skin.data.polygons])
    for style in ['sidePart','crew','spiky','curtain']:
        def shape(v,style=style):
            f=smooth(eye_z+.025*s,eye_z+.115*s,v.z)
            if style=='sidePart':
                v.x+=.018*s*f;v.z+=.009*s*f
                v.z-=.008*s*math.exp(-((v.x+.034*s)/(.009*s))**2)*f
            elif style=='crew':
                loc,normal,_,_=scalp.find_nearest(v)
                v=loc+normal*.0035*s
            elif style=='spiky':
                teeth=(.5+.5*math.cos(v.x/(.022*s)*math.pi))*(.5+.5*math.cos(v.y/(.028*s)*math.pi))
                v.z+=(.010+.042*teeth)*s*f;v.x+=.012*s*f*(1 if v.x>0 else -1)
            else:
                front=1-smooth(-.09*s,-.02*s,v.y)
                v.x*=1+.09*f;v.z+=.018*s*f
                v.z+=.025*s*front*smooth(.012*s,.055*s,abs(v.x))*smooth(eye_z+.02*s,eye_z+.08*s,v.z)
            return v
        ob=clone(hair,'hairStyle',style,shape);ob.name='V15 '+style+' haircut'

    # Peci with fitted oval sides and a closed crown, separate from the hair.
    points=[];faces=[]
    for j in range(2):
        for i in range(48):
            t=i*math.pi/24;points.append((.126*s*math.cos(t),-.042*s+.143*s*math.sin(t),eye_z+.047*s if j==0 else max(v.co.z for v in skin.data.vertices)+.009*s))
            if j:faces.append((i,(i+1)%48,(i+1)%48+48,i+48))
    faces.append(tuple(range(48,96)))
    ob=mesh('V15 black peci',points,faces,mats['dress']);finish(ob,0,.003*s)
    dye(bind(tag(ob,'headAccessory','peci','headAccessory'),'head'),mats['dress'])
    for ob in bpy.context.scene.objects:
        if ob not in source and ob.type=='MESH':ob['v15Uniform']=True
