import bpy
import math
from mathutils import Vector

OUT = '/www/wwwroot/semesta/public/models/characters'
GLB = OUT + '/warga-chibi-base.glb'
BLEND = OUT + '/warga-chibi-base.blend'
PREVIEW = OUT + '/warga-chibi-preview.png'
LEADER_PREVIEW = OUT + '/pemimpin-chibi-preview.png'

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.armatures, bpy.data.cameras, bpy.data.lights):
    for item in list(datablocks):
        if item.users == 0:
            datablocks.remove(item)

def fabric(name, color, roughness=.82, strength=.08):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    noise = mat.node_tree.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 115 if 'Denim' in name else 85
    noise.inputs['Detail'].default_value = 2
    bump = mat.node_tree.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = strength
    bump.inputs['Distance'].default_value = .018
    mat.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    mat.node_tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat

M = {
    'Skin': fabric('Skin · honey', (.72, .39, .24), .68, .035),
    'Hair': fabric('Hair · chestnut', (.19, .075, .035), .86, .04),
    'Shirt': fabric('Cotton · warm ivory', (.88, .82, .68), .9),
    'Jacket': fabric('Canvas · cedar brown', (.39, .20, .105), .9),
    'Denim': fabric('Denim · indigo blue', (.105, .25, .40), .92, .13),
    'Boots': fabric('Leather · umber', (.20, .105, .055), .55, .035),
    'Sole': fabric('Rubber · dark brown', (.075, .055, .04), .68),
    'Scarf': fabric('Scarf · persimmon', (.72, .13, .09), .82),
    'Stitch': fabric('Stitch · golden thread', (.83, .61, .25), .65, .03),
    'EyeWhite': fabric('Eye · ivory', (.97, .94, .84), .36, .0),
    'Iris': fabric('Eye · warm hazel', (.20, .095, .045), .3, .0),
    'Pupil': fabric('Eye · deep brown', (.045, .027, .02), .25, .0),
    'Highlight': fabric('Eye · catchlight', (1, .98, .9), .18, .0),
    'Mouth': fabric('Mouth · muted rose', (.43, .15, .13), .78, .0),
    'Headwear': fabric('Headwear · dark cloth', (.045, .045, .055), .75, .035),
    'Helmet': fabric('Headwear · safety yellow', (.90, .54, .045), .45, .02),
    'Caping': fabric('Headwear · woven straw', (.58, .39, .16), .9, .07),
    'LeaderUniform': fabric('Leader Uniform · cream', (.84, .79, .66), .86, .04),
    'LeaderTrousers': fabric('Leader Trousers · cream', (.79, .74, .62), .88, .06),
    'Pack': fabric('Pack · terracotta canvas', (.54, .22, .12), .9, .08),
    'Batik': fabric('Batik · indigo motif', (.20, .105, .055), .84, .03),
    'Vest': fabric('Vest · high visibility', (.90, .56, .08), .78, .04),
    'VestGreen': fabric('Vest · cooperative green', (.16, .39, .31), .84, .04),
    'Sarong': fabric('Sarong · woven indigo', (.25, .18, .33), .9, .08),
}
texture_files = {
    'Skin': 'skin-soft.png', 'Hair': 'hair-chestnut.png', 'Shirt': 'cotton-cream.png',
    'Jacket': 'canvas-brown.png', 'Denim': 'denim-weave.png',
    'LeaderUniform': 'uniform-cream.png', 'LeaderTrousers': 'uniform-cream.png',
    'Pack': 'canvas-brown.png',
}
for material_key, texture_file in texture_files.items():
    image = bpy.data.images.load(OUT + '/textures/' + texture_file, check_existing=True)
    image.pack()
    material = M[material_key]
    nodes = material.node_tree.nodes
    shader = nodes.get('Principled BSDF')
    image_node = nodes.new('ShaderNodeTexImage')
    image_node.image = image
    image_node.interpolation = 'Linear'
    material.node_tree.links.new(image_node.outputs['Color'], shader.inputs['Base Color'])

objects_by_bone = {}
def put_on_bone(obj, bone):
    obj['avatar_bone'] = bone
    objects_by_bone.setdefault(bone, []).append(obj)
    return obj

def smooth(obj, material):
    obj.data.materials.append(material)
    if obj.type == 'MESH':
        for face in obj.data.polygons:
            face.use_smooth = True
    return obj

