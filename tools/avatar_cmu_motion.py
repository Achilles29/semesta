"""Small ASF/AMC reader for the two pinned CMU captures (120 Hz).

ASF coordinates are Y-up; output is Blender Z-up, facing -Y. Original data
terms and attribution live beside the captures; this module is project code.
"""
import math
from pathlib import Path
from mathutils import Vector, Matrix, Euler, Quaternion

SOURCE=Path(__file__).resolve().parents[1]/'ilustrasi/avatar-v2/farmer-v15-proportions/source/cmu'
CONVERT=Matrix(((1,0,0),(0,0,-1),(0,1,0)))
UNIT=.0254/.45

def rotation(values):
    return Euler(tuple(math.radians(v) for v in values),'XYZ').to_matrix()

def read_capture(subject,trial):
    bones={};section='';current=None;parents={}
    for line in (SOURCE/f'{subject}.asf').read_text().splitlines():
        a=line.split()
        if not a:continue
        if a[0].startswith(':'):section=a[0];continue
        if section==':bonedata':
            if a[0]=='begin':current={}
            elif a[0]=='end':bones[current['name']]=current
            elif a[0]=='name':current['name']=a[1]
            elif a[0]=='direction':current['direction']=Vector(tuple(map(float,a[1:])))
            elif a[0]=='length':current['length']=float(a[1])*UNIT
            elif a[0]=='axis':current['axis']=rotation(map(float,a[1:4]))
            elif a[0]=='dof':current['dof']=a[1:]
        elif section==':hierarchy' and a[0] not in ('begin','end'):
            for child in a[1:]:parents[child]=a[0]
    frames=[]
    for line in (SOURCE/f'{subject}_{trial}.amc').read_text().splitlines():
        a=line.split()
        if not a or a[0][0] in '#:':continue
        if a[0].isdigit():frames.append({})
        else:frames[-1][a[0]]=list(map(float,a[1:]))
    result=[]
    for frame in frames:
        root=frame['root'];points={'root':Vector(root[:3])*UNIT};rotations={'root':rotation(root[3:])}
        def solve(name):
            if name in points:return
            parent=parents[name];solve(parent);b=bones[name]
            angles=[0,0,0]
            for dof,v in zip(b.get('dof',[]),frame.get(name,[])):angles['xyz'.index(dof[1])]=v
            axis=b['axis'];r=rotations[parent]@axis@rotation(angles)@axis.inverted()
            rotations[name]=r;points[name]=points[parent]+r@b['direction']*b['length']
        for name in bones:solve(name)
        result.append({'points':{n:CONVERT@p for n,p in points.items()},'rotations':{n:CONVERT@r@CONVERT.transposed() for n,r in rotations.items()}})
    return result, bones

def cycle(subject,trial,start,end,frames):
    raw,bones=read_capture(subject,trial)
    travel=raw[end]['points']['root']-raw[start]['points']['root']
    heading=math.atan2(travel.x,-travel.y);align=Matrix.Rotation(-heading,3,'Z')
    # Remove capture drift and close the small seam with a cubic correction.
    first=raw[start];last=raw[end];result=[]
    for i in range(frames+1):
        t=i/frames;at=start+t*(end-start);j=min(int(at),end-1);u=at-j
        f=raw[j];g=raw[j+1];points={};rotations={};blend=t*t*(3-2*t)
        origin=f['points']['root'].lerp(g['points']['root'],u)
        for name in f['points']:
            p=f['points'][name].lerp(g['points'][name],u)-origin
            delta=(last['points'][name]-last['points']['root'])-(first['points'][name]-first['points']['root'])
            points[name]=align@(p-delta*blend)
            q=f['rotations'][name].to_quaternion().slerp(g['rotations'][name].to_quaternion(),u)
            correction=last['rotations'][name].to_quaternion().rotation_difference(first['rotations'][name].to_quaternion())
            rotations[name]=(align.to_quaternion()@q@Quaternion().slerp(correction,blend)).normalized()
        ground=min(f['points'][n].z*(1-u)+g['points'][n].z*u for n in ('lfoot','ltoes','rfoot','rtoes'))
        velocity={side:(raw[min(len(raw)-1,j+1)]['points'][prefix+'tibia']-raw[max(0,j-1)]['points'][prefix+'tibia']).length*60 for side,prefix in [('L','l'),('R','r')]}
        result.append({'points':points,'rotations':rotations,'ground':ground,'velocity':velocity,'sway':(align@(origin-first['points']['root']-travel*t)).x})
    floor=sorted(f['ground'] for f in result[:-1])[max(0,frames//10)]
    for f in result:f['flight']=max(0,f['ground']-floor-.008)
    result[-1]=result[0]
    return result,bones,math.hypot(travel.x,travel.y)/(frames/24)

if __name__=='__main__':
    import json
    for subject,trial in [('07','01'),('16','35')]:
        frames,bones=read_capture(subject,trial)
        path=SOURCE/f'{subject}_{trial}-fk.json'
        path.write_text(json.dumps([{n:list(p) for n,p in f['points'].items()} for f in frames]))
        print(subject,trial,len(frames),'root',list(frames[0]['points']['root']),list(frames[-1]['points']['root']))
