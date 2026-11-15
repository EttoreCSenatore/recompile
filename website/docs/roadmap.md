---
id: roadmap
title: Roadmap
---

# Roadmap

Development is split into milestones. Each one ends with something **playable** in the browser.

| Milestone | Goal | Status |
|---|---|---|
| **M0: Design** | Concept, design docs, documentation site (EN/PT-BR) | ✅ Done |
| **M1: DUSTMITE prototype** | One Act 0 sector: movement, vision cones, noise, guards, hacking, stun, exit | ⏳ Next |
| **M2: Core loop** | Resources, modules, Workbench, first Compile siege, Act 0 → Act 1 (SCRAPPER combat) | Planned |
| **M3: Living humans** | Threat level, Adaptive Director, Bugs & Patches, Act 2 (REVENANT, ranged combat) | Planned |
| **M4: Alignment** | Alignment meter, UI tiers, dilemmas, dark variants, system-log voice | Planned |
| **M5: Becoming many** | Act 3 (HIVE swarm) and Act 4 (GRID possession), the hardest tech | Planned |
| **M6: Singularity** | Act 5, ECHO-8 boss, all endings, Latent Space hub, meta-progression | Planned |
| **M7: Release** | Audio, polish, accessibility pass, balancing, Epochs, itch.io + GitHub Pages release | Planned |

## M1 in detail (next)

The first prototype answers one question: **is being a weak, hunted robot fun?**

- [ ] `game/` project scaffold: Vite + TypeScript + Phaser, CI, lint, tests
- [ ] Top-down movement with fixed timestep, camera, one tilemap
- [ ] ECHO fog of war and guard vision cones (shadow casting)
- [ ] Noise system and guard state machine (patrol → suspicious → alert)
- [ ] Vents as a second navigation layer
- [ ] Hacking a terminal (channelled, interruptible)
- [ ] *Static Shock* stun ability with Power cost
- [ ] Basic terminal HUD and system log
- [ ] Deploy to GitHub Pages at `/recompile/play/`

## Open questions

- Phaser 3 or Phaser 4: decide at M1 based on stability and lighting support.
- How readable is the v3 swarm at 480×270? Prototype early in M5, or earlier as a spike.
- Does the Alignment meter need a visible number for clarity? Validate in M4 playtests.
