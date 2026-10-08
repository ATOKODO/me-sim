"""Export the saved artist-editable Blender avatar, keeping all named actions.
Run: blender --background --factory-startup --python scripts/export-avatar.py [-- --model female]
"""
from pathlib import Path
import argparse
import sys
import bpy

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--model', choices=('male', 'female'), default='male')
arguments = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
model = parser.parse_args(arguments).model
SOURCE = ROOT / 'art' / 'avatar' / (model + '-casual-animated.blend')
OUTPUT = ROOT / 'public' / 'avatar' / 'character' / (model + '-casual.glb')
if not SOURCE.is_file():
    raise FileNotFoundError(SOURCE)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT), export_format='GLB',
    export_animations=True, export_animation_mode='ACTIONS',
    export_force_sampling=True, export_anim_single_armature=True,
    export_frame_range=False, export_optimize_animation_size=True,
    export_yup=True, export_cameras=False, export_lights=False,
)
print('AVATAR_EXPORTED=' + str(OUTPUT))
