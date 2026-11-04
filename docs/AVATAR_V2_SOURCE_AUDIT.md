# SEMESTA Avatar V2 — source asset audit

- Source: `public/models/characters/warga-chibi-base.glb` (5,531,036 bytes); GLB v2 header/chunks parse successfully.
- Host: Python 3.12.7; Blender runtime: Blender 4.5.15 LTS (/tmp/semesta-blender-runtime/blender-4.5.15-linux-x64/blender); Node/npm: not installed / not installed.
- Runtime package versions: Three.js `^0.187.0`, Vite `^8.3.5`. Pillow available: True; host `bpy`: False.
- Character asset world bounds (x,y,z): `{'min': [-0.545, 0.007, -0.336], 'max': [0.376, 1.837, 0.336], 'size': [0.921, 1.83, 0.672]}`.
- Existing character files: `public/models/characters/warga-chibi-base.glb` (5,531,036 bytes, .glb), `public/models/characters/warga-chibi-base.blend` (10,978,932 bytes, .blend), `public/models/characters/gallery/raka-warga-01.glb` (1,153,852 bytes, .glb), `public/models/characters/gallery/raka-warga-01.png` (631,138 bytes, .png), `public/models/characters/gallery/karakter-harvestmoon-warga-3d.png` (1,952,686 bytes, .png).
- Scene nodes / mesh objects / draw primitives: 93 / 76 / 109.
- Triangles / vertices: 104,416 / 65,474.
- Skinned / unskinned primitives: 109 / 0.
- GLB skins / joints: 1 / 16; vertex influence histogram: `{'1': 65474}`.
- Primitive UV / normals: 108 / 109.
- Computed UV range across primitives: `[[-5.1096, 0.0], [2.1813, 1.0]]`; vertices outside [0,1]: 4/65314.
- Materials / embedded images / embedded image bytes: 24 / 6 / 1,426,904.
- Bone count: 16.

## Geometry distribution (largest GLB mesh objects)

| Mesh object | Triangles | Primitives |
|---|---:|---:|
| Sphere.090 | 11,432 | 8 |
| Cube.020 | 5,820 | 2 |
| Top_Batik_Motif_00 | 4,480 | 1 |
| Sphere.107 | 4,308 | 1 |
| Sphere.119 | 3,336 | 1 |
| Cone.001 | 3,324 | 2 |
| Sphere.036 | 3,320 | 1 |
| Sphere.050 | 3,320 | 1 |
| Torus.001 | 3,172 | 2 |
| Sphere.103 | 3,088 | 1 |
| Torus.002 | 2,840 | 2 |
| Cube.018 | 2,812 | 2 |
| Torus.003 | 2,636 | 2 |
| Top_Kemeja_Placket | 2,592 | 3 |
| Sphere.027 | 2,340 | 3 |
| Outfit_Leader_Tunic mesh | 2,332 | 3 |
| Sphere.123 | 2,024 | 1 |
| Hair_Short_Lock_00 | 1,920 | 1 |
| Sphere.127 | 1,792 | 2 |
| Sphere.125 | 1,672 | 1 |

Mesh-object triangle bins:

- 2,000-9,999: 16 mesh objects
- 100-499: 6 mesh objects
- 500-1,999: 53 mesh objects
- 10,000+: 1 mesh objects

## Repository/runtime format

- Runtime uses vanilla Three.js (`three ^0.187.0`) and `GLTFLoader`; skinned instances use `SkeletonUtils.clone` and independent `AnimationMixer` instances.
- Avatar Studio mixes static preset records with optional `modelFile` GLB and `thumbnail` image fields. User-created palette presets are configuration JSON stored through the existing `avatar_library` API; those are not independent modular mesh assets.
- The live game currently loads the legacy `warga-chibi-base.glb` as the base model. V2 manifests are intentionally separate and not runtime-loaded.
- `assets/game/` is the current Vite deployment directory; the character source files are under `public/models/characters/`.

## Skeleton