def uv(name, loc, scale, material, bone, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth(obj, material)
    return put_on_bone(obj, bone)

def rounded_box(name, loc, scale, bevel, material, bone, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    if rotation:
        obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    bevel_mod = obj.modifiers.new('Soft tailored edges', 'BEVEL')
    bevel_mod.width = bevel
    bevel_mod.segments = 3
    bevel_mod.profile = .5
    obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return put_on_bone(obj, bone)

def capsule_between(name, a, b, radius, material, bone):
    start, end = Vector(a), Vector(b)
    delta = end - start
    middle = (start + end) * .5
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=14, location=middle)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (radius, radius, delta.length * .60 + radius)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth(obj, material)
    return put_on_bone(obj, bone)

def curve(name, coords, bevel, material, bone):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 16
    data.bevel_depth = bevel
    data.bevel_resolution = 3
    spl = data.splines.new('BEZIER')
    spl.bezier_points.add(len(coords) - 1)
    for point, co in zip(spl.bezier_points, coords):
        point.co = co
        point.handle_left_type = 'AUTO'
        point.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return put_on_bone(obj, bone)

def torso(name, rings, material, bone, segments=32):
    vertices = []
    faces = []
    for z, rx, ry in rings:
        for index in range(segments):
            angle = math.tau * index / segments
            vertices.append((math.cos(angle)*rx, math.sin(angle)*ry, z))
    for ring_index in range(len(rings)-1):
        for index in range(segments):
            a = ring_index*segments + index
            b = ring_index*segments + (index+1)%segments
            faces.append((a,b,b+segments,a+segments))
    faces.append(tuple(range(segments-1,-1,-1)))
    faces.append(tuple((len(rings)-1)*segments+i for i in range(segments)))
    mesh = bpy.data.meshes.new(name + ' mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for polygon in mesh.polygons: polygon.use_smooth = True
    return put_on_bone(obj, bone)

# A compact armature gives the exported asset usable walk-cycle controls.
arm_data = bpy.data.armatures.new('Warga Chibi Rig')
arm = bpy.data.objects.new('Warga Chibi Rig', arm_data)
bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bones = {
    'root': ((0, 0, .08), (0, 0, .66), None),
    'spine': ((0, 0, .62), (0, 0, 1.24), 'root'),
    'neck': ((0, 0, 1.19), (0, 0, 1.42), 'spine'),
    'head': ((0, 0, 1.34), (0, 0, 1.83), 'neck'),
}
for side, suffix in [(-1, 'L'), (1, 'R')]:
    bones[f'upper_arm.{suffix}'] = ((side*.22, 0, 1.11), (side*.29, 0, .91), 'spine')
    bones[f'forearm.{suffix}'] = ((side*.29, 0, .91), (side*.32, 0, .68), f'upper_arm.{suffix}')
    bones[f'hand.{suffix}'] = ((side*.32, 0, .68), (side*.33, -.015, .57), f'forearm.{suffix}')
    bones[f'thigh.{suffix}'] = ((side*.13, 0, .68), (side*.14, 0, .39), 'root')
    bones[f'calf.{suffix}'] = ((side*.14, 0, .39), (side*.14, 0, .15), f'thigh.{suffix}')
    bones[f'foot.{suffix}'] = ((side*.14, 0, .18), (side*.14, -.18, .12), f'calf.{suffix}')
edit_bones = {}
for name, (head, tail, parent) in bones.items():
    bone = arm_data.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    edit_bones[name] = bone
for name, (_, _, parent) in bones.items():
    if parent:
        edit_bones[name].parent = edit_bones[parent]
        edit_bones[name].use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
arm.show_in_front = True

# Legs and chunky farmer boots, with separate bone-weighted upper/lower sections.
torso('Bottom_Base_Pelvis', [(.53,.15,.11),(.57,.18,.12),(.63,.19,.13),(.69,.17,.12),(.74,.14,.10)], M['Denim'], 'root')
for side, suffix in [(-1, 'L'), (1, 'R')]:
    x = side * .14
    capsule_between('Bottom_Celana_Upper_' + suffix, (x, 0, .55), (x, 0, .30), .078, M['Denim'], f'thigh.{suffix}')
    capsule_between('Bottom_Celana_Lower_' + suffix, (x, 0, .31), (x, 0, .13), .065, M['Denim'], f'calf.{suffix}')
    capsule_between('Bottom_Cargo_Upper_' + suffix, (x, 0, .55), (x, 0, .30), .08, M['Denim'], f'thigh.{suffix}')
    capsule_between('Bottom_Cargo_Lower_' + suffix, (x, 0, .31), (x, 0, .13), .067, M['Denim'], f'calf.{suffix}')
    rounded_box('Bottom_Cargo_Pocket_' + suffix, (x, -.078, .41), (.072, .018, .085), .009, M['Denim'], f'thigh.{suffix}')
    capsule_between('Bottom_Jeans_Upper_' + suffix, (x, 0, .55), (x, 0, .30), .088, M['Denim'], f'thigh.{suffix}')
    capsule_between('Bottom_Jeans_Lower_' + suffix, (x, 0, .31), (x, 0, .13), .073, M['Denim'], f'calf.{suffix}')
    uv('Bottom_Jeans_Cuff_' + suffix, (x, -.005, .14), (.078,.08,.035), M['Stitch'], f'calf.{suffix}', 16, 10)
    capsule_between('Bottom_Kulot_Upper_' + suffix, (x, 0, .55), (x, 0, .30), .115, M['Denim'], f'thigh.{suffix}')
    capsule_between('Bottom_Kulot_Lower_' + suffix, (x, 0, .31), (x, 0, .13), .105, M['Denim'], f'calf.{suffix}')
    capsule_between('Bottom_Pendek_Short_' + suffix, (x, 0, .54), (x, 0, .34), .09, M['Denim'], f'thigh.{suffix}')
    capsule_between('Bottom_ExposedLeg_' + suffix, (x, 0, .31), (x, 0, .13), .064, M['Skin'], f'calf.{suffix}')
    uv('Leather boot ' + suffix, (x, -.065, .12), (.09, .135, .07), M['Boots'], f'foot.{suffix}')
    uv('Boot sole ' + suffix, (x, -.075, .067), (.092, .137, .02), M['Sole'], f'foot.{suffix}', 20, 12)

uv('Bottom_Rok_Waist', (0,.005,.615), (.19,.13,.085), M['Denim'], 'root', 28, 18)
bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=.235, radius2=.17, depth=.42, location=(0,.005,.435))
rok = bpy.context.object
rok.name = 'Bottom_Rok_Skirt'
smooth(rok, M['Denim'])
put_on_bone(rok, 'root')
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=.265, radius2=.18, depth=.52, location=(0,.005,.43))
sarong = bpy.context.object
sarong.name = 'Bottom_Sarung_Wrap'
smooth(sarong, M['Sarong'])
put_on_bone(sarong, 'root')
for index in range(5):
    curve('Bottom_Sarung_Stripe_%02d' % index, [(-.21,-.18,.25+index*.075),(0,-.198,.25+index*.075),(.21,-.18,.25+index*.075)], .006, M['Stitch'], 'root')

