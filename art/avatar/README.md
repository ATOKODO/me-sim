# Avatar sources

Original characters and textures are by **Vinrax**: [PSX Female Secretary Character](https://vinrax.itch.io/psx-secretary-character) and [PSX Casual Male Character](https://vinrax.itch.io/psx-casual-male-character). Both pages permit use in projects with attribution. Me-Sim adds animations, accessories and Blender/GLB conversions. The original models and textures are not relicensed under AGPL; see the [credits and limits of the published permission](../../CREDITS.md).

- `male_casual.fbx`: original model with a 25-bone skeleton and no animation clips.
- `character-texture.png`: supplied texture, preserved unchanged.
- `male-casual-animated.blend`: editable version with an embedded texture and fifteen actions. Accessories are attached to `prop_*` bones.
- `female_secretary.fbx`: supplied female model with a 28-bone skeleton and no animation clips.
- `secretary_tex.png`: supplied female texture, preserved unchanged and embedded in the GLB.
- `female-casual-animated.blend`: female model on its own rig, with an embedded texture, fifteen added accessory bones and fifteen editable actions.
- `female-character-report.json`: inventory of this variant (488 vertices, 932 triangles, 43 bones including accessories, fifteen clips).
- `character-report.json`: inventory from initial preparation.

To export work saved in a `.blend`, use `scripts/export-avatar.py` with Blender. Add `-- --model female` to export the female model; without it, the male model is exported. `scripts/prepare-avatar.py` rebuilds the initial animations and replaces the working file, so use it only for an intentional rebuild.

`scripts/prepare-female-avatar.py` rebuilds the female variant from `female_secretary.fbx` and `secretary_tex.png` through the shared `prepare-avatar.py -- --model female` generator. It replaces the female files, so do not run it over manual work you need to keep.

The application loads `public/avatar/character/female-casual.glb` for a profile whose `sex` is `female`, and `public/avatar/character/male-casual.glb` otherwise. Clip mappings are in `public/avatar/animations.json`. An artist can replace one movement or the entire character without changing application code.

See the [creation and integration guide](../../docs/en/artist-animation-guide.md).
