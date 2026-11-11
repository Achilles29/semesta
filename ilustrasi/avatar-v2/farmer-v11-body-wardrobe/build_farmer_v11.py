"""V11 body fitting and mix-and-match Indonesian/casual wardrobe.
Blender 4.5 LTS --background -t 4 --python <file> [-- --views front,left]
Preserves V10. No network, paid service, or commercial game mesh required.
"""
import ast
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE=Path(__file__).resolve().parent
NAME='farmer-v11-body-wardrobe'
parser=argparse.ArgumentParser();parser.add_argument('--views',default='all')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.ops.wm.open_mainfile(filepath=str(HERE.parent/'farmer-v10-customization/farmer-v10-customization.blend'))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;rig=bpy.data.objects['SemestaV2_Rig'];camera=scene.camera
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=True
for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
scene.frame_set(1)

def helpers(path,names):
    tree=ast.parse(path.read_text(encoding='utf-8'))
    nodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names]
    assert len(nodes)==len(names)
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(path),'exec'),globals())

helpers(HERE.parent/'farmer-v8-modular/build_farmer_v8.py',
        ['smooth','weights','skin_object','mesh','loft','ribbon','ellipsoid','morph'])
source_morph=morph
helpers(HERE.parent/'farmer-v10-customization/build_farmer_v10.py',['duplicate','join','thickness','rounded_box'])
SKIN=bpy.data.materials['V8_skin'];SHIRT=bpy.data.materials['V8_shirt']
PANTS=bpy.data.materials['V8_trousers'];BAG=bpy.data.materials['V8_pack']
HAIR=bpy.data.materials['V8_hair'];CAP=bpy.data.materials['V8_headwear']
BOOT=bpy.data.materials['V8_footwear'];SOLE=bpy.data.materials['V8_sole']
BRASS=bpy.data.materials['V8_brass']

def mat(name,rgb):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Roughness'].default_value=.9
    return m

INK=mat('V11_FabricIndigo',(.018,.028,.045));CREAM=mat('V11_FabricIvory',(.75,.61,.36))

# First flatten the excessive V10 belly on ALL fitted garments/accessories.
# Facial shape keys must receive the same base change to preserve their deltas.
def flatten(p):
    x,y,z=p
    region=smooth(.82,.91,z)*(1-smooth(1.11,1.28,z))*(1-smooth(.20,.28,abs(x)))
    p.y*=1-.19*region
    p.x*=1-.045*region
    return p

for obj in scene.objects:
    if obj.type!='MESH':continue
    if obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:
            for v in key.data:v.co=flatten(v.co.copy())
    for v in obj.data.vertices:v.co=flatten(v.co.copy())
    obj.data.update()

# Independent bottom and footwear slots. The old tight-trouser anatomy is
# replaced by a minimum straight-leg cloth envelope, preserving its connected crotch.
pants=bpy.data.objects['Garment_Trousers'];pants['avatarSlot']='bottomStyle';pants['avatarChoice']='relaxed'
for v in pants.data.vertices:
    x,y,z=v.co;sign=1 if x>=0 else -1
    if z<.72:
        t=smooth(.30,.43,z);rx=.086+.008*t;ry=.100+.007*t
        cx=sign*.101;cy=.01
        dx=x-cx;dy=y-cy;r=math.sqrt((dx/rx)**2+(dy/ry)**2)
        blend=1-smooth(.60,.73,z)
        if r>0:
            v.co.x=cx+dx*(1+(1/r-1)*blend)
            v.co.y=cy+dy*(1+(1/r-1)*blend)
    if .63<z<.86 and abs(x)<.22:
        # A continuous cloth front/back, without the source body's groin/glute details.
        target=(1 if y>=0 else -1)*.136*math.sqrt(max(.05,1-(x/.225)**2))
        blend=smooth(.63,.73,z)
        v.co.y=v.co.y*(1-blend)+target*blend
    if z<.46:v.co.z=.14+(z-.30)*2
