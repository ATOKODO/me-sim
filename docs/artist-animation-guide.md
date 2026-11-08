# Replace the character and its 3D animations {#remplacer-le-personnage-et-ses-animations-3d}

Two local characters are included: the male model from `male_casual.fbx`, and the supplied female character in `female_secretary.fbx` with `secretary_tex.png`. A profile selects the female variant when `sex` is `female`; male or unspecified keeps the default model. This choice changes no measurement.

The original FBX files have 25 male bones and 28 female bones, without animation clips. Fifteen actions are created on each rig for idle and fourteen habits. Each GLB includes its character, texture and props. The fifteen modes of a variant share one file and mixer. Switching profiles preserves the camera and reuses loaded models.

## Editable sources {#sources-modifiables}

- `art/avatar/male_casual.fbx`: original FBX, retained unchanged.
- `art/avatar/character-texture.png`: original texture atlas, retained unchanged and packed into Blender.
- `art/avatar/male-casual-animated.blend`: textured character, rig, props and fifteen editable actions in Blender 4.2 LTS.
- `art/avatar/female_secretary.fbx` and `art/avatar/secretary_tex.png`: supplied female model/atlas, retained identically.
- `art/avatar/female-casual-animated.blend`: female character on its own rig, packed texture and fifteen editable actions; original geometry, UVs and weights preserved.
- `art/avatar/female-character-report.json`: inventory of this variant.
- `public/avatar/character/female-casual.glb`: self-contained female export.
- `art/avatar/character-report.json`: inventory of sources and generated actions.
- `public/avatar/character/male-casual.glb`: self-contained export used by the app.
- `public/avatar/animations.json`: mapping of each habit to a GLB file and exact clip name.

Each `AvatarRig` retains its source character's joints. Some female bones and vertex groups are renamed (`hips` → `pelvis`, `.L` / `.R` → `_left` / `_right`) to share activity generation code; their positions and weights remain those of the FBX. Fifteen `prop_*` bones control props: their scale is animated between 0 and 1 to show only the current activity's props. `CharacterAtlas` and `SecretaryAtlas` use their respective texture UVs and colors, with pixel filtering.

## Edit an animation in Blender {#modifier-une-animation-dans-blender}

1. Open `male-casual-animated.blend` or `female-casual-animated.blend`, select `AvatarRig`, then enter **Pose Mode**.
2. In **Dope Sheet → Action Editor**, select an action from the table below. Each action has a fake user so it stays in the file.
3. Edit character or prop poses and bone keys. Keep an in-place loop with a recognizable first pose. The app timeline gives each event two seconds and restarts its clip for every row, including consecutive events of the same habit.
4. Save the `.blend`, then export every action with the supplied script from the project root:

   ```powershell
   & 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/export-avatar.py
   # Export the female model after saving edits:
   & 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/export-avatar.py -- --model female
   npm run check:avatar
   ```

The export script reads the saved `.blend` without altering sources. `scripts/prepare-avatar.py` is only for **rebuilding initial animations from the FBX**: it replaces the `.blend` and GLB, so do not run it after manual work you want to retain. `scripts/prepare-female-avatar.py` rebuilds the female character from `female_secretary.fbx` and `secretary_tex.png` through the common generator with `--model female`; it replaces the female working file and GLB. Use only **export-avatar.py** to deliver artist edits.

| Habit            | Blender action / GLB clip |
| ---------------- | ------------------------- |
| `idle`           | `Idle`                    |
| `walk`           | `Walk`                    |
| `exercise`       | `Exercise`                |
| `work`           | `Work`                    |
| `social`         | `Social`                  |
| `screen`         | `Screen`                  |
| `screen_evening` | `ScreenEvening`           |
| `gaming`         | `Gaming`                  |
| `reading`        | `Read`                    |
| `meal`           | `Meal`                    |
| `alcohol`        | `Alcohol`                 |
| `tobacco`        | `Tobacco`                 |
| `vaping`         | `Vaping`                  |
| `sedentary`      | `Sedentary`               |
| `rest`           | `Rest`                    |

## Replace one or more habits {#remplacer-une-ou-plusieurs-habitudes}

Artists can use a different character and rig without editing Angular or Rust. Each GLB contains the complete character, useful props and at least one clip. Habits can share a GLB or use separate files.

```json
{
  "version": 1,
  "overrides": {
    "idle": { "file": "character/male-casual.glb", "clip": "Idle" },
    "walk": { "file": "clips/walk.glb", "clip": "Walk" },
    "reading": { "file": "character/male-casual.glb", "clip": "Read" }
  },
  "variants": {
    "female": {
      "overrides": {
        "idle": { "file": "character/female-casual.glb", "clip": "Idle" },
        "walk": { "file": "character/female-casual.glb", "clip": "Walk" },
        "reading": { "file": "character/female-casual.glb", "clip": "Read" }
      }
    }
  }
}
```

Manifest version remains **1**: `overrides` describes the default model, while optional `variants.female.overrides` describes the female model. Old manifests remain readable. A missing habit for a variant uses that variant's procedural 3D character; it does not automatically use another variant's GLB.

While the manifest and GLB load, the room stays visible and the caption says **Loading character…**; the procedural person is hidden until loading finishes. Missing/invalid files or absent named clips then use that habit's procedural animation. A shared file remains usable for other clips if one clip name is incorrect.

## GLB contract {#contrat-d-un-glb}

- Use binary glTF 2.0 (`.glb`) with embedded textures and geometry. Manifest paths are relative to `public/avatar/`; remote URLs and paths escaping this folder are rejected.
- Put the origin on the floor between the feet. Vertical axis **+Y**, forward **+Z**, approximate height **2.2 units**. Blender's glTF export automatically converts its Z-up axes to GLB axes.
- Export animations and retain their exact names in `clip`. For manual export in Blender 4.2, choose **glTF Binary**, **Animation Mode: Actions**, all actions of one armature and animation sampling; disable the scene-range limit.
- Optional `AvatarShirt` material takes the profile's chosen color. Other materials keep theirs. Supplied models use `CharacterAtlas` or `SecretaryAtlas` to preserve their textures: profile color does not recolor their clothes. Artists can add an `AvatarShirt` material for a recolorable area.
- Prefer light geometry, few materials and small textures. Rendering applies pixel filtering.

## Check in the application {#verifier-dans-l-application}

1. Run `npm run check:avatar` to check files, clip names and local assets.
2. Start `npm start` or `npm run desktop`. Create/edit a **Female** profile to check that variant, then a male/unspecified profile for the default. Select each habit with dashboard **Preview**. The caption reads **GLB ANIMATION** for artist models.
3. Click events or **Replay the day** to check timeline animation triggers.
4. For automated tests, run `npm run build`, then `npm test`. Both characters' tests check fifteen clips and timeline playback, one GLB load per variant, profile switching without camera reset and late loads. Deliberately delayed loads also check that no procedural avatar appears while waiting, after navigation and refresh, followed by fallback on real failure. Captures are saved in `test-results/`.
5. Rebuild with `npm run package` or `npm run package:offline` to include new assets in the installer.

Animations illustrate self-reported activities. If WebGL is unavailable, a message offers a 3D retry; no replacement avatar is generated. The loader releases geometry, textures and skeletons when the scene closes.
