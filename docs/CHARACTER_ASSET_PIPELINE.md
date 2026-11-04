# Character GLB pipeline

## Current implementation

Semesta uses Three.js directly (the project depends on `three`; it does not use React or React Three Fiber). The world loads the character with `GLTFLoader`. `game-src/avatar-character-3d.js` clones the skinned hierarchy with `SkeletonUtils.clone`, clones materials before recoloring, and creates a separate `AnimationMixer` for each character instance. The movement controller chooses the available `Walk` or `Idle` clip; movement and visual animation remain separate.

The existing `public/models/characters/warga-chibi-base.glb` is a valid glTF 2.0 file with a skinned mesh and two imported clips. It was generated from Blender primitives, has 109 primitives and about 104k triangles, and does not include Run or the interaction/farming clips. It is therefore a working prototype asset, not the premium final character requested. The generated audit is in [CHARACTER_ASSET_VALIDATION.md](CHARACTER_ASSET_VALIDATION.md).

## Try a replacement in Avatar Studio

1. Open Admin → Avatar.
2. Use **Uji GLB lokal** and choose a `.glb` file. The browser parses it for this preview only; it is not uploaded or saved.
3. Inspect the actual animation list, wireframe, skeleton, lighting presets, scale, material data, bounds, and renderer statistics.
4. Use **Kembali ke aset situs** to restore the currently installed model.

The preview reports missing clips and structural warnings. Its render statistics describe the preview scene, including its ground and lights, not only the character. A valid GLB is not automatically a visually approved character. Check front orientation, grounded feet, skinning deformation, and material appearance by rotating the model through a full turn and playing each available clip.

## Install a production asset

Keep the current prototype as a rollback copy. Place a reviewed, licensed, rigged GLB in `public/models/characters/`, then update the character model path in `application/views/game.php` (`$character_model_path`) so the game and Avatar Studio load that asset. Ensure its cache version is derived from that same file. Run:

```sh
python3 tools/validate_character_glb.py --input public/models/characters/your-reviewed-model.glb --report docs/CHARACTER_ASSET_VALIDATION.md
```

The validator exits with status 2 when the initial structural gate is not met and still writes a report. It checks geometry size, skinning, texture presence, approximate ground clearance, and required named animation states. Its bbox check cannot verify foot contact during animation or which direction the face points; inspect those in the preview. This is a screening tool, not a substitute for visual or runtime review. Do not promote an asset merely because the GLB parses.

## Asset handoff conventions

- Format: glTF 2.0 binary `.glb`, with textures embedded so the browser import can be self-contained.
- Rig: skinned mesh with `JOINTS_0` and `WEIGHTS_0`; keep a single consistent humanoid rest pose and skeleton across clothing variants.
- Scale/origin: upright character, feet at local ground level, approximately 1.8 game units tall. The current prototype's measured world bounds are about 0.92 × 1.83 × 0.67 units.
- Facing: face the game world's forward direction and verify it in the 360° preview; do not infer orientation from a filename.
- Materials: PBR materials, UVs and normals; pack color/roughness/normal maps in the GLB where used. Keep texture dimensions suitable for mobile and desktop profiling.
- Animation names: `Idle`, `Walk`, `Run`, `Interact`, `Wave`, `Hoe`, `Watering`, and `Harvest`. Locomotion clips should be in-place because the game controller moves the character. Preserve a rest/idle pose and verify transitions for deformation.
- License: record the source and license alongside the delivered asset before it is distributed.

## Scope and limitations

Implemented now: GLB structural validator and generated report, local GLB preview/import, actual clip selection, 360° drag rotation and zoom, wireframe/skeleton controls, three preview lighting presets including a generated studio environment, scale calibration, material report, draw-call/triangle/geometry/texture and approximate FPS readouts.

Still requires a production artist asset: the project does not contain a premium character GLB. The current model has only Idle and Walk, so the preview disables unavailable clips instead of inventing them. The game runtime likewise only transitions between imported Idle and Walk today. Full activity animation states, visual acceptance of a replacement, desktop/mobile profiling, screenshots, and final build validation remain pending the production GLB and a working Node/Vite build environment.
