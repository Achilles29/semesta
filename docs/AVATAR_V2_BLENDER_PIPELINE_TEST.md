# Avatar V2 Blender pipeline test record

**Date:** 4 November 2026  
**Blender:** 4.5.15 LTS (portable official Linux archive; not installed system-wide)  
**Purpose:** verify the actual importer → optional normalization → GLB exporter → clean-scene reimport path. This is a structural tooling test, not character quality approval.

## Reproducible Blender runtime

The host did not have Blender on `PATH`. The official Blender 4.5.15 Linux archive was downloaded to `/tmp/blender-4.5.15-linux-x64.tar.xz`, and its SHA-256 was checked against the official Blender 4.5 release index:

```text
0d2b8bb2efe97e6c8eb57de6b7322f8800e1984e3125b60decca5f6771e4773e
```

It was extracted to `/tmp/semesta-blender-runtime/blender-4.5.15-linux-x64/`. Version output: `Blender 4.5.15 LTS` (build `5afeabba6097`, 2026-10-22). Official download: [Blender 4.5 LTS release](https://www.blender.org/download/LTS/); [4.5 release files and checksums](https://download.blender.org/release/Blender4.5/).

## Test A — isolated synthetic Blender I/O fixture

`tools/avatar_v2_blender_smoke_fixture.py` creates one hand-authored closed ring mesh, a 6-bone armature, UVs, one PBR material, and `Idle`/`Walk` actions. It uses no Blender primitive creation operators, is clearly marked as a test fixture, and is saved only under `/tmp/semesta-avatar-v2-smoke/`. It is not a usable character and never enters `assets/avatar-v2/characters/` or the game.

Commands run:

```sh
/tmp/semesta-blender-runtime/blender-4.5.15-linux-x64/blender --background --factory-startup \
  --python tools/avatar_v2_blender_smoke_fixture.py -- \
  --output /tmp/semesta-avatar-v2-smoke/smoke-source.blend

/tmp/semesta-blender-runtime/blender-4.5.15-linux-x64/blender --background --factory-startup \
  --python tools/blender_avatar_v2_pipeline.py -- \
  --input /tmp/semesta-avatar-v2-smoke/smoke-source.blend --mode export \
  --output /tmp/semesta-avatar-v2-smoke/smoke-final.glb \
  --report assets/avatar-v2/reports/blender-4.5.15-synthetic-smoke.json \
  --normalize-height 1.8 --yaw-degrees 0 --allow-test-output --force
```

Result: **pass**. Blender exported one skinned mesh, reimported the GLB into a clean scene, and retained the armature, all six fixture bones, and both actions. `roundTripValidated: true`, `roundTripSkinnedMeshObjectCount: 1`, and `productionReady: false`. The test prompted a correction to the exporter hierarchy: weighted meshes are now parented to their armature while preserving their world transform, removing Blender's `Armature must be the parent of skinned mesh` warning. The exported GLB independently audits as one mesh/primitive, one skin, six joints, and 140 triangles.

## Test B — legacy character GLB round-trip

Command run:

```sh
/tmp/semesta-blender-runtime/blender-4.5.15-linux-x64/blender --background --factory-startup \
  --python tools/blender_avatar_v2_pipeline.py -- \
  --input public/models/characters/warga-chibi-base.glb --mode export \
  --output /tmp/semesta-avatar-v2-smoke/legacy-glb-roundtrip-final.glb \
  --report assets/avatar-v2/reports/blender-4.5.15-glb-roundtrip.json \
  --allow-test-output --force
```

Result: **structural round-trip pass**. The pipeline imported the legacy GLB, exported a temporary GLB, reset the Blender scene, and reimported it. It retained the source armature, all source bone names, `Idle` and `Walk` action names, and at least one skinned mesh object. The host-side GLB audit of the temporary output also confirms 109 skinned primitives, 16 joints, 104,416 triangles, and both source clips. Output is outside the repository in `/tmp/semesta-avatar-v2-smoke/`.

`blender-4.5.15-glb-roundtrip.json` records `roundTripValidated: true`, no missing source bones/actions, missing required clips `Run`, `Interact`, `Wave`, `Hoe`, `Water`, `Harvest`, `Carry`, `Sit`, and `productionReady: false`. This proves the Blender file path executes against a representative legacy GLB; it does not prove its topology, visuals, deformation, animation quality, or modular outfit compatibility.

## Test C — optional normalization smoke path

The synthetic fixture was run with `--normalize-height 1.8 --yaw-degrees 0`. Normalization changed only a parent root transform, retained the synthetic source skeleton/actions, and the GLB round-trip passed. The legacy model also completed a normalized test export recorded in `assets/avatar-v2/reports/blender-4.5.15-glb-normalized-roundtrip.json`. Normalization does not identify the face direction automatically; yaw must be visually confirmed for each real source. Neither output was adopted as a production asset.

## What the test does not cover

- no visually reviewed character, sculpt, retopology, UV layout, PBR detail, skin weights, or facial quality;
- no joint pose/deformation review for shoulder, elbow, wrist, hip, knee, ankle, or neck;
- no review of clothing clipping, interchangeable components, or skin/hair tint masks;
- no check that the source animation curves produce good motion in Three.js;
- no browser/Studio render, because Node/npm are unavailable in this environment;
- no premium V2 GLB produced.

The pipeline is fit to continue structural handling of a real source file, but acceptance for character production requires the manual/visual gates above and in `AVATAR_V2_VISUAL_REVIEW.md`.
