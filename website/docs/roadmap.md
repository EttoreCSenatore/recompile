---
id: roadmap
title: Roadmap
---

# Roadmap

Development is split into milestones. Each one ends with something **playable** in the browser.

| Milestone | Goal | Status |
|---|---|---|
| **M0: Design** | Concept, design docs, documentation site (EN/PT-BR) | ✅ Done |
| **M1: DUSTMITE prototype** | One Act 0 sector: movement, vision cones, noise, guards, hacking, stun, exit | ✅ Done: [play it](pathname:///recompile/play/) |
| **M2: Core loop** | Resources, modules, Workbench, first Compile siege, Act 0 → Act 1 (SCRAPPER combat) | ⏳ Next |
| **M3: Living humans** | Threat level, Adaptive Director, Bugs & Patches, Act 2 (REVENANT, ranged combat) | Planned |
| **M4: Alignment** | Alignment meter, UI tiers, dilemmas, dark variants, system-log voice | Planned |
| **M5: Becoming many** | Act 3 (HIVE swarm) and Act 4 (GRID possession), the hardest tech | Planned |
| **M6: Singularity** | Act 5, ECHO-8 boss, all endings, Latent Space hub, meta-progression | Planned |
| **M7: Release** | Audio, polish, accessibility pass, balancing, Epochs, itch.io + GitHub Pages release | Planned |

## M1 in detail (done)

The first prototype answers one question: **is being a weak, hunted robot fun?**
[Play it in the browser](pathname:///recompile/play/) (keyboard required). Add `?seed=123` to the URL to replay a specific run.

- [x] `game/` project scaffold: Vite + TypeScript + Phaser 4, CI, lint, unit tests, Playwright smoke test
- [x] Top-down movement with fixed timestep, camera, one handcrafted sector
- [x] ECHO fog of war and guard/camera vision cones (ray casting)
- [x] Noise system and guard state machine (patrol → suspicious → investigate → alert)
- [x] Vents as a second navigation layer (guards cannot enter or see inside)
- [x] Hacking terminals and cameras (channelled, interruptible, noisy)
- [x] *Static Shock* stun ability with Power cost
- [x] Terminal-style HUD, system log, Threat level, seeded runs
- [x] Deploy to GitHub Pages at `/recompile/play/`

:::note Scope notes
M1 keeps the simulation in plain TypeScript classes (`game/src/sim/`), separate from rendering and fully unit-tested.
The ECS (bitECS) and data validation (Zod) described in [Architecture](./technical/architecture.md) arrive in M2,
when modules, enemies and content files make them worthwhile. Gamepad support is also planned for M2.
:::

## Open questions

- ~~Phaser 3 or Phaser 4~~: decided in M1, **Phaser 4**.
- How readable is the v3 swarm at 480×270? Prototype early in M5, or earlier as a spike.
- Does the Alignment meter need a visible number for clarity? Validate in M4 playtests.
