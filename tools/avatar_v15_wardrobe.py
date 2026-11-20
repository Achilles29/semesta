"""Second wardrobe pass: garment volume, tailoring and distinct everyday outfits.

Uses existing weights and rest anatomy. No changes to approved animation data.
New geometry is CC0; derivatives retain the original MakeHuman attribution.
"""
from avatar_v14_common import *
from mathutils.kdtree import KDTree

def fit_bob_silhouette():
    """Keep the bob outside the enlarged skull and reach below the jaw."""
    obj=bpy.data.objects.get('V15 bob silhouette')
    if not obj:return
    eye=next(o for o in bpy.data.objects if o.type=='MESH' and o.get('avatarSlot')=='eyes' and not o.get('v15Variation'))
    rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    skin=next(o for o in bpy.data.objects if o.type=='MESH' and o.get('avatarSlot')=='skin' and not o.get('authoringOnly'))
    s=(max(v.co.z for v in skin.data.vertices)-rig.data.bones['head'].head_local.z)/.176471
    eye_z=sum(v.co.z for v in eye.data.vertices)/len(eye.data.vertices)
    saved=obj.data.attributes.get('v15BobSource')
    if not saved:
        saved=obj.data.attributes.new('v15BobSource','FLOAT_VECTOR','POINT')
        for v,d in zip(obj.data.vertices,saved.data):d.vector=v.co
    for v,d in zip(obj.data.vertices,saved.data):
        v.co=d.vector;fullness=1+.25*(1-smooth(eye_z-.055*s,eye_z+.075*s,v.co.z));v.co.x*=fullness;v.co.y=(v.co.y+.035*s)*fullness-.035*s
        v.co.z-=.055*s*(1-smooth(eye_z-.07*s,eye_z+.08*s,v.co.z))
    obj.data.update()

def fit_wardrobe_headwear():
    rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    skin=next(o for o in bpy.data.objects if o.type=='MESH' and o.get('avatarSlot')=='skin' and not o.get('authoringOnly'))
    s=(max(v.co.z for v in skin.data.vertices)-rig.data.bones['head'].head_local.z)/.176471
    for obj in bpy.data.objects:
        if obj.type!='MESH' or obj.get('avatarVariantGroup')!='headAccessory' or obj.get('avatarVariant') not in ['beanie','brimHat']:continue
        saved=obj.data.attributes.get('v15HeadwearSource')
        if not saved:
            saved=obj.data.attributes.new('v15HeadwearSource','FLOAT_VECTOR','POINT')
            for v,d in zip(obj.data.vertices,saved.data):d.vector=v.co
        for v,d in zip(obj.data.vertices,saved.data):
            v.co=d.vector;v.co.x*=1.08;v.co.y=(v.co.y+.042*s)*1.12-.042*s;v.co.z+=.018*s
        obj.data.update()

