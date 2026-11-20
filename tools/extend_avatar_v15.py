"""Author original, fitted V15 identity and wardrobe assets; retain approved motion.

Run with Blender --background --python tools/extend_avatar_v15.py -- --profile ID.
Existing CC0 mesh derivatives retain their source attribution. New accessories CC0.
"""
import argparse, json, math, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v14_common import *
p=argparse.ArgumentParser();p.add_argument('--profile',default='male-balanced');p.add_argument('--refit-headwear','--refit-bob',dest='refit_bob',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
folder=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'/a.profile
bpy.ops.wm.open_mainfile(filepath=str(folder/'avatar.blend'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');rest(rig)
if a.refit_bob:
    from avatar_v15_wardrobe import fit_bob_silhouette,fit_wardrobe_headwear
    from avatar_v15_review import default_variants
    fit_bob_silhouette()
    fit_wardrobe_headwear()
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for o in bpy.context.scene.objects:
        if o.type=='MESH' and o.get('avatarSlot') and not o.get('authoringOnly'):o.hide_set(False);o.hide_render=False;o.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(folder/'avatar-export.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_morph=True,export_morph_normal=True,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,export_yup=True)
    (folder/'avatar-export.glb').replace(folder/'avatar.glb')
    default_variants()
    for o in bpy.context.scene.objects:
        if o.get('avatarVariantGroup'):o.hide_set(o.hide_render)
    rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1)
    bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(folder/'avatar.blend'))
    print('V15_VARIATIONS_READY',a.profile,flush=True);sys.exit(0)
# Idempotent: generated objects and identity keys can be rebuilt independently.
for o in list(bpy.context.scene.objects):
    if o.get('v15Variation'):bpy.data.objects.remove(o,do_unlink=True)
base=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('avatarSlot') and not o.get('authoringOnly')]
for o in base:
    original=o.data.attributes.get('v15OriginalPosition')
    if original:
        for v,co in zip(o.data.vertices,original.data):v.co=co.vector
for o in base:
    if o.data.shape_keys:
        for key in list(o.data.shape_keys.key_blocks):
            if key.name.startswith('Id_'):o.shape_key_remove(key)
headz=rig.data.bones['head'].head_local.z
eyes=next(o for o in base if o.get('avatarSlot')=='eyes')
eye_z=sum(v.co.z for v in eyes.data.vertices)/len(eyes.data.vertices)
eye_y=min(v.co.y for v in eyes.data.vertices)
skin_obj=next(o for o in base if o.get('avatarSlot')=='skin')
top_z=max(v.co.z for v in skin_obj.data.vertices)
s=(top_z-headz)/(.176471)
def gauss(x,c,w):return math.exp(-((x-c)/w)**2)
def identity(co,kind):
    x,y,z=co;d=Vector();front=1-smooth(eye_y+.025*s,eye_y+.10*s,y)
    cheek=gauss(z,eye_z-.055*s,.050*s)*front
    if kind=='faceRound':d.x=x*.12*cheek;d.y=-.006*s*cheek
    if kind=='faceAngular':d.x=x*.13*gauss(z,eye_z-.087*s,.022*s)*front;d.x-=x*.06*gauss(z,eye_z-.04*s,.022*s)*front
    if kind=='eyeAlmond':d.z=-(z-eye_z)*.22*gauss(abs(x),.034*s,.028*s)*gauss(z,eye_z,.022*s)*front
    if kind=='eyeRound':d.z=(z-eye_z)*.18*gauss(abs(x),.034*s,.028*s)*gauss(z,eye_z,.024*s)*front
    nose=gauss(x,0,.019*s)*gauss(z,eye_z-.032*s,.027*s)*front
    if kind=='noseBroad':d.x=x*.42*nose
    if kind=='noseDefined':d.y=-.009*s*nose
    mouth=gauss(x,0,.035*s)*gauss(z,eye_z-.075*s,.013*s)*front
    if kind=='mouthWide':d.x=x*.20*mouth
    if kind=='mouthFull':d.y=-.004*s*mouth;d.z=(z-(eye_z-.075*s))*.20*mouth
    ear=smooth(.067*s,.088*s,abs(x))*gauss(z,eye_z-.02*s,.045*s)*(1-front*.8)
    if kind=='earProminent':d.x=(1 if x>0 else -1)*.012*s*ear
    if kind=='earTapered':d.z=.019*s*ear*smooth(eye_z-.03*s,eye_z+.015*s,z)
    return co+d
identities=['faceRound','faceAngular','eyeAlmond','eyeRound','noseBroad','noseDefined','mouthWide','mouthFull','earProminent','earTapered']
for o in base:
    if o.get('avatarSlot')=='accessoryChest':
        if not o.data.shape_keys:o.shape_key_add(name='Basis')
        key=o.shape_key_add(name='Id_OuterwearFit')
        for v in key.data:v.co.y+=.019*s*(1 if v.co.y>0 else -1)
    if o.get('avatarSlot') not in ['skin','eyes','brows','teeth']:continue
    if not o.data.shape_keys:o.shape_key_add(name='Basis')
    for kind in identities:
        key=o.shape_key_add(name='Id_'+kind)
        for v in key.data:v.co=identity(v.co,kind)
def tag(o,group,option,slot):
    o['v15Variation']=True;o['avatarVariantGroup']=group;o['avatarVariant']=option;o['avatarSlot']=slot
    return o
def bind(o,bone):
    o.parent=rig;g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE')
    m=o.modifiers.new('V15 skin','ARMATURE');m.object=rig
    return o
def clone(o,group,option,change):
    n=o.copy();n.data=o.data.copy();bpy.context.collection.objects.link(n);n.name='V15_'+option+'_'+o.name;tag(n,group,option,o['avatarSlot'])
    if n.data.shape_keys:
        for key in n.data.shape_keys.key_blocks:
            for v in key.data:v.co=change(v.co.copy())
    else:
        for v in n.data.vertices:v.co=change(v.co.copy())
    return n
hair=next(o for o in base if o.get('avatarSlot')=='hair')
eyes['avatarVariantGroup']='eyeColor';eyes['avatarVariant']='brown'
import numpy as np
for option,color in [('blue',(.18,.42,.66)),('green',(.25,.48,.24))]:
    variant=clone(eyes,'eyeColor',option,lambda v:v)
    mat=eyes.data.materials[0].copy();variant.data.materials.clear();variant.data.materials.append(mat)
    tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE')
    original=tex.image;pixels=np.array(original.pixels[:],dtype=np.float32).reshape(-1,4)
    rgb=pixels[:,:3];hi=rgb.max(axis=1);lo=rgb.min(axis=1)
    # Only chromatic brown iris pixels: sclera, pupil, alpha and highlights stay intact.
    mask=np.clip((hi-lo-.035)/.12,0,1)*np.clip((hi-.035)/.08,0,1)
    luminance=rgb@np.array([.2126,.7152,.0722]);target=np.array(color);target=target/(target@np.array([.2126,.7152,.0722]))
    rgb[:]=rgb*(1-mask[:,None])+np.clip(luminance[:,None]*target,0,1)*mask[:,None]
    image=bpy.data.images.new('V15 iris '+option,width=original.size[0],height=original.size[1],alpha=True)
    image.pixels.foreach_set(pixels.ravel());image.pack();tex.image=image
hair['avatarVariantGroup']='hairStyle';hair['avatarVariant']='short'
def crop(v):
    v.x*=.95;v.y=(v.y+.045*s)*.90-.045*s
    v.z=max(v.z,eye_z+.012*s)+(top_z-v.z)*.10
    return v
clone(hair,'hairStyle','crop',crop)
# A swept base plus a separate tied bun, all bound to the measured head.
clone(hair,'hairStyle','bun',lambda v:Vector((v.x*.97,(v.y+.04*s)*.94-.04*s,v.z)))
hairmat=material('V15 hair strands',(.10,.065,.04),.72)
metal=material('V15 warm metal',(.55,.38,.16),.29,.75)
fabric=material('V15 woven accessories',(.12,.19,.22),.85)
leather=material('V15 satchel leather',(.22,.10,.055),.6)
def ellipsoid(name,pos,scale,mat,group,option,slot,bone):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=pos);o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(mat)
    for f in o.data.polygons:f.use_smooth=True
    return bind(tag(o,group,option,slot),bone)
