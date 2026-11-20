"""Baked animation for the independent adult skeleton; no legacy rest assumptions."""
from avatar_v14_common import *

def build_animations(rig):
    scene=bpy.context.scene;rig.animation_data_create();data=rig.data
    def aim(name,a,b):
        source=data.bones[name];q=(source.tail_local-source.head_local).rotation_difference(b-a)@source.matrix_local.to_quaternion()
        rig.pose.bones[name].matrix=Matrix.Translation(a)@q.to_matrix().to_4x4();bpy.context.view_layer.update()
    def leg(side,ankle,dz):
        thigh=data.bones['thigh.'+side];calf=data.bones['calf.'+side]
        hip=thigh.head_local+Vector((0,0,dz));d=ankle-hip;distance=d.length;u=d.normalized();l1=thigh.length;l2=calf.length
        if distance>l1+l2-.0001:raise ValueError(f'Unreachable leg: {side} {distance} > {l1+l2}')
        along=(l1*l1-l2*l2+distance*distance)/(2*distance);pole=Vector((0,-1,0));pole=(pole-u*pole.dot(u)).normalized()
        knee=hip+u*along+pole*math.sqrt(max(0,l1*l1-along*along))
        aim('thigh.'+side,hip,knee);aim('calf.'+side,knee,ankle)
        rig.pose.bones['foot.'+side].matrix=Matrix.Translation(ankle)@data.bones['foot.'+side].matrix_local.to_quaternion().to_matrix().to_4x4();bpy.context.view_layer.update()
    def arm(side,mode='rest',t=0,dz=0,swing=0):
        sign=1 if side=='L' else -1
        a=data.bones['upper_arm.'+side].head_local+Vector((0,0,dz))
        l1=data.bones['upper_arm.'+side].length;l2=data.bones['forearm.'+side].length
        upper=Vector((sign*.24,-math.sin(swing),-math.cos(swing))).normalized()
        lower=Vector((sign*.12,-.12-math.sin(swing),-math.cos(swing))).normalized()
        if mode=='point':upper=Vector((sign*.18,-1,-.13)).normalized();lower=Vector((sign*.1,-1,.08)).normalized()
        if mode=='hold':upper=Vector((sign*.25,-.15,-1)).normalized();lower=Vector((-sign*.10,-1,-.12)).normalized()
        if mode=='sit':upper=Vector((sign*.25,-.45,-1)).normalized();lower=Vector((-sign*.1,-1,-.5)).normalized()
        if mode=='wave':upper=Vector((sign*.65,0,-.55)).normalized();lower=Vector((sign*(.18+.12*math.sin(t*math.tau*2)),-.08,1)).normalized()
        elbow=a+upper*l1;wrist=elbow+lower*l2
        aim('upper_arm.'+side,a,elbow);aim('forearm.'+side,elbow,wrist)
        direction=lower if mode!='wave' else Vector((sign*.15,-.05,1)).normalized()
        aim('hand.'+side,wrist,wrist+direction*data.bones['hand.'+side].length)
    gait={}
    for name,frames in [('Idle',72),('Walk',24),('Run',16),('Wave',48),('Sit',48),('Point',48),('Hold',48)]:
        action=bpy.data.actions.new(name);rig.animation_data.action=action
        is_gait=name in ['Walk','Run'];stride=.38 if name=='Walk' else .58;stance=.60 if name=='Walk' else .43;lift=.085 if name=='Walk' else .15
        if is_gait:gait[name]={'duration':frames/24,'stanceFraction':stance,'strideDistance':stride,'recommendedForwardSpeed':stride/(frames/24*stance),'floor':0,'unevenTerrainIK':False}
        for frame in range(frames+1):
            scene.frame_set(frame)
            for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
            t=frame/frames
            dz=0
            if is_gait:dz=(-.047 if name=='Walk' else -.095)+(.007 if name=='Walk' else .018)*(1-math.cos(4*math.pi*t))
            if name=='Sit':dz=-.38
            root=rig.pose.bones['root'];root.location=data.bones['root'].matrix_local.to_3x3().inverted()@Vector((0,0,dz));bpy.context.view_layer.update()
            for side,phaseoffset,sign in [('L',0,1),('R',.5,-1)]:
                phase=(t+phaseoffset)%1;foot=data.bones['foot.'+side].head_local.copy();foot.x=sign*.118
                if is_gait:
                    if phase<stance:foot.y+=-stride/2+stride*phase/stance
                    else:
                        q=(phase-stance)/(1-stance);foot.y+=stride/2-stride*smooth(0,1,q);foot.z+=lift*math.sin(math.pi*q)
                elif name=='Sit':foot.y-=.40
                leg(side,foot,dz)
                mode='wave' if name=='Wave' and side=='L' else 'point' if name=='Point' and side=='L' else name.lower() if name in ['Hold','Sit'] else 'rest'
                swing=(.30 if name=='Walk' else .55)*math.sin((t+phaseoffset)*math.tau) if is_gait else 0
                arm(side,mode,t,dz,swing)
            hand_pose(rig,'relaxed')
            if name=='Wave':hand_pose(rig,'open','L')
            if name=='Point':hand_pose(rig,'point','L')
            if name=='Hold':hand_pose(rig,'grip')
            if name=='Idle':
                b=rig.pose.bones['head'];b.rotation_quaternion=Quaternion(Vector((0,1,0)),.018*math.sin(t*math.tau))
            for b in rig.pose.bones:
                b.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=b.name)
                b.keyframe_insert(data_path='location',frame=frame,group=b.name)
        for curve in action.fcurves:
            for key in curve.keyframe_points:key.interpolation='LINEAR'
        track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
        rest(rig)
    return gait
