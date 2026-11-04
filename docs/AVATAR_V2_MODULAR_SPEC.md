# SEMESTA Avatar V2 — modular asset and rig contract

**Version:** draft contract `semesta-humanoid-v2.0`. Blender import/export has been smoke-tested, but this skeleton contract itself is not yet proven on a quality character or supported by the live runtime. Do not integrate V2 into the live Three.js game until a real base character passes deformation, visual, and browser acceptance review.

## Asset categories

| Category | Examples | Attachment/deformation | Body masking and compatibility |
|---|---|---|---|
| Base body | Male/female proportions, face, hands, feet | Skinned to the exact V2 skeleton | Defines body family; variants are explicit, not presumed cross-compatible |
| Face | Eyes, brows, mouth, expression shapes | Facial bones or named morph targets; face material atlas allowed | Compatible only with the same face/body topology and expression contract |
| Hair | Short, curls, long, tied, hijab | Scalp-cap meshes skinned to head/neck; rigid hair ornaments to head/attachment bones | Hat clearance and scalp coverage are declared per item |
| Tops | Shirt, batik, jacket, uniform, kebaya | Separate skinned garments weighted to the same skeleton | Hide covered torso/upper-arm regions using named body masks; list incompatible packs/armor |
| Bottoms | Trousers, sarong, skirt, shorts | Separate skinned garments weighted to pelvis/leg bones | Hide covered pelvis/thigh/calf regions; declare body family and footwear clearance |
| Footwear | Boots, sandals, shoes | Skinned to foot/ankle bones; rigid buckles may attach to foot | Hide foot region only when the shoe supplies a complete foot silhouette |
| Headwear | Peci, caping, safety helmet, cap | Rigid attachment to `attach_head` or skinned to head for deformation | Declare hair styles hidden/reduced and incompatibilities; no floating hat offsets |
| Facial hair | Moustache, beard | Head skinned or face morph-compatible | Hide/replace incompatible face overlays; declare style and body/face compatibility |
| Accessories | Badge, backpack, satchel, scarf, tools | Skinned clothing-style mesh or rigid `attach_*` bone | Slots: head, back, waist, hand.L, hand.R, chest; declare occupied slot conflicts |
| Animations | Idle, Walk, Run, Interact, Wave, Hoe, Water, Harvest, Carry, Sit | Same rig version or explicitly retargeted and reviewed | Root-motion policy and required attachment pose are declared per clip |

Skinned clothing must deform on the same compatible skeleton, with its own reviewed vertex weights. It must not be merely parented to the character root. Rigid props use named attachment bones. Clothing declares body areas to hide or a compatible body variant to prevent body-through-cloth. No automatic mesh cutting or blind weight transfer is approved.

## Skeleton convention

Output GLB coordinate convention: right-handed, `+Y` up, character facing `+Z`, local `+X` to the character's right. Blender source convention: `+Z` up and `-Y` forward; use the official glTF exporter conversion and verify the exported GLB in Three.js. All variants use identical bone names, parent relationships, rest pose, and local bone axes. Nominal model origin is at the midpoint between planted feet; floor is `Y=0`; target height is about `1.8` SEMESTA units.

Required deformation hierarchy (names are exact and case-sensitive):

```text
root
└── pelvis
    └── spine_01
        └── chest
            ├── clavicle_L ─ upper_arm_L ─ upper_arm_twist_L ─ lower_arm_L ─ forearm_twist_L ─ hand_L
            ├── clavicle_R ─ upper_arm_R ─ upper_arm_twist_R ─ lower_arm_R ─ forearm_twist_R ─ hand_R
            └── neck ─ head
    ├── upper_leg_L ─ thigh_twist_L ─ lower_leg_L ─ calf_twist_L ─ foot_L ─ toe_L
    └── upper_leg_R ─ thigh_twist_R ─ lower_leg_R ─ calf_twist_R ─ foot_R ─ toe_R
```

Add non-deforming rigid attachment bones `attach_head` under `head`, `attach_back` and `attach_chest` under `chest`, `attach_waist` under `pelvis`, and `attach_hand_L` / `attach_hand_R` under the corresponding hands. Their rest transforms are part of the contract and must be recorded per component; rigid props attach here rather than to guessed offsets on the character root.

`clavicle`, `upper_arm`, `lower_arm`, `hand`, `neck`, `head`, `pelvis`, `spine_01`, `chest`, `upper_leg`, `lower_leg`, `foot`, and `toe` are required. Twist bones are strongly recommended for premium deformation; if omitted, document the equivalent corrective shape/rig method and validate it. Add `spine_02` and `spine_03` when needed by the torso silhouette. Names, parents, rest transforms, and bone axes form the versioned contract and cannot vary between interchangeable components.