pants.data.update()
cargo=duplicate(pants,'Bottom_Cargo','cargo')
for v in cargo.data.vertices:
    x,y,z=v.co;sign=1 if x>=0 else -1
    t=smooth(.33,.46,z)*(1-smooth(.70,.84,z))
    v.co.x+= (x-sign*.101)*.12*t;v.co.y*=1+.12*t
for sign,side in [(1,'L'),(-1,'R')]:
    rounded_box('Cargo_Pocket_'+side,(sign*.196,-.015,.60),(.018,.11,.125),PANTS,
                'thigh.'+side,'bottomStyle','cargo')
for obj in scene.objects:
    if obj.name.startswith('Trouser_Cuff_'):
        obj['avatarSlot']='footwearStyle';obj['avatarChoice']='boots'
    if obj.name.startswith('Boot_'):
        obj['avatarSlot']='footwear';obj['avatarChoice']='boots'

def skirt_weights(p):
    # Blended left/right legs keep the single cloth tube continuous at the centre.
    upper=smooth(.62,.85,p.z);side=smooth(-.14,.14,p.x)
    return {'root':upper,'thigh.L':(1-upper)*side,'thigh.R':(1-upper)*(1-side)}

def lower_cloth(name,choice,flared=False):
    n=64;rows=24;verts=[];faces=[]
    for i in range(rows+1):
        t=i/rows;z=.24+.62*t
        rx=(.235 if flared else .205)*(1-t)+.183*t
        ry=(.153 if flared else .137)*(1-t)+.122*t
        for j in range(n):
            a=2*math.pi*j/n
            folds=.006*(1-t)*math.cos(12*a)
            verts.append(((rx+folds)*math.cos(a),(ry+folds)*math.sin(a),z))
    for i in range(rows):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    o=mesh(name,verts,faces,PANTS,slot='bottomStyle',choice=choice,weight_fn=skirt_weights)
    o.data.materials.append(INK);o.data.materials.append(CREAM)
    for f in o.data.polygons:
        row=f.index//n;col=f.index%n
        if choice=='sarong':
            f.material_index=2 if row%8==0 or col%16==0 else (1 if row%4==0 or col%8==0 else 0)
        elif row<2:f.material_index=2
    thickness(o,.003)
    if choice=='sarong':
        # The overlapping front fold distinguishes a wrap from a generic skirt.
        ribbon('Sarong_WrapEdge',[(.065,-.14,.81),(.070,-.147,.65),(.075,-.15,.45),(.08,-.15,.25)],
               .015,CREAM,slot='bottomStyle',choice=choice)
    return o

lower_cloth('Bottom_Sarong','sarong');lower_cloth('Bottom_Skirt','skirt',True)

# Sandals use real CC0 feet/shins rather than leaving the amputated boot region empty.
source_path=HERE.parent/'farmer-v6-mesh-study/farmer-v6-cc0-base-study.blend'
with bpy.data.libraries.load(str(source_path),link=False) as (src,dst):
    dst.objects=['V6_BlenderStudio_CC0_StylizedBody']
source=dst.objects[0];assert source is not None,'Missing CC0 body source for feet'
coords=[source_morph(v.co) for v in source.data.vertices]
selected=[f for f in source.data.polygons if max(coords[i].z for i in f.vertices)<.365]
ids=sorted({i for f in selected for i in f.vertices});mapping={i:j for j,i in enumerate(ids)}
feet=mesh('Sandal_Feet',[coords[i] for i in ids],[tuple(mapping[i] for i in f.vertices) for f in selected],
          SKIN,slot='footwear',choice='sandals')
