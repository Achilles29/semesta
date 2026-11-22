"""Adult fitted separates, skirts and low heels for the citizen collection."""
from avatar_v15_citizen_common import *

TOPS=['officeBlazer','fittedBlouse','satinTop','stageTop']
SKIRTS=['pencilSkirt','aLineSkirt','miniSkirt']

def build_fashion(rig):
    for obj in list(bpy.context.scene.objects):
        if obj.get('v15CitizenWardrobe'): bpy.data.objects.remove(obj,do_unlink=True)
    profile=json.loads(rig['avatarProfile']);s=profile['height']/1.78
    female=profile['sex']=='female';heavy=profile['body']=='heavy'
    hip=rig.data.bones['thigh.L'].head_local.z
    chest=rig.data.bones['chest'].tail_local.z
    _,_,_,bvh=body_data(rig)
    cloth=material('Citizen neutral fine suiting',(1,1,1),.76)
    silk=material('Citizen neutral satin',(1,1,1),.31)
    leather=material('Citizen stage leather',(1,1,1),.39)
    lining=material('Citizen ivory camisole',(.83,.77,.65),.43)
    dark=material('Citizen charcoal inset',(.016,.020,.028),.63)
    gold=material('Citizen brushed button',(.64,.43,.17),.32,.7)
    sole=material('Citizen heel sole',(.022,.019,.021),.63)

    def make(name,pts,polys,mat,group,option,slot='top',fixed=False,uv=None,thickness=.002):
        obj=mesh(name,pts,polys,mat,uv);tag(obj,group,option,slot,fixed=fixed)
        if thickness: finish(obj,0,thickness*s)
        bind_from_body(obj,rig);return obj

    def ray_ring(z,theta,ease=.012):
        direction=Vector((math.sin(theta),-math.cos(theta),0))
        centre=Vector((0,body_center_y(rig,z),z))
        loc,_,_,_=bvh.ray_cast(centre+direction*.6*s,-direction,1.2*s)
        if loc is None: loc=Vector((math.sin(theta)*.17*s,.015*s-math.cos(theta)*.12*s,z))
        return loc+direction*ease*s

    def tank(option,mat,hem=None,under=False,tailored=False):
        # The neckline is a sewn continuous edge, lower at the sternum and
        # under the arms, with shoulder straps carrying front to back.
        pts=[];polys=[];uv=[];n=64;rows=24
        low=hip+.015*s if hem is None else hem
        for row in range(rows+1):
            t=row/rows
            for j in range(n):
                a=j/n*math.tau;front=max(0,math.cos(a));side=abs(math.sin(a))
                high=chest+.012*s-(.075 if tailored else .14)*s*side**7-(.17 if tailored else .105)*s*front**12
                if under: high+=.018*s*front**12
                z=low+(high-low)*t
                pts.append(ray_ring(z,a,.011 if under else .023 if tailored else .016))
        # Smooth the sewn neckline across the last rows; sampled skin facets
        # must not turn a satin edge into a serrated strip.
        for iteration in range(3):
            before=[p.copy() for p in pts]
            for row in range(rows-3,rows+1):
                strength=.22*(row-(rows-4))/4
                for j in range(n):
                    idx=row*n+j
                    pts[idx]=before[idx].lerp((before[row*n+(j-1)%n]+before[row*n+(j+1)%n])*.5,strength)
        for row in range(rows):
            for j in range(n):
                polys.append((row*n+j,row*n+(j+1)%n,(row+1)*n+(j+1)%n,(row+1)*n+j))
                uv.append([(j/n,row/rows),((j+1)/n,row/rows),((j+1)/n,(row+1)/rows),(j/n,(row+1)/rows)])
        return make('Citizen '+option+(' camisole' if under else ' shaped top'),pts,polys,mat,'topStyle',option,fixed=under,uv=uv)

    def tailored(option,mat,open_front=False,cropped=False):
        # A new continuous sewn neckline replaces cutting holes in the coarse
        # legacy shirt. All rows conform to the actual fitted torso.
        result=tank(option,mat,hem=hip+(.15 if cropped else .025)*s,tailored=True)
        result.name='Citizen '+option+' tailored shell'
        for side in ['L','R']:
            arm=rig.data.bones['upper_arm.'+side];fore=rig.data.bones['forearm.'+side]
            direction=(fore.tail_local-arm.head_local).normalized()
            u=direction.cross(Vector((0,1,0))).normalized();v=direction.cross(u).normalized()
            sleeve_pts=[];sleeve_faces=[];n=32;rows=20
            arm_surface=[];arm_bvh=None
            if not female:
                # The masculine profiles have substantially wider upper arms
                # than the original fixed taper. Fit each ring to the actual
                # same-side arm skin, leaving cloth ease over the widest part.
                # Keep the already verified female sleeve geometry unchanged.
                source,weights,_,_=body_data(rig)
                arm_surface=[point.co.copy() for point in source.data.vertices
                             if sum(weights[point.index].get(name+'.'+side,0)
                                    for name in ['upper_arm','forearm'])>=.35]
                arm_faces=[list(poly.vertices) for poly in source.data.polygons
                           if sum(sum(weights[i].get(name+'.'+side,0)
                                      for name in ['upper_arm','forearm'])
                                  for i in poly.vertices)/len(poly.vertices)>=.25]
                arm_bvh=BVHTree.FromPolygons([point.co for point in source.data.vertices],arm_faces)
            sleeve_radii=[];sleeve_frames=[]
            for row in range(rows+1):
                t=row/rows
                centre=arm.head_local.lerp(fore.head_local,min(1,t*2)) if t<.5 else fore.head_local.lerp(fore.tail_local,(t-.5)*2)
                radius=(.068*(1-t)+.035*t)*s*(1.1 if heavy else 1)
                row_u,row_v=u,v
                if arm_bvh:
                    # Rings follow each arm segment, not a single shoulder to
                    # wrist axis crossing the bent rest-pose elbow obliquely.
                    axis=(arm.tail_local-arm.head_local).normalized().lerp(
                        (fore.tail_local-fore.head_local).normalized(),smooth(.4,.6,t)).normalized()
                    row_u=axis.cross(Vector((0,1,0))).normalized();row_v=axis.cross(row_u).normalized()
                row_radii=[]
                for j in range(n):
                    a=j/n*math.tau;radial=row_u*math.cos(a)+row_v*math.sin(a)
                    fitted=radius
                    if arm_bvh:
                        hit,_,_,_=arm_bvh.ray_cast(centre+radial*.22*s,-radial,.44*s)
                        if hit is not None and (hit-centre).dot(radial)>0:
                            fitted=max(fitted,(hit-centre).dot(radial)+.012*s)
                    row_radii.append(fitted)
                sleeve_radii.append(row_radii);sleeve_frames.append((centre,row_u,row_v))
            # A conservative neighbour envelope avoids abrupt cuffs/bulges;
            # smoothing must never shrink a ring back through the arm surface.
            if arm_surface:
                sleeve_radii=[[max(sleeve_radii[k][j]*.94**abs(k-i)
                                    for k in range(max(0,i-2),min(rows+1,i+3)))
                               for j in range(n)] for i in range(rows+1)]
            for row in range(rows+1):
                centre,row_u,row_v=sleeve_frames[row]
                for j in range(n):
                    a=j/n*math.tau;sleeve_pts.append(centre+(row_u*math.cos(a)+row_v*math.sin(a))*sleeve_radii[row][j])
            for row in range(rows):
                for j in range(n):sleeve_faces.append((row*n+j,row*n+(j+1)%n,(row+1)*n+(j+1)%n,(row+1)*n+j))
            make('Citizen '+option+' tailored sleeve '+side,sleeve_pts,sleeve_faces,mat,'topStyle',option,thickness=.003)
            # A body-shaped cap joins the sleeve to the torso. Torso fitting
            # deliberately excludes arms, so rays cannot supply this bridge.
            # Copy the continuous anatomical shoulder surface and its weights;
            # overlapping hems remain covered when the arm swings or bends.
            source=anatomy(rig);sign=1 if side=='L' else -1
            selected=[]
            for poly in source.data.polygons:
                centre=sum((source.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
                if centre.x*sign<.070*s:continue
                if centre.x*sign>arm.head_local.x*sign+.105*s:continue
                if centre.z<arm.head_local.z-.080*s:continue
                if (centre-arm.head_local).length>.185*s:continue
                selected.append(poly)
            ids=sorted({i for poly in selected for i in poly.vertices});index={v:i for i,v in enumerate(ids)}
            cap=mesh('Citizen '+option+' sewn shoulder '+side,
                     [source.data.vertices[i].co+source.data.vertices[i].normal*.018*s for i in ids],
                     [[index[i] for i in poly.vertices] for poly in selected],mat)
            tag(cap,'topStyle',option,'top')
            bind_from_body(cap,rig,ids)
            finish(cap,0,.0025*s)
        if open_front: tank(option,lining if option=='officeBlazer' else dark,under=True)
        for sign in [-1,1]:
            # Lapels follow the breast/torso surface instead of floating blocks.
            xzs=[(.034,chest-.14*s),(.085,chest-.015*s),(.115,chest-.06*s),(.055,chest-.195*s)]
            pts=[(sign*x*s,body_surface(rig,sign*x*s,z,offset=.025*s),z) for x,z in xzs]
            make('Citizen '+option+' soft lapel',pts,[(0,1,2,3)],mat,'topStyle',option,thickness=.003)
        for i in range(3 if open_front else 5):
            z=hip+.085*s+i*.054*s
            if cropped and z<hip+.18*s: continue
            x=.025*s if open_front else 0
            bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=1,location=(x,body_surface(rig,x,z,offset=.027*s),z))
            button=bpy.context.object;button.name='Citizen '+option+' button';button.scale=(.005*s,.0025*s,.005*s)
            bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);button.data.materials.append(gold)
            tag(button,'topStyle',option,'top',fixed=True);bind_from_body(button,rig)
        return result

    tailored('officeBlazer',cloth,True)
    tailored('fittedBlouse',silk)
    tank('satinTop',silk)
    tailored('stageTop',leather,True,True)

    for option in SKIRTS:
        n=64;rows=24;pts=[];polys=[];uv=[]
        top=hip+.07*s
        bottom=hip-({'pencilSkirt':.38,'aLineSkirt':.36,'miniSkirt':.265}[option])*s
        # Hip contour is shared with the actual anatomy; skirt continues as one
        # garment around both legs, with controlled ease for walking.
        hip_ring=[ray_ring(hip-.025*s,j/n*math.tau,.043) for j in range(n)]
        for row in range(rows+1):
            t=row/rows;z=top+(bottom-top)*t
            for j in range(n):
                a=j/n*math.tau
                if z>=hip-.025*s: p=ray_ring(z,a,.043)
                else:
                    p=hip_ring[j].copy();p.z=z
                    down=(hip-.025*s-z)/(hip-.025*s-bottom)
                    flare={'pencilSkirt':.045,'aLineSkirt':.32,'miniSkirt':.13}[option]
                    p.x*=1+down*flare;p.y=.015*s+(p.y-.015*s)*(1+down*flare*.7)
                    # Restrained tailoring folds, not anatomical leg inflation.
                    wave=.0025*s*down*math.sin(a*10)
                    p.x+=math.sin(a)*wave;p.y-=math.cos(a)*wave
                # The front panel needs cloth ease over the moving thigh,
                # especially in Run/Sit. Keep the side and back silhouette
                # tailored while a shallow front bow prevents knee punctures.
                p.y-=.026*s*max(0,math.cos(a))**2*smooth(.08,.48,t)
                pts.append(p)
        for row in range(rows):
            for j in range(n):
                polys.append(((row+1)*n+j,(row+1)*n+(j+1)%n,row*n+(j+1)%n,row*n+j))
                uv.append([(j/n,(row+1)/rows),((j+1)/n,(row+1)/rows),((j+1)/n,row/rows),(j/n,row/rows)])
        skirt=make('Citizen '+option+' shaped skirt',pts,polys,cloth,'bottomStyle',option,'bottom',uv=uv,thickness=.003)
        # Avoid the discontinuous nearest-left/nearest-right split at centre.
        for v in skirt.data.vertices:
            blend=smooth(.015*s,.145*s,top-v.co.z)
            side=.5+.5*max(-1,min(1,v.co.x/(.060*s)))
            for g in skirt.vertex_groups: g.remove([v.index])
            for bone,w in [('root',1-blend),('thigh.L',blend*side),('thigh.R',blend*(1-side))]:
                if w>0: skirt.vertex_groups[bone].add([v.index],w,'REPLACE')

    # Fit the closed pumps to actual toes, not the foot bone's short tail.
    # The ankle opening, outer upper and sole are continuous closed loops;
    # the approved flat-foot pose and all armature rest matrices stay intact.
    for side in ['L','R']:
        foot=rig.data.bones['foot.'+side];sign=1 if side=='L' else -1
        points=[v.co.copy() for v in anatomy(rig).data.vertices
                if v.co.x*sign>0 and v.co.z<foot.head_local.z+.020*s]
        toe_y=min(p.y for p in points)-.009*s
        heel_y=max(p.y for p in points)+.007*s
        x=(min(p.x for p in points)+max(p.x for p in points))/2
        centre=Vector((x,(toe_y+heel_y)/2))
        # Convex outline follows the actual female/male foot envelope. It is
        # sampled at regular angles, giving an even rim without a square toe.
        xy=sorted(set((round(p.x,6),round(p.y,6)) for p in points))
        def turn(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
        lower=[];upper=[]
        for point in xy:
            while len(lower)>=2 and turn(lower[-2],lower[-1],point)<=0:lower.pop()
            lower.append(point)
        for point in reversed(xy):
            while len(upper)>=2 and turn(upper[-2],upper[-1],point)<=0:upper.pop()
            upper.append(point)
        hull=[Vector(p) for p in lower[:-1]+upper[:-1]]
        def cross(a,b):return a.x*b.y-a.y*b.x
        outline=[];n=64
        for j in range(n):
            angle=j/n*math.tau;direction=Vector((math.cos(angle),math.sin(angle)))
            distances=[]
            for start,end in zip(hull,hull[1:]+hull[:1]):
                edge=end-start;denom=cross(direction,edge)
                if abs(denom)<1e-8:continue
                distance=cross(start-centre,edge)/denom
                along=cross(start-centre,direction)/denom
                if distance>0 and -.0001<=along<=1.0001:distances.append(distance)
            radius=max(distances) if distances else .055*s
            outline.append(centre+direction*(radius+.010*s))
        # The top opening wraps the heel/instep. Its front edge remains well
        # behind the toes, producing a real closed vamp instead of an open tube.
        pts=[];polys=[];rows=18
        opening_front=toe_y+(heel_y-toe_y)*.44
        opening_back=heel_y-.009*s
        opening_mid=(opening_front+opening_back)/2
        opening_depth=(opening_back-opening_front)/2
        for row in range(rows+1):
            t=max(0,(row-1)/(rows-1))
            for j,outer in enumerate(outline):
                angle=j/n*math.tau
                inner=Vector((foot.head_local.x+.033*s*math.cos(angle),
                              opening_mid+opening_depth*math.sin(angle)))
                p=outer.lerp(inner,t)
                top=.075*s+.030*s*(math.sin(angle)+1)/2
                z=.059*s+(top-.059*s)*math.sin(t*math.pi/2)
                if row==0:z=.029*s
                hit,_,_,_=bvh.ray_cast(Vector((p.x,p.y,foot.head_local.z+.060*s)),Vector((0,0,-1)),.23*s)
                if hit is not None and row>0 and t<.999:z=max(z,hit.z+.009*s)
                pts.append((p.x,p.y,z))
        for row in range(rows):
            for j in range(n):polys.append((row*n+j,row*n+(j+1)%n,(row+1)*n+(j+1)%n,(row+1)*n+j))
        shoe=make('Citizen low heel '+side,pts,polys,leather,'shoeStyle','heels','footwear',thickness=.003)
        for v in shoe.data.vertices:
            for g in shoe.vertex_groups:g.remove([v.index])
            shoe.vertex_groups['foot.'+side].add([v.index],1,'REPLACE')
        # Closed sole with a shallow arch and a separate grounded block heel.
        sole_points=[];sole_faces=[]
        for layer in [0,1]:
            for p in outline:
                along=(p.y-toe_y)/(heel_y-toe_y)
                floor=(.004+.015*smooth(.22,.70,along))*s
                sole_points.append((p.x,p.y,.029*s if layer else floor))
        for j in range(n):sole_faces.append((j,(j+1)%n,n+(j+1)%n,n+j))
        sole_faces.extend([tuple(reversed(range(n))),tuple(range(n,n*2))])
        outsole=make('Citizen pump sole '+side,sole_points,sole_faces,sole,'shoeStyle','heels','footwear',fixed=True,thickness=0)
        for v in outsole.data.vertices:
            for g in outsole.vertex_groups:g.remove([v.index])
            outsole.vertex_groups['foot.'+side].add([v.index],1,'REPLACE')
        bpy.ops.mesh.primitive_cube_add(size=1,location=(foot.head_local.x,heel_y-.030*s,.015*s))
        block=bpy.context.object;block.name='Citizen low block heel '+side;block.scale=(.045*s,.045*s,.027*s)
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        block.data.materials.append(sole);tag(block,'shoeStyle','heels','footwear',fixed=True)
        bevel=block.modifiers.new('Rounded heel edge','BEVEL');bevel.width=.005*s;bevel.segments=3;apply_modifier(block,bevel)
        bind_from_body(block,rig)
        for v in block.data.vertices:
            for g in block.vertex_groups:g.remove([v.index])
            block.vertex_groups['foot.'+side].add([v.index],1,'REPLACE')

    # Only coverage required by the garments is restored, with an explicit
    # visibility contract shared by game runtime and catalogue renderer.
    skin_patch(rig,'Citizen upper body coverage',lambda p: hip-.015*s<p.z<1.55*s,{'topStyle':TOPS})
    ankle=max(rig.data.bones['foot.'+side].head_local.z for side in ['L','R'])+.015*s
    skin_patch(rig,'Citizen skirt leg coverage',lambda p: ankle<=p.z<hip-.19*s,{'bottomStyle':SKIRTS})
    # Pumps expose the instep even with trousers. Partition the foot/leg faces
    # so heel wearers have skin in the opening without double surfaces in skirts.
    skin_patch(rig,'Citizen open shoe foot coverage',lambda p: .020*s<p.z<ankle,{'bottomStyle':SKIRTS,'shoeStyle':['heels']})
    return {'tops':TOPS,'skirts':SKIRTS,'shoes':['heels']}