# Shirt and jacket give the silhouette layered cloth rather than a single colored torso.
torso('Top_Base_Torso', [(.62,.15,.105),(.70,.18,.12),(.82,.19,.13),(.94,.205,.14),(1.07,.225,.15),(1.16,.205,.135),(1.23,.14,.10)], M['Shirt'], 'spine')
# A fitted neckline closes the visible gap between the short neck and each shirt.
# The selectable top groups keep each collar in sync with its matching garment.
for style, material in [('Base', M['Shirt']), ('Jaket', M['Jacket']), ('Hoodie', M['Jacket']), ('Jas', M['Jacket'])]:
    radius = .108 if style in ('Jaket', 'Hoodie', 'Jas') else .075
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=.02, major_segments=24, minor_segments=8, location=(0, 0, 1.235))
    collar = bpy.context.object
    collar.name = f'Top_{style}_Collar'
    smooth(collar, material)
    put_on_bone(collar, 'spine')
uv('Top_Petani_Bib', (0, -.155, .91), (.145, .032, .20), M['Jacket'], 'spine', 28, 18)
rounded_box('Top_Petani_Pocket', (0, -.184, .91), (.09, .016, .085), .018, M['Jacket'], 'spine')
for side, suffix in [(-1, 'L'), (1, 'R')]:
    x = side * .11
    capsule_between('Top_Petani_Strap_' + suffix, (x, -.15, 1.16), (side*.16, -.18, .96), .026, M['Denim'], 'spine')
    uv('Top_Petani_Button_' + suffix, (side*.12, -.215, 1.12), (.018, .012, .018), M['Stitch'], 'spine', 12, 8)
    # Jacket panels sit over the shaped torso and appear only for the jacket preset.
    curve('Top_Jaket_Stitch_' + suffix, [(side*.17,-.214,.76),(side*.22,-.216,.97),(side*.18,-.195,1.17)], .005, M['Stitch'], 'spine')
    rounded_box('Top_Jaket_Pocket_' + suffix, (side*.20,-.191,.91), (.105,.025,.13), .018, M['Jacket'], 'spine')
    uv('Top_Jaket_Lapel_' + suffix, (side*.075, -.196, 1.18), (.065, .026, .10), M['Jacket'], 'spine', 20, 14)
    capsule_between('Top_Base_Sleeve_' + suffix, (side*.205, 0, 1.12), (side*.285, 0, .94), .05, M['Shirt'], f'upper_arm.{suffix}')
    for style in ['Jaket', 'Hoodie', 'Jas']:
        capsule_between(f'Top_{style}_Sleeve_' + suffix, (side*.205, 0, 1.12), (side*.285, 0, .94), .052, M['Jacket'], f'upper_arm.{suffix}')
    capsule_between('Forearm ' + suffix, (side*.29, 0, .92), (side*.32, -.01, .72), .045, M['Skin'], f'forearm.{suffix}')
    uv('Hand ' + suffix, (side*.33, -.025, .66), (.046, .041, .055), M['Skin'], f'hand.{suffix}')
    for finger in range(4):
        dx = (finger - 1.5) * .018
        capsule_between(f'Finger {suffix} {finger}', (side*.33 + dx, -.048, .635), (side*.33 + dx, -.05, .585), .009, M['Skin'], f'hand.{suffix}')
    capsule_between('Thumb ' + suffix, (side*.33-side*.038, -.038, .67), (side*.33-side*.062, -.05, .63), .012, M['Skin'], f'hand.{suffix}')