```text
root  (parent: Warga Chibi Rig)
spine  (parent: root)
neck  (parent: spine)
head  (parent: neck)
upper_arm.L  (parent: spine)
forearm.L  (parent: upper_arm.L)
hand.L  (parent: forearm.L)
upper_arm.R  (parent: spine)
forearm.R  (parent: upper_arm.R)
hand.R  (parent: forearm.R)
thigh.L  (parent: root)
calf.L  (parent: thigh.L)
foot.L  (parent: calf.L)
thigh.R  (parent: root)
calf.R  (parent: thigh.R)
foot.R  (parent: calf.R)
```

## Textures and materials

| Image | Resolution | Channels | Format | Bytes |
|---|---:|---:|---|---:|
| canvas-brown | 512×512 | 3 (R/G/B) | PNG | 209492 |
| cotton-cream | 512×512 | 3 (R/G/B) | PNG | 188975 |
| skin-soft | 512×512 | 3 (R/G/B) | PNG | 167246 |
| denim-weave | 512×512 | 3 (R/G/B) | PNG | 331866 |
| hair-chestnut | 512×512 | 3 (R/G/B) | PNG | 350801 |
| uniform-cream | 512×512 | 3 (R/G/B) | PNG | 178524 |

Observed: Embedded images report dimensions/modes [(512, 512, 'RGB')]. Base-color image references present: True; normal map: False; AO map: False; metallic-roughness map: False. Materials not backed by image maps use PBR factors.

## Animation clips

| Clip | Duration | Channels | Target paths |
|---|---:|---:|---|
| Idle | 0.5417s | 48 | translation: 16, rotation: 16, scale: 16; root translation: yes; scale tracks: yes |
| Walk | 0.5417s | 48 | translation: 16, rotation: 16, scale: 16; root translation: yes; scale tracks: yes |

Current required clips not found: `Run`, `Interact`, `Wave`, `Hoe`, `Watering`, `Harvest`, `Carry`, `Sit`. The two existing clips target translation/scale channels; the report distinguishes pelvis/root translation where named as `root`, `Root`, or `Armature`. Inspect root motion and bone scaling in Blender before using them with game-driven movement.

## Visual and provenance assessment

- Manually inspected `public/models/characters/warga-chibi-preview.png` and `public/models/characters/gallery/raka-warga-01.png` in the repository. They show separate, rounded primitive parts with visible gaps at shoulders, wrists, hips/legs, and neck; the torso and head silhouettes are simple, material detail is low, and the pose is stiff. These images are renders, not 3D source assets.
- `tools/create_chibi_avatar.py` explicitly calls Blender primitive sphere, cube, cone, torus, and cylinder creation operators and assigns each part wholly to one bone before joining by category. The GLB weight scan reports all 65,474 vertices with exactly one positive bone influence; this rigid per-part weighting explains hard seams and poor bending at joints. The rig has no dedicated pelvis, clavicle, toe, finger, or facial-control bones. It is a prototype generator, not a suitable production source mesh or an approved path for V2 final characters.
- The existing generator starts by deleting the current Blender scene and writes directly to the legacy `.blend`/`.glb` paths. It was not run. Do not use it as the V2 pipeline.
- The V2 pipeline does not run this generator and does not modify or overwrite either existing GLB/Blend file.
- AI 3D: an optional Meshy multi-view API adapter is in `tools/meshy_multiview_to_glb.py`. No Meshy API key was found. Preflight is local-only; submission requires explicit credit confirmation and was not called.

## Not measurable from this host-only audit

UV coordinate bounds are computed from GLB accessors, but UV island packing, texel density, overlap, seam placement, disconnected component intent, facial appeal, skin-weight quality, and animation deformation require visual Blender review. The available portable Blender was used to prove structural import/export/reimport only; no visual or deformation approval is implied.

## Production decision

**Reject as a premium source mesh.** The existing GLB is structurally loadable but was built from primitives and the visual review does not pass the requested target. `raka-warga-01.glb` is exported from the same Blender source, not an independent sculpted source. The gallery PNG is 2D only. No suitable external source mesh or configured 3D generation credential was found, so mesh-dependent V2 production is stopped pending a licensed source character.
