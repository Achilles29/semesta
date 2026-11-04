import json
from pathlib import Path

import bpy

ROOT = Path('/www/wwwroot/semesta')
SOURCE = ROOT / 'public/models/characters/warga-chibi-base.blend'
OUT = ROOT / 'public/models/characters/gallery'
OUT.mkdir(parents=True, exist_ok=True)
GLB = OUT / 'raka-warga-01.glb'
PREVIEW = OUT / 'raka-warga-01.png'

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))

# Keep one complete character: Raka, a resident in a cream shirt, jeans,
# black hair, peci, and a small resident badge.
keep_prefixes = (
    'Core_', 'Top_Base_', 'Top_Kemeja_', 'Bottom_Base_', 'Bottom_Jeans_',
    'Accessory_Peci_', 'Accessory_Badge_',
)
avatar_objects = []
for obj in list(bpy.context.scene.objects):
    if obj.get('avatar_bone'):
        if obj.name.startswith(keep_prefixes):
            obj.hide_render = False
            obj.hide_set(False)
            avatar_objects.append(obj)
        else:
            bpy.data.objects.remove(obj, do_unlink=True)

palette = {
    'skin': (0.565, 0.245, 0.128, 1),
    'hair': (0.020, 0.014, 0.012, 1),
    'cotton': (0.78, 0.73, 0.60, 1),
    'denim': (0.035, 0.075, 0.145, 1),
    'batik': (0.09, 0.045, 0.025, 1),
    'headwear': (0.018, 0.018, 0.022, 1),
    'pack': (0.35, 0.10, 0.055, 1),
}
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    name = material.name.lower()
    key = next((key for key in palette if name.startswith(key)), None)
    if key is None:
        continue
    nodes = material.node_tree.nodes
    shader = nodes.get('Principled BSDF')
    if shader:
        socket = shader.inputs.get('Base Color')
        if socket:
            for link in list(socket.links):
                material.node_tree.links.remove(link)
            socket.default_value = palette[key]

scene = bpy.context.scene
scene.frame_set(1)
scene.render.filepath = str(PREVIEW)
scene.render.image_settings.file_format = 'PNG'
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.cycles.samples = 24

# Export the rigged, standalone file with only the selected avatar meshes.
armatures = [obj for obj in scene.objects if obj.type == 'ARMATURE']
if not armatures:
    raise RuntimeError('Karakter tidak memiliki armature.')
armature = armatures[0]
bpy.ops.object.select_all(action='DESELECT')
armature.select_set(True)
for obj in avatar_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = armature
bpy.ops.export_scene.gltf(
    filepath=str(GLB), export_format='GLB', use_selection=True,
    export_animations=True, export_skins=True, export_morph=True,
    export_materials='EXPORT', export_apply=True, export_yup=True,
)
bpy.ops.render.render(write_still=True)
print(json.dumps({'glb': str(GLB), 'preview': str(PREVIEW), 'meshes': len(avatar_objects)}))
