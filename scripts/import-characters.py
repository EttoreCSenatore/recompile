#!/usr/bin/env python3
"""Imports Quaternius' Universal Base Characters + Universal Animation Library (Standard, CC0) for the guards.

Usage: python3 scripts/import-characters.py "<Universal Base Characters zip>" "<Universal Animation Library zip>"
Output: game/public/models/characters/
  Superhero_Male_FullBody.gltf / Superhero_Female_FullBody.gltf  (rigged bodies, WebP textures)
  animations.glb                                                  (only the clips the game uses, no mesh)
Both packs share one 65-bone skeleton, so the clips play on the bodies by bone name.
Zips: https://quaternius.itch.io/universal-base-characters and https://quaternius.itch.io/universal-animation-library
"""
import json, os, shutil, struct, sys, tempfile, zipfile
from PIL import Image

BODIES = ['Superhero_Male_FullBody', 'Superhero_Female_FullBody']
KEEP_CLIPS = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Idle_Torch_Loop', 'Pistol_Idle_Loop', 'Pistol_Shoot', 'Hit_Chest', 'Death01']
MAX_SIZE = {'BaseColor': 1024, 'Dark': 1024, 'Normal': 512, 'Roughness': 512}
ELEM = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}

def read_glb(path):
    b = open(path, 'rb').read()
    jlen = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jlen])
    off = 20 + jlen
    blen = struct.unpack('<I', b[off:off + 4])[0]
    return j, b[off + 8:off + 8 + blen]

def write_glb(path, j, blob):
    jb = json.dumps(j, separators=(',', ':')).encode()
    jb += b' ' * (-len(jb) % 4)
    blob += b'\0' * (-len(blob) % 4)
    total = 12 + 8 + len(jb) + 8 + len(blob)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A) + jb)
        f.write(struct.pack('<II', len(blob), 0x004E4942) + blob)

def slim_animations(src, dst):
    """Keep only KEEP_CLIPS: copy just the accessors they use, drop meshes, skins and materials."""
    j, blob = read_glb(src)
    anims = [a for a in j['animations'] if a['name'] in KEEP_CLIPS]
    used = sorted({s[k] for a in anims for s in a['samplers'] for k in ('input', 'output')})
    remap = {old: new for new, old in enumerate(used)}
    out = bytearray()
    views, accs = [], []
    for old in used:
        a = j['accessors'][old]
        bv = j['bufferViews'][a['bufferView']]
        size = a['count'] * ELEM[a['type']] * 4
        start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        views.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': size})
        out += blob[start:start + size]
        out += b'\0' * (-len(out) % 4)
        na = {k: v for k, v in a.items() if k not in ('bufferView', 'byteOffset', 'sparse')}
        na['bufferView'] = len(views) - 1
        accs.append(na)
    for a in anims:
        for s in a['samplers']:
            s['input'], s['output'] = remap[s['input']], remap[s['output']]
    nodes = [{k: v for k, v in n.items() if k not in ('mesh', 'skin')} for n in j['nodes']]
    slim = {'asset': j['asset'], 'scene': j['scene'], 'scenes': j['scenes'], 'nodes': nodes, 'animations': anims,
            'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(out)}]}
    write_glb(dst, slim, bytes(out))
    return len(anims)

def main(bodies_zip: str, anims_zip: str) -> None:
    out = os.path.join(os.path.dirname(__file__), '..', 'game', 'public', 'models', 'characters')
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    with tempfile.TemporaryDirectory() as tmp:
        bdir, adir = os.path.join(tmp, 'b'), os.path.join(tmp, 'a')
        zipfile.ZipFile(bodies_zip).extractall(bdir)
        zipfile.ZipFile(anims_zip).extractall(adir)
        broot = os.path.join(bdir, os.listdir(bdir)[0])
        aroot = os.path.join(adir, os.listdir(adir)[0])
        src_dir = os.path.join(broot, 'Base Characters', 'Godot - UE')
        textures = {}
        for name in BODIES:
            data = json.load(open(os.path.join(src_dir, name + '.gltf')))
            for img in data['images']:
                uri = img['uri']
                if not os.path.exists(os.path.join(src_dir, uri)):
                    uri = uri.replace('_png.png', '.png')  # stray "_png" in some texture names
                dest = os.path.splitext(img['uri'])[0] + '.webp'
                textures[uri] = dest
                img['uri'] = dest
            for buf in data['buffers']:
                shutil.copy(os.path.join(src_dir, buf['uri']), os.path.join(out, buf['uri']))
            json.dump(data, open(os.path.join(out, name + '.gltf'), 'w'), separators=(',', ':'))
        for t, dest in textures.items():
            im = Image.open(os.path.join(src_dir, t))
            kind = next((k for k in MAX_SIZE if k in t), 'BaseColor')
            im.thumbnail((MAX_SIZE[kind], MAX_SIZE[kind]))
            im.save(os.path.join(out, dest), 'WEBP', quality=82, method=6)
        n = slim_animations(os.path.join(aroot, 'Unreal-Godot', 'UAL1_Standard.glb'), os.path.join(out, 'animations.glb'))
        shutil.copy(os.path.join(broot, 'License_Standard.txt'), os.path.join(out, 'LICENSE.txt'))
    total = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
    print(f'{len(BODIES)} bodies, {len(textures)} textures, {n} clips, {total/1e6:.1f} MB -> {os.path.normpath(out)}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
