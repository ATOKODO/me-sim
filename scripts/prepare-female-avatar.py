"""Build an artist-editable female variant from the existing local animated rig.
Run: blender --background --factory-startup --python scripts/prepare-female-avatar.py
This regenerates the female working file; use export-avatar.py to export an artist's saved edits.
"""
import bpy
import hashlib
import json
import math
from pathlib import Path
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art' / 'avatar'
SOURCE = ART / 'male-casual-animated.blend'
OUTPUT = ROOT / 'public' / 'avatar' / 'character' / 'female-casual.glb'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
rig = bpy.data.objects['AvatarRig']
body = bpy.data.objects['MaleCasual']
body.name = 'FemaleCasual'
body.data.name = 'FemaleBody'
local_to_rig = rig.matrix_world.inverted() @ body.matrix_world
rig_to_local = local_to_rig.inverted()
head_index = body.vertex_groups['head'].index
head_points = [local_to_rig @ v.co for v in body.data.vertices
               if any(g.group == head_index and g.weight > 0.65 for g in v.groups)]
lo = Vector(tuple(min(p[i] for p in head_points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in head_points) for i in range(3)))
center = (lo + hi) / 2

# Retain UVs, skin weights and joint placement. Only the body surface changes.
for vertex in body.data.vertices:
    point = local_to_rig @ vertex.co
    weights = {body.vertex_groups[g.group].name: g.weight for g in vertex.groups}
    spine = weights.get('spine', 0)
    chest = weights.get('chest', 0)
    pelvis = weights.get('pelvis', 0)
    head = weights.get('head', 0)
    point.x *= 1 - 0.12 * spine - 0.035 * chest + 0.06 * pelvis
    if head > 0.5:
        jaw = max(0, min(1, (hi.z - point.z) / max(hi.z - lo.z, 0.01)))
        point.x = center.x + (point.x - center.x) * (1 - 0.18 * jaw)
    vertex.co = rig_to_local @ point


def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = 1
    return mat

shirt = material('AvatarShirt', (0.30, 0.44, 0.35))
body.data.materials.append(shirt)
skin = material('FemaleSkin', (0.57, 0.38, 0.25))
body.data.materials.append(skin)
for polygon in body.data.polygons:
    points = [local_to_rig @ body.data.vertices[i].co for i in polygon.vertices]
    z = sum(p.z for p in points) / len(points)
    weight = sum(sum(g.weight for g in body.data.vertices[i].groups
                     if body.vertex_groups[g.group].name in ('spine', 'chest', 'shoulder_left', 'shoulder_right'))
                 for i in polygon.vertices) / len(polygon.vertices)
    if 0.99 <= z <= 1.445 and weight > 0.45:
        polygon.material_index = 1
    head_weight = sum(sum(g.weight for g in body.data.vertices[i].groups
                         if body.vertex_groups[g.group].name in ('head', 'neck'))
                      for i in polygon.vertices) / len(polygon.vertices)
    if head_weight > 0.5:
        polygon.material_index = 2

# A faceted bob, open around the face, is bound to the existing head bone.
vertices, faces = [], []
rx = (hi.x - lo.x) / 2 + 0.018
ry = (hi.y - lo.y) / 2 + 0.018
segments = 12
for radius, z in [(0.25, hi.z + 0.024), (0.82, hi.z - 0.004), (1.02, hi.z - 0.068)]:
    for i in range(segments):
        angle = i * math.tau / segments
        vertices.append((center.x + rx * radius * math.sin(angle),
                         center.y + ry * radius * math.cos(angle), z))
faces.append(tuple(range(segments - 1, -1, -1)))
for ring in range(2):
    for i in range(segments):
        a, b = ring * segments + i, ring * segments + (i + 1) % segments
        faces.append((a, b, b + segments, a + segments))
start = len(vertices)
angles = [math.radians(-135 + i * 30) for i in range(10)]
for radius, z in [(1.02, hi.z - 0.066), (1.12, lo.z - 0.045)]:
    for angle in angles:
        vertices.append((center.x + rx * radius * math.sin(angle),
                         center.y + ry * radius * math.cos(angle) + 0.008, z))
