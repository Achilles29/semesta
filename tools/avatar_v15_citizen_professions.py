"""Readable citizen professions, fitted to the current V15 garment surfaces.

Blender authoring module only: build_professions(rig) does not save or export.
Call after the body's shared garment-fitting pass. Coordinates are metres, Z up,
front -Y. Original RW insignia; no third-party clothing textures or logos.
"""
from avatar_v14_common import *
from avatar_v15_citizen_common import fit_garment_to_body, body_data, body_center_y
from mathutils.kdtree import KDTree


def build_professions(rig):
    """Add five role tops, three bottoms, and correct the existing police set."""
    for obj in list(bpy.context.scene.objects):
        if obj.get('v15CitizenProfession'):
            data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if data.users == 0 and isinstance(data, bpy.types.Mesh):
                bpy.data.meshes.remove(data)
    for mat in list(bpy.data.materials):
        if mat.name.startswith('V15 citizen profession ') and mat.users == 0:
            bpy.data.materials.remove(mat)

    profile = json.loads(rig['avatarProfile'])
    unit = profile['height'] / 1.78
    body = {'slim': .94, 'balanced': 1, 'heavy': 1.14}[profile['body']]
    chest = rig.data.bones['chest']
    hip = rig.data.bones['thigh.L'].head_local
    waist = hip.z + .07 * unit
    source = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    result = []
    trees = {}

    def srgb(code):
        values = [int(code[i:i+2], 16)/255 for i in (1, 3, 5)]
        return tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in values)

    def cloth(name, color, rough=.86, metal=0):
        return material('V15 citizen profession '+name, srgb(color), rough, metal)

    mats = {
        'police': cloth('police warm brown', '#A58C72'),
        'policeBottom': cloth('police dark brown', '#30241C'),
        'charcoal': cloth('graphite twill', '#252C32'),
        'orange': cloth('operator orange', '#F56B20'),
        'silver': cloth('reflective silver', '#DCE3DF', .43, .12),
        'yellow': cloth('high visibility yellow', '#D2E348', .60),
        'navy': cloth('rescue and pilot navy', '#202D42'),
        'red': cloth('racing red', '#CB2638'),
        'white': cloth('clean white', '#ECEFEB'),
        'black': cloth('uniform black', '#15191D'),
        'gold': cloth('RW brass embroidery', '#D1AD55', .52, .25),
        'blue': cloth('medical blue', '#2F7797'),
        'khaki': cloth('civil service khaki', '#AC9470'),
    }

    def tagged(obj, group, style, slot=None):
        obj['avatarVariantGroup'] = group
        obj['avatarVariant'] = style
        obj['avatarSlot'] = slot or ('top' if group == 'topStyle' else 'bottom')
        obj['avatarFixedColor'] = True
        obj['avatarTintMode'] = 'absolute'
        obj['v15CitizenProfession'] = True
        # Source uniforms remain available for repeat authoring but their new
        # fitted replacements, rather than both versions, must be exported.
        if 'authoringOnly' in obj:
            del obj['authoringOnly']
        obj.hide_render = False
        obj.hide_set(False)
        result.append(obj)
        return obj

    def dye(obj, mat):
        obj['avatarFixedColor'] = True
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        for polygon in obj.data.polygons:
            polygon.material_index = 0
        return obj

    def largest(group, option):
        matches = [o for o in source if o.get('avatarVariantGroup') == group and o.get('avatarVariant') == option]
        if not matches:
            raise RuntimeError('Missing fitted garment: '+group+'/'+option)
        return max(matches, key=lambda o: len(o.data.vertices))

    def duplicate(src, group, style, label, mat, ease=.018):
        obj = src.copy()
        obj.data = src.data.copy()
        bpy.context.collection.objects.link(obj)
        obj.name = 'V15 profession '+style+' '+label
        tagged(obj, group, style)
        dye(obj, mat)
        if group == 'topStyle':
            authored = [vertex.co.copy() for vertex in obj.data.vertices]
            fit_garment_to_body(obj, rig, ease=ease)
            fit_neckline(obj, authored, ease)
        return obj

    def fit_neckline(obj, authored, ease):
        """Keep the authored neckline's local topology during torso fitting.

        Upper shoulders are an open cross section: a radial body ray can hit
        the opposite shoulder and pull one vertex across the entire neck. The
        source is already scaled to this rig and has a clean, close neckline;
        retain that band and blend into the fitted chest below it. This also
        keeps sleeve caps on their authored side rather than creating needles.
        """
        neck_z=rig.data.bones['neck'].head_local.z
        for vertex, original in zip(obj.data.vertices,authored):
            strength=smooth(neck_z-.160*unit,neck_z-.120*unit,original.z)
            if strength<=0:
                continue
            vertex.co=vertex.co.lerp(original,strength)
        # Regression guard for the thin cross-neck triangles. Across the six
        # authored profiles these torso-band edges measure at most 6.3 cm per
        # height unit; the failed body-ray fit produced edges over 30 cm.
        if len(obj.data.vertices)>1000:
            for edge in obj.data.edges:
                a,b=edge.vertices
                originals=(authored[a],authored[b])
                if min(v.z for v in originals)<neck_z-.120*unit:
                    continue
                if max(abs(v.x) for v in originals)>.32*unit:
                    continue
                length=(obj.data.vertices[a].co-obj.data.vertices[b].co).length
                if length>.075*unit:
                    raise RuntimeError('Profession neckline edge exceeds 7.5 cm: '+obj.name)
        obj.data.update()

    def weighted(obj, template):
        # Keep the current fitted garment's exact joint blends for small panels.
        if template.name not in trees:
            tree = KDTree(len(template.data.vertices))
            for vertex in template.data.vertices:
                tree.insert(vertex.co, vertex.index)
            tree.balance()
            trees[template.name] = tree
        tree = trees[template.name]
        groups = {g.index: obj.vertex_groups.new(name=g.name) for g in template.vertex_groups}
        for vertex in obj.data.vertices:
            _, index, _ = tree.find(vertex.co)
            for weight in template.data.vertices[index].groups:
                if weight.weight > 0:
                    groups[weight.group].add([vertex.index], weight.weight, 'REPLACE')
        obj.parent = rig
        modifier = obj.modifiers.new('Profession garment skin', 'ARMATURE')
        modifier.object = rig
        return obj

    def surface(template, x, z, back=False, offset=.003):
        direction = -1 if back else 1
        hit, point, _, _ = template.ray_cast(Vector((x, -direction*2, z)), Vector((0, direction, 0)))
        if not hit:
            # A narrow neckline/panel gap may have no triangle. Nearest surface
            # keeps trim on the actual garment instead of a guessed torso depth.
            _, point, _, _ = template.closest_point_on_mesh(Vector((x, -.22*direction*unit, z)))
            return point+Vector((0, -direction*offset*unit, 0))
        return Vector((x, point.y-direction*offset*unit, z))

    def patch(name, template, style, mat, x0, x1, z0, z1, offset=.003, back=False, group='topStyle', nx=8, nz=4):
        points = []
        faces = []
        for row in range(nz+1):
            z = z0+(z1-z0)*row/nz
            for col in range(nx+1):
                x = x0+(x1-x0)*col/nx
                points.append(surface(template, x, z, back, offset))
                if row and col:
                    i = row*(nx+1)+col
                    face = (i-nx-2, i-nx-1, i, i-1)
                    faces.append(tuple(reversed(face)) if back else face)
        obj = mesh('V15 profession '+style+' '+name, points, faces, mat)
        finish(obj, 0, .0015*unit)
        return weighted(tagged(obj, group, style), template)

    def shape_patch(name, template, style, mat, coords, offset=.005):
        points = [surface(template, x, z, offset=offset) for x, z in coords]
        obj = mesh('V15 profession '+style+' '+name, points, [tuple(range(len(points)))], mat)
        finish(obj, 0, .0015*unit)
        return weighted(tagged(obj, 'topStyle', style), template)

    def ribbon(name, template, style, mat, path, width, offset=.004, group='topStyle'):
        points = []
        faces = []
        sampled = []
        for a, b in zip(path[:-1], path[1:]):
            a, b = Vector(a), Vector(b)
            for step in range(9):
                sampled.append(a.lerp(b, step/9))
        sampled.append(Vector(path[-1]))
        for i, point in enumerate(sampled):
            tangent = sampled[min(i+1, len(sampled)-1)]-sampled[max(0, i-1)]
            normal = Vector((-tangent.y, tangent.x)).normalized()*width/2
            for sign in (-1, 1):
                x, z = point+normal*sign
                points.append(surface(template, x, z, offset=offset))
            if i:
                j = 2*i
                faces.append((j-2, j-1, j+1, j))
        obj = mesh('V15 profession '+style+' '+name, points, faces, mat)
        finish(obj, 0, .001*unit)
        return weighted(tagged(obj, group, style), template)

    def lettering(label, template, style, x, z, size=.012, mat=None, offset=.008):
        # Text becomes mesh and conforms to the shirt: the GLB contains the
        # original RW identity without depending on a font or a canvas at runtime.
        curve = bpy.data.curves.new('Profession label '+label, 'FONT')
        curve.body = label
        curve.size = size*unit
        curve.align_x = 'CENTER'
        curve.align_y = 'CENTER'
        curve.resolution_u = 4
        text = bpy.data.objects.new('Profession label source', curve)
        bpy.context.collection.objects.link(text)
        text.location = (x, 0, z)
        text.rotation_euler = (math.pi/2, 0, 0)
        bpy.context.view_layer.update()
        data = bpy.data.meshes.new_from_object(text.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        matrix = text.matrix_world.copy()
        for vertex in data.vertices:
            co = matrix @ vertex.co
            vertex.co = surface(template, co.x, co.z, offset=offset)
        obj = bpy.data.objects.new('V15 profession '+style+' label '+label, data)
        bpy.context.collection.objects.link(obj)
        data.materials.append(mat or mats['gold'])
        bpy.data.objects.remove(text, do_unlink=True)
        if curve.users == 0:
            bpy.data.curves.remove(curve)
        return weighted(tagged(obj, 'topStyle', style), template)

    def sleeves(style, mat):
        return [duplicate(o, 'topStyle', style, 'long sleeve '+o.name[-1], mat) for o in source
                if o.get('avatarVariantGroup') == 'topStyle' and o.get('avatarVariant') == 'jacket' and 'sleeve' in o.name.lower()]

    def continuous_hem(obj, end_z, ease=.020):
        """Replace the old shirt's scalloped lower edge with a fitted shell.

        The source shirt has a narrow centre tail, not an all-around coat hem.
        Extending its lowest vertices cannot produce a coat. This surface uses
        measured torso/hip sections and shares the existing garment skinning.
        """
        _, _, _, body_bvh = body_data(rig)
        top = waist+.145*unit
        cut = top-.025*unit
        old_points = [v.co.copy() for v in obj.data.vertices]
        group_names = [group.name for group in obj.vertex_groups]
        old_weights = [{g.group:g.weight for g in v.groups} for v in obj.data.vertices]
        keep = [tuple(p.vertices) for p in obj.data.polygons
                if max(obj.data.vertices[i].co.z for i in p.vertices) >= cut
                or min(abs(obj.data.vertices[i].co.x) for i in p.vertices) > .27*unit*body]
        ids = sorted({i for face in keep for i in face})
        mapping = {old:new for new,old in enumerate(ids)}
        points = [old_points[i] for i in ids]
        faces = [tuple(mapping[i] for i in face) for face in keep]
        weights = [old_weights[i] for i in ids]
        tree = KDTree(len(old_points))
        for i, p in enumerate(old_points): tree.insert(p,i)
        tree.balance()
        base = len(points); rows=18; around=64
        for row in range(rows+1):
            z = top+(end_z-top)*row/rows
            measure_z = max(z, hip.z+.045*unit)
            origin = Vector((0,body_center_y(rig,measure_z),measure_z))
            pants_z=min(z,max(v.co.z for v in trousers.data.vertices)-.015*unit)
            nearby=[v.co for v in trousers.data.vertices if abs(v.co.z-pants_z)<.025*unit]
            # Body-only fitting can bury the hem behind roomy trousers. Use the
            # actual trouser envelope wherever the two garments overlap; a coat
            # continues around both legs rather than following one bare thigh.
            envelope=None
            if nearby and z<waist+.130*unit:
                rx=max(abs(v.x) for v in nearby)+.023*unit
                front=min(v.y for v in nearby)-.025*unit
                back=max(v.y for v in nearby)+.023*unit
                envelope=(rx,(front+back)/2,(back-front)/2)
            for col in range(around):
                theta=math.tau*col/around
                direction=Vector((math.cos(theta),math.sin(theta),0))
                hit,_,_,_=body_bvh.ray_cast(origin+direction*.6*unit,-direction,1.2*unit)
                if hit is None:
                    radius=1/math.sqrt((direction.x/(.215*unit*body))**2+(direction.y/(.155*unit*body))**2)
                    hit=origin+direction*radius
                co=hit+direction*ease*unit
                # Coats stay clear of hips and retain an open skirt below them.
                flare=max(0,(hip.z+.045*unit-z))*.11
                co+=direction*flare
                if envelope:
                    rx,cy,ry=envelope
                    # A lower coat spans two legs. A rounded rectangular section
                    # encloses them; a narrow ellipse cuts through both thighs.
                    power=.50 if end_z<hip.z else .72
                    x=rx*math.copysign(abs(math.cos(theta))**power,math.cos(theta))
                    y=cy+ry*math.copysign(abs(math.sin(theta))**power,math.sin(theta))
                    blend=1-smooth(waist+.010*unit,waist+.130*unit,z)
                    target_x=math.copysign(max(abs(co.x),abs(x)),co.x)
                    target_y=min(co.y,y) if direction.y<0 else max(co.y,y)
                    co.x+=(target_x-co.x)*blend
                    co.y+=(target_y-co.y)*blend
                co.z=z
                points.append(co)
                weights.append(old_weights[tree.find(co)[1]])
                if row:
                    i=base+row*around+col
                    previous=base+row*around+(col+1)%around
                    faces.append((i,previous,previous-around,i-around))
        data=bpy.data.meshes.new(obj.name+' continuous hem')
        data.from_pydata(points,[],faces)
        for mat in obj.data.materials: data.materials.append(mat)
        old_data=obj.data;obj.data=data
        if old_data.users==0:bpy.data.meshes.remove(old_data)
        obj.vertex_groups.clear()
        for name in group_names:obj.vertex_groups.new(name=name)
        for index, entries in enumerate(weights):
            for group, value in entries.items():obj.vertex_groups[group].add([index],value,'REPLACE')
        for polygon in data.polygons:polygon.use_smooth=True
        data.update()
        trees.pop(obj.name,None)
        return obj

    def shirt_details(style, template, mat):
        """Collars and pockets follow the already-fitted shirt, including bust."""
        neck_z=rig.data.bones['neck'].head_local.z
        for sign in (-1,1):
            x=sign*.102*body*unit
            z=chest.head_local.z-.055*unit
            patch('flat chest pocket',template,style,mat,x-.042*unit,x+.042*unit,z-.046*unit,z+.045*unit,.003)
            shape_patch('pocket flap',template,style,mat,[(x-.045*unit,z+.047*unit),(x+.045*unit,z+.047*unit),(x+.045*unit,z+.022*unit),(x,z+.010*unit),(x-.045*unit,z+.022*unit)],.006)
            shape_patch('tailored collar',template,style,mat,[(sign*.025*unit,neck_z-.008*unit),(sign*.062*unit,neck_z-.011*unit),(sign*.093*unit,neck_z-.068*unit),(sign*.046*unit,neck_z-.043*unit)],.004)
        patch('button placket',template,style,mat,-.010*unit,.010*unit,waist+.010*unit,neck_z-.052*unit,.003)
        for i in range(5):
            z=waist+.030*unit+i*(neck_z-waist-.100*unit)/4
            patch('button',template,style,mats['black'],-.0028*unit,.0028*unit,z-.0028*unit,z+.0028*unit,.006,nx=1,nz=1)

    def fitted_uniform(style, mat):
        originals=[o for o in source if o.get('avatarVariantGroup')=='topStyle' and o.get('avatarVariant')==style]
        main=largest('topStyle',style)
        for obj in originals:
            # Previous builds may have fitted these originals in place. Recover
            # their authored coordinates once, then leave them as hidden source.
            saved=obj.data.attributes.get('v15ProfessionPoliceSource')
            if saved:
                for vertex,item in zip(obj.data.vertices,saved.data):vertex.co=item.vector
                obj.data.update()
            obj['authoringOnly']=True
            obj.hide_render=True
        top=duplicate(main,'topStyle',style,'fitted uniform shirt',mat)
        continuous_hem(top,waist+.005*unit)
        def tidy_short_sleeve(obj):
            for vertex in obj.data.vertices:
                co=vertex.co
                blend=smooth(.20*unit,.28*unit,abs(co.x))
                if not blend:continue
                bone=rig.data.bones['upper_arm.'+('L' if co.x>0 else 'R')]
                axis=bone.tail_local-bone.head_local
                t=(co-bone.head_local).dot(axis)/axis.length_squared
                if -.1<t<1.45:
                    center=bone.head_local+axis*t
                    factor=1-(.15 if profile['sex']=='female' else .10)*blend
                    vertex.co=center+(co-center)*factor
            obj.data.update()
        tidy_short_sleeve(top)
        for obj in originals:
            if 'sleeve' in obj.name.lower():
                added=duplicate(obj,'topStyle',style,'fitted short sleeve '+obj.name[-1],mat)
                tidy_short_sleeve(added)
        shirt_details(style,top,mat)
        return top

    def arm_ribbon(sleeve, style, mat, width, offset=.004):
        side = 'L' if sleeve.name.endswith('L') else 'R'
        upper = rig.data.bones['upper_arm.'+side]
        fore = rig.data.bones['forearm.'+side]
        points = [upper.head_local.lerp(upper.tail_local, .20), upper.tail_local, fore.head_local.lerp(fore.tail_local, .90)]
        return ribbon('arm stripe '+side, sleeve, style, mat, [(p.x, p.z) for p in points], width*unit, offset)

    def collar(style, template, mat, height=.035):
        neck = rig.data.bones['chest'].tail_local
        points = []
        faces = []
        for row in range(2):
            for i in range(40):
                angle = math.tau*i/40
                points.append((.071*unit*math.cos(angle), neck.y+.075*unit*math.sin(angle), neck.z-.018*unit+row*height*unit))
                if row:
                    j = row*40+i
                    faces.append((j-40, (j-40+1)%40, 40+(i+1)%40, j))
        obj = mesh('V15 profession '+style+' stand collar', points, faces, mat)
        finish(obj, 0, .002*unit)
        return weighted(tagged(obj, 'topStyle', style), template)

    def shoulder_tabs(style, template, gold=True):
        # Cast down onto the actual shoulder surface; tabs are not upright
        # blocks floating above the upper chest.
        for sign in (-1, 1):
            x0, x1 = sorted([sign*.105*unit*body, sign*.183*unit*body])
            def top_panel(name, start, end, mat, lift):
                points = []
                faces = []
                for row in range(4):
                    y = -.044*unit+.062*unit*row/3
                    for col in range(9):
                        x = start+(end-start)*col/8
                        hit, point, _, _ = template.ray_cast(Vector((x, y, 2.5)), Vector((0, 0, -1)))
                        z = point.z if hit else chest.tail_local.z-.06*unit
                        points.append((x, y, z+lift*unit))
                        if row and col:
                            i = row*9+col
                            faces.append((i-10, i-9, i, i-1))
                obj = mesh('V15 profession '+style+' '+name, points, faces, mat)
                finish(obj, 0, .0012*unit)
                weighted(tagged(obj, 'topStyle', style), template)
            top_panel('shoulder tab', x0, x1, mats['black'], .003)
            if gold:
                for i in range(3):
                    middle = x0+(x1-x0)*(.25+i*.24)
                    top_panel('shoulder rank bar', middle-.003*unit, middle+.003*unit, mats['gold'], .005)

    def ring_band(name, template, style, mat, z0, z1, group='topStyle', side=None, offset=.003):
        # Resample the actual surface at level heights, rather than painting old
        # irregular trouser polygons (which made the tape visibly sawtoothed).
        points=[];faces=[];around=64;rows=5
        for row in range(rows+1):
            z=z0+(z1-z0)*row/rows
            origin=Vector((0,.015*unit,z))
            if side:
                calf=rig.data.bones['calf.'+side]
                t=(z-calf.head_local.z)/(calf.tail_local.z-calf.head_local.z)
                origin=calf.head_local.lerp(calf.tail_local,t)
                origin.z=z
            for col in range(around):
                theta=math.tau*col/around
                direction=Vector((math.cos(theta),math.sin(theta),0))
                hit,co,_,_=template.ray_cast(origin,direction,distance=.45*unit)
                if not hit:
                    _,co,_,_=template.closest_point_on_mesh(origin+direction*.15*unit)
                co+=direction*offset*unit
                co.z=z
                points.append(co)
                if row:
                    i=row*around+col;j=row*around+(col+1)%around
                    faces.append((i-around,j-around,j,i))
        obj=mesh('V15 profession '+style+' '+name,points,faces,mat)
        finish(obj,0,.001*unit)
        return weighted(tagged(obj,group,style),template)

    def lower_bands(obj, style, fire=False):
        # One material per mesh also avoids glTF primitive children whose
        # variant metadata otherwise lives only on the parent Group.
        for side in ['L','R']:
            if fire:
                ring_band('yellow trouser tape '+side,obj,style,mats['yellow'],.254*unit,.326*unit,'bottomStyle',side,.003)
                ring_band('silver trouser tape '+side,obj,style,mats['silver'],.270*unit,.310*unit,'bottomStyle',side,.005)
            else:
                ring_band('racing ankle cuff '+side,obj,style,mats['black'],.135*unit,.178*unit,'bottomStyle',side,.003)

    shirt = largest('topStyle', 'shirt')
    jacket = largest('topStyle', 'jacket')
    trousers = largest('bottomStyle', 'straight')

    # Rebuild the details on the final fitted surface. Old detached pocket/collar
    # planes cannot be independently radial-fitted: that makes their tips float.
    for obj in source:
        if obj.get('avatarVariant') == 'police' and obj.get('avatarVariantGroup')=='bottomStyle':
            dye(obj,mats['policeBottom'])
    police_main=fitted_uniform('police',mats['police'])
    shoulder_tabs('police', police_main)
    name_z = chest.head_local.z+.055*unit
    patch('name strip', police_main, 'police', mats['black'], -.157*unit*body, -.060*unit*body, name_z-.012*unit, name_z+.012*unit)
    lettering('POLISI RW', police_main, 'police', -.108*unit*body, name_z, .010)
    bx, bz = .105*unit*body, name_z-.005*unit
    shape_patch('RW shield', police_main, 'police', mats['gold'], [(bx-.024*unit, bz+.024*unit), (bx+.024*unit, bz+.024*unit), (bx+.021*unit, bz-.014*unit), (bx, bz-.030*unit), (bx-.021*unit, bz-.014*unit)])
    lettering('RW', police_main, 'police', bx, bz+.003*unit, .014, mats['black'], .009)

    civil=fitted_uniform('civilService',mats['khaki'])
    shoulder_tabs('civilService',civil,gold=False)
    patch('civil service name strip',civil,'civilService',mats['black'],-.157*unit*body,-.060*unit*body,name_z-.010*unit,name_z+.010*unit)
    lettering('RW',civil,'civilService',-.108*unit*body,name_z,.010)

    # Orange safety vest over charcoal full sleeves. The vest is part of this
    # top option, so the runtime's covered-underlayer rule cannot hide it.
    operator = duplicate(jacket, 'topStyle', 'operator', 'charcoal work shirt', mats['charcoal'])
    continuous_hem(operator,waist-.035*unit)
    sleeves('operator', mats['charcoal'])
    vest = duplicate(largest('outerwearStyle', 'vest'), 'topStyle', 'operator', 'orange safety vest', mats['orange'], ease=.034)
    for sign in (-1, 1):
        x0, x1 = sorted([sign*.032*unit, sign*.205*body*unit])
        for z in (waist+.030*unit, chest.head_local.z-.065*unit):
            patch('vest horizontal reflector', vest, 'operator', mats['silver'], x0, x1, z-.016*unit, z+.016*unit, .004)
        ribbon('vest shoulder reflector', vest, 'operator', mats['silver'], [(sign*.15*body*unit, chest.tail_local.z-.035*unit), (sign*.13*body*unit, chest.head_local.z+.010*unit), (sign*.105*body*unit, waist+.045*unit)], .023*unit, .005)
    for z in (waist+.030*unit, chest.head_local.z-.065*unit):
        patch('vest rear reflector', vest, 'operator', mats['silver'], -.20*body*unit, .20*body*unit, z-.016*unit, z+.016*unit, .004, back=True)
    lettering('RW KARYA', vest, 'operator', .105*body*unit, chest.head_local.z-.020*unit, .010, mats['black'], .008)

    # Racing: continuous graphite silhouette, stand collar, cloth waist and
    # narrow red/white panel lines. No safari pockets or utility belt.
    racing = duplicate(shirt, 'topStyle', 'racing', 'smooth suit torso', mats['charcoal'])
    continuous_hem(racing,waist-.012*unit)
    race_arms = sleeves('racing', mats['charcoal'])
    collar('racing', racing, mats['charcoal'])
    for sign in (-1, 1):
        path = [(sign*.15*body*unit, chest.tail_local.z-.035*unit), (sign*.125*body*unit, chest.head_local.z+.010*unit), (sign*.17*body*unit, waist-.015*unit)]
        ribbon('red fitted chest panel', racing, 'racing', mats['red'], path, .043*unit, .003)
        ribbon('white chest piping', racing, 'racing', mats['white'], path, .006*unit, .005)
    for arm in race_arms:
        arm_ribbon(arm, 'racing', mats['white'], .052, .003)
        arm_ribbon(arm, 'racing', mats['red'], .040, .005)
    patch('fabric waist band', racing, 'racing', mats['black'], -.20*body*unit, .20*body*unit, waist-.014*unit, waist+.014*unit, .003)
    lettering('RW RACING', racing, 'racing', 0, chest.head_local.z+.060*unit, .015, mats['white'], .007)
    race_bottom = duplicate(trousers, 'bottomStyle', 'racing', 'regular suit legs', mats['charcoal'])
    lower_bands(race_bottom, 'racing')
    for sign in (-1, 1):
        path = [(sign*.19*body*unit, hip.z+.040*unit), (sign*.21*body*unit, hip.z-.17*unit), (sign*.17*body*unit, .25*unit)]
        ribbon('leg red panel', race_bottom, 'racing', mats['red'], path, .035*unit, .003, group='bottomStyle')
        ribbon('leg white piping', race_bottom, 'racing', mats['white'], path, .005*unit, .005, group='bottomStyle')

    # Fire service: navy coat and legs, broad yellow/silver visibility bands.
    firefighter = duplicate(jacket, 'topStyle', 'firefighter', 'navy protective coat', mats['navy'])
    continuous_hem(firefighter,hip.z-.060*unit,ease=.030)
    fire_arms = sleeves('firefighter', mats['navy'])
    collar('firefighter', firefighter, mats['navy'], .045)
    for z in (waist+.015*unit, chest.head_local.z-.050*unit):
        ring_band('visibility yellow backing',firefighter,'firefighter',mats['yellow'],z-.032*unit,z+.032*unit,offset=.003)
        ring_band('silver visibility tape',firefighter,'firefighter',mats['silver'],z-.017*unit,z+.017*unit,offset=.005)
    for arm in fire_arms:
        side = 'L' if arm.name.endswith('L') else 'R'
        fore = rig.data.bones['forearm.'+side]
        center = fore.head_local.lerp(fore.tail_local, .72)
        patch('forearm reflective band', arm, 'firefighter', mats['yellow'], center.x-.052*unit, center.x+.052*unit, center.z-.022*unit, center.z+.022*unit, .004)
    patch('rescue zipper', firefighter, 'firefighter', mats['black'], -.007*unit, .007*unit, waist-.065*unit, chest.tail_local.z-.050*unit, .007)
    lettering('RW RESCUE', firefighter, 'firefighter', 0, chest.head_local.z+.055*unit, .014, mats['white'], .009)
    fire_bottom = duplicate(trousers, 'bottomStyle', 'firefighter', 'navy rescue trousers', mats['navy'])
    lower_bands(fire_bottom, 'firefighter', fire=True)

    # Pilot shirt: white short sleeves and paired pockets, navy/gold epaulettes
    # and original wing badge, paired with dedicated navy trousers.
    pilot=duplicate(largest('topStyle','civilService'),'topStyle','pilot','fitted white pilot shirt',mats['white'])
    continuous_hem(pilot,waist+.005*unit)
    for obj in source:
        if obj.get('avatarVariantGroup')=='topStyle' and obj.get('avatarVariant')=='civilService' and 'sleeve' in obj.name.lower():
            duplicate(obj,'topStyle','pilot','short sleeve '+obj.name[-1],mats['white'])
    shirt_details('pilot',pilot,mats['white'])
    shoulder_tabs('pilot', pilot)
    wing_x, wing_z = .105*body*unit, chest.head_local.z+.055*unit
    shape_patch('RW pilot wings', pilot, 'pilot', mats['gold'], [(wing_x-.043*unit, wing_z+.010*unit), (wing_x-.012*unit, wing_z+.007*unit), (wing_x, wing_z+.017*unit), (wing_x+.012*unit, wing_z+.007*unit), (wing_x+.043*unit, wing_z+.010*unit), (wing_x+.032*unit, wing_z-.009*unit), (wing_x, wing_z-.014*unit), (wing_x-.032*unit, wing_z-.009*unit)])
    patch('pilot name strip', pilot, 'pilot', mats['black'], -.15*body*unit, -.06*body*unit, wing_z-.010*unit, wing_z+.010*unit)
    lettering('RW AIR', pilot, 'pilot', -.105*body*unit, wing_z, .010)
    duplicate(trousers, 'bottomStyle', 'pilot', 'navy formal trousers', mats['navy'])

    # The medical coat has a complete lower shell, not an extended centre tail.
    coat = duplicate(shirt, 'topStyle', 'labcoat', 'thigh length medical coat', mats['white'])
    continuous_hem(coat,hip.z-.220*unit,ease=.028)
    sleeves('labcoat', mats['white'])
    neck_z=rig.data.bones['neck'].head_local.z
    for sign in (-1,1):
        shape_patch('medical lapel',coat,'labcoat',mats['white'],[(sign*.025*unit,neck_z-.008*unit),(sign*.071*unit,neck_z-.018*unit),(sign*.105*unit,chest.head_local.z+.035*unit),(sign*.025*unit,chest.head_local.z-.005*unit)],.005)
    for sign in (-1, 1):
        x = sign*.13*body*unit
        patch('medical lower pocket', coat, 'labcoat', mats['white'], x-.046*unit, x+.046*unit, waist-.145*unit, waist-.045*unit, .006)
        patch('medical pocket opening', coat, 'labcoat', mats['blue'], x-.046*unit, x+.046*unit, waist-.046*unit, waist-.041*unit, .008)
    patch('medical placket', coat, 'labcoat', mats['white'], -.012*unit, .012*unit, waist-.17*unit, chest.head_local.z+.05*unit, .006)
    patch('medical name patch', coat, 'labcoat', mats['blue'], .070*unit*body, .155*unit*body, chest.head_local.z+.035*unit, chest.head_local.z+.055*unit, .005)
    lettering('RW MED', coat, 'labcoat', .112*unit*body, chest.head_local.z+.045*unit, .010, mats['white'], .008)
    for i in range(5):
        z = waist-.13*unit+i*.073*unit
        patch('coat button', coat, 'labcoat', mats['white'], -.003*unit, .003*unit, z-.003*unit, z+.003*unit, .009, nx=1, nz=1)

    for obj in result:
        obj.data.update()
    bpy.context.view_layer.update()
    return result
