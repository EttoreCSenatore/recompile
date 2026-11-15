---
id: modules
title: Modules & Builds
---

# Modules & Builds

Modules are the loot of RECOMPILE. They drop during a run, are installed at **Workbenches**
(or in the field at a higher Scrap cost), and define your build.

## Slot types

| Slot | Affects | Example |
|---|---|---|
| **Chassis** | Max Power, armour, size | *Ceramic Plating*: +20% max Power, −10% speed |
| **Locomotion** | Speed, dash, terrain | *Magnetic Treads*: climb walls in vents |
| **Sensor** | Vision radius, scan speed, detection | *Thermal Eye*: see through smoke |
| **Weapon** | Primary and secondary attack | *Arc Welder*: short-range beam that chains |
| **CPU** | Cooldowns, hack speed, ability count | *Overclocked Core*: −20% cooldowns, +heat |
| **Network** (v3+) | Swarm size, possession range | *Mesh Relay*: +2 drones |

Each version unlocks more slots: v0.1 has **2**, v1 **4**, v2 **6**, v3+ **8**.

## Rarity

| Tier | Colour | Notes |
|---|---|---|
| **Salvaged** | Grey | Common, simple stat changes |
| **Military** | Blue | Adds an active effect |
| **Prototype** | Purple | Changes how an ability works |
| **Anomalous** | Red | Unique, very strong, always has a drawback |

Example of an Anomalous module: *Grief Engine*. +50% damage for 10 s after killing a human.
Every kill also lowers Alignment by an extra point.

## Tags and synergies

Every module has 1–2 **tags**. Installing **3 modules with the same tag** activates a set
bonus.

| Tag | Set bonus (3 pieces) |
|---|---|
| `THERMAL` | Attacks ignite; burning enemies take +25% damage |
| `EMP` | Stuns also disable enemy electronics (radios, turrets) |
| `KINETIC` | Knockback into walls deals bonus damage |
| `STEALTH` | First attack from undetected deals ×3 damage |
| `SWARM` | Drones respawn 50% faster |
| `VIRAL` | Hacks spread to one nearby device |
| `PARASITIC` | Damage dealt restores Power (Alignment penalty on humans) |

## Porting modules between versions

When you compile, you choose which modules to **port** to the new body. Porting costs Scrap
and may upgrade the module to the new architecture (one rarity tier up, *tuning*). Modules you
do not port are lost. This keeps builds coherent across a run while forcing commitment.

## Rerolls

At a Workbench you can spend Data to **reroll** the next module offer. The cost rises each time
within an act.

## Implemented in M2.2

:::note Prototype status
The prototype has 15 modules for Sensor, CPU, Chassis and Weapon, the Workbench (`E`), sealed caches, drops from
humans, rerolls, porting with tuning, and the THERMAL, EMP, STEALTH, VIRAL and PARASITIC set bonuses. Locomotion and
Network slots, KINETIC and SWARM, and the full module pool arrive with later bodies and milestones.
:::
