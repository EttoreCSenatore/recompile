---
id: procedural-generation
title: Procedural Generation
---

# Procedural Generation

Sectors are **assembled from handcrafted chunks**, not generated tile by tile. This keeps
levels readable and designed while still varying each run.

## Pipeline

```mermaid
flowchart LR
  A[Seed] --> B[Route map per act]
  B --> C[Sector graph]
  C --> D[Place chunks]
  D --> E[Connect & validate]
  E --> F[Populate: loot + enemies]
  F --> G[Playable sector]
```

### 1. Route map
For each act, generate a small branching graph (3 layers, 2–3 nodes per layer) and assign node
types (Data cache, Scrapyard, Workbench, Safehouse, Elite, Dilemma, Unknown) with weighted
rules. For example, at least one Workbench per act and never two Elites in a row.

### 2. Sector graph
An abstract graph of **rooms**: entry, exit, 2–4 points of interest, optional rooms. The
graph guarantees at least **two distinct paths** from entry to exit (stealth and loud).

### 3. Chunk placement
Each zone has a library of **chunks** made in Tiled (for example 16×16 tiles), tagged with
their door sockets (N/E/S/W), their role (combat arena, stealth corridor, vault) and
their difficulty. The generator places chunks whose sockets match the graph.

### 4. Connect & validate
- Corridors and vents connect the chunks.
- A flood fill checks that the exit is reachable and that every point of interest is
  reachable.
- Vents form a **second navigation layer** used by small versions (v0.1, v3 drones).
- If validation fails, regenerate with the next sub-seed (bounded retries).

### 5. Populate
The [Director](../design/enemies.md#the-adaptive-director) receives a **spawn budget**
based on act, sector depth, node type and Epoch. It buys enemy groups from the zone's pool,
applying active countermeasures. Loot is placed with a separate budget so risky rooms hold
better rewards.

## Determinism

- One master seed per run; each subsystem (route, layout, loot, spawns) gets its own derived
  stream, so changing loot rules does not change layouts.
- Seeds can be displayed and entered in a **Seeded Run** mode.

## Testing generation

- A headless script generates **thousands of sectors per zone** in CI and checks
  reachability, path counts and budget limits.
- Failing seeds are saved as regression fixtures.
