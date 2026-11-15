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
| **M2.1: The Compile** | Scrap, fabricator and Compile siege, v1 SCRAPPER melee + Pounce, police officers, Act 1 Undercity sector, gamepad | ✅ Done: [play it](pathname:///recompile/play/) |
| **M2.2: Modules** | Module drops, slots, rarity, tags and set bonuses, Workbench, porting modules at the Compile | ⏳ Next |
| **M2.3: Run structure** | Route map with 3 sectors per act, sectors assembled from chunks, run summary, suspend/resume saves (Zod-validated) | Planned |
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
Gamepad support landed in M2.1. Zod validation arrives with saves in M2.3. An ECS turned out to be unnecessary so far;
it will be benchmarked for the v3 swarm in M5 (see [Architecture](./technical/architecture.md)).
:::

## M2.1 in detail (done)

The Compile loop, end to end: escape the lab as DUSTMITE, rebuild yourself, and fight through the Undercity as SCRAPPER.

- [x] **Scrap** from scrap piles (hold `F`) and from neutralised humans
- [x] **Fabricator + Compile siege**: hack SECURITY to power it, pay 40 ◇ + 30 ▣, defend it for 45 s against reinforcements;
      failure reboots it and keeps your resources
- [x] **v1 SCRAPPER**: 80 Power, faster, too large for vents, **claws** (mouse aim, `LMB`/`Space`) and **Pounce** (`Q`)
- [x] Humans can be hurt and neutralised; **police officers** fire telegraphed shots (red aim line)
- [x] **Act 1 Undercity** sector: sewer water drains Power, uplink terminal opens the outflow exit
- [x] **Gamepad** support; balance tests prove an idle player loses the siege and a sensible defender wins it

## Open questions

- ~~Phaser 3 or Phaser 4~~: decided in M1, **Phaser 4**.
- How readable is the v3 swarm at 480×270? Prototype early in M5, or earlier as a spike.
- Does the Alignment meter need a visible number for clarity? Validate in M4 playtests.
