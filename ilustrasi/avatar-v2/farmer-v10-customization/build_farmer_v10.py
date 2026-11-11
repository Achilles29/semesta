"""V10: real garment ease, hair/accessory meshes and independent facial morphs.

Blender 4.5 LTS --background -t 4 --python <this file> [-- --views front,left]
Uses the saved V9 blend; selectively reuses pure helpers, never runs old builds.
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

HERE = Path(__file__).resolve().parent
NAME = 'farmer-v10-customization'
parser = argparse.ArgumentParser()
parser.add_argument('--views', default='all')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
bpy.ops.wm.open_mainfile(filepath=str(HERE.parent / 'farmer-v9-friendly-face/farmer-v9-friendly-face.blend'))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rig = bpy.data.objects['SemestaV2_Rig']
rig.animation_data.action = None
for track in rig.animation_data.nla_tracks: track.mute = True
for bone in rig.pose.bones: bone.matrix_basis = Matrix.Identity(4)
scene.frame_set(1)

def helpers(path, names):
    tree = ast.parse(path.read_text(encoding='utf-8'))
    nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names]
    assert len(nodes) == len(names)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), 'exec'), globals())

helpers(HERE.parent/'farmer-v8-modular/build_farmer_v8.py',
        ['smooth', 'weights', 'skin_object', 'mesh', 'loft', 'ellipsoid', 'ribbon', 'lock'])
tree = ast.parse((HERE.parent/'farmer-v9-friendly-face/build_farmer_v9.py').read_text(encoding='utf-8'))
profile = ast.literal_eval(next(n.value for n in tree.body if isinstance(n, ast.Assign)
                               and any(isinstance(t, ast.Name) and t.id == 'profile' for t in n.targets)))
helpers(HERE.parent/'farmer-v9-friendly-face/build_farmer_v9.py', ['shape', 'front_y'])
morph = lambda p: Vector(p)  # New hair is authored directly in the V9 coordinate space.
SKIN = bpy.data.materials['V8_skin']; HAIR = bpy.data.materials['V8_hair']
SHIRT = bpy.data.materials['V8_shirt']; PANTS = bpy.data.materials['V8_trousers']
BAG = bpy.data.materials['V8_pack']; BRASS = bpy.data.materials['V8_brass']
CAP = bpy.data.materials['V8_headwear']

# V9 inherited duplicate meridian vertices from the source neck loop. Welding
# the complete head removes the bright centre-face seam before adding morphs.
body = bpy.data.objects['Body_Skin']
bm = bmesh.new(); bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v.co.z > 1.475], dist=.00003)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(body.data); bm.free(); body.data.update()

CAPABILITIES = {
    'outfit': ['overalls', 'tee', 'loose-tee', 'work-shirt'],
    'hairStyle': ['short', 'swept', 'curtain', 'tied', 'none'],
    'headwear': ['cap', 'beanie', 'none'],
    'accessory': ['satchel', 'backpack', 'scarf', 'none'],
    'gloves': ['work', 'none'],
    'faceShape': ['oval', 'round', 'angular'],
    'eyeStyle': ['almond', 'round', 'relaxed'],
    'noseStyle': ['defined', 'button', 'upturned'],
    'mouthStyle': ['smile', 'neutral', 'grin'],
    'colors': ['skin', 'hair', 'shirt', 'trousers', 'footwear', 'headwearColor', 'gloveColor', 'pack'],
}
MORPHS = {'faceShape': {'round': 'Face_Round', 'angular': 'Face_Angular'},
          'eyeStyle': {'round': 'Eye_Round', 'relaxed': 'Eye_Relaxed'},
          'noseStyle': {'button': 'Nose_Button', 'upturned': 'Nose_Upturned'},
          'mouthStyle': {'neutral': 'Mouth_Neutral', 'grin': 'Mouth_Grin'}}
rig['avatarCapabilities'] = json.dumps(CAPABILITIES)
rig['avatarMorphs'] = json.dumps(MORPHS)
rig['faceRevision'] = 'v10-independent-facial-morphs'

def duplicate(obj, name, choice=None):
    new = obj.copy(); new.data = obj.data.copy(); new.name = name
    scene.collection.objects.link(new)
    if choice: new['avatarChoice'] = choice
    return new

def join(objects, name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.hide_set(False); obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join(); objects[0].name = name
    return objects[0]

def thickness(obj, amount=.003):
    mod = obj.modifiers.new('Visible garment edge', 'SOLIDIFY')
    mod.thickness = amount; mod.offset = -1

# Garments: preserve shoulder topology and weights, but remove the body-hugging
# waist and add real radial allowance. No global scaling of the skeleton/body.
def garment_point(p, ease=1):
    x, y, z = p; ax = abs(x)
    torso = 1 - smooth(.19, .29, ax)
    waist = (1 - smooth(1.08, 1.31, z)) * torso
    # A hanging tube across the narrow waist, instead of following abdominal anatomy.
    x *= 1 + .12*ease*waist
    y *= 1 + .18*ease*waist
    if z < 1.40:
        y += (.009*ease*torso) * (1 if y >= 0 else -1)
    if z < 1.27 and ax < .225:
        # Minimum cloth envelope straightens the waist without changing anatomy.
        radius_x = .170 + .012*ease + .004*(1-smooth(.86,1.16,z))
        radius_y = .132 + .012*ease
        radius = math.sqrt((x/radius_x)**2+(y/radius_y)**2)
        blend = (1-smooth(1.16,1.27,z))*torso
        if 0 < radius < 1:
            x *= 1+(1/radius-1)*blend; y *= 1+(1/radius-1)*blend
    # Sleeves expand around the upper-arm axis; collar remains fitted.
    sleeve = smooth(.205, .29, ax)
    center = .255 + max(0, 1.31-z)*.096/.235
    x += (1 if x >= 0 else -1)*(ax-center)*.19*ease*sleeve
    y *= 1 + .25*ease*sleeve
    return Vector((x, y, z))

shirt = bpy.data.objects['Garment_Shirt']
original_shirt = [v.co.copy() for v in shirt.data.vertices]
shirt['avatarSlot'] = 'outfit'; shirt['avatarChoices'] = ['overalls', 'tee']
for v, p in zip(shirt.data.vertices, original_shirt): v.co = garment_point(p, 1)
thickness(shirt)
for choice, ease, drop in [('loose-tee', 2.15, .045), ('work-shirt', 1.65, .022)]:
    obj = duplicate(shirt, 'Garment_'+choice, choice)
    del obj['avatarChoices']
    for v, p in zip(obj.data.vertices, original_shirt):
        v.co = garment_point(p, ease)
        v.co.z -= drop*(1-smooth(.86, 1.12, p.z))*(1-smooth(.19,.29,abs(p.x)))
    obj.data.update()

# Bib/straps and satchel must move outward with the new cloth, not intersect it.
for obj in list(scene.objects):
    if obj.type != 'MESH': continue
    if obj.name.startswith('Outfit_Overalls_'):
        for v in obj.data.vertices: v.co = garment_point(v.co, 1)
        thickness(obj, .002)
    if obj.name == 'Accessory_SatchelStrap':
        for v in obj.data.vertices:
            v.co = garment_point(v.co, 2.15)
            if v.co.y < 0: v.co.y -= .018
    if obj.name in ['Accessory_Satchel', 'Accessory_Button']:
        for v in obj.data.vertices: v.co.x += .018

pants = bpy.data.objects['Garment_Trousers']
for v in pants.data.vertices:
    x,y,z = v.co; sign = 1 if x >= 0 else -1
    fullness = smooth(.35,.46,z)*(1-smooth(.76,.86,z))
    # Keep the crotch connected and the boot cuff invariant.
    middle = smooth(.015,.075,abs(x))
    v.co.x += (x-sign*.10)*.23*fullness*middle
    v.co.y *= 1+.24*fullness
pants.data.update()

def rounded_box(name, center, size, mat, bone, slot, choice):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object; obj.name = name; obj.dimensions=size
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bevel=obj.modifiers.new('Rounded seams','BEVEL');bevel.width=.015;bevel.segments=3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.append(mat)
    for f in obj.data.polygons:f.use_smooth=True
    skin_object(obj,bone);obj['avatarSlot']=slot;obj['avatarChoice']=choice
    return obj

# A loose collared work shirt: actual collar leaves, placket and patch pockets.
for sign, side in [(1,'L'),(-1,'R')]:
    obj=mesh('WorkShirt_Collar_'+side,
        [(sign*.028,-.084,1.435),(sign*.095,-.061,1.405),
         (sign*.133,-.147,1.329),(sign*.054,-.161,1.354)],
        [(0,1,2,3)],SHIRT,slot='outfit',choice='work-shirt')
    thickness(obj,.005)
    rounded_box('WorkShirt_Pocket_'+side,(sign*.096,-.178,1.19),(.083,.012,.09),
                SHIRT,'chest','outfit','work-shirt')
for i,z in enumerate([1.32,1.22,1.12,1.02,.92]):
    ellipsoid('WorkShirt_Button_'+str(i),(0,-.181,z),(.008,.004,.008),BRASS,
              'chest' if z>1.16 else 'spine','outfit','work-shirt')
ribbon('WorkShirt_Placket',[(0,-.181,z) for z in [.88,.98,1.08,1.18,1.28,1.35]],
       .019,SHIRT,slot='outfit',choice='work-shirt')

# Three additional complete hairstyles, not recolours of the short cut.
for style in ['swept','curtain','tied']:
    parts=[duplicate(bpy.data.objects['Hair_Scalp'],'Hair_'+style+'_Scalp',style)]
    before=set(scene.objects)
    if style=='swept':
        for j in range(7):
            x=-.17+j*.047
            path=[(x+.065*t,-.145-.072*math.sin(t*math.pi*.75),
                   1.855-.135*t+.024*math.sin(t*math.pi)) for t in [i/9 for i in range(10)]]
            lock('Sweep_'+str(j),path,.040,.021)
        for j in range(9):
            a=.1+j*(math.pi-.2)/8
            lock('Sweep_Back_'+str(j),[(.19*math.cos(a),.16*math.sin(a),1.81),
                 (.207*math.cos(a+.06),.177*math.sin(a+.06),1.73),
                 (.177*math.cos(a+.1),.144*math.sin(a+.1),1.635)],.042,.018)
    elif style=='curtain':
        for sign in [-1,1]:
            for j in range(4):
                x=.018+j*.027
                lock('Curtain_'+str(sign)+'_'+str(j),
                    [(sign*x,-.10,1.871),(sign*(x+.06),-.188,1.81),
                     (sign*(.14+j*.013),-.183+j*.014,1.715),
                     (sign*(.159+j*.011),-.115+j*.013,1.64-j*.015)],.047,.022)
        for j in range(11):
            a=.08+j*(math.pi-.16)/10
            lock('Curtain_Back_'+str(j),[(.19*math.cos(a),.16*math.sin(a),1.81),
                 (.214*math.cos(a),.185*math.sin(a),1.70),
                 (.163*math.cos(a+.06),.142*math.sin(a+.06),1.56+.018*math.sin(j))],.045,.022)
    else:
        for sign in [-1,1]:
            lock('Tied_Fringe_'+str(sign),[(sign*.035,-.14,1.84),(sign*.11,-.213,1.77),
                 (sign*.151,-.17,1.69)],.047,.019)
        for j in range(5):
            lock('Tied_Tail_'+str(j),[((j-2)*.018,.14,1.76),((j-2)*.027,.219,1.69),
                 ((j-2)*.024,.247,1.60),((j-2)*.013,.215,1.49+.016*abs(j-2))],.045,.032)
    for obj in set(scene.objects)-before:
        if obj.type=='MESH':obj['avatarChoice']=style;parts.append(obj)
    join(parts,'Hair_'+style)

# Beanie keeps the same envelope as the cap, with a separate rolled brim.
beanie=duplicate(bpy.data.objects['Headwear_BackwardCap'],'Headwear_Beanie','beanie')
for v in beanie.data.vertices:v.co.z += .018*smooth(1.78,1.92,v.co.z)
loft('Headwear_BeanieRim',[(0,0,1.765,.216,.207),(0,0,1.785,.224,.214),
      (0,0,1.812,.220,.211)],CAP,'head','headwear','beanie')

rounded_box('Backpack_Main',(0,.213,1.13),(.255,.13,.32),BAG,'chest','accessory','backpack')
rounded_box('Backpack_Flap',(0,.279,1.24),(.264,.019,.13),BAG,'chest','accessory','backpack')
rounded_box('Backpack_Pocket',(0,.290,1.04),(.174,.035,.105),BAG,'chest','accessory','backpack')
for sign,side in [(1,'L'),(-1,'R')]:
    ribbon('Backpack_Strap_'+side,[(sign*.12,.21,1.25),(sign*.17,.10,1.39),
       (sign*.17,-.075,1.41),(sign*.14,-.183,1.28),(sign*.15,-.188,1.13),
       (sign*.17,-.14,.99),(sign*.16,.19,.99)],.032,BAG,slot='accessory',choice='backpack')
loft('Scarf_Collar',[(0,0,1.399,.114,.107),(0,0,1.427,.101,.098),
                   (0,0,1.45,.083,.088)],BAG,'neck','accessory','scarf')
scarf=mesh('Scarf_Tail',[(-.06,-.112,1.42),(.047,-.113,1.42),(.080,-.188,1.29),
         (.018,-.197,1.19),(-.03,-.185,1.30)],[(0,1,2,3,4)],BAG,slot='accessory',choice='scarf')
thickness(scarf,.005)

# Independent facial shape keys. Every patch follows the deformed face surface;
# head shapes taper away above the brows to keep all hair/headwear compatible.
def nose(x,z,style='defined'):
    if style=='button': return .029*math.exp(-(x/.026)**2-((z-1.614)/.023)**2)
    if style=='upturned': return .043*math.exp(-(x/.024)**2-((z-1.621)/.022)**2)+.007*math.exp(-(x/.018)**2-((z-1.65)/.035)**2)
    return .035*math.exp(-(x/.027)**2-((z-1.616)/.025)**2)+.010*math.exp(-(x/.018)**2-((z-1.649)/.040)**2)

def old_nose(x,z):return .019*math.exp(-(x/.022)**2-((z-1.617)/.026)**2)
def surface(x,z):return front_y(x,z)+old_nose(x,z)-nose(x,z)

facial=[o for o in scene.objects if o.type=='MESH' and (o.name=='Body_Skin' or o.name.startswith('Face_'))]
for obj in facial:
    is_body=obj.name=='Body_Skin'; is_eye=obj.name.startswith(('Face_Eye','Face_Iris','Face_Pupil','Face_Highlight'))
    is_mouth=obj.name.startswith('Face_Smile');is_ear=obj.name.startswith('Face_Ear')
    # Improve the base nose in actual geometry, including bridge and defined tip.
    for v in obj.data.vertices:
        x,y,z=v.co
        if 1.50<z<1.74 and y<-.04 and not is_ear:v.co.y -= nose(x,z)-old_nose(x,z)
    obj.shape_key_add(name='Basis')
    def key(name, fn):
        k=obj.shape_key_add(name=name)
        for dst,src in zip(k.data,obj.data.vertices):dst.co=fn(src.co.copy())
    def face_point(p,style):
        x,y,z=p
        if not 1.485<z<1.747:return p
        amount=smooth(1.485,1.54,z)*(1-smooth(1.69,1.747,z))
        factor=1+(.12 if style=='round' else -.12)*amount
        p.x*=factor
        if y<-.035 and not is_ear:
            # Stretch the head and its decals together, preserving patch clearance.
            p.y += (.007 if style=='round' else -.002)*amount
        return p
    key('Face_Round',lambda p:face_point(p,'round'))
    key('Face_Angular',lambda p:face_point(p,'angular'))
    for style in ['button','upturned']:
        def change_nose(p,style=style):
            x,y,z=p
            if 1.50<z<1.74 and y<-.04 and not is_ear:p.y+=nose(x,z)-nose(x,z,style)
            return p
        key('Nose_'+style.title(),change_nose)
    if is_eye:
        for style in ['round','relaxed']:
            def change_eye(p,style=style):
                x,y,z=p;sign=1 if x>=0 else -1;cx=sign*.073
                p.x=cx+(x-cx)*( .91 if style=='round' else 1.04)
                p.z=1.68+(z-1.68)*(1.15 if style=='round' else .77)
                p.y+=surface(p.x,p.z)-surface(x,z)
                return p
            key('Eye_'+style.title(),change_eye)
    if is_mouth:
        for style in ['neutral','grin']:
            def change_mouth(p,style=style):
                x,y,z=p
                t=max(0,min(1,(x+.047)/.094));base=1.551+.009*(2*t-1)**2+.002*t
                p.x*=.78 if style=='neutral' else 1.18
                p.z=(1.555 if style=='neutral' else 1.548+.017*(2*t-1)**2)+(z-base)
                p.y+=surface(p.x,p.z)-surface(x,z)
                return p
            key('Mouth_'+style.title(),change_mouth)

# Recalculate consistent outward normals on generated meshes (patches remain
# front-facing); authored source normals are retained where possible.
for obj in scene.objects:
    if obj.type=='MESH':obj.data.update()

DEFAULTS={'outfit':'overalls','headwear':'cap','accessory':'satchel','gloves':'work',
          'hairStyle':'short','faceShape':'oval','eyeStyle':'almond','noseStyle':'defined','mouthStyle':'smile'}
def configure(**options):
    cfg={**DEFAULTS,**options}
    for obj in scene.objects:
        if obj.type!='MESH':continue
        slot=obj.get('avatarSlot');key='hairStyle' if slot=='hair' else slot
        visible=not slot or cfg.get(key) in list(obj.get('avatarChoices',[obj.get('avatarChoice')]))
        obj.hide_set(not visible);obj.hide_render=not visible
        if obj.data.shape_keys:
            for k in obj.data.shape_keys.key_blocks:
                if k.name!='Basis':k.value=0
            for field,values in MORPHS.items():
                name=values.get(cfg[field]);k=obj.data.shape_keys.key_blocks.get(name) if name else None
                if k:k.value=1
    bpy.context.view_layer.update()

def rest():
    rig.animation_data.action=None
    for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
    scene.frame_set(1);bpy.context.view_layer.update()

rest();configure()
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/(NAME+'.blend')))
for obj in scene.objects:obj.hide_set(False);obj.hide_render=False
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in scene.objects:
    if obj.type=='MESH':obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(HERE/(NAME+'.glb')),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_extras=True,
    export_morph=True,export_morph_normal=True,export_yup=True)
report={'revision':NAME,'contract':'semesta-farmer-v8-legacy19','capabilities':CAPABILITIES,
        'morphs':MORPHS,'source':'V9 saved blend; original CC0 body preserved',
        'defaultGameChanged':False,'note':'Morph combinations are additive; inspect extreme combinations in WebGL.'}
(HERE/'build-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')

camera=scene.camera
scene.render.resolution_x=800;scene.render.resolution_y=1000
scene.render.resolution_percentage=100
def render(name,loc=(2.8,-4.1,1.6),target=(0,0,.95),scale=2.10):
    if args.views!='all' and name not in args.views.split(','):return
    camera.data.ortho_scale=scale;camera.location=loc
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(HERE/(name+'.png'));bpy.ops.render.render(write_still=True)

configure()
for name,loc in [('front',(0,-5,.95)),('left',(-5,0,.95)),('back',(0,5,.95)),('three-quarter',(2.8,-4.1,1.6))]:render(name,loc)
for style in ['oval','round','angular']:
    configure(headwear='none',accessory='none',faceShape=style,
              eyeStyle={'oval':'almond','round':'round','angular':'relaxed'}[style],
              noseStyle={'oval':'defined','round':'button','angular':'upturned'}[style],
              mouthStyle={'oval':'smile','round':'grin','angular':'neutral'}[style])
    render('face-'+style,(0,-4,1.68),(0,0,1.68),.62)
configure(headwear='none',accessory='none')
render('face-profile',(-4,0,1.68),(0,0,1.68),.62)
for style in ['swept','curtain','tied']:
    configure(headwear='none',hairStyle=style,accessory='none')
    render('hair-'+style,(2,-4,1.72),(0,0,1.68),.75)
for outfit in ['tee','loose-tee','work-shirt']:
    configure(outfit=outfit,headwear='none',hairStyle='curtain',accessory='none',gloves='none')
    render('outfit-'+outfit)
configure(outfit='loose-tee',headwear='beanie',hairStyle='tied',accessory='backpack',gloves='none')
render('accessory-backpack',(2.8,4.1,1.6))
configure(outfit='work-shirt',headwear='none',hairStyle='swept',accessory='scarf',gloves='none')
render('accessory-scarf')
for clip,frame in [('Walk',7),('Run',7),('Hoe',8),('Wave',14)]:
    rest();configure(outfit='loose-tee',headwear='none',accessory='backpack',hairStyle='tied')
    rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame)
    render('pose-'+clip.lower())
rest();configure()
print(json.dumps(report))
