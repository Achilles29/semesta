"""Capture the unmodified V12 body and inspect geometry before changing it."""
import sys, json, math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v13_common import *
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'ilustrasi/avatar-v2/farmer-v12-expression/farmer-v12-expression.blend'))
rig=bpy.data.objects['SemestaV2_Rig'];rest(rig);configure(rig)
data={'bones':{b.name:{'head':list(b.head_local),'tail':list(b.tail_local),'matrix':[list(r) for r in b.matrix_local]} for b in rig.data.bones},'meshes':[],'actions':{a.name:list(a.frame_range) for a in bpy.data.actions}}
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    data['meshes'].append({'name':o.name,'vertices':len(o.data.vertices),'faces':len(o.data.polygons),'slot':o.get('avatarSlot'),'choice':o.get('avatarChoice'),'bounds':[[min(v.co[i] for v in o.data.vertices),max(v.co[i] for v in o.data.vertices)] for i in range(3)]})
(OUT/'source-audit.json').write_text(json.dumps(data,indent=2))
scene=bpy.context.scene;scene.render.resolution_x=600;scene.render.resolution_y=750;scene.render.resolution_percentage=100
for name,view,angle in [('front','body',0),('side','body',math.pi/2),('back','body',math.pi),('hand','hand',0),('feet','feet',.35),('torso','torso',0)]:
    render('v12-'+name,view,angle)
print('V13_SOURCE_AUDIT_COMPLETE')
