#!/usr/bin/env python3
"""Imports the pieces of Quaternius' Modular SciFi MegaKit (Standard, CC0) that the game uses.

Usage: python3 scripts/import-megakit.py "<path to Modular SciFi MegaKit[Standard].zip>"
Output: game/public/models/megakit/  (glTF + bin + downscaled WebP textures + licence)
Get the zip from https://quaternius.itch.io/modular-sci-fi-megakit (free Standard tier).
"""
import json, os, shutil, sys, tempfile, zipfile
from PIL import Image

PIECES = [
    'Platforms/Platform_Simple', 'Platforms/Door_Metal',
    'Walls/WallBand_Straight', 'Walls/WallAstra_Straight',
    'Props/Prop_Computer', 'Props/Prop_Chest', 'Props/Prop_Crate3', 'Props/Prop_ItemHolder',
    'Props/Prop_Vent_Small',
]
MAX_SIZE = {'BaseColor': 1024, 'Emissive': 512, 'Normal': 512, 'ORM': 512}  # px, per texture kind

def main(zip_path: str) -> None:
    out = os.path.join(os.path.dirname(__file__), '..', 'game', 'public', 'models', 'megakit')
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(tmp)
        root = os.path.join(tmp, next(d for d in os.listdir(tmp) if d.startswith('Modular SciFi MegaKit')))
        textures = set()
        for p in PIECES:
            src = os.path.join(root, 'glTF', p + '.gltf')
            data = json.load(open(src))
            for img in data.get('images', []):
                textures.add(img['uri'])
                img['uri'] = os.path.splitext(img['uri'])[0] + '.webp'
            name = os.path.basename(p)
            for buf in data['buffers']:
                shutil.copy(os.path.join(os.path.dirname(src), buf['uri']), os.path.join(out, buf['uri']))
            json.dump(data, open(os.path.join(out, name + '.gltf'), 'w'), separators=(',', ':'))
        for t in sorted(textures):
            im = Image.open(os.path.join(root, 'Textures', t))
            kind = next((k for k in MAX_SIZE if k in t), 'BaseColor')
            im.thumbnail((MAX_SIZE[kind], MAX_SIZE[kind]))
            im.save(os.path.join(out, os.path.splitext(t)[0] + '.webp'), 'WEBP', quality=82, method=6)
        shutil.copy(os.path.join(root, 'License_Standard.txt'), os.path.join(out, 'LICENSE.txt'))
    total = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
    print(f'{len(PIECES)} pieces, {len(textures)} textures, {total/1e6:.1f} MB -> {os.path.normpath(out)}')

if __name__ == '__main__':
    main(sys.argv[1])
