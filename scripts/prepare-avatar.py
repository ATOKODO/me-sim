"""Build the supplied FBX avatar, texture and editable habit animation clips.
Run with Blender 4.2+: blender --background --factory-startup --python scripts/prepare-avatar.py
"""
import bpy
import argparse
import sys
import hashlib
import json
import math
from pathlib import Path
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art' / 'avatar'
OUTPUT = ROOT / 'public' / 'avatar' / 'character'
OUTPUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--model', choices=('male', 'female'), default='male')
arguments = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
variant = parser.parse_args(arguments).model
female = variant == 'female'
source_file = 'female_secretary.fbx' if female else 'male_casual.fbx'
texture_file = 'secretary_tex.png' if female else 'character-texture.png'
character_name = 'FemaleSecretary' if female else 'MaleCasual'
source_stem = variant + '-casual'
bone_map = {
    'hips': 'pelvis',
    'shoulder.L': 'shoulder_left', 'shoulder.R': 'shoulder_right',
    'upper_arm.L': 'upper_arm_left', 'upper_arm.R': 'upper_arm_right',
    'forearm.L': 'forearm_left', 'forearm.R': 'forearm_right',
    'hand.L': 'hand_left', 'hand.R': 'hand_right',
    'thigh.L': 'thigh_left', 'thigh.R': 'thigh_right',
    'foot.L': 'foot_left', 'foot.R': 'foot_right',
} if female else {}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(ART / source_file))
bpy.context.view_layer.update()
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
character = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
source_actions = [action.name for action in bpy.data.actions]
source_bones = len(rig.data.bones)
if source_actions:
    raise RuntimeError('The source now contains animation clips; review them before replacing them.')

# Bone aliases let both source rigs use the same activity authoring code.
# The female skeleton retains its original joint positions and skin weights.
for original, canonical in bone_map.items():
    if original not in rig.data.bones:
        raise RuntimeError('Missing source bone: ' + original)
    if original in character.vertex_groups:
        character.vertex_groups[original].name = canonical
    rig.data.bones[original].name = canonical

image = bpy.data.images.load(str(ART / texture_file), check_existing=True)
image.pack()
material = bpy.data.materials.new('SecretaryAtlas' if female else 'CharacterAtlas')
material.use_nodes = True
material.node_tree.nodes.clear()
tex = material.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = image
tex.interpolation = 'Closest'
bsdf = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Roughness'].default_value = 1.0
bsdf.inputs['Metallic'].default_value = 0.0
out = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
material.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
material.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
character.data.materials.clear()
character.data.materials.append(material)
character.name = character_name

bounds = [character.matrix_world @ Vector(c) for c in character.bound_box]
minimum = min(v.z for v in bounds)
height = max(v.z for v in bounds) - minimum
scale = 2.2 / height

# Every accessory uses its own bone, so a single rig action controls its visibility.
props = {}
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
character.select_set(False)
bpy.ops.object.mode_set(mode='EDIT')

def add_prop(name, position, parent=None):
    bone = rig.data.edit_bones.new('prop_' + name)
    bone.head = position
    bone.tail = Vector(position) + Vector((0, 0, 0.1))
    if parent:
        bone.parent = rig.data.edit_bones[parent]
    props[name] = {'bone': bone.name, 'position': Vector(position)}

left_grip = rig.data.bones['hand_left'].head_local.lerp(rig.data.bones['hand_left'].tail_local, 0.55) if female else Vector((0.312, 0.014, 0.855))
right_grip = rig.data.bones['hand_right'].head_local.lerp(rig.data.bones['hand_right'].tail_local, 0.55) if female else Vector((-0.312, 0.014, 0.855))
sit_drop = 0.30 if female else 0.32
seat_height = rig.data.bones['pelvis'].head_local.z - sit_drop if female else 0.55
head_height = rig.data.bones['head'].head_local.z
face_height = head_height + 0.068

for name in ('phone', 'controller', 'cup', 'cigarette', 'spoon'):
    add_prop(name, right_grip, 'hand_right')
for name in ('book', 'plate', 'vape'):
    add_prop(name, left_grip, 'hand_left')
