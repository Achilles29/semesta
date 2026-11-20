"""V15 locomotion retargeted from pinned CMU human motion capture.
Measured timing and limb directions; target segment lengths and boot support.
"""
from avatar_v14_common import *
from avatar_cmu_motion import cycle
from mathutils import Euler
REVISION='v15-cmu-locomotion-2-head'

def stabilized_head_rotations(capture,run):
    """Remove the actor/calibration bias, retaining small periodic head motion.

    The source has ~10 degrees of constant roll in Walk and ~6 in Run.
    Copying that absolute orientation also mismatches our shorter neck chain.
    Work in character space so torso sway cannot tilt the gaze a second time.
    """
    reference=capture[0]['rotations']['head']
    samples=[]
    for f in capture[:-1]:
        q=f['rotations']['head'].copy()
        if q.dot(reference)<0:q.negate()
        samples.append(q)
    average=Quaternion(tuple(sum(q[i] for q in samples)/len(samples) for i in range(4))).normalized()
    result=[]
    for f in capture:
        delta=(f['rotations']['head']@average.inverted()).to_euler('XYZ')
        # Smooth limiting avoids a flat spot at hard clamp boundaries.
        angles=[limit*math.tanh(angle*gain/limit) for angle,gain,limit in zip(delta,(.45,.25,.3),map(math.radians,(3,1.5,2.5)))]
        angles[0]+=math.radians(1 if run else 0)
        result.append(Euler(angles,'XYZ').to_quaternion())
    return result

def build_animations(rig):
    from avatar_v14_animation import build_animations as gestures
    gestures(rig)
    return rebuild_locomotion(rig)

