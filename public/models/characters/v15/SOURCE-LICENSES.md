# V15 character source notices

Walk and Run use motion data from the CMU Graphics Lab Motion Capture Database.
The data used in this project was obtained from mocap.cs.cmu.edu.

Official source and terms: https://mocap.cs.cmu.edu/
Captures: subject 07, trial 01 (walk); subject 16, trial 35 (run/jog).
The motion data has been retargeted to each character's skeleton.

CMU allows research use and inclusion in commercially sold products. Its terms
prohibit resale of the motion data itself, including converted data. These
motion captures are not CC0. Keep this notice with distributed character files.

The underlying MakeHuman anatomy and source graphics use CC0:
https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.ASSETS.md

Detailed file provenance, source hashes and processing instructions are in the
project's `ilustrasi/avatar-v2/farmer-v14-jrpg/SOURCE-LICENSES.md` and
`ilustrasi/avatar-v2/farmer-v15-proportions/source/cmu/README.md`.

## V15 tambahan identitas dan wardrobe

Revision: `v15-wardrobe-1`. Sumber yang dapat diedit ada di
`ilustrasi/avatar-v2/farmer-v15-proportions/<profile>/avatar.blend`.

- Sepuluh morph identitas, rambut cepak/sanggul, fitted tunik/rompi panjang,
  celana longgar dan bot tebal: turunan geometri CC0 MakeHuman yang sudah
  tercantum di sumber V14/V15. Dibuat oleh `tools/extend_avatar_v15.py`.
- Iris biru/hijau: turunan tekstur brown_eye CC0 yang sama; pupil dan sclera
  dipertahankan. Tidak menambahkan sumber gambar eksternal.
- Topi kain, kacamata bulat, anting, gelang dan tas: geometri asli generator
  lokal, dirilis CC0 bersama aset ini.
- PNG preset adalah render model hasil generator, bukan gambar konsep.
- Animasi CMU tetap tunduk pada ketentuan CMU di atas; lisensinya bukan CC0.
- Distribusi runtime `.gltf`/`.bin`/tekstur berbasis hash memakai sumber dan
  ketentuan yang sama dengan GLB; pengemasan tidak mengubah lisensi.

## Wardrobe revision 2

`tools/avatar_v15_wardrobe.py` creates the original pockets, seams, collars,
fitted sleeves, jacket hem, headwear, hair additions, jewellery and watch.
These new components and the procedural woven roughness texture are CC0.
The expanded trouser, shirt, hair and shoe meshes remain derivatives of the
MakeHuman assets attributed above. Approved CMU motion data is unchanged.
