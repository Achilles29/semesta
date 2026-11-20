"""Continuous fitting field shared by skin, facial targets, clothes and rest joints.

Profiles are bounded design presets, not medical categories or a universal ideal.
Full anatomical source remains available for future garment coverage masks.
"""
from avatar_v14_common import *

PROFILES={f'{sex}-{body}':dict(id=f'{sex}-{body}',sex=sex,body=body,height=1.78 if sex=='male' else 1.68,headScale=1.14)
          for sex in ['male','female'] for body in ['slim','balanced','heavy']}

def classify_slot(name):
    if name.startswith('Arka_'):return {'Arka_Skin':'skin','Arka_Eyes':'eyes','Arka_Hair':'hair','Arka_Brows':'brows','Arka_Teeth':'teeth'}.get(name,'skin')
    if 'Boot' in name:return 'footwear'
    if 'Trouser' in name:return 'bottom'
    if 'Waistcoat' in name:return 'outerwear'
    if 'harness' in name.lower():return 'accessoryChest'
    if any(s in name.lower() for s in ['belt','buckle','pouch']):return 'accessoryWaist'
    return 'top'

def fit_profile(rig,profile):
    frame=profile['sex'];body=profile['body'];mass={'slim':-.65,'balanced':0,'heavy':1}[body]
    # Preserve ankle spacing and hand length; change tissue around each limb,
    # not the scale of the whole character or the distance between both legs.
    arm_lines=[]
    for side in ['L','R']:
        for name in ['upper_arm.','forearm.']:
            b=rig.data.bones[name+side];arm_lines.append((b.head_local.copy(),b.tail_local.copy()))
    def fit(point):
        p=Vector(point);z=p.z;x=p.x
        pelvis=math.exp(-((z-.96)/.21)**2);waist=math.exp(-((z-1.15)/.26)**2)
        torso=smooth(.80,1.02,z)*(1-smooth(1.42,1.56,z))
        central=1-smooth(.19,.31,abs(x))
        p.x*=1+central*(mass*(.17*waist+.07*pelvis)+(-.035 if frame=='female' else 0)*torso)
        p.y=-.025+(p.y+.025)*(1+central*mass*(.36*waist+.10*pelvis))
        if frame=='female':
            shoulder=smooth(1.20,1.44,z)*(1-smooth(1.49,1.57,z))
            p.x*=1-.065*shoulder
        leg_weight=smooth(.27,.39,z)*(1-smooth(.87,1.04,z))
        center=(1 if x>=0 else -1)*(.11+.10*(1-smooth(.25,1,z)))
        p.x+=mass*.17*leg_weight*(x-center)
        p.y+=mass*.19*leg_weight*(point.y+.01)
        arm_weight=smooth(.20,.29,abs(x))*(1-smooth(1.48,1.56,z))
        if arm_weight:
            closest=[]
            for a,b in arm_lines:
                t=max(0,min(1,(Vector(point)-a).dot(b-a)/(b-a).length_squared));c=a+(b-a)*t
                closest.append(((Vector(point)-c).length,c,t))
            _,c,t=min(closest,key=lambda a:a[0]);strength=mass*.20*arm_weight*smooth(.76,.92,z)
            p+=(Vector(point)-c)*strength
        # A smooth neck transition keeps the enlarged skull/eyes/teeth/hair
        # coherent and avoids a detached head or a stretched jaw.
        h=smooth(1.49,1.585,z)*(profile['headScale']-1)
        pivot=Vector((0,-.012,1.535));p=pivot+(p-pivot)*(1+h)
        # The head grows upward. Rebalance stature instead of just making
        # the candidate taller. Profile height is anatomical, without hair.
        p.z=.025+(p.z-.025)*profile['height']/(1.78+.270*(profile['headScale']-1))
        return p
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH':continue
        if obj.data.shape_keys:
            for block in obj.data.shape_keys.key_blocks:
                for v in block.data:v.co=fit(v.co)
            for v,key in zip(obj.data.vertices,obj.data.shape_keys.key_blocks[0].data):v.co=key.co
        else:
            for v in obj.data.vertices:v.co=fit(v.co)
        obj.data.update();obj['avatarSlot']=classify_slot(obj.name)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for bone in rig.data.edit_bones:
        bone.head=fit(bone.head);bone.tail=fit(bone.tail)
        bone.align_roll(Vector((0,-1,0)) if abs((bone.tail-bone.head).normalized().y)<.95 else Vector((0,0,1)))
    bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()
    rig['avatarProfile']=json.dumps(profile)
    rig['avatarVariantContract']=json.dumps({'version':1,'profileId':profile['id'],'sex':frame,'bodyType':body,'headScale':profile['headScale'],'slots':['skin','eyes','hair','brows','teeth','top','outerwear','bottom','footwear','accessoryChest','accessoryWaist'],'coverage':'Each garment must ship a tested body coverage mask and a fit for each supported profile.','restPose':'Per-profile rest matrices; animations must be baked per profile.'})
    return fit
