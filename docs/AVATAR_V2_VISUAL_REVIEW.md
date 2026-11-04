# Avatar V2 visual review procedure

This is a manual review gate. It must be completed by an artist after importing a licensed GLB; no V2 model is currently available to render.

## Browser preview already present in Avatar Studio

1. Sign in to Admin → Avatar and choose **Uji GLB lokal**. The file is parsed in the browser and is not uploaded.
2. Use the three lighting presets and scale slider to establish a neutral, correctly sized preview. Do not judge material color from a dramatic colored light.
3. Capture the same model at front, left profile, back, and three-quarter by dragging the canvas. Capture a close crop of the face at a closer zoom.
4. Select every imported animation clip and observe a full loop. Note root translation, root rotation, bone scale, deformation, floating feet, and intersection. Wireframe and skeleton visibility help diagnose topology and rig placement but do not constitute approval.
5. Record the actual filename/hash, device/browser, reviewer/date, and observations in the asset manifest. Keep the views in `assets/avatar-v2/previews/<assetId>/` and the validation report in `assets/avatar-v2/reports/`.

## Required rejection checks

- Inspect shoulder, elbow, wrist, neck, pelvis, knee, ankle, and garment deformation.
- Confirm hands retain an open tool-grip pose and fingers do not collapse.
- Check hair under headwear, clothing/body masking, prop attachment, and planted foot contact.
- Check front-facing direction, scale, normals, UV seams, texture color space, and face readability at the gameplay camera distance.
- Reject an asset with broken rigging or severe intersections even if its GLB parser, triangle budget, and material counts pass.

Current Avatar Studio does not export a structured set of camera renders, and no automated screenshot capture or Blender offline render has been run. Capture these views manually in the browser until a Blender environment is available and a repeatable render setup can be validated.