# Every shirt selection has its own actual garment detail meshes, not just a color swap.
outer_top = [(.62,.16,.115),(.70,.19,.13),(.82,.20,.14),(.94,.215,.15),(1.07,.235,.16),(1.16,.215,.145),(1.23,.15,.11)]
torso('Top_Jaket_Body', outer_top, M['Jacket'], 'spine')
torso('Top_Hoodie_Body', outer_top, M['Jacket'], 'spine')
uv('Top_Hoodie_Hood', (0,.145,1.20), (.145,.105,.15), M['Jacket'], 'spine', 24, 16)
rounded_box('Top_Hoodie_Pocket', (0,-.165,.82), (.22,.025,.12), .035, M['Jacket'], 'spine')
for side in [-1,1]:
    curve('Top_Hoodie_Drawstring_' + str(side), [(side*.025,-.17,1.17),(side*.035,-.188,1.04),(side*.035,-.18,.98)], .006, M['Stitch'], 'spine')
torso('Top_Jas_Body', outer_top, M['Jacket'], 'spine')
for side in [-1,1]:
    curve('Top_Jas_Lapel_' + str(side), [(0,-.155,1.22),(side*.08,-.175,1.10),(side*.18,-.145,.98)], .012, M['Stitch'], 'spine')
    rounded_box('Top_Jas_Pocket_' + str(side), (side*.15,-.153,.91), (.09,.018,.075), .012, M['Jacket'], 'spine')
for index,z in enumerate([1.08,.96,.84]):
    uv('Top_Jas_Button_%02d' % index, (0,-.165,z), (.009,.006,.009), M['Stitch'], 'spine', 12, 8)
for index in range(7):
    x = (index-3)*.038
    curve('Top_Batik_Motif_%02d' % index, [(x,-.187,.72),(x,-.207,.94),(x,-.172,1.19)], .006, M['Batik'], 'spine',)
for side, suffix in [(-1,'L'),(1,'R')]:
    rounded_box('Top_Seragam_Pocket_' + suffix, (side*.17,-.19,1.02), (.13,.025,.12), .018, M['Shirt'], 'spine')
    uv('Top_Seragam_Button_' + suffix, (side*.17,-.211,1.08), (.012,.008,.012), M['Stitch'], 'spine', 10, 8)
    # High-visibility vest panels and reflective bands for workers.
    for style, vest_mat in [('Pekerja',M['Vest']),('Rompi',M['VestGreen'])]:
        rounded_box(f'Top_{style}_Panel_' + suffix, (side*.17,-.19,.98), (.17,.036,.34), .045, vest_mat, 'spine')
        rounded_box(f'Top_{style}_Reflector_' + suffix, (side*.17,-.214,.91), (.17,.012,.035), .012, M['Highlight'], 'spine')
    curve('Top_Kebaya_Edge_' + suffix, [(side*.19,-.18,1.18),(side*.07,-.21,.97),(side*.19,-.17,.73)], .012, M['Stitch'], 'spine')
    uv('Top_Kebaya_Flower_' + suffix, (side*.09,-.222,1.08), (.025,.012,.025), M['Scarf'], 'spine', 12, 8)
    uv('Top_Koko_Collar_' + suffix, (side*.07,-.165,1.20), (.065,.035,.045), M['Shirt'], 'spine', 16, 10)
curve('Top_Koko_Placket', [(0,-.197,1.19),(0,-.207,.92),(0,-.184,.73)], .009, M['Stitch'], 'spine')

# Modular wearable accessories controlled by the Studio's accessory dropdown.
bpy.ops.mesh.primitive_torus_add(major_radius=.05, minor_radius=.007, major_segments=24, minor_segments=8, location=(-.085,-.232,1.625), rotation=(math.pi/2,0,0))
glasses_left=bpy.context.object; glasses_left.name='Accessory_Glasses_Left'; smooth(glasses_left,M['Headwear']); put_on_bone(glasses_left,'head')
bpy.ops.mesh.primitive_torus_add(major_radius=.05, minor_radius=.007, major_segments=24, minor_segments=8, location=(.085,-.232,1.625), rotation=(math.pi/2,0,0))
glasses_right=bpy.context.object; glasses_right.name='Accessory_Glasses_Right'; smooth(glasses_right,M['Headwear']); put_on_bone(glasses_right,'head')
curve('Accessory_Glasses_Bridge',[(-.04,-.236,1.625),(0,-.248,1.63),(.04,-.236,1.625)],.008,M['Headwear'],'head')
uv('Accessory_Badge_Medallion',(.20,-.208,1.09),(.038,.016,.038),M['Stitch'],'spine',16,10)
uv('Accessory_Badge_Center',(.20,-.225,1.09),(.018,.008,.018),M['Scarf'],'spine',12,8)
curve('Accessory_Sash',[(-.19,-.17,1.18),(-.05,-.215,.98),(.17,-.16,.75)],.016,M['Scarf'],'spine')
rounded_box('Accessory_Map_Board',(-.46,-.075,.69),(.17,.035,.23),.018,M['Shirt'],'hand.L')
curve('Accessory_Map_Hand', [(-.40,-.09,.67),(-.46,-.11,.62),(-.49,-.09,.70)],.025,M['Skin'],'hand.L')
bpy.ops.mesh.primitive_torus_add(major_radius=.042, minor_radius=.007, major_segments=20, minor_segments=8, location=(.32,-.008,.75))
watch_band=bpy.context.object; watch_band.name='Accessory_Jam_Band'; smooth(watch_band,M['Headwear']); put_on_bone(watch_band,'forearm.R')
uv('Accessory_Jam_Face',(.32,-.047,.75),(.027,.012,.029),M['Headwear'],'forearm.R',16,12)
uv('Accessory_Jam_Dial',(.32,-.060,.75),(.014,.005,.016),M['Stitch'],'forearm.R',12,8)

