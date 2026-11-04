You are a senior Three.js / React Three Fiber game engineer and technical character artist.

GOAL:
Upgrade the existing farming/village game from primitive-based low-poly characters to a premium stylized 3D character system, preserving existing gameplay.

PHASE 1 — AUDIT
Inspect package.json, game scenes, player and NPC components, movement controllers, camera, animation, asset loading, rendering and build tooling.
Identify current character implementation and all dependencies.
Report findings before major architectural changes.
Do not overwrite working assets or gameplay.

PHASE 2 — ASSET PIPELINE
Use real GLB/glTF 2.0 skinned character assets.
Do not construct final character bodies from SphereGeometry, BoxGeometry, CylinderGeometry or CapsuleGeometry.
Look for existing licensed character assets in the repository.
Never claim a high-quality character model has been generated unless a valid 3D mesh file actually exists.
If no production-ready character asset is available, implement an asset import pipeline, viewer, validator and clear missing-asset instructions. Do not fabricate or substitute a primitive model as final.
Character style: premium stylized 3D cozy farming simulation, appealing expressive face, rounded proportions, detailed hair, believable cloth folds, polished boots, high-quality PBR materials.
Use consistent scale and skeleton conventions.

PHASE 3 — VALIDATION
Validate GLB import, mesh count, triangles, textures, material maps, skinned meshes, bones, animation clips, orientation and bounding boxes.
Verify character faces forward, feet touch ground, animations do not deform the mesh and materials display correctly.
Generate a readable validation report.

PHASE 4 — COMPONENT ARCHITECTURE
Build reusable components:
CharacterModel
CharacterAnimator
PlayerAvatar
NPCCharacter
CharacterPreview
CharacterAssetValidator
Keep movement logic independent from visual character logic.
Use useGLTF, useAnimations and SkeletonUtils.clone for independently animated skinned character instances.
Avoid mutating shared materials unintentionally.

PHASE 5 — ANIMATION
Implement an animation state machine:
idle, walk, run, interact, wave, hoe, watering, harvest.
Map imported animation names to these states.
Use smooth crossfade transitions and action cleanup.
Support independent NPC animation instances.
Handle missing animation clips explicitly, without inventing animations or silently marking them complete.
Use in-place locomotion when existing movement controller drives character translation; avoid double-applying root motion.

PHASE 6 — RENDERING
Audit renderer configuration.
Configure sRGB output, ACES tone mapping, correct PBR color spaces, directional shadows, hemisphere/ambient fill lighting and environment lighting.
Ensure material colors are not washed out or excessively dark.
Add quality presets for desktop and mobile.
Keep shadows and postprocessing performance-conscious.

PHASE 7 — PERFORMANCE
Add GLB preload, asset caching and proper disposal.
Use texture compression and geometry compression only when compatible loaders are configured.
Avoid cloning heavy resources unnecessarily.
Measure FPS, draw calls, triangles, texture memory and number of active animated NPCs.
Define budgets based on profiling rather than assuming arbitrary limits.
Test mobile and desktop.

PHASE 8 — CHARACTER PREVIEW
Create a dedicated preview route or dev panel:
360-degree rotation
Zoom
Animation selection
Wireframe toggle
Skeleton visibility
Lighting presets
Material inspection
Performance statistics
Character scale calibration
Show errors for missing assets and animation clips.

PHASE 9 — INTEGRATION
Replace one existing character with the new GLB pipeline first.
Preserve player controls, collisions, NPC interactions, camera, and game logic.
Do not replace all NPCs until the first character passes acceptance tests.

ACCEPTANCE CRITERIA:
- Real GLB character loads successfully.
- Character has genuine 3D mesh and valid PBR materials.
- Full body is visible and grounded.
- Character rotates 360 degrees correctly.
- Skeleton and imported animations work.
- Idle/walk/run transitions work smoothly.
- Existing game movement and interactions still work.
- Independent NPC instances do not share animation state.
- Character preview works.
- Build and existing tests pass.
- Provide before/after screenshots and a concise technical report.
- Clearly distinguish implemented features from missing external character assets.

IMPORTANT:
Do not merely improve primitive geometry.
Do not present a 2D AI image as a functional 3D asset.
Do not invent GLB files, rigging or animation clips.
Prioritize genuine asset quality and maintainable architecture.
Start by auditing the repository, then implement incrementally.