for v in feet.data.vertices:v.co.z+=.030*(1-smooth(.10,.24,v.co.z))
bpy.data.objects.remove(source,do_unlink=True)
for sign,side in [(1,'L'),(-1,'R')]:
    points=[v.co for v in feet.data.vertices if sign*v.co.x>0 and v.co.z<.12]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    x=(lo.x+hi.x)/2;cy=(lo.y+hi.y)/2;rx=(hi.x-lo.x)/2+.009;ry=(hi.y-lo.y)/2+.015
    loft('Sandal_Sole_'+side,[(x,cy,.012,rx,ry),(x,cy,.031,rx,ry)],
         SOLE,'foot.'+side,'footwear','sandals')
    # Two sandal straps arch across the upper foot.
    for j,y in enumerate([-.110,-.022]):
        points=[(x+.066*math.cos(a),y,.045+.052*math.sin(a)) for a in [math.pi*i/16 for i in range(17)]]
        verts=[(px,py+d,pz) for px,py,pz in points for d in [-.014,.014]]
        o=mesh('Sandal_Strap_'+side+str(j),verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(16)],
               BOOT,'foot.'+side,'footwear','sandals');thickness(o,.004)

surface_trees={}
def clothing_surface(obj,x,z,front=True,offset=.004):
    if obj.name not in surface_trees:surface_trees[obj.name]=BVHTree.FromPolygons([v.co for v in obj.data.vertices],[list(f.vertices) for f in obj.data.polygons])
    tree=surface_trees[obj.name]
    hit=tree.ray_cast(Vector((x,-1 if front else 1,z)),Vector((0,1 if front else -1,0)))[0]
    return Vector((x,(-.15 if front else .13),z)) if hit is None else hit+Vector((0,-offset if front else offset,0))

