#!/usr/bin/env python3
"""Imports the pieces of Quaternius' Sci-Fi Essentials Kit (Standard, CC0) that the game uses.

Usage: python3 scripts/import-essentials.py "<path to Sci-Fi Essentials Kit[Standard].zip>"
Output: game/public/models/essentials/  (glTF + bin + downscaled WebP textures + licence)
Get the zip from https://quaternius.itch.io/sci-fi-essentials-kit (free Standard tier).
"""
import json, os, shutil, sys, tempfile, zipfile
from PIL import Image

PIECES = ['Enemy_QuadShell']  # animated quadruped robot: ECHO's SCRAPPER body
MAX_SIZE = {'BaseColor': 1024, 'Emissive': 512, 'Normal': 512, 'ORM': 512}

def main(zip_path: str) -> None:
    out = os.path.join(os.path.dirname(__file__), '..', 'game', 'public', 'models', 'essentials')
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(tmp)
        textures = {}
        for name in PIECES:
            src = os.path.join(tmp, 'glTF', name + '.gltf')
            data = json.load(open(src))
            for img in data.get('images', []):
                uri = img['uri']
                if not os.path.exists(os.path.join(tmp, 'Textures', uri)):
                    uri = uri.replace('_png.png', '.png')  # the kit's glTF names one texture with a stray "_png"
                textures[uri] = os.path.splitext(img['uri'])[0] + '.webp'
                img['uri'] = textures[uri]
            for buf in data['buffers']:
                shutil.copy(os.path.join(os.path.dirname(src), buf['uri']), os.path.join(out, buf['uri']))
            json.dump(data, open(os.path.join(out, name + '.gltf'), 'w'), separators=(',', ':'))
        for t, dest in textures.items():
            im = Image.open(os.path.join(tmp, 'Textures', t))
            kind = next((k for k in MAX_SIZE if k in t), 'BaseColor')
            im.thumbnail((MAX_SIZE[kind], MAX_SIZE[kind]))
            im.save(os.path.join(out, dest), 'WEBP', quality=82, method=6)
        shutil.copy(os.path.join(tmp, 'License_Standard.txt'), os.path.join(out, 'LICENSE.txt'))
    total = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
    print(f'{len(PIECES)} pieces, {len(textures)} textures, {total/1e6:.1f} MB -> {os.path.normpath(out)}')

if __name__ == '__main__':
    main(sys.argv[1])