def extend_wardrobe(rig,base,s,clone,tag,bind,ellipsoid,tube):
    profile=json.loads(rig['avatarProfile']);height=profile['height']/1.78
    body={'slim':.94,'balanced':1,'heavy':1.14}[profile['body']]
    # s measures the enlarged head. Garments use stature, not head scale.
    unit=height
    cloth=material('V15 cotton twill',(.105,.16,.20),.94)
    seam=material('V15 twill stitching',(.25,.29,.30),.95)
    jacketmat=material('V15 field jacket canvas',(.20,.27,.19),.92)
    shirtmat=material('V15 cotton shirt',(.72,.78,.75),.88)
    rubber=material('V15 sneaker rubber',(.72,.74,.70),.8)
    canvas=material('V15 sneaker canvas',(.19,.27,.31),.91)
    metal=material('V15 wardrobe metal',(.38,.40,.42),.3,.65)
    knit=material('V15 charcoal knit',(.10,.13,.15),.97)
    leather=material('V15 belt bag leather',(.28,.15,.08),.75)
    # A fine shared woven texture adds fabric grain without baking leg anatomy.
    import numpy as np
    name='V15 woven twill tile'
    image=bpy.data.images.get(name)
    if not image:
        n=256;y,x=np.mgrid[:n,:n];rng=np.random.default_rng(15)
        grain=.83+.10*np.sin(x*np.pi/2)*np.sin(y*np.pi/2)+.03*rng.random((n,n))
        pixels=np.ones((n,n,4),dtype=np.float32);pixels[:,:,:3]=grain[:,:,None]
        image=bpy.data.images.new(name,width=n,height=n,alpha=False);image.pixels.foreach_set(pixels.ravel());image.pack()
    for mat in [cloth,shirtmat,jacketmat,knit,canvas]:
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;tex=nodes.new('ShaderNodeTexImage');tex.image=image
        mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs[3].default_value=12
        uv=nodes.new('ShaderNodeTexCoord');links.new(uv.outputs['UV'],mapping.inputs[0]);links.new(mapping.outputs[0],tex.inputs['Vector'])
        # Constant dyed cloth colour + woven roughness is glTF-native. A colour
        # Mix shader can silently export white in this Blender exporter.
        links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Roughness'])

    def skinned(obj,source):
        """Transfer nearby fitted garment weights to its seams/pockets."""
        tree=KDTree(len(source.data.vertices))
        for v in source.data.vertices:tree.insert(v.co,v.index)
        tree.balance();groups={g.index:obj.vertex_groups.new(name=g.name) for g in source.vertex_groups}
        for v in obj.data.vertices:
            _,index,_=tree.find(v.co)
            for g in source.data.vertices[index].groups:
                if g.weight>0:groups[g.group].add([v.index],g.weight,'REPLACE')
        obj.parent=rig;mod=obj.modifiers.new('Fitted garment weights','ARMATURE');mod.object=rig
        return obj

    def detail(name,points,faces,mat,source,group,option,slot,thickness=.002):
        obj=mesh(name,points,faces,mat);finish(obj,0,thickness*unit)
        return skinned(tag(obj,group,option,slot),source)

    def box(name,pos,size,mat,group,option,slot,bone=None,source=None):
        bpy.ops.mesh.primitive_cube_add(size=1,location=pos);obj=bpy.context.object;obj.name=name;obj.scale=size
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);obj.data.materials.append(mat)
        bevel=obj.modifiers.new('Soft tailored edge','BEVEL');bevel.width=.006*unit;bevel.segments=2;apply_modifier(obj,bevel)
        tag(obj,group,option,slot)
        return skinned(obj,source) if source else bind(obj,bone)

    trousers=next(o for o in base if o.get('avatarSlot')=='bottom')
    if not trousers.data.attributes.get('v15OriginalPosition'):
        saved=trousers.data.attributes.new('v15OriginalPosition','FLOAT_VECTOR','POINT')
        for v,d in zip(trousers.data.vertices,saved.data):d.vector=v.co
    original=[v.co.copy() for v in trousers.data.vertices]
    source_hem=min(v.z for v in original)
    # Replace the old 18% inflation, which still outlined every calf and knee.
    for obj in list(bpy.context.scene.objects):
        if obj.get('avatarVariantGroup')=='bottomStyle' and obj.get('v15Variation'):bpy.data.objects.remove(obj,do_unlink=True)
    hip=rig.data.bones['thigh.L'].head_local;knee=rig.data.bones['thigh.L'].tail_local;ankle=rig.data.bones['foot.L'].head_local
    def center(z):
        a,b=(ankle,knee) if z<knee.z else (knee,hip)
        t=max(0,min(1,(z-a.z)/(b.z-a.z)));return a.lerp(b,t)
    # Section envelopes keep left/right topology and the shaped waistband intact.
    bins={}
    for i,v in enumerate(original):
        k=round(v.z/(.025*unit));bins.setdefault(k,[]).append(v)
    def cross_section(z):
        nearby=[v for k in range(round(z/(.025*unit))-1,round(z/(.025*unit))+2) for v in bins.get(k,[]) if v.x>0]
        c=center(z)
        return max([abs(v.x-center(v.z).x) for v in nearby]+[.025*unit]),max([abs(v.y-center(v.z).y) for v in nearby]+[.025*unit])
    sections={k:cross_section(k*.0125*unit) for k in range(0,100)}
    def trouser_shape(v,style):
        z=v.z;c=center(z);sign=1 if v.x>=0 else -1
        key=round(z/(.0125*unit));rx,ry=sections[key] if key in sections else cross_section(z)
        x=(abs(v.x)-c.x)/rx;y=(v.y-c.y)/ry;angle=math.atan2(y,x)
        lower=1-smooth(knee.z+.14*unit,hip.z-.045*unit,z)
        ease={'fitted':.055,'straight':.102,'relaxed':.115,'wide':.137,'cargo':.112}[style]*unit*(1.04 if profile['sex']=='female' else 1)
        # Straight/wide styles retain width below the knee; no calf narrowing.
        radiusx=max(rx+.010*unit,ease*body);radiusy=max(ry+.016*unit,ease*body*.91)
        fold=(.0025*unit*math.sin(z*67/unit+angle*3)+.002*unit*math.sin(z*39/unit-angle*4))*lower
        r=max(.88,min(1.08,math.hypot(x,y)))
        v.x=sign*((c.x+math.cos(angle)*(radiusx+fold)*(.93+.07*r))*lower+(abs(v.x)+.010*unit*smooth(.015,.15,abs(v.x)))*(1-lower))
        v.y=(c.y+math.sin(angle)*(radiusy+fold)*(.93+.07*r))*lower+(v.y+(.020*unit if v.y>c.y else -.027*unit))*(1-lower)
        # Lower the crotch slightly and extend hems over the boot shaft.
        v.z-=.027*unit*(1-smooth(.0,.085*unit,abs(v.x)))*smooth(.70*unit,.86*unit,z)*(1-smooth(.90*unit,1.03*unit,z))
        v.z-=.115*unit*(1-smooth(.24*unit,.52*unit,z))
        hem=.128*unit+max(0,z-source_hem-.014*unit)*.60+.001*unit*math.sin(angle*4)
        blend=smooth(source_hem+.014*unit,source_hem+.134*unit,z);v.z=hem*(1-blend)+v.z*blend
        return v
    pants={}
    for style in ['straight','relaxed','wide','cargo']:
        obj=clone(trousers,'bottomStyle',style,lambda v,style=style:trouser_shape(v,style));obj.data.materials.clear();obj.data.materials.append(cloth);pants[style]=obj
    for v,co in zip(trousers.data.vertices,original):v.co=trouser_shape(co.copy(),'fitted')
    trousers.data.update();trousers.data.materials.clear();trousers.data.materials.append(cloth);pants['fitted']=trousers
    for style,obj in pants.items():
        obj.data.update()
        # Real fabric pocket openings and fly: geometry, not skin shading.
        def front_y(x,z):
            hit,loc,_,_=obj.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
            return loc.y-.003*unit if hit else -.14*unit
        for sign in [-1,1]:
            coords=[(sign*.08*body*unit,hip.z+.04*unit),(sign*.16*body*unit,hip.z-.035*unit)]
            pts=[]
            for x,z in coords:pts.extend([(x-.002*unit,front_y(x,z),z),(x+.002*unit,front_y(x,z),z)])
            detail('V15 slanted pocket opening '+style,pts,[(0,1,3,2)],seam,obj,'bottomStyle',style,'bottom',.001)
        fly=[(-.003*unit,front_y(0,z),z) for z in [hip.z+.035*unit,hip.z-.075*unit]]+[(.003*unit,front_y(0,z),z) for z in [hip.z-.075*unit,hip.z+.035*unit]]
        detail('V15 fly seam '+style,fly,[(0,1,2,3)],seam,obj,'bottomStyle',style,'bottom',.001)
        # The cargo version has genuine box pockets and overhanging flaps.
        if style=='cargo':
            for sign in [-1,1]:
                z=knee.z+.12*unit;x=sign*.20*body*unit;y=front_y(x,z)-.012*unit
                box('V15 cargo bellows pocket',(x,y,z),(.115*unit,.032*unit,.145*unit),cloth,'bottomStyle',style,'bottom',source=obj)
                box('V15 cargo pocket flap',(x,y-.019*unit,z+.060*unit),(.124*unit,.012*unit,.040*unit),seam,'bottomStyle',style,'bottom',source=obj)

    linen=next(o for o in base if o.get('avatarSlot')=='top')
    def top_shape(v,style):
        central=1-smooth(.20*unit,.31*unit,abs(v.x));lo=1-smooth(1.13*unit,1.45*unit,v.z)
        v.x*=1+(.04 if style=='shirt' else .08)*central
        v.y+=((-.010 if v.y<0 else .010) if style=='shirt' else (-.022 if v.y<0 else .022))*unit*central
        v.z-= (.035 if style=='shirt' else .065)*unit*lo
        return v
    for style,mat in [('shirt',shirtmat),('jacket',jacketmat)]:
        obj=clone(linen,'topStyle',style,lambda v,style=style:top_shape(v,style));obj.data.materials.clear();obj.data.materials.append(mat);obj.data.update()
        def front(x,z):
            hit,loc,_,_=obj.ray_cast(Vector((x,-1,z)),Vector((0,1,0)));return loc.y-.006*unit if hit else -.12*unit
        for sign in [-1,1]:
            z=rig.data.bones['chest'].tail_local.z-.055*unit
            verts=[(sign*x*unit,front(sign*x*unit,z+dz*unit)-.006*unit,z+dz*unit) for x,dz in [(0.03,.025),(.08,.022),(.10,-.036),(.047,-.013)]]
            detail('V15 folded collar '+style,verts,[(0,1,2,3)],mat,obj,'topStyle',style,'top',.004)
        for i in range(5):
            z=hip.z+.10*unit+i*.07*unit
            box('V15 shirt fastener '+style,(0,front(0,z)-.005*unit,z),(.011*unit,.006*unit,.011*unit),metal,'topStyle',style,'top',source=obj)
        for sign in [-1,1] if style=='jacket' else [-1]:
            x=sign*.105*body*unit;z=rig.data.bones['chest'].head_local.z-.04*unit;y=front(x,z)
            box('V15 chest pocket '+style,(x,y,z),(.085*unit,.010*unit,.10*unit),mat,'topStyle',style,'top',source=obj)
        if style=='jacket':
            # A continuous untucked hem covers the new roomy waistband. The
            # original tucked shirt alone would intersect the trouser hips.
            pts=[];faces=[]
            for j in range(6):
                t=j/5;z=(1.14-.225*t)*unit;rx=(.218+.042*t)*unit*body;ry=(.163+.012*t)*unit*body
                for k in range(40):
                    angle=k*math.pi/20;pts.append((rx*math.cos(angle),-.015*unit+ry*math.sin(angle),z))
                    if j:idx=j*40+k;prev=j*40+(k+1)%40;faces.append((idx,prev,prev-40,idx-40))
            detail('V15 jacket full hem',pts,faces,mat,obj,'topStyle',style,'top',.003)
        if style in ['shirt','jacket']:
            # Long sleeves follow the arm joints and blend upper/lower weights.
            for side in ['L','R']:
                upper=rig.data.bones['upper_arm.'+side];fore=rig.data.bones['forearm.'+side]
                pts=[];faces=[];weights=[]
                for j in range(13):
                    t=j/12*(.58 if style=='shirt' else 1);pos=upper.head_local.lerp(upper.tail_local,t*2) if t<=.5 else fore.head_local.lerp(fore.tail_local,(t-.5)*2)
                    axis=(upper.tail_local-upper.head_local).normalized().lerp((fore.tail_local-fore.head_local).normalized(),smooth(.35,.65,t)).normalized();u=axis.cross(Vector((0,1,0))).normalized();v=axis.cross(u)
                    radius=(.082*(1-t)+.043*t+.01*math.sin(math.pi*t))*unit*body
                    for k in range(20):
                        theta=k*math.pi/10;pts.append(pos+radius*(u*math.cos(theta)+v*math.sin(theta)));weights.append(smooth(.35,.65,t))
                        if j:idx=j*20+k;prev=j*20+(k+1)%20;faces.append((idx,prev,prev-20,idx-20))
                sleeve=mesh('V15 '+style+' sleeve '+side,pts,faces,mat);tag(sleeve,'topStyle',style,'top');sleeve.parent=rig
                g1=sleeve.vertex_groups.new(name='upper_arm.'+side);g2=sleeve.vertex_groups.new(name='forearm.'+side)
                for i,w in enumerate(weights):g1.add([i],1-w,'REPLACE');g2.add([i],w,'REPLACE')
                mod=sleeve.modifiers.new('Sleeve skin','ARMATURE');mod.object=rig

    # Low canvas shoes retain the original sole and foot weights. All trouser
    # styles now overlap their ankles, preserving the existing body coverage.
    for obj in [o for o in base if o.get('avatarSlot')=='footwear']:
        def shoe(v):
            if v.z>.13*unit:v.z=.13*unit+(v.z-.13*unit)*.15
            return v
        n=clone(obj,'shoeStyle','sneakers',shoe);n.data.materials.clear();n.data.materials.append(rubber if 'sole' in obj.name else canvas)
        n=clone(obj,'shoeStyle','workBoots',lambda v:Vector((v.x*1.025,v.y*1.025,v.z)));n.data.materials.clear();n.data.materials.append(knit if 'sole' in obj.name else leather)
    for side in ['L','R']:
        foot=rig.data.bones['foot.'+side].head_local
        for i in range(4):
            z=(.080+i*.012)*unit;y=(-.13+i*.017)*unit
            tube('V15 sneaker lace',[(foot.x-.027*unit,y,z),(foot.x+.027*unit,y,z)],.002*unit,rubber,'shoeStyle','sneakers','footwear','foot.'+side)

    hair=next(o for o in base if o.get('avatarSlot')=='hair');hairmat=hair.data.materials[0]
    eyes=next(o for o in base if o.get('avatarSlot')=='eyes');eye_z=sum(v.co.z for v in eyes.data.vertices)/len(eyes.data.vertices);eye_y=min(v.co.y for v in eyes.data.vertices)
    clone(hair,'hairStyle','ponytail',lambda v:Vector((v.x*.98,(v.y+.04*s)*.94-.04*s,v.z)))
    hairplain=material('V15 tied hair',(.10,.065,.04),.72)
    # A tapering ponytail, with several strands, instead of a scaled sphere.
    for offset in [-.018,0,.018]:
        pts=[(offset*s,.075*s+i*.008*s,eye_z+.085*s-i*.020*s) for i in range(13)]
        tube('V15 ponytail strand',pts,.018*s,hairplain,'hairStyle','ponytail','hair','head')
    def swept(v):
        f=smooth(eye_z+.02*s,eye_z+.12*s,v.z);v.x+=.030*s*f;v.y+=.018*s*f;v.z+=.020*s*f;return v
    clone(hair,'hairStyle','swept',swept)
    clone(hair,'hairStyle','bob',lambda v:Vector((v.x*1.03,v.y,v.z)))
    # Hair-card curtain along sides/back, open around the face.
    pts=[];faces=[]
    for j in range(5):
        for i in range(25):
            t=-.15+math.pi*1.10*i/24;r=.104*s*(1+.04*math.sin(i*2))
            pts.append((r*math.cos(t),-.035*s+.118*s*math.sin(t),eye_z+.085*s-j*.040*s))
            if j and i:idx=j*25+i;faces.append((idx,idx-1,idx-26,idx-25))
    obj=mesh('V15 bob silhouette',pts,faces,hairplain);finish(obj,0,.003*s);bind(tag(obj,'hairStyle','bob','hair'),'head')

    # Beanie and broad-brim hat have fitted crowns; headband keeps visible hair.
    for style in ['beanie','brimHat']:
        pts=[];faces=[]
        for j in range(10):
            t=.02+(math.pi/2-.02)*j/9
            for i in range(32):
                theta=i*math.pi/16;pts.append((.113*s*math.sin(t)*math.cos(theta),-.042*s+.125*s*math.sin(t)*math.sin(theta),eye_z+.034*s+(.122 if style=='beanie' else .105)*s*math.cos(t)))
                if j:idx=j*32+i;prev=j*32+(i+1)%32;faces.append((idx,prev,prev-32,idx-32))
        ob=mesh('V15 '+style+' crown',pts,faces,knit if style=='beanie' else leather);finish(ob,0,.004*s);bind(tag(ob,'headAccessory',style,'headAccessory'),'head')
        if style=='brimHat':
            pts=[];faces=[]
            for ring in [1,1.6]:
                for i in range(48):
                    t=i*math.pi/24;pts.append((.112*s*ring*math.cos(t),-.042*s+.127*s*ring*math.sin(t),eye_z+.035*s-.009*s*(ring-1)))
            for i in range(48):faces.append((i,(i+1)%48,(i+1)%48+48,i+48))
            ob=mesh('V15 broad brim',pts,faces,leather);finish(ob,0,.005*s);bind(tag(ob,'headAccessory',style,'headAccessory'),'head')
        else:
            pts=[(.113*s*math.cos(i*math.pi/24),-.042*s+.126*s*math.sin(i*math.pi/24),eye_z+.038*s) for i in range(49)]
            tube('V15 beanie rolled hem',pts,.011*s,knit,'headAccessory',style,'headAccessory','head')
    pts=[(.111*s*math.cos(i*math.pi/24),-.042*s+.124*s*math.sin(i*math.pi/24),eye_z+.041*s) for i in range(49)]
    tube('V15 fabric headband',pts,.009*s,leather,'headAccessory','headband','headAccessory','head')

    for sign in [-1,1]:
        x=sign*.035*s;y=eye_y-.016*s
        pts=[(x+dx*s,y,eye_z+dz*s) for dx,dz in [(-.028,-.017),(.028,-.017),(.028,.017),(-.028,.017),(-.028,-.017)]]
        tube('V15 rectangular glasses',pts,.0022*s,knit,'faceAccessory','squareGlasses','faceAccessory','head')
        tube('V15 rectangular temple',[(sign*.064*s,y,eye_z),(sign*.091*s,-.005*s,eye_z)],.002*s,knit,'faceAccessory','squareGlasses','faceAccessory','head')
        ellipsoid('V15 stud earring',(sign*.093*s,-.014*s,eye_z-.047*s),(.004*s,.004*s,.004*s),metal,'earAccessory','studs','earAccessory','head')
    tube('V15 rectangular bridge',[(-.008*s,eye_y-.016*s,eye_z+.008*s),(.008*s,eye_y-.016*s,eye_z+.008*s)],.002*s,knit,'faceAccessory','squareGlasses','faceAccessory','head')
    fore=rig.data.bones['forearm.L'];axis=(fore.tail_local-fore.head_local).normalized();u=axis.cross(Vector((0,0,1))).normalized();v=axis.cross(u);c=fore.tail_local-axis*.028*unit
    pts=[c+.032*unit*(u*math.cos(i*math.pi/16)+v*math.sin(i*math.pi/16)) for i in range(33)]
    tube('V15 wrist watch strap',pts,.006*unit,knit,'handAccessory','watch','handAccessory','forearm.L')
    ellipsoid('V15 watch face',c+Vector((0,-.033*unit,0)),(.018*unit,.006*unit,.020*unit),metal,'handAccessory','watch','handAccessory','forearm.L')
    fit_bob_silhouette()
    fit_wardrobe_headwear()
