"""Wardrobe 4: additive identity sculpt and differentiated trouser tailoring.

Run after wardrobe 3. Source coordinates are retained for repeatable fitting;
the skeleton, weights and approved locomotion actions are never changed.
"""
import sys,argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v14_common import *
from avatar_v15_review import default_variants
p=argparse.ArgumentParser();p.add_argument('--profile',default='male-heavy');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
folder=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'/a.profile
bpy.ops.wm.open_mainfile(filepath=str(folder/'avatar.blend'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');rest(rig)
profile=json.loads(rig['avatarProfile']);unit=profile['height']/1.78
skin=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('avatarSlot')=='skin' and not o.get('authoringOnly'))
eyes=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('avatarSlot')=='eyes')
eye_z=sum(v.co.z for v in eyes.data.vertices)/len(eyes.data.vertices);eye_y=min(v.co.y for v in eyes.data.vertices)
s=(max(v.co.z for v in skin.data.vertices)-rig.data.bones['head'].head_local.z)/.176471
def g(x,c,w):return math.exp(-((x-c)/w)**2)
def sculpt(co,kind):
    x,y,z=co;d=Vector();front=1-smooth(eye_y+.025*s,eye_y+.11*s,y)
    cheek=g(z,eye_z-.045*s,.039*s)*front
    jaw=g(z,eye_z-.098*s,.035*s)*front
    if kind=='faceSquare':d.x=x*(.24*jaw+.05*cheek);d.z=.006*s*jaw
    if kind=='faceLong':d.x=-x*.10*cheek;d.z=-.014*s*jaw
    if kind in ['faceSenior','facePrabowow']:
        senior=kind=='faceSenior'
        # Broad lower cheeks and a shorter, rounded chin distinguish the parody.
        d.x=x*((.12 if senior else .20)*cheek+(.10 if senior else .22)*jaw)
        d.y-=s*((.003 if senior else .012)*cheek+.005*jaw)
        d.z+=.011*s*jaw*(1 if not senior else -.3)
        # Shallow nasolabial creases, under-eye trough and softer jowls.
        fold=g(abs(x),(.026+.08*max(0,eye_z-z))*s,.0045*s)*g(z,eye_z-.063*s,.025*s)*front
        d.y+=.0028*s*fold+.002*s*g(z,eye_z-.015*s,.005*s)*g(abs(x),.036*s,.021*s)*front
        d.z-=.003*s*g(abs(x),.067*s,.018*s)*jaw
        if not senior:
            nose=g(x,0,.019*s)*g(z,eye_z-.037*s,.023*s)*front
            d.x+=x*.32*nose;d.y+=.004*s*nose
            # Heavier upper lids and a straighter, less prominent mouth.
            d.z-=.003*s*g(z,eye_z+.009*s,.008*s)*g(abs(x),.034*s,.025*s)*front
            mouth=g(z,eye_z-.075*s,.012*s)*g(x,0,.037*s)*front
            d.y+=.003*s*mouth;d.x+=x*.08*mouth
    return co+d
for o in bpy.context.scene.objects:
    if o.type!='MESH' or o.get('avatarSlot') not in ['skin','eyes','brows','teeth']:continue
    if not o.data.shape_keys:o.shape_key_add(name='Basis')
    for kind in ['faceSquare','faceLong','faceSenior','facePrabowow']:
        name='Id_'+kind;old=o.data.shape_keys.key_blocks.get(name)
        if old:o.shape_key_remove(old)
        key=o.shape_key_add(name=name)
        for v,b in zip(key.data,o.data.shape_keys.key_blocks[0].data):v.co=sculpt(b.co,kind)

for o in list(bpy.context.scene.objects):
    if o.get('v15Character4'):bpy.data.objects.remove(o,do_unlink=True)
source=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('avatarVariantGroup')=='bottomStyle']
hip=rig.data.bones['thigh.L'].head_local;knee=rig.data.bones['thigh.L'].tail_local;ankle=rig.data.bones['foot.L'].head_local
def center(z):
    lo,hi=(ankle,knee) if z<knee.z else (knee,hip)
    return lo.lerp(hi,max(0,min(1,(z-lo.z)/(hi.z-lo.z))))