for i in range(len(angles) - 1):
    faces.append((start + i, start + i + 1, start + i + 1 + len(angles), start + i + len(angles)))
mesh = bpy.data.meshes.new('FemaleBobHair')
mesh.from_pydata(vertices, [], faces)
mesh.update()
hair = bpy.data.objects.new('FemaleBobHair', mesh)
bpy.context.collection.objects.link(hair)
hair.data.materials.append(material('FemaleHair', (0.075, 0.035, 0.018)))
hair.parent = rig
hair.matrix_parent_inverse = Matrix.Identity(4)
group = hair.vertex_groups.new(name='head')
group.add(list(range(len(mesh.vertices))), 1, 'REPLACE')
modifier = hair.modifiers.new('AvatarRig', 'ARMATURE')
modifier.object = rig
for polygon in mesh.polygons:
    polygon.use_smooth = False

# Replace the inherited beard with simple geometric facial features.
# Surface rays place the low-poly face on the reshaped head without editing the source atlas.
points = [local_to_rig @ v.co for v in body.data.vertices]
surface = BVHTree.FromPolygons(points, [tuple(p.vertices) for p in body.data.polygons])
face_vertices, face_polygons, face_materials = [], [], []
head_height = hi.z - lo.z

def face_mark(x, z, width, height, material_index):
    start = len(face_vertices)
    for dx, dz in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
        origin = Vector((x + dx * width / 2, lo.y - 0.2, z + dz * height / 2))
        hit, normal, index, distance = surface.ray_cast(origin, Vector((0, 1, 0)))
        if hit is None:
            raise RuntimeError('Facial feature is outside the head surface')
        face_vertices.append(tuple(hit + Vector((0, -0.003, 0))))
    face_polygons.append(tuple(start + i for i in range(4)))
    face_materials.append(material_index)

for side in (-1, 1):
    face_mark(center.x + side * rx * 0.40, lo.z + head_height * 0.56, 0.024, 0.013, 0)
    face_mark(center.x + side * rx * 0.40, lo.z + head_height * 0.63, 0.028, 0.006, 0)
face_mark(center.x, lo.z + head_height * 0.28, 0.032, 0.006, 1)
face_mesh = bpy.data.meshes.new('FemaleFace')
face_mesh.from_pydata(face_vertices, [], face_polygons)
face_mesh.update()
face = bpy.data.objects.new('FemaleFace', face_mesh)
bpy.context.collection.objects.link(face)
face.data.materials.append(material('FemaleEyes', (0.04, 0.025, 0.018)))
face.data.materials.append(material('FemaleLips', (0.34, 0.10, 0.075)))
for polygon, material_index in zip(face_mesh.polygons, face_materials):
    polygon.material_index = material_index
face.parent = rig
face.matrix_parent_inverse = Matrix.Identity(4)
face.vertex_groups.new(name='head').add(list(range(len(face_vertices))), 1, 'REPLACE')
face.modifiers.new('AvatarRig', 'ARMATURE').object = rig

rig.animation_data.action = bpy.data.actions['Idle']
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ART / 'female-casual-animated.blend'), compress=True)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT), export_format='GLB', export_animations=True,
    export_animation_mode='ACTIONS', export_force_sampling=True,
    export_anim_single_armature=True, export_frame_range=False,
    export_optimize_animation_size=True, export_yup=True,
    export_cameras=False, export_lights=False,
)
report = {
    'source': SOURCE.name,
    'variant': 'female',
    'bodyVertices': len(body.data.vertices),
    'hairVertices': len(hair.data.vertices),
    'bodyTriangles': sum(len(p.vertices) - 2 for p in body.data.polygons),
    'hairTriangles': sum(len(p.vertices) - 2 for p in hair.data.polygons),
    'faceTriangles': sum(len(p.vertices) - 2 for p in face.data.polygons),
    'bones': len(rig.data.bones),
    'clips': sorted(a.name for a in bpy.data.actions),
    'sourceTextureSha256': hashlib.sha256((ART / 'character-texture.png').read_bytes()).hexdigest(),
}
(ART / 'female-character-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print('FEMALE_AVATAR_EXPORTED=' + json.dumps(report), flush=True)