ellipsoid('V15 tied bun',(0,.080*s,eye_z+.079*s),(.047*s,.042*s,.044*s),hairmat,'hairStyle','bun','hair','head')
def tube_asset(name,points,radius,mat,group,option,slot,bone):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=2
    spl=curve.splines.new('POLY');spl.points.add(len(points)-1)
    for p,co in zip(spl.points,points):p.co=(*co,1)
    ob=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')
    return bind(tag(ob,group,option,slot),bone)
# Glasses use the actual eye plane and head width; no tinted whites.
for sign in [-1,1]:
    cx=sign*.035*s
    points=[(cx+.029*s*math.cos(t),eye_y-.014*s,eye_z+.020*s*math.sin(t)) for t in [i*2*math.pi/40 for i in range(41)]]
    tube_asset('V15 round glasses',points,.0018*s,metal,'faceAccessory','glasses','faceAccessory','head')
    tube_asset('V15 glasses temple',[(sign*.064*s,eye_y-.014*s,eye_z),(sign*.090*s,eye_y+.008*s,eye_z),(sign*.090*s,-.005*s,eye_z-.006*s)],.0016*s,metal,'faceAccessory','glasses','faceAccessory','head')
    points=[(sign*.095*s+.009*s*math.cos(t),-.014*s,eye_z-.047*s+.013*s*math.sin(t)) for t in [i*2*math.pi/32 for i in range(33)]]
    tube_asset('V15 hoop earring',points,.0015*s,metal,'earAccessory','hoops','earAccessory','head')