def long_sleeves(obj):
    # Extend the actual short-sleeve boundary; no detached tube laid over the arm.
    verts=[tuple(v.co) for v in obj.data.vertices];faces=[tuple(f.vertices) for f in obj.data.polygons]
    edge_counts={}
    for f in faces:
        for a,b in zip(f,f[1:]+f[:1]):
            e=tuple(sorted((a,b)));edge_counts[e]=edge_counts.get(e,0)+1
    boundary={i for e,count in edge_counts.items() if count==1 for i in e}
    for sign in [-1,1]:
        ring=[i for i in boundary if sign*verts[i][0]>.25 and 1.06<verts[i][2]<1.10]
        assert len(ring)>6, f'Cannot locate sleeve rim on {obj.name}'
        cx=sum(verts[i][0] for i in ring)/len(ring);cy=sum(verts[i][1] for i in ring)/len(ring)
        ring.sort(key=lambda i:math.atan2(verts[i][1]-cy,verts[i][0]-cx))
        start=[Vector(verts[i]) for i in ring];previous=ring
        for row in range(1,9):
            t=row/8;z=1.08-.225*t;center=Vector((cx+(sign*.392-cx)*t,cy+(-.035-cy)*t,z))
            new=[]
            for p in start:
                a=math.atan2(p.y-cy,p.x-cx);r=math.hypot(p.x-cx,p.y-cy)
                radius=r*(1-t)+.043*t
                new.append(len(verts));verts.append(tuple(center+Vector((radius*math.cos(a),radius*math.sin(a),0))))
            for j in range(len(ring)):faces.append((previous[j],previous[(j+1)%len(ring)],new[(j+1)%len(ring)],new[j]))
            previous=new
    material=obj.data.materials[0];choice=obj['avatarChoice'];name=obj.name
    bpy.data.objects.remove(obj,do_unlink=True)
    new=mesh(name,verts,faces,material,slot='outfit',choice=choice);thickness(new)
    bm=bmesh.new();bm.from_mesh(new.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(new.data);bm.free()
    return new

# Six additional tops: geometry and construction differ, not just menu labels.
tops={}
for choice in ['batik','koko','kebaya','hoodie','tunic','blazer']:
    obj=duplicate(bpy.data.objects['Garment_work-shirt'],'Top_'+choice,choice)
    for v in obj.data.vertices:
        x,y,z=v.co
        bottom=1-smooth(.86,1.18,z);center=1-smooth(.19,.29,abs(x))
        if choice in ['koko','kebaya','tunic','blazer']:v.co.z-={'koko':.04,'kebaya':.11,'tunic':.22,'blazer':.07}[choice]*bottom*center
        if choice=='kebaya':
            waist=math.exp(-((z-1.06)/.13)**2)*center
            v.co.x*=1-.06*waist;v.co.y*=1-.04*waist
        if choice in ['hoodie','tunic']:
            v.co.x*=1+.045*bottom*center;v.co.y*=1+.045*bottom*center
        if choice in ['kebaya','tunic','koko','blazer'] and v.co.z<.99 and abs(x)<.25:
            # A longer top must clear the hips/skirt, not keep the old waist diameter.
            radius=math.sqrt((v.co.x/.225)**2+(v.co.y/.166)**2)
            blend=1-smooth(.86,.99,v.co.z)
            if 0<radius<1:v.co.x*=1+(1/radius-1)*blend;v.co.y*=1+(1/radius-1)*blend
    if choice in ['koko','kebaya','hoodie','tunic','blazer']:obj=long_sleeves(obj)
    tops[choice]=obj

# Collars and buttons: duplicate editable work-shirt details for batik/blazer.
for obj in list(scene.objects):
    if not obj.name.startswith('WorkShirt_'):continue
    for choice in ['batik','blazer']:
        if choice=='blazer' and 'Collar' not in obj.name:continue
        duplicate(obj,choice+'_'+obj.name,choice)
loft('Koko_StandCollar',[(0,0,1.40,.092,.085),(0,0,1.441,.086,.083)],SHIRT,'neck','outfit','koko')
for choice in ['koko','tunic','blazer','kebaya']:
    top=tops[choice]
    for j,z in enumerate([1.31,1.22,1.13,1.04,.95]):
        p=clothing_surface(top,0,z,offset=.009)
        ellipsoid(choice+'_Button_'+str(j),p,(.006,.004,.006),BRASS,
                  'chest' if z>1.16 else 'spine','outfit',choice)
for choice in ['kebaya','blazer']:
    top=tops[choice]
    for sign in [-1,1]:
        path=[clothing_surface(top,sign*x,z,offset=.007) for x,z in [(.072,1.39),(.10,1.32),(.045,1.19),(.012,1.08),(.012,.88)]]
        ribbon(choice+'_FrontEdge_'+str(sign),path,.014,CREAM,slot='outfit',choice=choice)
# Decorative geometric floral motifs inspired by batik, not a claim of a specific regional textile.
top=tops['batik'];verts=[];faces=[]
for front in [True,False]:
    for row in range(7):
        z=.91+row*.059
        for col in range(5):
            x=-.128+col*.064+(row%2)*.012
            for petal in range(4):
                a=petal*math.pi/2;cx=x+.013*math.cos(a);cz=z+.013*math.sin(a)
                start=len(verts)
                for j in range(10):
                    t=2*math.pi*j/10
                    verts.append(clothing_surface(top,cx+.010*math.cos(t),cz+.014*math.sin(t),front,.004))
                faces.append(tuple(start+j for j in range(10)) if front else tuple(start+j for j in reversed(range(10))))
o=mesh('Batik_FloralMotif',verts,faces,CREAM,slot='outfit',choice='batik')
for mat_ in [CREAM]:mat_.use_nodes=True;mat_.surface_render_method='DITHERED'
# Hood folded behind the neck, not obstructing interchangeable hair/headwear.
loft('Hoodie_FoldedHood',[(0,.085,1.30,.105,.06),(0,.105,1.36,.125,.074),(0,.09,1.425,.105,.062)],
     SHIRT,'chest','outfit','hoodie')
for sign in [-1,1]:
    ribbon('Hoodie_Drawstring_'+str(sign),[(sign*.045,-.104,1.40),(sign*.043,-.165,1.30),(sign*.045,-.167,1.24)],
           .006,CREAM,slot='outfit',choice='hoodie')
rounded_box('Hoodie_Pouch',(0,-.16,1.01),(.20,.016,.115),SHIRT,'spine','outfit','hoodie')

# Peci, a simple headscarf and longer bob extend the wardrobe for both frames.
loft('Headwear_Peci',[(0,0,1.765,.215,.202),(0,0,1.86,.208,.195),(0,0,1.89,.19,.179),
                    (0,0,1.90,.002,.002)],CAP,'head','headwear','peci')
scalp=duplicate(bpy.data.objects['Hair_Scalp'],'Headwear_Hijab','hijab')
scalp['avatarSlot']='headwear';scalp.data.materials.clear();scalp.data.materials.append(CAP)
for v in scalp.data.vertices:
    v.co.x*=1.10;v.co.y*=1.10;v.co.z+=.01
    if v.co.y>0:v.co.z-=.12*(1-smooth(1.65,1.80,v.co.z))
loft('Hijab_ShoulderDrape',[(0,0,1.315,.27,.207),(0,0,1.38,.19,.175),
                         (0,0,1.46,.105,.125),(0,0,1.50,.087,.103)],CAP,'neck','headwear','hijab')
bob=duplicate(bpy.data.objects['Hair_curtain'],'Hair_Bob','bob')
for v in bob.data.vertices:
    if v.co.y>-.09 and v.co.z<1.75:v.co.z-=.07*(1-smooth(1.60,1.75,v.co.z))

# Bind shape variants on every worn mesh, with a single exclusive target per
# frame/type pair. This avoids additive female+plus-size fitting errors.
BODY_TYPES={
 'skinny':(.84,.80,.84,.88,.73,.79),
 'slender':(.92,.86,.88,.94,.85,.88),
 'muscular':(1.20,1.00,1.02,1.04,1.26,1.12),
 'full':(1.15,1.30,1.37,1.20,1.17,1.18),
 'plus':(1.32,1.60,1.70,1.40,1.36,1.35),
 'fit':(1.08,.90,.92,1.03,1.09,1.06),
 'mature':(1.05,1.15,1.18,1.05,.99,1.03),
 'soft-mature':(1.03,1.18,1.22,1.18,1.03,1.10),
}
BODY_MORPHS={frame+'/'+kind:'Body_'+frame+'_'+kind for frame in ['male','female'] for kind in BODY_TYPES}
def body_shape(p,frame,kind):
    x,y,z=p;ax=abs(x);sign=1 if x>=0 else -1
    chest,waist,depth,hip,arm,leg=BODY_TYPES[kind]
    if frame=='female':chest*=.94;waist*=.94;hip*=1.12;arm*=.94
    # One continuous scale envelope; overlapping waist/hip multipliers previously
    # produced a triangular hem. Lateral displacement saturates monotonically,
    # moving sleeves/hands out with a wide torso rather than folding outer vertices inward.
    def interp(stops):
        if z<=stops[0][0]:return stops[0][1]
        for (za,a),(zb,b) in zip(stops,stops[1:]):
            if z<=zb:return a+(b-a)*smooth(za,zb,z)
        return stops[-1][1]
    sx=interp([(.34,1),(.60,leg),(.80,hip),(1.02,waist),(1.27,chest),(1.47,1)])
    sy=interp([(.34,1),(.60,leg),(.80,1+(hip-1)*.65),(1.02,depth),(1.27,1+(chest-1)*.65),(1.47,1)])
    p.x+=sign*min(ax,.19)*(sx-1)
    torso=smooth(.72,.87,z)*(1-smooth(1.36,1.47,z))*(1-smooth(.20,.34,ax))
    chest_zone=smooth(1.08,1.27,z)
    p.y*=1+(sy-1)*(1-smooth(.20,.34,ax))
    if frame=='female':
        # Subtle clothed torso contour, not a separate exposed/anatomical mesh.
        p.y-=.014*math.exp(-((z-1.24)/.085)**2)*torso*smooth(.015,.09,ax)*(1-smooth(.12,.20,ax))
    if ax>.24 and .82<z<1.37:
        blend=smooth(.24,.30,ax)*smooth(.82,.92,z)*(1-smooth(1.31,1.39,z))
        cx=.255+max(0,1.31-z)*.096/.235
        p.x+=sign*(ax-cx)*(arm-1)*blend;p.y*=1+(arm-1)*blend
    if kind in ['mature','soft-mature']:p.y+=.009*torso*chest_zone
    return p

# Apply solidify before adding shape keys; glTF otherwise cannot export those modifiers with morphs.
for obj in list(scene.objects):
    if obj.type!='MESH':continue
    obj.hide_set(False);bpy.context.view_layer.objects.active=obj
    if not obj.data.shape_keys:
        for modifier in list(obj.modifiers):
            if modifier.type!='ARMATURE':bpy.ops.object.modifier_apply(modifier=modifier.name)

# Batch same-material pieces of a slot before generating body morphs. One hair
# style or a row of buttons should not cost one draw call per individual piece.
groups={}
for obj in list(scene.objects):
    if obj.type!='MESH' or obj.data.shape_keys or len(obj.data.materials)!=1:continue
    signature=(obj.get('avatarSlot'),obj.get('avatarChoice'),tuple(obj.get('avatarChoices',[])),obj.data.materials[0].name)
    groups.setdefault(signature,[]).append(obj)
for objects in groups.values():
    if len(objects)>1:join(objects,objects[0].name)

for obj in list(scene.objects):
    if obj.type!='MESH':continue
    points=[v.co.copy() for v in obj.data.vertices]
    if not any(.34<p.z<1.47 for p in points):continue
    if not obj.data.shape_keys:obj.shape_key_add(name='Basis')
    for frame in ['male','female']:
        for kind in BODY_TYPES:
            key=obj.shape_key_add(name=BODY_MORPHS[frame+'/'+kind])
            for v,p in zip(key.data,points):v.co=body_shape(p.copy(),frame,kind)

CAPABILITIES=json.loads(rig['avatarCapabilities']);MORPHS=json.loads(rig['avatarMorphs'])
CAPABILITIES.update(bodyFrame=['male','female'],bodyType=list(BODY_TYPES),
    outfit=['overalls','tee','loose-tee','work-shirt','batik','koko','kebaya','hoodie','tunic','blazer'],
    bottomStyle=['relaxed','cargo','sarong','skirt'],footwear=['boots','sandals'],
    headwear=['cap','beanie','peci','hijab','none'],hairStyle=['short','swept','curtain','tied','bob','none'])
# The legacy footwear color name is retained; V11 uses footwearStyle to avoid a slot/color collision.
CAPABILITIES['footwearStyle']=CAPABILITIES.pop('footwear')
for obj in scene.objects:
    if obj.get('avatarSlot')=='footwear':obj['avatarSlot']='footwearStyle'
rig['avatarCapabilities']=json.dumps(CAPABILITIES);rig['avatarBodyMorphs']=json.dumps(BODY_MORPHS)
rig['avatarRevision']=NAME
DEFAULTS=dict(outfit='tee',bottomStyle='relaxed',footwearStyle='sandals',bodyFrame='male',bodyType='slender',
              hairStyle='short',headwear='none',accessory='none',gloves='none',faceShape='oval',
              eyeStyle='almond',noseStyle='defined',mouthStyle='smile')
def configure(**options):
    cfg={**DEFAULTS,**options};selected_body=BODY_MORPHS[cfg['bodyFrame']+'/'+cfg['bodyType']]
    for obj in scene.objects:
        if obj.type!='MESH':continue
        slot=obj.get('avatarSlot');field='hairStyle' if slot=='hair' else slot
        visible=not slot or cfg.get(field) in list(obj.get('avatarChoices',[obj.get('avatarChoice')]))
        if slot=='hair' and cfg['headwear']=='hijab':visible=False
        obj.hide_set(not visible);obj.hide_render=not visible
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                if key.name!='Basis':key.value=1 if key.name==selected_body else 0
            for field,values in MORPHS.items():
                key=obj.data.shape_keys.key_blocks.get(values.get(cfg[field],''))
                if key:key.value=1
    bpy.context.view_layer.update()

def rest():
    rig.animation_data.action=None
    for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
    scene.frame_set(1);bpy.context.view_layer.update()

rest();configure()
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/(NAME+'.blend')))
# Export neutral morph weights; runtime sets one body shape from saved config.
for obj in scene.objects:
    obj.hide_set(False);obj.hide_render=False
    if obj.type=='MESH' and obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:
            if key.name!='Basis':key.value=0
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in scene.objects:
    if obj.type=='MESH':obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(HERE/(NAME+'.glb')),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,
    export_morph=True,export_morph_normal=True,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,export_yup=True)