def rebuild_locomotion(rig):
    scene=bpy.context.scene;data=rig.data;gait={}
    profile=json.loads(rig['avatarProfile']);scale=profile['height']/1.78
    def place(name,rotation):
        b=rig.pose.bones[name];pos=b.matrix.translation.copy()
        b.matrix=Matrix.Translation(pos)@rotation.to_matrix().to_4x4()
        bpy.context.view_layer.update()
    def aim(name,direction):
        source=data.bones[name]
        q=(source.tail_local-source.head_local).rotation_difference(direction)@source.matrix_local.to_quaternion()
        place(name,q)
    heel=Vector((0,.075*scale,.005*scale));toe=Vector((0,-.198*scale,.005*scale))
    for name,subject,trial,start,end,frames in [('Walk','07','01',49,179,26),('Run','16','35',42,138,20)]:
        capture,source,speed=cycle(subject,trial,start,end,frames);run=name=='Run'
        head_rotations=stabilized_head_rotations(capture,run)
        target_leg=sum(data.bones[n+'.L'].length for n in ('thigh','calf'))
        motion_scale=target_leg/(source['lfemur']['length']+source['ltibia']['length'])
        rig.animation_data.action=None
        for track in list(rig.animation_data.nla_tracks):
            if track.name==name:rig.animation_data.nla_tracks.remove(track)
        old=bpy.data.actions.get(name)
        if old:bpy.data.actions.remove(old)
        action=bpy.data.actions.new(name);rig.animation_data.action=action;contacts=[]
        for frame,f in enumerate(capture):
            scene.frame_set(frame)
            for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
            p=f['points'];root=rig.pose.bones['root'];rest_root=data.bones['root'].matrix_local
            root.matrix=Matrix.Translation(rest_root.translation+Vector((f['sway']*motion_scale,0,0)))@(f['rotations']['root']@rest_root.to_quaternion()).to_matrix().to_4x4()
            bpy.context.view_layer.update()
            # Global frames retain measured lean and torso counter-rotation,
            # while accommodating the different number of source spine joints.
            for bone,source_bone in [('spine','lowerback'),('chest','thorax')]:
                place(bone,f['rotations'][source_bone]@data.bones[bone].matrix_local.to_quaternion())
            head_rotation=head_rotations[frame]
            neck_rotation=f['rotations']['thorax'].slerp(head_rotation,.7)
            place('neck',neck_rotation@data.bones['neck'].matrix_local.to_quaternion())
            place('head',head_rotation@data.bones['head'].matrix_local.to_quaternion())
            foot_contacts={}
            for side,prefix,sign in [('L','l',1),('R','r',-1)]:
                for bone,a,b in [('thigh','hipjoint','femur'),('calf','femur','tibia'),('upper_arm','clavicle','humerus'),('forearm','humerus','wrist')]:
                    direction=p[prefix+b]-p[prefix+a]
                    if bone in ('upper_arm','forearm') and profile['body']=='heavy':direction.x+=sign*.018
                    aim(bone+'.'+side,direction)
                # Keep the wrist straight and the palm facing inward. ASF's
                # short wrist/hand bones are not equivalent to our palm bone;
                # aiming them directly produced splayed, claw-like wrists.
                hand=data.bones['hand.'+side]
                long=(data.bones['middle.01.'+side].head_local-hand.head_local).normalized()
                across=(data.bones['little.01.'+side].head_local-data.bones['index.01.'+side].head_local).normalized()
                inside=across.cross(long).normalized()*sign
                lower=(p[prefix+'wrist']-p[prefix+'humerus']).normalized()
                swing=long.rotation_difference(lower)
                desired=f['rotations']['thorax']@Vector((-sign,0,0))
                desired=(desired-lower*desired.dot(lower)).normalized()
                current=swing@inside;current=(current-lower*current.dot(lower)).normalized()
                twist=math.atan2(lower.dot(current.cross(desired)),current.dot(desired))
                hand_rotation=Quaternion(lower,twist)@swing
                place('hand.'+side,hand_rotation@hand.matrix_local.to_quaternion())
                # ASF ankle-to-ball slopes down even in support. Compensate
                # that anatomical offset when orienting our rigid boot sole.
                footdir=p[prefix+'foot']-p[prefix+'tibia']
                pitch=math.atan2(footdir.z,-footdir.y)+.30
                yaw=math.atan2(footdir.x,-footdir.y)
                q=Quaternion(Vector((0,0,1)),yaw)@Quaternion(Vector((1,0,0)),-pitch)
                foot='foot.'+side;place(foot,q@data.bones[foot].matrix_local.to_quaternion())
                base=data.bones[foot].head_local;ankle=rig.pose.bones[foot].matrix.translation
                foot_contacts[side]=[ankle+q@(v-Vector((0,0,base.z))) for v in (heel,toe)]
            # Support the boot using the actual target bone lengths. The flight
            # height is measured from capture, not an invented sine-wave bounce.
            support=[side for side in ('L','R') if f['velocity'][side]<.9]
            if not support:support=[min(f['velocity'],key=f['velocity'].get)]
            lowest=min(v.z for side in (support if not run else ('L','R')) for v in foot_contacts[side])
            flight=f['flight']*motion_scale if run else 0;dz=.005*scale+flight-lowest
            mat=root.matrix.copy();mat.translation.z+=dz;root.matrix=mat;bpy.context.view_layer.update()
            for side in ('L','R'):
                sole=min(v.z+dz for v in foot_contacts[side])
                clearance=.025*scale if not run and side not in support else .005*scale
                lift=max(0,clearance-sole)
                if lift:
                    # Resolve shoe clearance with a two-bone solve, keeping
                    # the captured knee plane and each profile's bone lengths.
                    hip=rig.pose.bones['thigh.'+side].matrix.translation.copy()
                    knee=rig.pose.bones['calf.'+side].matrix.translation.copy()
                    foot=rig.pose.bones['foot.'+side];footq=foot.matrix.to_quaternion()
                    ankle=foot.matrix.translation.copy()+Vector((0,0,lift));d=ankle-hip;distance=d.length;u=d.normalized()
                    l1=data.bones['thigh.'+side].length;l2=data.bones['calf.'+side].length
                    distance=min(distance,l1+l2-.00001);ankle=hip+u*distance
                    along=(l1*l1-l2*l2+distance*distance)/(2*distance)
                    pole=knee-hip;pole=(pole-u*pole.dot(u)).normalized()
                    target_knee=hip+u*along+pole*math.sqrt(max(0,l1*l1-along*along))
                    aim('thigh.'+side,target_knee-hip);aim('calf.'+side,ankle-target_knee);place('foot.'+side,footq)
            contacts.append({side:[round(min(v.z+dz for v in points),6),round(points[0].y,6)] for side,points in foot_contacts.items()})
            hand_pose(rig,'grip')
            for bone_name in json.loads(rig['avatarHandContract'])['bones']:
                b=rig.pose.bones[bone_name];b.rotation_quaternion=Quaternion().slerp(b.rotation_quaternion,.9 if run else .4)
            for b in rig.pose.bones:
                b.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=b.name)
                b.keyframe_insert(data_path='location',frame=frame,group=b.name)
        for curve in action.fcurves:
            for key in curve.keyframe_points:key.interpolation='LINEAR'
        track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
        gait[name]={'revision':REVISION,'source':f'CMU {subject}_{trial}','sourceFrames':[start+1,end+1],'sourceFPS':120,'duration':frames/24,'recommendedForwardSpeed':speed*motion_scale,'floor':0,'unevenTerrainIK':False,'contactModel':'capture-boot-support-v1','heelOffset':list(heel),'toeOffset':list(toe),'captureContacts':contacts}
        rest(rig)
    rig['avatarRevision']=REVISION
    return gait
