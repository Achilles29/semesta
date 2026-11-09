# SEMESTA Avatar V2 — handoff

## Task A2 status — 4 November 2026

The owner selected four 2D references under `assets/avatar-v2/source/`: `semesta_farmer_male_v2-r1-front.png`, `semesta_farmer_male_v2-r1-left-profile.png`, `semesta_farmer_male_v2-r1-back.png`, and `semesta_farmer_male_v2-r1-front-three-quarter.png`. They passed the existing Meshy adapter's local preflight (434×874 PNGs; `networkCalled: false`). Report: `assets/avatar-v2/reports/meshy-multiview-r1-preflight.json`. The generated turnaround sheets and prior r2 variants are retained separately under `source/references/` and revisioned filenames; the selected r1 files were not altered. These are **2D references only**, not a GLB or an approved 3D model.

The Meshy generation request is **not submitted** because `MESHY_API_KEY` is absent from the protected environment. The owner explicitly approved one multiview generation up to 30 credits. Current official API pricing for `meshy-7.1` multi-image with 2K textures is exactly **30 credits** (20 mesh + 10 texture). This adapter's request defaults to standard geometry, 2K texture, and PBR; it does not request Ultra geometry, which would add 5 credits. Sources: [API pricing](https://docs.meshy.ai/en/api/pricing), [multi-image API parameters](https://docs.meshy.ai/en/api/multi-image-to-3d).

