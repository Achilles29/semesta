# SEMESTA Avatar V2 — source asset audit

- Source: `public/models/characters/gallery/raka-warga-01.glb` (1,153,852 bytes); GLB v2 header/chunks parse successfully.
- Host: Python 3.12.7; portable Blender 4.5.15 LTS was downloaded and used for separate structural pipeline tests; it is not installed system-wide. Node/npm: not installed / not installed.
- Runtime package versions: Three.js `^0.187.0`, Vite `^8.3.5`. Pillow available: True; host `bpy`: False.
- Character asset world bounds (x,y,z): `{'min': [-0.376, 0.039, -0.217], 'max': [0.376, 1.77, 0.233], 'size': [0.752, 1.731, 0.45]}`.
- Existing character files: `public/models/characters/warga-chibi-base.glb` (5,531,036 bytes, .glb), `public/models/characters/warga-chibi-base.blend` (10,978,932 bytes, .blend), `public/models/characters/gallery/raka-warga-01.glb` (1,153,852 bytes, .glb), `public/models/characters/gallery/raka-warga-01.png` (631,138 bytes, .png), `public/models/characters/gallery/karakter-harvestmoon-warga-3d.png` (1,952,686 bytes, .png).
- Scene nodes / mesh objects / draw primitives: 36 / 19 / 33.
- Triangles / vertices: 30,088 / 17,947.
- Skinned / unskinned primitives: 33 / 0.
- GLB skins / joints: 1 / 16; vertex influence histogram: `{'1': 17947}`.
- Primitive UV / normals: 32 / 33.
- Computed UV range across primitives: `[[0.0, 0.0], [1.0, 1.0]]`; vertices outside [0,1]: 0/17787.
- Materials / embedded images / embedded image bytes: 14 / 0 / 0.
- Bone count: 16.

## Geometry distribution (largest GLB mesh objects)

| Mesh object | Triangles | Primitives |
|---|---:|---:|
| Sphere.090 | 11,432 | 8 |
| Sphere.036 | 3,320 | 1 |
| Sphere.050 | 3,320 | 1 |
| Top_Kemeja_Placket | 2,592 | 3 |
| Sphere.011 | 1,160 | 2 |
| Sphere.024 | 1,160 | 2 |
| Top_Base_Torso mesh | 828 | 1 |
| Sphere.005 | 808 | 2 |
| Sphere.018 | 808 | 2 |
| Sphere.004 | 520 | 1 |
| Sphere.017 | 520 | 1 |
| Sphere.035 | 520 | 1 |
| Sphere.049 | 520 | 1 |
| Sphere.070 | 520 | 1 |
| Sphere.031 | 520 | 1 |
| Sphere.045 | 520 | 1 |
| Sphere.066 | 456 | 2 |
| Bottom_Base_Pelvis mesh | 316 | 1 |
| Cylinder | 248 | 1 |

Mesh-object triangle bins:

- 100-499: 3 mesh objects
- 500-1,999: 12 mesh objects
- 2,000-9,999: 3 mesh objects
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

Observed: This GLB contains no embedded image files. Base-color image references present: False; normal map: False; AO map: False; metallic-roughness map: False. Materials not backed by image maps use PBR factors.

## Animation clips

| Clip | Duration | Channels | Target paths |
|---|---:|---:|---|
| Idle | 0.5417s | 48 | translation: 16, rotation: 16, scale: 16; root translation: yes; scale tracks: yes |

Current required clips not found: `Walk`, `Run`, `Interact`, `Wave`, `Hoe`, `Watering`, `Harvest`, `Carry`, `Sit`. This GLB has only one `Idle` clip (48 channels), targeting translation, rotation, and scale. Inspect root motion and bone scaling in Blender before using it with game-driven movement.

## Visual and provenance assessment

- Manually inspected `public/models/characters/warga-chibi-preview.png` and `public/models/characters/gallery/raka-warga-01.png` in the repository. They show separate, rounded primitive parts with visible gaps at shoulders, wrists, hips/legs, and neck; the torso and head silhouettes are simple, material detail is low, and the pose is stiff. These images are renders, not 3D source assets.
- `tools/create_chibi_avatar.py` explicitly calls Blender primitive sphere, cube, cone, torus, and cylinder creation operators and assigns each part wholly to one bone before joining by category. The Raka GLB has 17,947 vertices, all with exactly one positive bone influence; this rigid per-part weighting explains hard seams and poor bending at joints. The rig has no dedicated pelvis, clavicle, toe, finger, or facial-control bones. It is a prototype generator, not a suitable production source mesh or an approved path for V2 final characters.
- The existing generator starts by deleting the current Blender scene and writes directly to the legacy `.blend`/`.glb` paths. It was not run. Do not use it as the V2 pipeline.
- The V2 pipeline does not run this generator and does not modify or overwrite either existing GLB/Blend file.

## Not measurable from this host-only audit

UV coordinate bounds are computed from GLB accessors, but UV island packing, texel density, overlap, seam placement, disconnected component intent, normals in motion, facial appeal, skin-weight quality, and animation deformation require visual Blender review. The portable Blender round-trip tests prove import/export/reimport only; they are not visual or deformation approval.

## Production decision

**Reject as a premium source mesh.** The existing GLB is structurally loadable but was built from primitives and the visual review does not pass the requested target. `raka-warga-01.glb` is exported from the same Blender source, not an independent sculpted source. The gallery PNG is 2D only. No suitable external source mesh or configured 3D generation credential was found, so mesh-dependent V2 production is stopped pending a licensed source character.