tube_asset('V15 glasses bridge',[(-.007*s,eye_y-.014*s,eye_z+.004*s),(0,eye_y-.017*s,eye_z+.008*s),(.007*s,eye_y-.014*s,eye_z+.004*s)],.0017*s,metal,'faceAccessory','glasses','faceAccessory','head')
# Cap is a fitted hemisphere, brim is a shallow ellipsoid.
verts=[];faces=[]
for j in range(9):
    t=.025+(math.pi/2-.025)*j/8
    for i in range(32):
        angle=i*math.pi/16;verts.append((.111*s*math.sin(t)*math.cos(angle),-.042*s+.123*s*math.sin(t)*math.sin(angle),eye_z+.049*s+.108*s*math.cos(t)))
        if j: k=j*32+i;prev=j*32+(i+1)%32;faces.append((k,prev,prev-32,k-32))
o=mesh('V15 cloth cap',verts,faces,fabric);finish(o,0,.003*s);bind(tag(o,'headAccessory','cap','headAccessory'),'head')
ellipsoid('V15 cap brim',(0,eye_y-.034*s,eye_z+.050*s),(.108*s,.070*s,.006*s),fabric,'headAccessory','cap','headAccessory','head')
for side in ['L','R']:
    b=rig.data.bones['forearm.'+side];axis=(b.tail_local-b.head_local).normalized();u=axis.cross(Vector((0,0,1))).normalized();v=axis.cross(u).normalized();c=b.tail_local-axis*.025*s
    points=[c+(u*math.cos(t)+v*math.sin(t))*.030*s for t in [i*math.pi/16 for i in range(33)]]
    tube_asset('V15 wrist bracelet '+side,points,.004*s,metal,'handAccessory','bracelets','handAccessory','forearm.'+side)
chest=rig.data.bones['chest'].head_local
def satchel_box(name,position,size,mat,bevel):
    bpy.ops.mesh.primitive_cube_add(size=1,location=position);o=bpy.context.object;o.name=name;o.scale=size
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(mat)
    edge=o.modifiers.new('Soft stitched edges','BEVEL');edge.width=bevel;edge.segments=4;apply_modifier(o,edge)
    for face in o.data.polygons:face.use_smooth=True
    return bind(tag(o,'backAccessory','satchel','backAccessory'),'chest')