# Neck and shirt collar. The scarf is a selectable accessory, never forced on every outfit.
capsule_between('Neck', (0, 0, 1.24), (0, 0, 1.37), .06, M['Skin'], 'neck')
uv('Accessory_Scarf_Neck', (0, -.14, 1.245), (.13, .052, .045), M['Scarf'], 'spine')
rounded_box('Accessory_Scarf_Tail', (.045, -.188, 1.17), (.085, .035, .14), .028, M['Scarf'], 'spine', (0, -.22, -.12))
curve('Top_Kemeja_Placket', [(0,-.151,1.16),(0,-.16,.98),(0,-.139,.76)], .006, M['Stitch'], 'spine')
curve('Top_Kemeja_Collar_L', [(-.105,-.12,1.225),(-.045,-.155,1.16),(0,-.151,1.20)], .008, M['Shirt'], 'spine')
curve('Top_Kemeja_Collar_R', [(0,-.151,1.20),(.045,-.155,1.16),(.105,-.12,1.225)], .008, M['Shirt'], 'spine')
for index, z in enumerate([1.11, 1.02, .93, .84]):
    uv('Top_Kemeja_Button_%02d' % index, (0,-.163,z), (.009,.006,.009), M['Boots'], 'spine', 12, 8)

# Optional canvas rucksack, with a front pocket, curved straps and brass clasp.
rounded_box('Accessory_Backpack_Body', (0,.228,.98), (.37,.20,.43), .075, M['Pack'], 'spine')
rounded_box('Accessory_Backpack_Pocket', (0,.105,.88), (.24,.025,.15), .035, M['Pack'], 'spine')
uv('Accessory_Backpack_Clasp', (0,.085,.965), (.026,.018,.026), M['Stitch'], 'spine', 12, 8)
for side in [-1,1]:
    curve('Accessory_Backpack_Strap', [(side*.19,.20,1.17),(side*.22,.13,1.03),(side*.19,.12,.84)], .022, M['Pack'], 'spine')

# A second tailored outfit shares this same body and rig for the admin leader preset.
torso('Outfit_Leader_Tunic', [(.62,.15,.105),(.70,.18,.12),(.82,.19,.13),(.94,.205,.14),(1.07,.225,.15),(1.16,.205,.135),(1.23,.14,.10)], M['LeaderUniform'], 'spine')
torso('Outfit_Leader_Pelvis', [(.53,.15,.11),(.57,.18,.12),(.63,.19,.13),(.69,.17,.12),(.74,.14,.10)], M['LeaderTrousers'], 'root')
for side, suffix in [(-1, 'L'), (1, 'R')]:
    x = side * .14
    capsule_between('Outfit_Leader_Trouser_' + suffix, (x, 0, .55), (x, 0, .17), .092, M['LeaderTrousers'], f'thigh.{suffix}')
    rounded_box('Outfit_Leader_Pocket_' + suffix, (side*.17, -.205, 1.04), (.16, .025, .15), .025, M['LeaderUniform'], 'spine')
    rounded_box('Outfit_Leader_PocketFlap_' + suffix, (side*.17, -.224, 1.105), (.17, .026, .045), .012, M['LeaderUniform'], 'spine')
    rounded_box('Outfit_Leader_Epaulette_' + suffix, (side*.23, -.035, 1.13), (.12, .12, .035), .018, M['LeaderUniform'], 'spine')
    capsule_between('Outfit_Leader_Sleeve_' + suffix, (side*.22, 0, 1.10), (side*.29, 0, .95), .058, M['LeaderUniform'], f'upper_arm.{suffix}')
    uv('Outfit_Leader_Cuff_' + suffix, (side*.29, -.005, .94), (.067, .07, .035), M['LeaderUniform'], f'upper_arm.{suffix}', 16, 10)
    uv('Outfit_Leader_PocketButton_' + suffix, (side*.17, -.249, 1.105), (.015, .008, .015), M['Stitch'], 'spine', 12, 8)