def render(name,loc=(2.8,-4.1,1.6)):
    if args.views!='all' and name not in args.views.split(','):return
    camera.data.ortho_scale=2.10;camera.location=loc
    camera.rotation_euler=(Vector((0,0,.95))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_x=700;scene.render.resolution_y=900
    scene.render.filepath=str(HERE/(name+'.png'));bpy.ops.render.render(write_still=True)

configure()
for name,loc in [('front',(0,-5,.95)),('left',(-5,0,.95)),('back',(0,5,.95))]:render(name,loc)
for frame in ['male','female']:
    for kind in BODY_TYPES:
        configure(bodyFrame=frame,bodyType=kind,hairStyle='bob' if frame=='female' else 'swept')
        render('body-'+frame+'-'+kind,(0,-5,.95))
saved_colors={m.name:tuple(m.diffuse_color) for m in [SHIRT,PANTS,CAP]}
def palette(shirt=(.72,.69,.59),pants=(.036,.074,.19),cap=(.015,.018,.022)):
    for m,c in [(SHIRT,shirt),(PANTS,pants),(CAP,cap)]:
        m.diffuse_color=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1)
for outfit in CAPABILITIES['outfit']:
    palette(shirt={'batik':(.12,.055,.025),'kebaya':(.48,.10,.19),'hoodie':(.06,.16,.25),
                   'tunic':(.10,.27,.21),'blazer':(.025,.05,.10)}.get(outfit,(.72,.69,.59)),
            pants=(.12,.07,.035) if outfit=='kebaya' else (.036,.074,.12))
    configure(bodyFrame='female' if outfit in ['kebaya','tunic'] else 'male',outfit=outfit,
              bottomStyle='sarong' if outfit in ['koko','tee'] else ('skirt' if outfit=='kebaya' else 'relaxed'),
              headwear='peci' if outfit=='koko' else 'none',hairStyle='bob' if outfit in ['kebaya','tunic'] else 'swept')
    render('outfit-'+outfit)
