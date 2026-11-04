# Avatar V2 — optional AI 3D source workflow

## Finding (checked 4 November 2026)

There are current paid API products that can generate GLB from multiple views. Meshy's official Multi-Image to 3D endpoint accepts one to four views of the **same** object and can return textured GLB with PBR maps. The first image is treated as the front view. Meshy documents the rigging endpoint for textured humanoid GLBs and separate animation endpoints. This makes the service technically integrable as a **source-mesh proposal**; it does not make its output a premium, production-approved character. One-view image-to-3D is not recommended for a full-body character when front/side/back consistency matters.

Official API docs:

- [Meshy Multi-Image to 3D](https://docs.meshy.ai/en/api/multi-image-to-3d)
- [Meshy rigging](https://docs.meshy.ai/en/api/rigging)
- [Meshy animation](https://docs.meshy.ai/en/api/animation)
- [Meshy API pricing](https://docs.meshy.ai/en/api/pricing)
- [Meshy API key handling](https://docs.meshy.ai/en/api/authentication)
- Alternative: [Tripo API](https://developers.tripo3d.ai/en), which documents image/multiview generation, processing, rigging and animation.

Meshy's published API pricing currently lists image-to-3D with a standard texture at 30 credits for Meshy-7, auto-rigging at 5 credits, and animation at 3 credits per action; Ultra and texture options can add credits. Prices and product behavior may change. Check the provider's pricing page immediately before any submission. A provider API key is tied to account usage, so keep it in a protected environment variable and set provider-side credit limits. **No request was submitted in this task. No API key was found in the environment.**

### Task A2 source views

For Task A2 the owner selected four references at `assets/avatar-v2/source/semesta_farmer_male_v2-r1-{front,left-profile,back,front-three-quarter}.png`; the local Meshy `preflight` passed for four 434×874 PNGs and made no network request. They contain no third-party source images and are 2D references only, not a model. Report: `assets/avatar-v2/reports/meshy-multiview-r1-preflight.json`. See `assets/avatar-v2/source/semesta_farmer_male_v2-image-provenance.json` for source details and retained r2 design iteration.

Meshy's current published API price for `meshy-7.1` multi-image with 2K textures is 30 credits (20 mesh + 10 texture), with +5 for Ultra geometry; rigging is 5 credits and animation is 3 per action. The adapter leaves texture resolution at the provider default, so recalculate the actual task before submitting. Meshy's terms require rights to submitted references; the account plan determines output licensing (free-plan output CC BY 4.0 with attribution; paid-plan output assigned to the paid customer under the terms). Non-Enterprise user content may be used to improve the service unless opted out, and API outputs are retained for three days. No account plan was available to inspect, no key is configured, and no paid task was submitted. Check the terms and account privacy/licensing settings before upload: [Terms of Use](https://www.meshy.ai/terms-of-use), [commercial-use FAQ](https://help.meshy.ai/en/articles/9992001-can-i-use-meshy-assets-commercially-license-copyright-explained), [API pricing](https://docs.meshy.ai/en/api/pricing).

## Adapter in this repository

`tools/meshy_multiview_to_glb.py` supports:

- `preflight`: checks 2–4 local view files, size, file type, optional Pillow-readable dimensions, and SHA-256. It makes no network request.
- `submit`: posts the multiview request only if `MESHY_API_KEY` exists and the caller explicitly adds `--confirm-credit-use`.
- `status`: queries a known task ID. It does not create a task.
- `download`: downloads a completed GLB only under `assets/avatar-v2/source/`; rejects live-asset destinations, overwrites, non-HTTPS URLs, and non-Meshy asset hosts.

The adapter does not fabricate or log credentials, does not automatically submit, does not silently move a generated mesh to `characters/`, and does not mark an output production-ready. Treat each downloaded file as an unreviewed external source and preserve the task ID, provider credit usage, prompt/image source, license terms, and downloaded file hash.

Example local-only preflight:

```sh
python3 tools/meshy_multiview_to_glb.py preflight \
  --views farmer-front.png farmer-left.png farmer-back.png farmer-three-quarter.png
```

After the project owner has supplied/configured an API key in a protected environment, checked current cost and licensing, and decided to spend credits, the explicit submission command is:

```sh
python3 tools/meshy_multiview_to_glb.py submit \
  --views farmer-front.png farmer-left.png farmer-back.png farmer-three-quarter.png \
  --confirm-credit-use
```

Do not put the key literal in shell history, repository files, screenshots, logs, or command transcripts. Prefer exporting it from a protected secret manager instead of typing it inline.

## Recommended source views

Follow `AVATAR_V2_FARMER_CONCEPT.md` and prepare 2–4 separate images of the same approved design in the same neutral A-pose, with matching proportions/costume/light/background. Use front first, then left profile, back, and optionally three-quarter. If starting from one concept sheet, crop its panels into individual views and manually confirm alignment. A multiview generator may still invent unseen details, produce dense/uneven topology, inconsistent anatomy, or a poor face; Blender cleanup, retopology, UV/weight repair, rigging review, and visual acceptance remain necessary.

## Rig and animation caveat

Provider auto-rigging can produce a quick biped and basic walk/run files. Its skeleton is **not** the Semesta V2 rig by virtue of both being humanoid. Compare bone names, hierarchy, rest pose, local axes, weights, root motion, and each output animation. Retarget to `semesta-humanoid-v2.0` or update the versioned contract only after review. The required farming interactions (Hoe, Water, Harvest, Carry, Sit) still need matching animation outputs or artist-created animation. The API adapter currently generates and downloads the unrigged multiview source; its rig/animation calls are deliberately not automated until the generated model passes manual source review and the owner explicitly approves additional credit use.
