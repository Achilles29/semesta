# CMU locomotion sources

The data used in this project was obtained from mocap.cs.cmu.edu.

Source: [CMU Graphics Lab Motion Capture Database](https://mocap.cs.cmu.edu/).
Retrieved 2026-11-20. The four original files are pinned by URL, byte count and
SHA-256 in [manifest.json](manifest.json). `terms-source.html` records the
official home page and usage terms at retrieval time.

| Avatar clip | Capture | Source frames (inclusive, 1-based) | Capture rate | Exported cycle |
| --- | --- | --- | --- | --- |
| Walk | [07_01](http://mocap.cs.cmu.edu/search.php?subjectnumber=07), walk | 50–180 | 120 Hz | 26/24 seconds |
| Run | [16_35](http://mocap.cs.cmu.edu/search.php?subjectnumber=16), run/jog | 43–139 | 120 Hz | 20/24 seconds |

## Usage terms

These captures are **not CC0**. CMU permits use in research and inclusion in
commercial products. Its terms prohibit reselling the motion data itself,
including converted versions. Keep the attribution above with the project;
do not market the included captures or retargeted clips as a standalone motion
data pack. Consult the linked official terms for the complete wording.
This is separate from the CC0 MakeHuman mesh/texture sources documented for V14.

## Processing

`tools/avatar_cmu_motion.py` reads the ASF hierarchy and AMC joint angles,
performs forward kinematics, converts coordinates and selects one cycle.
Small capture drift and endpoint differences are corrected continuously.
`tools/avatar_v15_animation.py` transfers the measured limb directions, torso
rotation and timing to each profile's own rig. It adapts boot contact, swing
clearance and palm orientation; relaxed finger poses are authored locally.
Horizontal root travel is removed for in-place playback. Runtime movement
must use each clip's `recommendedForwardSpeed` and playback rate.

This is a two-capture retargeter, not a general-purpose mocap importer. Residual
contact sliding is reported by the runtime audit; uneven-ground IK, starts,
stops, turns and footstep audio are not part of these loop clips.