For a smooth stylized biped, author normalized weights with up to four influences per vertex (one to four is valid; hard single-bone weighting at shoulders, elbows, hips, and knees is not acceptable). Paint gradients across shoulder/clavicle, upper-arm twist, elbow/forearm, pelvis/thigh, knee/calf, and neck transitions. Use corrective shape keys or corrective bones where volume loss remains. Blender's preserve-volume option may help on selected meshes but is not a substitute for good topology and weight painting. Inspect the character at extreme but intended gameplay poses: shoulder raise/forward reach, elbow bend, wrist rotation, torso twist, hip flex, knee bend, ankle roll, neck turn. Repeat the same pose checks on every garment. The tiny synthetic fixture and current legacy GLB round-trips do **not** validate these deformations.

Optional finger bones: `thumb_01_L..03_L`, `index_01_L..03_L`, `middle_01_L..03_L`, `ring_01_L..03_L`, `little_01_L..03_L` and matching `_R`. Optional expression shapes: `blink_L`, `blink_R`, `smile`, `brow_up_L`, `brow_up_R`, `mouth_open`. These are optional until validated in the actual target character; do not claim face animation until it exists.

Use a humanoid relaxed A-pose (arms about 35–45 degrees below horizontal), neutral hands, straight knees, planted feet, and forward gaze. A different skeleton is not compatible solely because it is humanoid. Retargeting must map names and axes, establish rest-pose offsets, bake animation, export a new GLB, and compare shoulder, elbow, wrist, neck, hip, knee, ankle, and garment deformation.

## Animation contract

| Semantic state | Export clip name | Priority | Root translation |
|---|---|---:|---|
| idle | `Idle` | Core | In place |
| walk | `Walk` | Core | In place |
| run | `Run` | Core | In place |
| interact | `Interact` | Core | In place |
| wave | `Wave` | Secondary | In place |
| hoe | `Hoe` | Secondary | In place |
| water | `Water` | Secondary | In place |
| harvest | `Harvest` | Secondary | In place |
| carry | `Carry` | Secondary | In place |
| sit | `Sit` | Secondary | In place |

Root is stationary for locomotion because the game movement controller owns world translation. Export clips on the exact V2 rig, preserve the neutral rest pose, use consistent frame rate and clip naming, and record duration, loop flag, root-motion audit, and source/provenance. Missing clips stay `missing`; never synthesize status. A different source rig requires explicit retargeting review. Current runtime only recognizes `Idle` and `Walk`; this spec does not change that runtime.

## Registry records

The registry schema lives at `assets/avatar-v2/asset_registry.schema.json`. Every actual record needs:

- stable `assetId`, human display name, category, version and file path;
- compatible base-body IDs and skeleton version;
- `skinned` or `rigid_attachment` method, rig/attachment bone and attachment transform;
- PBR material/texture variants and texture color spaces;
- hide-body regions, incompatible equipment IDs, occupied slots;
- license, creator/source URL or purchase record, attribution obligations, and import date;
- validation report reference and visual-review state.

The `appearanceChannels` contract is what a future Studio Avatar selector consumes. Skin selection uses a deliberately authored skin-color palette or skin material variants, optionally driven by a skin mask; never tint the eye, mouth, hair, or clothing pixels with a whole-body material color. Hair selection swaps a compatible skinned scalp/hair mesh and can expose authored hair color variants. Tops, bottoms, and footwear swap skinned meshes sharing the exact skeleton contract, plus declared material/dye variants. Headwear and rigid accessories attach to named bones (`attach_head`, `attach_back`, `attach_waist`, `attach_hand_L`, `attach_hand_R`, `attach_chest`) with per-item transforms; hair clearance and conflicting slots are registry data. The selected asset's base-body compatibility, occupied slots, hide-body regions, and incompatible-equipment list filter valid combinations. The Studio assembles one body family and skeleton version, one compatible mesh per slot, its declared material variants, and attachment transforms. Female/male proportions are separate base-body IDs unless an item explicitly lists both.

Each interchangeable skinned GLB must include a compatible skin/joint hierarchy and a bind pose matching the base body; runtime assembly must resolve joints by the contract's stable names and verify inverse bind matrices before binding meshes to the character's shared `Skeleton`. A coincidentally similar humanoid rig is not sufficient. Components that cannot pass the same skeleton and clipping checks must be exported as approved combined outfit variants instead of presented as mix-and-match.

The initial registry intentionally contains no invented asset records. The source and animation manifests mark every V2 character as pending.
