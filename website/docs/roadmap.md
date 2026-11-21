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
| **M2.2: Modules** | Module drops, slots, rarity, tags and set bonuses, Workbench, porting modules at the Compile | ✅ Done: [play it](pathname:///recompile/play/) |
| **M2.3: Run structure** | Route map with 3 sectors per act, sectors assembled from chunks, run summary, suspend/resume saves (Zod-validated) | Planned |
| **M2.4: Modern 3D view** | Move rendering from flat 2D to a 3D scene with an angled, Diablo-style camera; detailed character models, props and environments; lighting and shadows. The simulation stays untouched | ✅ Renderer ported to Three.js; Phaser removed. Models, lighting and art still to polish |
| **M2.5: Foundations** | Project practices adapted from Kaladrius: licence, contributor docs, versions and an in-game "What's new", decision log, glossary, pinned CI, docs parity, game UI in EN + PT-BR, playtest flags. See [Project Practices](./technical/project-practices.md) | ⏳ Next (proposed) |
| **M3: Living humans** | Threat level, Adaptive Director, Bugs & Patches, Act 2 (REVENANT, ranged combat) | Planned |
| **M4: Alignment** | Alignment meter, UI tiers, dilemmas, dark variants, system-log voice | Planned |
| **M5: Becoming many** | Act 3 (HIVE swarm) and Act 4 (GRID possession), the hardest tech | Planned |
| **M6: Singularity** | Act 5, ECHO-8 boss, all endings, Latent Space hub, meta-progression | Planned |
| **M7: Release** | Audio, polish, accessibility pass, balancing, Epochs, itch.io + GitHub Pages release | Planned |

## M1 in detail (done)

The first prototype answers one question: **is being a weak, hunted robot fun?**
[Play it in the browser](pathname:///recompile/play/) (keyboard required). Add `?seed=123` to the URL to replay a specific run.

- [x] `game/` project scaffold: Vite + TypeScript + Phaser 4 (replaced by Three.js in M2.4), CI, lint, unit tests, Playwright smoke test
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

## M2.2 in detail (done)

Loot and builds, end to end. Everything is data-driven in `game/src/sim/modules.ts`.

- [x] **15 modules** across Sensor, CPU, Chassis and Weapon, in four rarities (Salvaged, Military, Prototype, Anomalous with a drawback)
- [x] **Slots per body**: v0.1 has 2 (Sensor, CPU), v1 has 4 (+ Chassis, Weapon)
- [x] **Drops**: neutralised humans sometimes carry one; **sealed caches** (hold `F`) always hold one
- [x] **Workbench** (press `E` nearby): cheap installs, one free offer, **rerolls** for Data with a cost that rises per act. Away from a bench, `E` opens the field loadout at ×2 Scrap
- [x] **Tags and set bonuses** at 3 pieces: THERMAL, EMP, STEALTH, VIRAL, PARASITIC (KINETIC and SWARM wait for knockback and drones)
- [x] **Porting**: finishing a Compile pauses the game and asks which modules to carry over; each costs Scrap and is **tuned** one rarity tier up

## M2.4 modern 3D view (decided)

The game moves from flat 2D drawing to a 3D scene viewed from above at an angle, like Diablo, with far more detail on
characters and environments. The simulation in `game/src/sim/` is renderer-agnostic and stays as it is; the work is a new
renderer (a 3D engine such as Three.js is the likely choice, to be confirmed with a short spike) that reads the same world
state, plus models, lighting and shadows, and an angled camera with readable fog of war and vision cones. The DOM HUD and menus carry over.

### M2.4 spike result

The spike proved that a Three.js renderer in `game/src/render3d/` renders the real `World` with Three.js: instanced walls and floor, a perspective camera at a 52° pitch, shadows, a light that follows ECHO, procedural low-poly ECHO, guards and props, vision cones from the same `castRay`, fog of war and the existing DOM HUD. The simulation was not touched.

- **Engine: Three.js.** Phaser is a 2D engine; real lighting, shadows and meshes would mean fighting it. Three.js adds about 137 kB gzipped (and removing Phaser cut the game bundle from about 357 kB to about 134 kB gzipped).
- **Cost:** about 50 draw calls and 18k triangles on a Undercity level; fog is a per-instance colour update only when visibility changes.
- **Readability:** walls between the camera and ECHO must be cut down (done by dropping them to knee height); vision cones as flat fans on the floor stay readable.
- **Done after the spike:** `Renderer3D` (scene) and `Game` (modes, input, menus, effects) replace the Phaser scene; keyboard, mouse (aim by ray onto the floor) and gamepad all work; Phaser is gone.
- **Art pipeline decided:** free CC0 Quaternius packs for the environment (the Modular SciFi MegaKit is in: floors, wall panels, doors, terminals, chests, vents), hand-modelled ECHO bodies. The Sci-Fi Essentials Kit is in too: its animated QuadShell robot is the SCRAPPER body.
- **Map dressing done:** visual-only clutter along walls, themed per level (lab / Undercity), and a hand-built DUSTMITE.
- **Learning (XP, levels, subroutine cards) and hunter drones:** ECHO earns XP from every hack, stun, takedown and escape, levels up every minute or so, and picks one of three stacking cards each level; drones launch from threat 2 to keep the fights coming. See [Learning, Levels & Subroutines](./design/learning.md).
- **Pacing pass (faster, more frenetic):** faster bodies and guards, quicker hacks (about 40% shorter), a **dash** on `Space` / `A` (2.4 tiles, dodges bullets and tasers, 0.75 s cooldown), knockback on hits, officers that sidestep between shots, a shorter and busier Compile siege (36 s, up to 3 attackers), shorter cooldowns, faster threat decay, plus hit-stop, screen shake, a red damage vignette and a camera that leads where ECHO faces. Bugs fixed on the way: chasing guards could clip through wall corners, and guard models from the lab were reused (with the wrong body) after moving to the Undercity.
- **Guards are human now:** rigged Quaternius bodies with animations picked from AI state.
- **Still to do:** hand-made bodies for later versions, cap and pistol props for officers, smooth wall cutaway, accessibility options for lighting.

## Open questions


- ~~Phaser 3 or Phaser 4~~: decided in M1, **Phaser 4**; superseded by Three.js in M2.4.
- How readable is the v3 swarm at 480×270? Prototype early in M5, or earlier as a spike.
- Does the Alignment meter need a visible number for clarity? Validate in M4 playtests.