for index in range(5):
    uv('Outfit_Leader_Button_%02d' % index, (.018, -.207, .78 + index*.105), (.014, .009, .014), M['Stitch'], 'spine', 12, 8)
curve('Outfit_Leader_Sash', [(-.08,-.21,1.19),(-.02,-.222,1.03),(.10,-.198,.81)], .018, M['Scarf'], 'spine')
rounded_box('Outfit_Leader_Belt', (0, -.015, .69), (.54, .34, .075), .035, M['Sole'], 'root')
rounded_box('Outfit_Leader_Buckle', (0, -.19, .69), (.075, .018, .052), .012, M['Stitch'], 'root')

# Human-like chibi head: slightly smaller relative to the torso, with clear but restrained eyes.
uv('Head', (0, 0, 1.60), (.255, .225, .275), M['Skin'], 'head', 40, 28)
for side, suffix in [(-1, 'L'), (1, 'R')]:
    uv('Ear ' + suffix, (side*.267, -.015, 1.59), (.045, .038, .06), M['Skin'], 'head', 20, 14)
    uv('Inner ear ' + suffix, (side*.285, -.045, 1.59), (.02, .01, .032), M['Scarf'], 'head', 16, 10)
    # Eye sockets, eyes, warm irises, pupils and catchlights.
    uv('Eye white ' + suffix, (side*.085, -.207, 1.625), (.043, .025, .052), M['EyeWhite'], 'head', 28, 20)
    uv('Iris ' + suffix, (side*.081, -.229, 1.619), (.023, .013, .031), M['Iris'], 'head', 24, 16)
    uv('Pupil ' + suffix, (side*.080, -.240, 1.618), (.014, .008, .020), M['Pupil'], 'head', 20, 14)
    uv('Eye catchlight ' + suffix, (side*.088, -.247, 1.632), (.007, .004, .009), M['Highlight'], 'head', 12, 8)
    curve('Soft eyebrow ' + suffix, [(side*.14,-.205,1.745),(side*.09,-.226,1.76),(side*.045,-.214,1.75)], .009, M['Hair'], 'head')

# Sculpted-looking hair cap and pointed locks, separated from the face.
uv('Hair_Short_Cap', (0, .025, 1.815), (.285, .24, .18), M['Hair'], 'head', 32, 22)
uv('Hair_Short_Back', (0, .10, 1.67), (.27, .20, .22), M['Hair'], 'head', 28, 18)
for side in [-1, 1]:
    uv('Hair_Short_Side_Lock', (side*.235, -.015, 1.70), (.045, .06, .15), M['Hair'], 'head', 18, 12)
for index, x in enumerate([-.12, 0, .12]):
    curve('Hair_Short_Lock_%02d' % index, [(x-.055,-.20,1.84),(x,-.225,1.78),(x+.035,-.21,1.81)], .018, M['Hair'], 'head')

# Alternative mesh hairstyles are toggled in Studio; they are not flat cards.
uv('Hair_Curly_Cap', (0,.04,1.82), (.35,.29,.23), M['Hair'], 'head', 30, 20)
for index in range(11):
    angle = index * math.tau / 11
    uv('Hair_Curly_Curl_%02d' % index, (math.cos(angle)*.28, math.sin(angle)*.16, 1.80 + (index%3)*.045), (.09,.09,.09), M['Hair'], 'head', 16, 10)
uv('Hair_Long_Cap', (0,.035,1.835), (.345,.285,.22), M['Hair'], 'head', 32, 22)
uv('Hair_Long_Back', (0,.13,1.58), (.33,.24,.37), M['Hair'], 'head', 28, 18)
for side in [-1,1]: uv('Hair_Long_Lock', (side*.27,.035,1.49), (.085,.12,.39), M['Hair'], 'head', 20, 14)
uv('Hair_Hijab_Hood', (0,.115,1.67), (.36,.28,.34), M['Scarf'], 'head', 30, 20)
uv('Hair_Hijab_Drape', (0,.10,1.36), (.34,.25,.31), M['Scarf'], 'head', 26, 18)
uv('Hair_Cepak_Cap', (0,.035,1.79), (.28,.235,.13), M['Hair'], 'head', 28, 18)
uv('Hair_Cepak_Back', (0,.11,1.68), (.26,.19,.18), M['Hair'], 'head', 24, 16)
uv('Hair_Kuncir_Cap', (0,.035,1.80), (.285,.24,.16), M['Hair'], 'head', 28, 18)
uv('Hair_Kuncir_Tail', (0,.225,1.57), (.09,.105,.16), M['Hair'], 'head', 20, 14)
bpy.ops.mesh.primitive_torus_add(major_radius=.075, minor_radius=.012, major_segments=20, minor_segments=8, location=(0,.225,1.63))
kuncir_tie=bpy.context.object; kuncir_tie.name='Hair_Kuncir_Tie'; smooth(kuncir_tie,M['Scarf']); put_on_bone(kuncir_tie,'head')
for items in objects_by_bone.values():
    for obj in items:
        if obj.name.startswith(('Hair_Curly', 'Hair_Long', 'Hair_Hijab')):
            obj.hide_render = True