def tailor(v,style):
    factors={'fitted':.84,'slim':.74,'straight':.85,'relaxed':1,'wide':1,'cargo':.96,'tactical':.86,'camo':.92,'civilService':.80,'safariWhite':.80,'jeans':.89,'jeansSlim':.80,'police':.81}
    # Preserve waist/seat room; progressively taper from mid-thigh to hem.
    blend=1-smooth(knee.z+.03*unit,hip.z-.025*unit,v.z);factor=1+(factors[style]-1)*blend
    c=center(v.z);sign=1 if v.x>=0 else -1
    v.x=sign*(c.x+(abs(v.x)-c.x)*factor);v.y=c.y+(v.y-c.y)*factor
    return v
for o in source:
    saved=o.data.attributes.get('v15TailoringSource')
    if not saved:
        saved=o.data.attributes.new('v15TailoringSource','FLOAT_VECTOR','POINT')
        for v,d in zip(o.data.vertices,saved.data):d.vector=v.co
    for v,d in zip(o.data.vertices,saved.data):v.co=tailor(d.vector.copy(),o['avatarVariant'])
    o.data.update()

denim=material('V15 indigo denim',(.028,.075,.16),.96)
stitch=material('V15 denim copper thread',(.46,.26,.10),.9)
police=material('V15 police charcoal trousers',(.052,.061,.067),.91)
import numpy as np
n=128;y,x=np.mgrid[:n,:n];grain=.72+.14*np.sin((x+y)*math.pi/2)+.06*np.sin(x*math.pi)
pixels=np.ones((n,n,4),dtype=np.float32);pixels[:,:,:3]=grain[:,:,None]
img=bpy.data.images.get('V15 denim weave') or bpy.data.images.new('V15 denim weave',width=n,height=n,alpha=False)
img.pixels.foreach_set(pixels.ravel());img.pack()
tex=denim.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img
denim.node_tree.links.new(tex.outputs['Color'],denim.node_tree.nodes.get('Principled BSDF').inputs['Roughness'])
for style,template in [('slim','fitted'),('jeans','straight'),('jeansSlim','fitted'),('police','straight')]:
    for src in source:
        if src['avatarVariant']!=template:continue
        obj=src.copy();obj.data=src.data.copy();bpy.context.collection.objects.link(obj)
        obj.name='V15 '+style+' '+src.name;obj['avatarVariant']=style;obj['v15Variation']=True;obj['v15Character4']=True
        for v,d in zip(obj.data.vertices,src.data.attributes['v15TailoringSource'].data):v.co=tailor(d.vector.copy(),style)
        if style in ['jeans','jeansSlim','police']:
            obj['avatarFixedColor']=True;obj.data.materials.clear();obj.data.materials.append(police if style=='police' else denim if len(obj.data.vertices)>1000 else stitch)
            for poly in obj.data.polygons:poly.material_index=0
        obj.data.update()

# Regular police trousers pair with an unbranded grey uniform shirt.
police_top=material('V15 police grey shirt',(.30,.29,.26),.9)
for src in list(bpy.context.scene.objects):
    if src.type!='MESH' or src.get('avatarVariantGroup')!='topStyle' or src.get('avatarVariant')!='civilService':continue
    obj=src.copy();obj.data=src.data.copy();bpy.context.collection.objects.link(obj);obj.name='V15 police '+src.name
    obj['avatarVariant']='police';obj['v15Variation']=True;obj['v15Character4']=True;obj['avatarFixedColor']=True
    obj.data.materials.clear();obj.data.materials.append(police_top)
    for poly in obj.data.polygons:poly.material_index=0

rig['avatarVariationRevision']='v15-wardrobe-4-character'
rest(rig);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in bpy.context.scene.objects:
    if o.type=='MESH' and o.get('avatarSlot') and not o.get('authoringOnly'):o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(folder/'avatar-export.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,export_morph=True,export_morph_normal=True,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,export_yup=True)
(folder/'avatar-export.glb').replace(folder/'avatar.glb')
default_variants()
for o in bpy.context.scene.objects:
    if o.get('avatarVariantGroup'):o.hide_set(o.hide_render)
rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(folder/'avatar-export.blend'))
(folder/'avatar-export.blend').replace(folder/'avatar.blend')
print('V15_CHARACTER_READY',a.profile,flush=True)