add_prop('laptop', (0, -0.46, 0.78))
add_prop('chair', (0, 0.03, seat_height))
add_prop('pillow', (0, 0.13, 0.7))
add_prop('speech', (0.26, -0.05, head_height + 0.12 if female else 1.66), 'head')
for index in range(3):
    add_prop('puff' + str(index), (0, -0.15, (face_height if female else 1.61) + index * 0.025), 'head')
bpy.ops.object.mode_set(mode='OBJECT')

materials = {}
def solid(name, color, emission=0):
    if name not in materials:
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*color, 1)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value = (*color, 1)
        shader.inputs['Roughness'].default_value = 1
        if emission:
            shader.inputs['Emission Color'].default_value = (*color, 1)
            shader.inputs['Emission Strength'].default_value = emission
        materials[name] = mat
    return materials[name]

def bind(obj, prop, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    obj.parent = rig
    obj.matrix_parent_inverse = Matrix.Identity(4)
    group = obj.vertex_groups.new(name=props[prop]['bone'])
    group.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    modifier = obj.modifiers.new('AvatarRig', 'ARMATURE')
    modifier.object = rig
    return obj

def box(prop, name, size, offset=(0, 0, 0), color=(0.5, 0.5, 0.5), emission=0):
    center = props[prop]['position'] + Vector(offset)
    sx, sy, sz = [value / 2 for value in size]
    vertices = [center + Vector((x * sx, y * sy, z * sz)) for x, y, z in
                [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    faces = [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return bind(obj, prop, solid(name + 'Material', color, emission))

def sphere(prop, name, radius, offset, color):
    center = props[prop]['position'] + Vector(offset)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=center)
    obj = bpy.context.object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return bind(obj, prop, solid(name + 'Material', color))

box('phone', 'Phone', (0.085, 0.025, 0.16), color=(0.08,0.11,0.16))
box('phone', 'PhoneDisplay', (0.071,0.008,0.13), (0,-0.018,0), (0.24,0.42,0.75), 0.35)
box('controller', 'Controller', (0.22,0.10,0.075), color=(0.25,0.17,0.38))
for x in (-0.065, 0.065):
    sphere('controller', 'ControllerButton' + str(x), 0.02, (x,-0.052,0.028), (0.8,0.68,0.86))
box('book', 'BookCover', (0.28,0.19,0.027), color=(0.33,0.17,0.10))
box('book', 'BookPages', (0.26,0.175,0.026), (0,0,0.02), (0.88,0.83,0.67))
box('cup', 'Cup', (0.075,0.075,0.13), color=(0.67,0.25,0.14))
box('cup', 'Drink', (0.063,0.063,0.009), (0,0,0.067), (0.87,0.56,0.16))
box('cigarette', 'Cigarette', (0.02,0.11,0.02), color=(0.85,0.81,0.67))
box('cigarette', 'Ember', (0.02,0.018,0.02), (0,-0.055,0), (0.85,0.23,0.06), 0.3)
box('vape', 'Vape', (0.05,0.055,0.17), color=(0.19,0.41,0.53))
box('vape', 'VapeMouthpiece', (0.035,0.045,0.04), (0,0,0.1), (0.1,0.15,0.18))
box('plate', 'Plate', (0.29,0.23,0.022), color=(0.82,0.81,0.68))
sphere('plate', 'Food', 0.07, (0,0,0.05), (0.67,0.47,0.12))
box('spoon', 'Spoon', (0.025,0.17,0.018), color=(0.65,0.7,0.7))
box('laptop', 'LaptopBase', (0.41,0.28,0.025), color=(0.12,0.18,0.21))
box('laptop', 'LaptopDisplay', (0.38,0.023,0.23), (0,0.125,0.115), (0.23,0.4,0.46))
box('chair', 'ChairSeat', (0.56,0.45,0.055), color=(0.35,0.25,0.15))
box('chair', 'ChairBack', (0.56,0.055,0.42), (0,0.22,0.20), (0.39,0.29,0.19))
for x in (-0.22,0.22):
    for y in (-0.18,0.18):
        box('chair', 'ChairLeg', (0.045,0.045,seat_height), (x,y,-seat_height/2), (0.24,0.18,0.12))
box('pillow', 'RestPillow', (0.40,0.17,0.13), color=(0.37,0.43,0.66))
for index in range(3):
    sphere('speech', 'SpeechDot' + str(index), 0.035, (index*0.065,0,0), (0.89,0.69,0.26))
    sphere('puff' + str(index), 'Vapor' + str(index), 0.035 + index*0.005, (0,0,0), (0.70,0.77,0.76))

rig.scale = (scale, scale, scale)
rig.location.z = -minimum * scale
rig.name = 'AvatarRig'
FPS = 24
bpy.context.scene.render.fps = FPS
MODES = {
    'idle': ('Idle', 2.4), 'walk': ('Walk', 2.0), 'exercise': ('Exercise', 2.0),
    'work': ('Work', 2.0), 'social': ('Social', 2.0), 'screen': ('Screen', 2.0),
    'screen_evening': ('ScreenEvening', 2.8), 'gaming': ('Gaming', 2.0),
    'reading': ('Read', 2.4), 'meal': ('Meal', 2.0), 'alcohol': ('Alcohol', 2.4),
    'tobacco': ('Tobacco', 2.2), 'vaping': ('Vaping', 2.8),
    'sedentary': ('Sedentary', 3.0), 'rest': ('Rest', 3.0),
}
rest_rotations = {b.name: b.matrix_local.to_quaternion() for b in rig.data.bones}
for bone in rig.pose.bones:
    bone.rotation_mode = 'QUATERNION'

def rotate(name, x=0, y=0, z=0):
    world = Quaternion((1,0,0), x) @ Quaternion((0,1,0), y) @ Quaternion((0,0,1), z)
    rest = rest_rotations[name]
    rig.pose.bones[name].rotation_quaternion = rest.inverted() @ world @ rest

def translate(name, xyz):
    rig.pose.bones[name].location = rest_rotations[name].inverted() @ Vector(xyz)

def visible(*names):
    for name in names:
        rig.pose.bones[props[name]['bone']].scale = (1,1,1)

def sit():
    translate('pelvis', (0,0,-sit_drop))
    for side, shin in [('left','shin.L'), ('right','shin.R')]:
        rotate('thigh_' + side, x=-1.45)
        rotate(shin, x=1.45)
    visible('chair')

def hands_forward(upper=-0.35, elbow=-1.05):
    for side in ('left','right'):
        rotate('upper_arm_' + side, x=upper)
        rotate('forearm_' + side, x=elbow)

def aim_bone(name, target):
    """Bake a swing into the pose, retaining the source bone's roll."""
    bone = rig.pose.bones[name]
    head = bone.head.copy()
    swing = (bone.tail - head).rotation_difference(Vector(target) - head)
    bone.matrix = Matrix.LocRotScale(
        head, swing @ bone.matrix.to_quaternion(), bone.matrix.to_scale(),
    )
    bpy.context.view_layer.update()


def reach(side, target):
    """Analytic two-bone reach: no runtime IK or extra dependencies."""
    upper = rig.pose.bones['upper_arm_' + side]
    lower = rig.pose.bones['forearm_' + side]
    hand = rig.pose.bones['hand_' + side]
    start = upper.head.copy()
    length1 = (lower.head - start).length
    length2 = (hand.head - lower.head).length
    direction = Vector(target) - start
    distance = min(max(direction.length, abs(length1-length2)+0.001), length1+length2-0.001)
    axis = direction.normalized()
    outward = Vector((1 if side == 'left' else -1, 0, -0.65))
    pole = (outward - axis * outward.dot(axis)).normalized()
    adjacent = (length1**2 + distance**2 - length2**2) / (2*distance)
    height = math.sqrt(max(0, length1**2-adjacent**2))
    elbow = start + axis*adjacent + pole*height
    wrist = start + axis*distance
    aim_bone(upper.name, elbow)
    aim_bone(lower.name, wrist)
    # Keep held objects upright instead of inheriting the elbow's twist.
    hand.matrix = Matrix.LocRotScale(hand.head.copy(), rest_rotations[hand.name], Vector((1,1,1)))
    bpy.context.view_layer.update()


def pose(mode, u):
    wave = math.sin(u * math.tau)
    cycle = 0.5 - 0.5 * math.cos(u * math.tau)
    for bone in rig.pose.bones:
        bone.location = (0,0,0)
        bone.rotation_quaternion = (1,0,0,0)
        bone.scale = (0,0,0) if bone.name.startswith('prop_') else (1,1,1)
    # Relax the supplied female A-pose into a natural standing pose.
    # Kept on the original rig, so artists can edit every baked action.
    if female:
        rotate('upper_arm_left', y=0.45)
        rotate('upper_arm_right', y=-0.45)
    rotate('chest', x=wave*0.012)
    if mode == 'idle':
        translate('pelvis', (0,0,wave*0.004))
        rotate('head', z=wave*0.018)
    elif mode == 'walk':
        gait = math.sin(u * math.tau * 2)
        translate('pelvis', (0,0,abs(gait)*0.017))
        for side, sign, shin in [('left',1,'shin.L'), ('right',-1,'shin.R')]:
            rotate('thigh_'+side, x=gait*0.43*sign)
            rotate(shin, x=max(0,gait*sign)*0.50)
            rotate('upper_arm_'+side, x=-gait*0.34*sign)
    elif mode == 'exercise':
        translate('pelvis', (0,0,cycle*0.07))
        for side, sign in [('left',-1), ('right',1)]:
            rotate('upper_arm_'+side, y=sign*(0.15+cycle*1.9))
            rotate('thigh_'+side, y=sign*cycle*0.3)
    elif mode == 'work':
        sit(); hands_forward(-0.40,-0.95); visible('laptop')
        rotate('head', x=0.16)
        for side, sign in [('left',1),('right',-1)]:
            rotate('hand_'+side, x=math.sin(u*math.tau*4)*0.09*sign)
    elif mode == 'social':
        rotate('upper_arm_right', y=1.50)
        rotate('forearm_right', x=-0.75)
        rotate('hand_right', z=wave*0.35)
        rotate('head', z=wave*0.10)
        visible('speech')
    elif mode == 'screen':
        hands_forward(-0.35,-1.10); visible('phone')
        rotate('head', x=0.19)
        rotate('hand_left', x=wave*0.1)
    elif mode == 'screen_evening':
        sit(); hands_forward(-0.28,-1.15); visible('phone')
        rotate('spine', x=0.18)
        rotate('head', x=0.26 + wave*0.02)
        rotate('chest', z=-0.06)
    elif mode == 'gaming':
        sit(); hands_forward(-0.32,-1.0); visible('controller')
        rotate('spine', x=wave*0.04)
        for side, sign in [('left',1),('right',-1)]:
            rotate('hand_'+side, x=math.sin(u*math.tau*3)*0.12*sign)
    elif mode == 'reading':
        sit(); hands_forward(-0.45,-0.95); visible('book')
        rotate('head', x=0.23)
        rotate('hand_right', z=cycle*0.20)
    elif mode == 'meal':
        sit(); visible('plate','spoon')
        rotate('upper_arm_left', x=-0.45)
        rotate('forearm_left', x=-0.85)
        rotate('upper_arm_right', x=-0.50-cycle*0.32)
        rotate('forearm_right', x=-0.75-cycle*0.95)
        rotate('head', x=0.12)
    elif mode == 'alcohol':
        visible('cup')
        rotate('upper_arm_right', x=-0.30-cycle*0.60)
        rotate('forearm_right', x=-0.65-cycle*1.2)
        rotate('head', x=-cycle*0.09)
    elif mode == 'tobacco':
        visible('cigarette')
        rotate('upper_arm_right', x=-0.75-cycle*0.25, y=0.12)
        rotate('forearm_right', x=-1.55-cycle*0.2)
        rotate('head', z=0.06)
    elif mode == 'vaping':
        visible('vape')
        rotate('upper_arm_left', x=-0.90, y=-0.16)
        rotate('forearm_left', x=-1.48-cycle*0.25)
        rotate('chest', x=cycle*0.06)
    elif mode == 'sedentary':
        sit()
        rotate('head', z=wave*0.06)
        rotate('spine', x=0.10)
    elif mode == 'rest':
        sit(); visible('pillow')
        rotate('spine', x=-0.16)
        rotate('head', x=0.16, z=0.09)
        rotate('chest', x=wave*0.015)
    bpy.context.view_layer.update()
    if mode == 'work':
        for side, sign in [('left',1),('right',-1)]:
            reach(side, (sign*0.13,-0.37,0.84+math.sin(u*math.tau*4)*0.007*sign))
    elif mode == 'screen':
        reach('right', (0.015,-0.31,1.19))
        reach('left', (0.11,-0.32,1.17+wave*0.008))
    elif mode == 'screen_evening':
        reach('right', (0.015,-0.33,0.87))
        reach('left', (0.11,-0.34,0.85+wave*0.006))
    elif mode == 'gaming':
        reach('right', (-0.04,-0.32,0.88+math.sin(u*math.tau*3)*0.006))
        reach('left', (0.10,-0.32,0.88-math.sin(u*math.tau*3)*0.006))
    elif mode == 'reading':
        reach('left', (0.035,-0.34,0.88))
        reach('right', (-0.095+cycle*0.05,-0.34,0.91))
    elif mode == 'meal':
        reach('left', (0.035,-0.37,0.91))
        reach('right', (-0.10+cycle*0.085,-0.37+cycle*0.26,0.96+cycle*(0.22 if female else 0.33)))
    elif mode == 'alcohol':
        reach('right', (-0.18+cycle*0.155,-0.20+cycle*0.06,1.07+cycle*((face_height-0.11-1.07) if female else 0.43)))
    elif mode == 'tobacco':
        reach('right', (-0.12+cycle*0.095,-0.28+cycle*0.20,1.26+cycle*((face_height-1.26) if female else 0.35)))
    elif mode == 'vaping':
        reach('left', (0.16-cycle*0.145,-0.22+cycle*0.08,1.15+cycle*((face_height-0.11-1.15) if female else 0.35)))
    if mode in ('tobacco','vaping'):
        for index in range(3):
            name = 'puff'+str(index)
            phase = (u*(2 if mode=='tobacco' else 1) + index/3) % 1
            size = math.sin(phase*math.pi) * (0.9 if mode=='tobacco' else 1.65)
            pb = rig.pose.bones[props[name]['bone']]
            pb.scale = (size,size,size)
            translate(pb.name, (phase*0.045,-phase*0.06,phase*0.15))

rig.animation_data_create()
for mode, (name, seconds) in MODES.items():
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    count = round(seconds * FPS)
    for frame in range(count + 1):
        bpy.context.scene.frame_set(frame + 1)
        pose(mode, frame / count)
        for bone in rig.pose.bones:
            bone.keyframe_insert('rotation_quaternion', frame=frame+1, group=bone.name)
            bone.keyframe_insert('location', frame=frame+1, group=bone.name)
            bone.keyframe_insert('scale', frame=frame+1, group=bone.name)
    for curve in action.fcurves:
        for key in curve.keyframe_points:
            key.interpolation = 'LINEAR'
rig.animation_data.action = bpy.data.actions['Idle']
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ART / (source_stem + '-animated.blend')), compress=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT / (source_stem + '.glb')), export_format='GLB',
    export_animations=True, export_animation_mode='ACTIONS',
    export_force_sampling=True, export_anim_single_armature=True,
    export_frame_range=False, export_optimize_animation_size=True,
    export_yup=True, export_cameras=False, export_lights=False,
)
manifest_path = ROOT / 'public' / 'avatar' / 'animations.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
overrides = manifest.setdefault('variants', {}).setdefault('female', {}).setdefault('overrides', {}) if female else manifest['overrides']
model_file = 'character/' + source_stem + '.glb'
for mode, (clip, _) in MODES.items():
    existing = overrides.get(mode)
    if not existing or existing.get('file') == model_file:
        overrides[mode] = {'file':model_file,'clip':clip}
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
report = {
    'source':source_file, 'texture':texture_file, 'variant':variant,
    'sourceSha256':hashlib.sha256((ART/source_file).read_bytes()).hexdigest(),
    'boneAliases':bone_map,
    'sourceAnimationClips':source_actions,
    'sourceBones':source_bones, 'generatedPropBones':len(props),
    'characterVertices':len(character.data.vertices),
    'characterTriangles':sum(len(p.vertices)-2 for p in character.data.polygons),
    'textureSha256':hashlib.sha256((ART/texture_file).read_bytes()).hexdigest(),
    'generatedAnimationClips':[name for name,_ in MODES.values()],
    'heightUnits':2.2,
}
(ART/('female-character-report.json' if female else 'character-report.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('AVATAR_PREPARED='+json.dumps(report))
