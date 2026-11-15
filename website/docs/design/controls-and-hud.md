---
id: controls-and-hud
title: Controls, HUD & Accessibility
---

# Controls, HUD & Accessibility

## Controls

| Action | Keyboard + mouse | Gamepad |
|---|---|---|
| Move | `W A S D` | Left stick |
| Aim | Mouse | Right stick |
| Primary attack | Left click | `RT` |
| Secondary attack | Right click | `LT` |
| Dash | `Space` | `A` |
| Abilities 1–3 | `Q` `E` `R` | `X` `Y` `B` |
| Interact / hack | `F` (hold) | `RB` (hold) |
| Scan | `C` (hold) | `LB` (hold) |
| Stealth mode (slow, silent) | `Shift` (hold) | Left stick click |
| Consumables | `1`–`4` | D-pad |
| Map | `Tab` | `View` |
| Pause | `Esc` | `Menu` |

All bindings are remappable.

## HUD

The HUD looks like a **terminal overlay** projected by ECHO's own sensors.

```text
┌──────────────────────────────────────────────────────────────┐
│ > sys.log: guard_02 lost visual. resuming route.   THREAT ▮▮▯▯▯│
│                                                              │
│                                                              │
│                        [ game view ]                         │
│                                                              │
│                                                              │
│ PWR ▮▮▮▮▮▮▮▮▯▯▯▯ 64/80          ◇ DAT 112   ▣ SCR 47          │
│ [Q] POUNCE 12ϟ  [E] SCAN  [R] --        v1.2 SCRAPPER         │
└──────────────────────────────────────────────────────────────┘
```

- **System log** (top left): ECHO's internal monologue and intercepted radio. Its tone changes
  with [Alignment](./alignment.md).
- **Threat meter** (top right): 5 segments.
- **Power bar** (bottom left): segmented, flashes when low.
- **Resources** and **version tag** (bottom right).
- **UI colour** shifts with the Alignment tier.

## Accessibility

- Full key remapping and gamepad support.
- **Colour-blind safe**: Alignment tiers also change the UI *pattern* and the label, never
  only the colour.
- **Reduce effects**: toggles for CRT shader, glitch, screen shake and flashes.
- **Text size** scaling for the system log.
- **Game speed** slider (assist mode) that does not block achievements or endings.
- Subtitles for all radio barks (the game is text-first by design).
