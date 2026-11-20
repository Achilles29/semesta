import sys,json,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from avatar_v13_common import *
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'ilustrasi/avatar-v2/farmer-v12-expression/farmer-v12-expression.blend'))
rig=bpy.data.objects['SemestaV2_Rig'];rest(rig);configure(rig)
o=bpy.data.objects['Hands_Bare']
(OUT/'hand-source.json').write_text(json.dumps({'points':[list(v.co) for v in o.data.vertices],'edges':[list(e.vertices) for e in o.data.edges]}))
scene=bpy.context.scene;scene.render.resolution_x=600;scene.render.resolution_y=750
render('v12-hand-palm','hand',-math.pi/2)
render('v12-hand-back','hand',math.pi/2)
