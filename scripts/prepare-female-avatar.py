"""Build the supplied female FBX, texture and editable habit animations.
Run: blender --background --factory-startup --python scripts/prepare-female-avatar.py
Regenerates the working file; export-avatar.py preserves an artist's saved edits.
"""
import runpy
import sys
from pathlib import Path

sys.argv = [sys.argv[0], '--', '--model', 'female']
runpy.run_path(str(Path(__file__).with_name('prepare-avatar.py')), run_name='__main__')