# Optional headwear is exported as named 3D sub-objects and selected in Avatar Studio.
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.31, depth=.05, location=(0,0,1.96))
peci_brim = bpy.context.object
peci_brim.name = 'Accessory_Peci_Brim'
smooth(peci_brim, M['Headwear'])
put_on_bone(peci_brim, 'head')
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.265, depth=.15, location=(0,.005,2.04))
peci_crown = bpy.context.object
peci_crown.name = 'Accessory_Peci_Crown'
smooth(peci_crown, M['Headwear'])
put_on_bone(peci_crown, 'head')
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=14, location=(0,0,1.975))
helmet = bpy.context.object
helmet.name = 'Accessory_Helmet'
helmet.scale = (.34,.31,.18)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
smooth(helmet, M['Helmet'])
put_on_bone(helmet, 'head')
rounded_box('Accessory_Helmet_Brim', (0,-.025,1.94), (.72,.42,.045), .02, M['Helmet'], 'head')
caping = bpy.data.meshes.new('Caping · woven mesh')
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=.48, radius2=.035, depth=.34, location=(0,0,2.04))
caping_obj = bpy.context.object
caping_obj.name = 'Accessory_Caping'
smooth(caping_obj, M['Caping'])
put_on_bone(caping_obj, 'head')
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=.48, depth=.028, location=(0,0,1.88))
caping_rim = bpy.context.object
caping_rim.name = 'Accessory_Caping_Rim'
smooth(caping_rim, M['Caping'])
put_on_bone(caping_rim, 'head')
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.31, depth=.045, location=(0,0,1.94))
topi_brim = bpy.context.object
topi_brim.name = 'Accessory_Topi_Brim'
smooth(topi_brim, M['Headwear'])
put_on_bone(topi_brim, 'head')
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.235, depth=.19, location=(0,.015,2.035))
topi_crown = bpy.context.object
topi_crown.name = 'Accessory_Topi_Crown'
smooth(topi_crown, M['Headwear'])
put_on_bone(topi_crown, 'head')
bpy.ops.mesh.primitive_torus_add(major_radius=.32, minor_radius=.045, major_segments=32, minor_segments=10, location=(0,0,1.805))
bandana = bpy.context.object
bandana.name = 'Accessory_Bandana'
smooth(bandana, M['Scarf'])
put_on_bone(bandana, 'head')
for obj in [peci_brim, peci_crown, helmet, bpy.data.objects['Accessory_Helmet_Brim'], caping_obj, caping_rim, topi_brim, topi_crown, bandana]:
    obj.hide_render = True
for items in objects_by_bone.values():
    for obj in items:
        if obj.name.startswith('Outfit_Leader'):
            obj.hide_render = True

# Small nose bridge and tip, with a subtle smile.
uv('Nose bridge', (0, -.221, 1.555), (.027, .026, .048), M['Skin'], 'head', 18, 12)
uv('Nose tip', (0, -.241, 1.535), (.031, .027, .024), M['Skin'], 'head', 18, 12)
curve('Smile', [(-.045,-.221,1.465),(0,-.233,1.45),(.045,-.221,1.465)], .006, M['Mouth'], 'head')

# Merge small pieces by rig bone and switchable outfit/hair group. This keeps the GLB light
# enough for several citizens on a mobile map while preserving all material slots.
mesh_groups = {}
for bone_name, objects in objects_by_bone.items():
    for obj in objects:
        if bone_name == 'head':
            pivot = Vector((0, 0, 1.60))
            if obj.type == 'MESH':
                obj.location = pivot + (obj.location - pivot) * .70
                obj.location.z -= .10
                obj.scale *= .70
                if obj.name.startswith(('Accessory_Peci', 'Accessory_Caping', 'Accessory_Helmet', 'Accessory_Topi', 'Accessory_Bandana')):
                    obj.location.z -= .09
            elif obj.type == 'CURVE':
                for spline in obj.data.splines:
                    points = spline.bezier_points if spline.type == 'BEZIER' else spline.points
                    for point in points:
                        point.co.xyz = pivot + (Vector(point.co.xyz) - pivot) * .70
                        point.co.z -= .10
        if obj.type != 'MESH':
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.convert(target='MESH')
        group = obj.vertex_groups.new(name=bone_name)
        group.add([v.index for v in obj.data.vertices], 1.0, 'REPLACE')
        name = obj.name
        if name.startswith('Hair_Short_Lock'):
            category = 'Hair_Short_Lock'
        elif name.startswith('Hair_'):
            category = '_'.join(name.split('_')[:2])
        elif name.startswith('Outfit_Leader'):
            category = 'Outfit_Leader'
        elif name.startswith('Top_Base_Sleeve_'):
            category = 'Top_Base_Sleeve'
        elif name.startswith('Top_Base_'):
            category = 'Top_Base'
        elif name.startswith('Top_'):
            category = '_'.join(name.split('_')[:2])
        elif name.startswith('Bottom_ExposedLeg'):
            category = 'Bottom_ExposedLeg'
        elif name.startswith('Bottom_'):
            category = '_'.join(name.split('_')[:2])
        elif name.startswith('Accessory_'):
            category = '_'.join(name.split('_')[:2])
        else:
            category = 'Core'
        mesh_groups.setdefault((category, bone_name), []).append(obj)