Meshy's terms require the submitter to have rights to the input images and grant Meshy processing rights. The selected references were generated for this project and used no third-party source images. The Meshy account plan is unknown: free-plan output is under CC BY 4.0 with attribution, while paid-plan output is owned by the paid customer under the published terms. Non-Enterprise input/output may be used to improve services unless opted out, and API output is retained for three days; download and archive immediately if a task is later run. Check the account's privacy/training setting and plan/license before upload. [Terms details](https://www.meshy.ai/terms-of-use), [commercial-use FAQ](https://help.meshy.ai/en/articles/9992001-can-i-use-meshy-assets-commercially-license-copyright-explained).

**Owner dependency to resume Phase 3:** credit-use authorization is already recorded. Configure `MESHY_API_KEY` as a secret in the execution environment or run the adapter from a protected shell where that environment variable is set; do not paste it in chat or store it in the repository. Confirm the Meshy plan and privacy/training choice. Rigging and each animation are separate credit-consuming operations and need their own review/approval.

The portable Blender 4.5.15 runtime, existing pipeline, manifests, and V2 directories were verified present. No legacy or live game asset was edited. No premium character GLB exists yet, so readiness for Task B is **not achieved**.

**Status (4 November 2026):** Blender import → export → reimport is now exercised with Blender 4.5.15 LTS on both an isolated synthetic fixture and a copy of the legacy GLB. The pipeline is structurally tested. A premium V2 character is **not produced**: no suitable source mesh was supplied, and no model has passed visual, deformation, animation, and Studio acceptance. No live assets or game runtime were changed by this Task A continuation.

## Free MPFB source candidate — 5 November 2026

To explore a no-API route, generated a real editable humanoid mesh using MPFB 2.0.18 inside the portable Blender 4.5.15 runtime. No paid service or API credits were used. The source is `assets/avatar-v2/source/semesta_farmer_male_v2_mpfb-candidate.blend`; its provenance and known limits are in `assets/avatar-v2/source/semesta_farmer_male_v2_mpfb-provenance.json`. The model has a 19,158-vertex base body, a 53-bone MPFB game-engine rig, packed textures, a blue top, olive trousers, boots, short hair and dark-brown eyes. This is a source candidate only. It is **not** a premium or production-approved SEMESTA character.

Five inspection renders are in `assets/avatar-v2/previews/semesta_farmer_male_v2_mpfb-*.png`. Visual review found forehead texture marks, a generic face, eyes that lack the approved character appeal, and body proportions that are more realistic than the approved 3.5–4-head style. The rig has not been retargeted to `semesta-humanoid-v2.0`, clothing deformation has not been checked, and no animations are included. Do not put this candidate in the live game or `assets/avatar-v2/characters/`.

The generation script is `tools/generate_avatar_v2_mpfb_candidate.py`. It requires Blender 4.2+ with MPFB installed and the MakeHuman system assets, `shirts01`, and `pants01` packs available in MPFB's data library. Those packs are CC0; the exact source and license records are in the provenance JSON. The `.blend` packs its referenced image textures.

## 1. Pekerjaan yang benar-benar selesai

- Audited the legacy GLB, Blender source, gallery images, skeleton, weights, materials, UV numeric ranges, textures, and animation channels. Findings: [source audit](AVATAR_V2_SOURCE_AUDIT.md), [Raka audit](AVATAR_V2_RAKA_SOURCE_AUDIT.md), [visual review](AVATAR_V2_VISUAL_REVIEW.md).
- Defined an original SEMESTA art direction and male farmer concept: [style guide](AVATAR_V2_STYLE_GUIDE.md), [concept brief](AVATAR_V2_FARMER_CONCEPT.md).
- Wrote the versioned rig and modular Studio contract, including skin/hair/material channels, skinned garment requirements, slots, body masking, skin-weight guidelines, twist joints, and pose checks: [modular spec](AVATAR_V2_MODULAR_SPEC.md).
- Created a separate V2 library, registry/schema, character/animation manifests, read-only audit script, non-destructive Blender pipeline, and a credit-gated optional Meshy multiview adapter. The registry still has no invented production assets.
- Downloaded the official Blender 4.5.15 LTS Linux archive to `/tmp`, verified its SHA-256 against the official release checksum, and ran it without installing packages or changing the server's software. See [Blender test record](AVATAR_V2_BLENDER_PIPELINE_TEST.md).
- Ran two actual Blender 4.5.15 imports, GLB exports, and clean-scene reimports. Round-trip reports preserve source bone and action names. One test uses a synthetic test-only fixture; the other uses only a temporary copy of the old GLB. Outputs are in `/tmp/semesta-avatar-v2-smoke/`, not the game or the production V2 character directory.
- Reviewed provider documentation. The Meshy wrapper supports local preflight and gated multiview submit/status/download; no credentials were found and no provider request or credit spend occurred. [AI 3D workflow](AVATAR_V2_AI3D_WORKFLOW.md).

## 2. Lokasi GLB dan aset

### V2 folder structure

- `assets/avatar-v2/source/` — drop licensed incoming `.blend`, `.fbx`, `.obj` + textures/materials, or `.glb` here. Keep the original source unchanged; AI outputs also land here for review.
- `assets/avatar-v2/source/README.md` — source file formats, provenance details, and handoff requirements.
- `assets/avatar-v2/characters/` — only approved exported base characters. `semesta_farmer_male_v2.glb` and `semesta_farmer_female_v2.glb` **do not exist yet**.
- `assets/avatar-v2/bodies/`, `faces/`, `hair/`, `tops/`, `bottoms/`, `footwear/`, `headwear/`, `facial_hair/`, `accessories/`, `animations/` — modular categories, currently without approved production components.
- `assets/avatar-v2/previews/` — includes five unapproved MPFB source-candidate renders; no production-approved V2 renders.
- `assets/avatar-v2/reports/` — structural reports, including the Blender round-trip logs.
- `assets/avatar-v2/asset_registry.json`, `asset_registry.schema.json`, `semesta_character_manifest.json`, `semesta_animation_manifest.json` — registry/schema/manifests.

Legacy assets remain in place and were not overwritten:

- `public/models/characters/warga-chibi-base.glb` (5,531,036 bytes): the old GLB, structurally readable but rejected for premium quality.
- `public/models/characters/warga-chibi-base.blend` (10,978,932 bytes): old source.
- `public/models/characters/gallery/raka-warga-01.glb` and existing PNG previews/reference art: not V2 source models.

## 3. Skeleton, orientation, scale, and animation standard

Draft `semesta-humanoid-v2.0` is documented in the modular spec. Export GLB uses right-handed coordinates, `+Y` up, facing `+Z`, floor at `Y=0`, origin centered between planted feet, target height about 1.8 units. Blender source assumes `+Z` up and `-Y` forward; verify orientation after official glTF export.

Required joints include root/pelvis, spine/chest, clavicles, upper/lower arms/hands, neck/head, upper/lower legs, feet/toes. Upper-arm, forearm, thigh, and calf twist joints are strongly recommended for stylized joint volume. Use normalized weights with up to four influences and paint shoulder, elbow, wrist, hip, knee, ankle, and neck transitions deliberately. Corrective bones/shapes may be needed. These are production requirements, not deformation results: no premium character exists yet to validate them. The current legacy model's 16-bone structure and single positive influence per vertex is not this standard.

All replaceable garments need the same joint names, hierarchy, rest pose, local axes, and compatible inverse bind matrices. Runtime Studio assembly must resolve bones by name and bind each garment to the shared character skeleton; merely parenting a skinned mesh to the root is invalid. Color choices are explicit skin/hair material variants or authored tint-mask channels, with separate mesh/material slots for tops, bottoms, footwear, headwear, facial hair, and accessories. Registry compatibility, hide regions, occupied slots, hair clearance, and conflicting equipment gate combinations. Male and female body proportions remain separate compatibility families unless checked otherwise.

Target clips: `Idle`, `Walk`, `Run`, `Interact`, `Wave`, `Hoe`, `Water`, `Harvest`, `Carry`, `Sit`. Walk/run must be in place. The legacy file round-trip contains only `Idle` and `Walk`; the other eight are reported missing. Runtime still uses the current legacy setup; Task A makes no runtime integration changes.

## 4. Asset registry and modular manifests

`asset_registry.json` follows `asset_registry.schema.json`. Each real asset record must include stable ID, file, category, version, compatible body IDs, skeleton, skin/rigid attachment method, attachment transform/bone, materials and color-space declarations, Studio appearance channel, body hide regions, incompatible equipment/slots, license/provenance, structural report, and visual review status. The registry's channels include `skin`, `hair`, `top`, `bottom`, `footwear`, `headwear`, `facial_hair`, and `accessory`. No arbitrary whole-material tint is permitted on face/skin textures. Empty categories and pending manifest entries mean the models are not available yet.

## 5. Importing a future character into Three.js

This is an integration pattern only; the live runtime was not changed:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const gltf = await new GLTFLoader().loadAsync('/assets/avatar-v2/characters/semesta_farmer_male_v2.glb');
const character = cloneSkeleton(gltf.scene);
const mixer = new THREE.AnimationMixer(character);
const clips = Object.fromEntries(gltf.animations.map((clip) => [clip.name, clip]));
clips.Idle && mixer.clipAction(clips.Idle).play();
// Per frame: mixer.update(deltaSeconds).
```

For modular Studio assembly, load a skinned component, match its skin joints against the character by exact contract names, validate bind/rest matrices, then bind it to the shared `Skeleton`. Test clipping and deformation in the actual Studio preview before adding the component to the selectable catalog. Do not simply attach skinned garments to the root, and do not alter shared GLTF materials unless cloning the material instance.

## 6. Actual test evidence and validation

Portable Blender: Blender `4.5.15 LTS`, archive SHA-256 verified against the official Blender release index; executable is under `/tmp/semesta-blender-runtime/` and is not installed system-wide.

Test outcomes:

- Synthetic fixture smoke test: 1 weighted hand-authored ring mesh, 1 armature, UV/material and `Idle`/`Walk` test actions; import, normalization, GLB export, clean-scene reimport succeeded. The fixture is explicitly not a character and is stored only in `/tmp`.
- Legacy GLB round-trip test: import legacy GLB, export to `/tmp/semesta-avatar-v2-smoke/legacy-glb-roundtrip-tested.glb`, clean-scene reimport succeeded. Report: `assets/avatar-v2/reports/blender-4.5.15-glb-roundtrip.json`; it preserved all source joint and action names and flags `roundTripValidated: true`, `productionReady: false`.
- Normalized legacy GLB round-trip: successful test-only output in `/tmp`; report `assets/avatar-v2/reports/blender-4.5.15-glb-normalized-roundtrip.json`. The file was a test output, not a V2 character approval.
- The export script now parents skinned meshes under their armature while preserving world transform; the synthetic test succeeds without the exporter hierarchy warning. It does not edit mesh topology or paint weights.
- Legacy GLB audit: 76 mesh objects, 109 primitives, 104,416 triangles, 65,474 vertices, 1 skin / 16 bones; every vertex has one positive influence; 24 materials; six embedded 512×512 RGB images; no normal/AO/metallic-roughness maps; two animation clips, `Idle` and `Walk`. Structural size/counts do not indicate visual quality.
- `python3 tools/validate_character_glb.py` can parse and report the legacy model but intentionally returns nonzero because it does not pass the production gate.
- Node/npm are not available in this environment, so a browser-based visual or Studio integration check was not run. No premium visual result is asserted.

Reproducible test command (legacy GLB only; writes only to `/tmp` and the report folder):

```sh
/tmp/semesta-blender-runtime/blender-4.5.15-linux-x64/blender --background --factory-startup \
  --python tools/blender_avatar_v2_pipeline.py -- \
  --input public/models/characters/warga-chibi-base.glb --mode export \
  --output /tmp/semesta-avatar-v2-smoke/legacy-roundtrip.glb \
  --report assets/avatar-v2/reports/blender-roundtrip-recheck.json \
  --allow-test-output
```

The full test log and fixture command are in [Blender pipeline test record](AVATAR_V2_BLENDER_PIPELINE_TEST.md).

## 7. Yang dibutuhkan untuk melanjutkan produksi

Please prepare a **real, licensed 3D source mesh**, then copy the original into:

```text
/www/wwwroot/semesta/assets/avatar-v2/source/
```

Preferred handoff is one of:

- `.blend` with editable meshes/materials and its external texture files packed or included beside it; best if the artist source is available.
- `.fbx` with texture files and, if already rigged, its armature/skin weights and animation clips.
- `.glb` with embedded PBR textures, armature, skin weights, and any existing clips.
- `.obj` plus `.mtl` and all referenced image textures; this is geometry/material only and still requires rigging, weights, and animation work.

Also include a `README.txt` or `provenance.json` with creator/source, license or purchase receipt, attribution terms, export version, intended front direction, nominal height/unit, and known rig/animation limitations. If the supplied artifact is only a PNG/JPG concept render, it is **not** a 3D source mesh; include consistent front/side/back views as references and a 3D artist or authorized AI generation will still be needed.

## 8. AI 3D source-generation availability

Meshy officially exposes multiview image-to-3D, rigging, and animation APIs; its multiview API accepts one to four views of the same object and can return GLB/PBR data. These endpoints can technically provide an unreviewed source candidate, not a guaranteed premium asset. The adapter in `tools/meshy_multiview_to_glb.py` performs local preflight and requires both `MESHY_API_KEY` and an explicit `--confirm-credit-use` to submit. No key is configured in this environment, no task was submitted, and no credits were spent. Meshy documents prepaid API credits and per-request pricing that should be rechecked before use. See [AI workflow](AVATAR_V2_AI3D_WORKFLOW.md).

If using AI: supply 2–4 aligned images of one approved design (front first, profile, back, optional three-quarter), all in the same neutral A-pose and costume, then put the generated `.glb` under `assets/avatar-v2/source/`. It still must pass Blender import, topology/UV/material review, re-rig or retarget, joint deformation, texture/visual review, animation checks, license review, and browser performance review before entering `characters/` or Studio. An API-generated model is not inherently premium.

## 9. Instruksi untuk Codex Sesi 2

1. Start by inspecting files in `assets/avatar-v2/source/` and their provenance. Preserve each original. If only 2D images are present, do not call them a mesh or claim a character was made.
2. Run the structural audit and Blender read-only inspection on the supplied source. For Blender, use `tools/blender_avatar_v2_pipeline.py --mode inspect`; its default executable is `blender` on PATH, or set `BLENDER_EXECUTABLE` for the portable binary.
3. If no source mesh exists, report that the prerequisite is missing and give the owner the source formats/folder from section 7. Do not proceed by creating primitive substitutes.
4. For a valid source, review topology, normals, UVs, PBR maps/color spaces, connected components, skeleton, influences, and animation. Mark manual tasks for sculpting, retopology, UVs, weight painting, rigging, and face/hair/clothing modeling where needed. Do not destructively alter weighted meshes automatically.
5. Retarget to `semesta-humanoid-v2.0` only after matching bone hierarchy, bind pose, axes, and weights; prove joint bends and garments in reviewed poses. Do not declare smooth deformation just because structural export succeeds.
6. Render front, profile, back, three-quarter, face close-up, idle, and walk. Record visual approval explicitly. Validate required clips, licenses, mobile/desktop budgets, and Three.js preview before updating the manifest/registry.
7. Export only a reviewed new V2 asset into `assets/avatar-v2/characters/`. Never overwrite assets in `public/models/characters/`. Keep Task A separate from runtime integration until the owner requests and the quality gate passes.

**Success condition remains unmet:** no real, visually approved, textured, rigged, animated premium character GLB exists yet. Blender's tested round-trip proves only that this import/export/reimport pipeline operates on these test inputs.
