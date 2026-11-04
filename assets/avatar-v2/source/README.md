# Incoming Avatar V2 source files

Place the original, licensed character source in this folder before processing it. Preferred formats:

- `.blend` with meshes/materials and packed textures, or textures included beside the file;
- `.fbx` with its texture images and, when available, armature, skin weights, and clips;
- `.glb` with embedded PBR textures, armature, weights, and existing clips;
- `.obj` with `.mtl` and every referenced texture (geometry/material source only; it still needs rigging and animation).

Include provenance/license or purchase receipt, creator/source, attribution terms, intended front direction, nominal height/units, and known limitations in a neighboring `README.txt` or `provenance.json`. Do not put a PNG/JPG render here as if it were a 3D mesh. Reference images may be included in a `references/` subfolder, clearly labeled front/profile/back.

Incoming models remain unreviewed source files. Do not move them to `assets/avatar-v2/characters/` or any live `public/models/` directory until the Blender, visual, rigging, animation, licensing, and target-device reviews pass.

For the current SEMESTA Farmer V2 multiview reference set, use the four `semesta_farmer_male_v2-r2-*.png` files in front, left-profile, back, three-quarter order. The uncut sheets and the first draft's crops are retained under `references/` and beside these files for provenance. Local Meshy preflight passed; no network request has been made.