satchel_box('V15 leather satchel',(0,.165*s,chest.z+.015*s),(.225*s,.105*s,.275*s),leather,.022*s)
satchel_box('V15 satchel flap',(0,.224*s,chest.z+.093*s),(.213*s,.014*s,.105*s),leather,.012*s)
satchel_box('V15 satchel closing strap',(0,.234*s,chest.z+.035*s),(.021*s,.009*s,.12*s),leather,.003*s)
satchel_box('V15 satchel clasp',(0,.241*s,chest.z+.018*s),(.029*s,.008*s,.026*s),metal,.004*s)
for sign in [-1,1]:
    # Follow the garment surface instead of bridging through empty shoulder space.
    points=[]
    for front in [False,True]:
        heights=[chest.z-.04*s+i*.18*s/16 for i in range(17)]
        if front:heights.reverse()
        for z in heights:
            x=sign*.105*s;hits=[]
            for garment in base:
                if garment.get('avatarSlot') not in ['top','outerwear']:continue
                hit,loc,normal,index=garment.ray_cast(Vector((x,-1 if front else 1,z)),Vector((0,1 if front else -1,0)))
                if hit:hits.append(loc.y)
            y=(min(hits) if front else max(hits)) if hits else (-.13*s if front else .10*s)
            points.append((x,y+(-.019*s if front else .019*s),z))
    tube_asset('V15 satchel shoulder strap',points,.007*s,leather,'backAccessory','satchel','backAccessory','chest')
# Fitted derivatives preserve the base coverage and skin weights. They replace,
# rather than overlay, the original garments; hems never uncover masked skin.
for o in base:
    slot=o['avatarSlot']
    if slot not in ['top','outerwear','bottom','footwear']:continue
    group={'top':'topStyle','outerwear':'outerwearStyle','bottom':'bottomStyle','footwear':'shoeStyle'}[slot]
    o['avatarVariantGroup']=group;o['avatarVariant']={'top':'linen','outerwear':'vest','bottom':'fitted','footwear':'travel'}[slot]
    def change(v,slot=slot):
        if slot=='top':
            f=1-smooth(.99*s,1.32*s,v.z);v.x*=1+.065*f;v.y*=1+.075*f;v.z-=.055*s*f
        elif slot=='outerwear':
            f=1-smooth(.98*s,1.28*s,v.z);v.z-=.115*s*f;v.x*=1+.055*f;v.y*=1+.08*f
        elif slot=='bottom':
            f=1-smooth(.72*s,1.02*s,v.z);center=(1 if v.x>0 else -1)*.14*s;v.x=center+(v.x-center)*(1+.18*f);v.y*=1+.12*f
        else:
            # Rounder reinforced boots retain ankle coverage and exact sole height.
            f=1-smooth(.10*s,.23*s,v.z);v.x*=1+.025*f;v.y-=.018*s*f*smooth(-.02*s,-.16*s,-v.y)
        return v
    clone(o,group,{'top':'tunic','outerwear':'longVest','bottom':'relaxed','footwear':'reinforced'}[slot],change)
from avatar_v15_wardrobe import extend_wardrobe
extend_wardrobe(rig,base,s,clone,tag,bind,ellipsoid,tube_asset)
from avatar_v15_uniforms import extend_uniforms
extend_uniforms(rig,base,s,clone,tag,bind,tube_asset)
rig['avatarVariationRevision']='v15-wardrobe-3'
rig['avatarCapabilities']=json.dumps({'fixedAppearance':False,'expressions':True,'hands':True,'wardrobe':True,'identityMorphs':True})
rest(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in bpy.context.scene.objects:
    if o.type=='MESH' and o.get('avatarSlot') and not o.get('authoringOnly'):o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(folder/'avatar-export.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_morph=True,export_morph_normal=True,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,export_yup=True)
(folder/'avatar-export.glb').replace(folder/'avatar.glb')
# Keep the Blender file immediately viewable with the default outfit.
for o in bpy.context.scene.objects:
    if o.get('v15Variation'):o.hide_render=True;o.hide_set(True)
    if o.get('authoringOnly'):o.hide_render=True;o.hide_set(True)
from avatar_v15_review import default_variants
default_variants()
for o in bpy.context.scene.objects:
    if o.get('avatarVariantGroup'):o.hide_set(o.hide_render)
rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(folder/'avatar.blend'))
print('V15_VARIATIONS_READY',a.profile,flush=True)
