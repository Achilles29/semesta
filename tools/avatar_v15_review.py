"""Default variant visibility for offline GLB review renders."""
import json
from pathlib import Path
import bpy
def default_variants():
    catalog=json.loads((Path(__file__).resolve().parents[1]/'game-src/avatar-v15-catalog.json').read_text(encoding='utf-8'))
    state={k:v['default'] for k,v in catalog['fields'].items()}
    for obj in bpy.context.scene.objects:
        group=obj.get('avatarVariantGroup')
        if group:obj.hide_render=state.get(group)!=obj.get('avatarVariant')
