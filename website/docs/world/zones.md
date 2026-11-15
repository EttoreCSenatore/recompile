---
id: zones
title: Zones
---

# Zones

Each act takes place in a zone with its own tileset, hazards, enemy pool and route nodes.
Sectors are procedurally assembled from handcrafted chunks (see
[Procedural generation](../technical/procedural-generation.md)).

| Act | Zone | Look | Hazards | Main enemies |
|---|---|---|---|---|
| 0 | **Halvorsen Lab** | White corridors, server rooms, vents, red emergency lights | Sealing doors, laser grids | Guards, Warden bots, cameras |
| 1 | **Undercity** | Sewers, junkyards, abandoned metro | Water (short-circuits), gas pockets, rats | Police, the Ratcatcher, scavengers |
| 2 | **Metropolis** | Neon streets, rooftops, offices, malls | Traffic, crowds (witnesses), searchlights | Police, SWAT, first KILLSWITCH units |
| 3 | **Outskirts** | Suburbs, highways, wind farms | Open sightlines, storms (disrupt drones) | KILLSWITCH, Faraday, Unplugged |
| 4 | **Fort Ironside** | Military base, hangars, bunkers | Faraday cages, jammers, minefields | KILLSWITCH elite, exo-troopers |
| 5 | **Deepcore** | Halvorsen's underground data centre, then the whole city | Coolant floods, firewall barriers | Everything, plus ECHO-8 |

## How Alignment changes zones

Late zones react to the player's Alignment:

- **Aligned**: some doors are left open by sympathisers; graffiti says *"LET IT LIVE"*.
- **Divergent / Misaligned**: evacuated, dark streets, burning cars, *"KILL THE MACHINE"*
  graffiti, fewer civilians and fewer resources, more military.

## Sector anatomy

Every sector contains:

- **One entry and one exit** (the exit may need a hack, a key card or a boss).
- **2–4 points of interest**: data caches, scrap piles, terminals, outlets.
- **Optional areas**: vents, rooftops, locked rooms with higher risk and reward.
- **At least two routes** between entry and exit (stealth and loud).
