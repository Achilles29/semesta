"""Body-aware construction shared by the citizen wardrobe extensions.

Coordinates and weights come from the already fitted V15 source anatomy. The
approved armature and its animation actions are never edited here.
"""
from avatar_v14_common import *
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
from collections import defaultdict

_cache = {}

def anatomy(rig):
    return next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name == 'Anatomy_Source')

def body_data(rig):
    source = anatomy(rig)
    key = (rig.as_pointer(), source.data.as_pointer())
    if key in _cache:
        return _cache[key]
    _, _, faces = obj_data(MH / '3dobjs/base.obj')
    ids = sorted({i for group, indices, _ in faces if group == 'body' for i in indices})
    assert len(ids) == len(source.data.vertices)
    mapping = {'root':'root','spine05':'root','spine04':'spine','spine03':'spine','spine02':'spine','spine01':'chest','neck01':'neck','neck02':'neck','neck03':'neck','head':'head'}
    for side in ['L','R']:
        for old,new in [('pelvis','root'),('breast','chest'),('clavicle','clavicle'),('shoulder01','clavicle'),('upperarm01','upper_arm'),('upperarm02','upper_arm'),('lowerarm01','forearm'),('lowerarm02','forearm'),('wrist','hand'),('upperleg01','thigh'),('upperleg02','thigh'),('lowerleg01','calf'),('lowerleg02','calf'),('foot','foot')]:
            mapping[old+'.'+side] = new if new in ['root','chest'] else new+'.'+side
        for i,finger in enumerate(['thumb','index','middle','ring','little'],1):
            for j in range(1,4): mapping[f'finger{i}-{j}.{side}'] = f'{finger}.{j:02}.{side}'
    raw = json.loads((MH/'rigs/default_weights.mhw').read_text())['weights']
    weights = defaultdict(lambda: defaultdict(float))
    for old,entries in raw.items():
        name = mapping.get(old) or ('foot.'+old[-1] if old.startswith('toe') else 'hand.'+old[-1] if old.startswith('metacarpal') else 'head')
        for index,weight in entries: weights[index][name] += weight
    cooked=[]
    for index in ids:
        strongest = sorted(weights[index].items(), key=lambda x:-x[1])[:4]
        total = sum(v for _,v in strongest)
        cooked.append({n:v/total for n,v in strongest} if total else {'root':1})
    kd=KDTree(len(ids))
    for v in source.data.vertices: kd.insert(v.co,v.index)
    kd.balance()
    # Clothing rays must reach the torso rather than the A-pose arm in front
    # of it. A centre-out ray also fails on a slim waist when the chosen centre
    # falls outside the back surface; callers cast inward from outside instead.
    def torso_face(poly):
        arm=sum(sum(w for n,w in cooked[i].items() if n.startswith(('upper_arm.','forearm.','hand.','thumb.','index.','middle.','ring.','little.'))) for i in poly.vertices)/len(poly.vertices)
        return arm<.4
    bvh=BVHTree.FromPolygons([v.co for v in source.data.vertices],[list(p.vertices) for p in source.data.polygons if torso_face(p)])
    result=(source,cooked,kd,bvh)
    _cache[key]=result
    return result

def bind_from_body(obj,rig,source_ids=None):
    source,weights,kd,_=body_data(rig)
    obj.vertex_groups.clear()
    groups={n:obj.vertex_groups.new(name=n) for n in rig.data.bones.keys()}
    for v in obj.data.vertices:
        index = source_ids[v.index] if source_ids is not None else kd.find(v.co)[1]
        for name,value in weights[index].items(): groups[name].add([v.index],value,'REPLACE')
    for mod in list(obj.modifiers):
        if mod.type=='ARMATURE': obj.modifiers.remove(mod)
    mod=obj.modifiers.new('Citizen fitted skinning','ARMATURE');mod.object=rig;obj.parent=rig
    return obj

def body_center_y(rig,z):
    """Centre each torso section inside the actual fitted skin, including neck."""
    _,_,_,bvh=body_data(rig)
    front,_,_,_=bvh.ray_cast(Vector((0,-1,z)),Vector((0,1,0)),2)
    back,_,_,_=bvh.ray_cast(Vector((0,1,z)),Vector((0,-1,0)),2)
    return (front.y+back.y)*.5 if front is not None and back is not None else 0

def fit_garment_to_body(obj,rig,ease=.014):
    """Tailor central torso to the fitted body; retain the original sleeves.

    Call on a fresh clone before adding pockets/lapels. Radial fitting preserves
    bust/waist/hip shape instead of scaling a masculine torso box.
    """
    _,_,_,bvh=body_data(rig)
    profile=json.loads(rig['avatarProfile']);s=profile['height']/1.78
    low=rig.data.bones['thigh.L'].head_local.z-.04*s
    high=rig.data.bones['neck'].tail_local.z+.02*s
    for v in obj.data.vertices:
        if not low<v.co.z<high: continue
        strength=(1-smooth(.205*s,.29*s,abs(v.co.x))) * smooth(low,low+.05*s,v.co.z)
        if strength<=0: continue
        origin=Vector((0,body_center_y(rig,v.co.z),v.co.z));direction=v.co-origin;direction.z=0
        if direction.length<.001: continue
        direction.normalize();hit,normal,_,_=bvh.ray_cast(origin+direction*.6*s,-direction,1.2*s)
        if hit is not None:
            goal=hit+direction*ease*s
            v.co=v.co.lerp(goal,strength)
    obj.data.update()
    return obj

def body_surface(rig,x,z,front=True,offset=.012):
    _,_,_,bvh=body_data(rig)
    origin=Vector((x,-1 if front else 1,z));direction=Vector((0,1 if front else -1,0))
    loc,_,_,_=bvh.ray_cast(origin,direction,2)
    return (loc.y if loc is not None else (-.12 if front else .13)) + (-offset if front else offset)

def tag(obj,group,variant,slot,flag='v15CitizenWardrobe',fixed=False):
    obj[flag]=True;obj['avatarSlot']=slot
    if group: obj['avatarVariantGroup']=group;obj['avatarVariant']=variant
    obj['avatarTintMode']='absolute'
    if fixed: obj['avatarFixedColor']=True
    return obj

def skin_patch(rig,name,predicate,visible_for):
    source,_,_,_=body_data(rig)
    skin=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('avatarSlot')=='skin' and not o.get('v15CitizenWardrobe'))
    key=lambda co:tuple(round(v,5) for v in co)
    existing={key(v.co) for v in skin.data.vertices}
    polygons=[p for p in source.data.polygons if predicate(sum((source.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)) and not all(key(source.data.vertices[i].co) in existing for i in p.vertices)]
    ids=sorted({i for p in polygons for i in p.vertices});index={v:i for i,v in enumerate(ids)}
    uv=source.data.uv_layers.active
    coords=[[uv.data[l].uv[:] for l in p.loop_indices] for p in polygons] if uv else None
    obj=mesh(name,[source.data.vertices[i].co for i in ids],[[index[i] for i in p.vertices] for p in polygons],skin.data.materials[0],coords)
    tag(obj,None,None,'skin');obj['avatarVisibleFor']=json.dumps(visible_for)
    return bind_from_body(obj,rig,ids)