for (category, bone_name), objects in mesh_groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    active = objects[0]
    bpy.context.view_layer.objects.active = active
    if len(objects) > 1:
        bpy.ops.object.join()
    active.name = category + '_' + bone_name
    active.parent = arm
    modifier = active.modifiers.new('Character skeleton', 'ARMATURE')
    modifier.object = arm
    # A clean, coherent base outfit in Blender previews; the GLB keeps all
    # alternatives and the web avatar module switches them by their names.
    if category.startswith(('Hair_Curly', 'Hair_Long', 'Hair_Hijab', 'Outfit_Leader', 'Accessory_')):
        active.hide_render = True
    elif category.startswith('Top_') and category not in ('Top_Base', 'Top_Kemeja'):
        active.hide_render = True
    elif category.startswith('Bottom_') and category != 'Bottom_Celana':
        active.hide_render = True

# Walk cycle: alternating short steps and a gentle arm swing.
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 13
for action_name, amplitude in [('Walk', .38), ('Idle', .025)]:
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.objects.active = arm
    if arm.animation_data is None:
        arm.animation_data_create()
    action = bpy.data.actions.new(action_name)
    arm.animation_data.action = action
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='POSE')
    for name in ['thigh.L','thigh.R','upper_arm.L','upper_arm.R']:
        pose_bone = arm.pose.bones[name]
        pose_bone.rotation_mode = 'XYZ'
        for frame, phase in [(1,0),(4,1),(7,0),(10,-1),(13,0)]:
            factor = amplitude * phase
            direction = 1 if name.endswith('.L') else -1
            if name.startswith('thigh'):
                pose_bone.rotation_euler[0] = factor * direction
            else:
                pose_bone.rotation_euler[0] = -factor * direction * .7
            pose_bone.keyframe_insert(data_path='rotation_euler', frame=frame, group=action_name)
    bpy.ops.object.mode_set(mode='OBJECT')
    for curve_data in action.fcurves:
        for key in curve_data.keyframe_points:
            key.interpolation = 'BEZIER'

# A small turntable scene creates a convenient, inspectable .blend source file.
bpy.ops.object.select_all(action='DESELECT')
floor_mat = fabric('Preview ground', (.42, .55, .35), .92, .02)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,0))
ground = bpy.context.object
ground.name = 'Preview ground'
ground.data.materials.append(floor_mat)
ground.hide_render = False
ground.hide_viewport = True

camera_data = bpy.data.cameras.new('Preview Camera')
camera = bpy.data.objects.new('Preview Camera', camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (2.7, -5.1, 2.2)
target = Vector((0, -.02, 1.02))
camera.rotation_euler = (target - camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens = 70
scene.camera = camera

for name, loc, power, size, color in [
    ('Key softbox', (-3,-4,5), 480, 4.0, (1.0,.82,.64)),
    ('Fill softbox', (4,-2,3.2), 240, 3.0, (.67,.82,1.0)),
    ('Rim light', (0,3,4), 420, 2.5, (1.0,.72,.45)),
]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = loc
    light.rotation_euler = (Vector((0,0,1.0)) - light.location).to_track_quat('-Z','Y').to_euler()

scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = PREVIEW
scene.world.color = (.32,.32,.32)
scene.view_settings.view_transform = 'AgX'
scene.frame_set(1)

# Keep source scene, armature, materials and cycle actions in the editable project.
bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# Export only the playable rig and character; preview stage remains in the .blend source.
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
for obj in bpy.context.scene.objects:
    if obj.get('avatar_bone'):
        obj.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(
    filepath=GLB,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_skins=True,
    export_morph=True,
    export_materials='EXPORT',
    export_apply=True,
    export_yup=True,
)

scene.render.filepath = PREVIEW
bpy.ops.render.render(write_still=True)

for obj in bpy.context.scene.objects:
    if obj.name.startswith('Outfit_Leader'):
        obj.hide_render = False
    elif obj.name.startswith('Accessory_Peci'):
        obj.hide_render = False
    elif obj.name.startswith(('Top_', 'Bottom_', 'Accessory_')):
        obj.hide_render = True
    elif obj.name.startswith(('Hair_Curly', 'Hair_Long', 'Hair_Hijab')):
        obj.hide_render = True
    elif obj.name.startswith('Hair_Short'):
        obj.hide_render = False
scene.render.filepath = LEADER_PREVIEW
bpy.ops.render.render(write_still=True)
