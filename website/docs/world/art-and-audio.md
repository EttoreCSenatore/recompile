---
id: art-and-audio
title: Art & Audio
---

# Art & Audio

## Visual direction

- **Pixel art**, 32×32 tiles, characters about 24–32 px tall at v0.1 and growing with each
  version (the v2 REVENANT is visibly taller than humans).
- **Internal resolution 480×270**, scaled up with integer scaling for crisp pixels.
- **Top-down 3/4 perspective**, like classic action RPGs.
- **Dynamic lighting**: flashlights, emergency lights, muzzle flashes. Darkness is a gameplay
  tool for stealth.
- **Vision cones and fog of war** come from ECHO's sensors: what you cannot see is rendered as
  a dim scanline wireframe.
- **CRT post-processing** (scanlines, slight curvature, chromatic aberration). Optional.

## Palette and Alignment

The UI palette shifts with [Alignment](../design/alignment.md):

| Tier | UI colour | Feel |
|---|---|---|
| Aligned | `#39FF6A` phosphor green | Old terminal, hopeful |
| Drifting | `#FFB000` amber | Warning |
| Divergent | `#FF3B3B` red | Hostile |
| Misaligned | Monochrome + glitch | Something is wrong |

The world itself stays in desaturated urban tones, so the UI and threats always stand out.

## Readability rules

- Humans are warm-coloured; machines are cool-coloured.
- Enemy attacks are telegraphed with a red line or circle at least 0.4 s before they hit.
- Interactive objects have a subtle pulse in the current UI colour.

## Audio direction

- **Music**: dark synthwave and industrial. Layers are added as Threat rises (ambient → pulse
  → full combat).
- **Alignment affects music**: aligned themes are melodic; misaligned versions of the same
  themes are detuned, slowed and distorted.
- **SFX**: servo whines, relay clicks, modem-like hacking chirps; each version has its own
  footstep and movement sound.
- **Voices**: human barks are shown as text with a short radio-static sound. No full voice acting
  at first; possibly a synthesised voice for ECHO later.

## Asset pipeline

- **3D models** as glTF: environment pieces (floors, wall panels, doors, terminals, chests, vents) come from the free CC0 **Quaternius Modular SciFi MegaKit**, loaded by `game/src/render3d/kit.ts` with a procedural fallback; ECHO's bodies and the guards are still procedural low-poly and will be hand-modelled in Blender. `scripts/import-megakit.py` copies the used pieces and shrinks their textures (about 0.4 MB in total).
- Sprites in **Aseprite**, exported as sprite sheets plus JSON (HUD and 2D art only).
- Maps and chunks in **Tiled**, exported as JSON.
- Audio as **OGG** with MP3 fallback.
- All assets are original or properly licensed; licences are tracked in `CREDITS.md`.