configure(bodyFrame='female',bodyType='soft-mature',outfit='tunic',bottomStyle='skirt',headwear='hijab')
palette((.10,.27,.21),(.035,.065,.09),(.55,.39,.22))
render('outfit-hijab-tunic')
configure(bodyFrame='male',bodyType='mature',outfit='tee',bottomStyle='sarong',headwear='peci')
palette((.72,.69,.59),(.035,.18,.12))
render('outfit-oblong-sarong')
palette()
for clip,frame in [('Walk',7),('Run',7),('Hoe',8),('Wave',14)]:
    rest();configure(bodyFrame='female',bodyType='plus',outfit='koko',bottomStyle='sarong',headwear='hijab')
    rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame);render('pose-'+clip.lower())
rest();configure()
for m in [SHIRT,PANTS,CAP]:
    m.diffuse_color=saved_colors[m.name];m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=saved_colors[m.name]
report={'revision':NAME,'capabilities':CAPABILITIES,'bodyMorphs':BODY_MORPHS,
 'source':'V10 saved blend + original CC0 V6 feet; new garment meshes',
 'defaultGameChanged':False,'limitations':['Stylized clothed body shapes, not anatomical simulation',
 'Sarong/skirt use blended leg skinning, not cloth physics; extreme poses require visual review',
 'Batik-inspired geometric motif and simplified kebaya are game adaptations, not exhaustive regional costumes']}
(HERE/'build-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
