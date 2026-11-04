# SEMESTA Character Family V2 — art direction

**Status:** production specification only. No V2 source mesh or generated 3D character exists yet. The current prototype was rejected as a premium source after structural and visual inspection. The PNG references in the gallery are images, not 3D models.

## Original visual direction

Create original stylized anime/chibi residents with the warm, readable appeal of a modern cozy farming simulation. Use that genre only as broad direction. Do not copy any Story of Seasons or other copyrighted character model, costume, face, texture, or distinctive silhouette. Every resident should feel like a person in an Indonesian village rather than a reskin of a named game character.

## Proportions and gameplay readability

- Target height: **3.5–4 head lengths**, including footwear; provisional total height about **1.8 SEMESTA world units**.
- Head: large enough for facial acting at the isometric camera, but sculpt the cranium, temples, cheek planes, jaw, ears, and chin as one coherent silhouette. Avoid a sphere with attached feature dots.
- Eyes: expressive, readable large anime eyes with shaped lids, iris, pupil, highlights, and brows. Eye placement and gaze should read from front and three-quarter views; lids and eye parts must follow facial expression controls.
- Nose and mouth: distinct small forms integrated into the face; no floating ball nose or disconnected smile line.
- Torso: compact but sculpted shoulder, chest, waist, pelvis, and hip transitions. Arms begin at the shoulder and connect through elbows and wrists. Legs connect through a visible pelvis with knees and ankles.
- Limbs: short stylized proportions with enough edge flow and joints for bending. Hands need a thumb and a usable grip pose for future farming tools.
- Hair: layered, sculpted clumps with a deliberate hairline, volume, back silhouette, and cap/hat clearance. Avoid a single smooth cap or hair hidden inside headwear.
- Clothing: tailored volumes follow the body. Use seams, cuffs, hems, pockets, collars, folds, and restrained stitch detail. Garments should not be made of intersecting primitive capsules or boxes.
- Footwear: integrated ankle/sole shape with a clear planted base.
- Silhouette: check front, side, back, and three-quarter views at the actual isometric play size; the character must remain identifiable without texture detail.

## SEMESTA FARMER V2 — male base concept

Original young-adult Indonesian male farmer. Friendly and confident, with warm brown skin, layered chestnut-brown hair, expressive dark brown eyes, a shaped face, a blue work shirt, olive-green trousers, and practical brown boots. Use restrained amber or woven-fabric accents. Neutral A-pose, hands relaxed and open for later tool-grip posing; no handheld equipment during modeling. The character should be approachable and capable, not a child, mascot, or caricature.

### Concept sheet generation brief

Generate a single consistent design sheet with **separate, aligned views of the same design**: straight front, left profile, right profile if room allows, back, three-quarter front, and a close-up face panel. Keep identical body, hair, facial features, garment construction, colors, lighting, camera scale, and neutral A-pose across views. Orthographic or long-lens studio views; plain neutral background; full body and feet visible; no props, text, logos, dramatic camera perspective, motion, or alternate costume. Treat the image only as modeling reference. It is not a rigged model and must never be placed in the game as a 3D asset.

## Shading, color, and presentation

- Skin: soft warm stylized response with gentle roughness variation; avoid oily highlights or flat orange color.
- Hair: layered low-frequency shapes plus restrained roughness/specular breakup; preserve the hair silhouette under headwear.
- Cloth: mostly matte fabric with broad, readable folds and subtle woven detail; no noisy high-frequency bump that shimmers at gameplay scale.
- Leather/boots: slightly smoother than cloth, with readable sole and seam shapes.
- Palette anchors: chestnut hair `#5B3427`, work blue `#426A91`, olive trousers `#667344`, boot umber `#61402F`, warm skin family around `#B97855`; use these as direction, not fixed material constants.
- Preview light: neutral studio key, soft environment fill, gentle rim, ground contact shadow; avoid blown highlights and colored backgrounds that distort material evaluation.
- Color textures use sRGB; normal, roughness, metallic, and AO data use linear color space.

## Initial budgets (provisional; not device-profiled)

| Metric | Desktop target | Mobile target | Notes |
|---|---:|---:|---|
| Base body triangles | 20k–35k | 10k–20k LOD | Face and joints retain geometry; do not decimate blindly |
| Character draw calls | ≤8 | ≤6 | Prefer coherent materials/atlases; profile outfit variants |
| Material slots | ≤6 | ≤5 | PBR material slots, not a visual-quality score |
| Texture memory per character | ≤24 MiB | ≤8 MiB | Measure decoded GPU memory and sharing between instances |
| Main color atlas | 1 × 2048² or 2 × 1024² | 1 × 1024² LOD | Keep face texel density high; verify on device |
| Deforming skeleton bones | ≤60 | ≤50 | Count actual influences and profile simultaneous characters |
| Base GLB file size | ≤8 MiB | ≤5 MiB LOD preferred | Compression only after decoder support is verified |
| Active clips on base | 4 core | same asset, same rig | Idle/Walk/Run/Interact first; profile mixer cost |

These are design starting points, not measured performance results or hard rejection criteria. Benchmark several independently animated characters on representative desktop and mobile devices before revising them.

## Visual approval checklist

Approve only after inspecting front, side, back, three-quarter, face close-up, Idle, Walk, Run, and Interact. Reject broken shoulder/elbow/knee/neck bends, floating feet or accessories, hair/hat intersections, clothing-through-body, faceted normals, UV distortions, unreadable face at gameplay size, inconsistent views, or unlicensed provenance. Save the review renders with the asset version and reviewer/date.
