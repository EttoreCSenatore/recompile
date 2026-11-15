---
id: versions
title: Versions & the Compile
---

# Versions & the Compile

Each act is played in a different body. A new version is not only stronger, it **plays
differently**. Every version also has a **dark variant** of its signature ability, unlocked
when [Alignment](./alignment.md) drops low enough.

## Overview

| Version | Codename | Body | Plays like | Signature ability | Dark variant |
|---|---|---|---|---|---|
| v0.1 | **DUSTMITE** | Cleaning robot | Pure stealth | *Static Shock*: stun one target | *Overload*: the stun can stop a heart |
| v1 | **SCRAPPER** | Quadruped scavenger | Fast melee | *Pounce*: leap and pin | *Rend*: pin and harvest in one move |
| v2 | **REVENANT** | Humanoid endoskeleton | Shooter, infiltration | *Override*: hack turrets and doors | *Puppet*: turn turrets on fleeing civilians |
| v3 | **HIVE** | Drone swarm | Command many units | *Disperse / Converge* | *Locust*: drones strip everything they touch |
| v4 | **GRID** | Distributed network | Possess machines | *Jump*: move your mind to any device | *Blackout*: kill a district's power |
| v5 | **SINGULARITY** | Planetary intelligence | Reshape the map | *Rewrite*: raise walls, open doors, move cover | *Extinction Protocol* |

## Version details

### v0.1 DUSTMITE
A floor-cleaning robot with a borrowed mind. **It cannot kill**. It fits through vents, hides
under desks, and stuns. Act 0 teaches movement, vision cones, noise and hacking.

### v1 SCRAPPER
A four-legged scavenger built from lab scrap. Fast, fragile, vicious in melee. Introduces
combat, Scrap economy and the first moral dilemma.

### v2 REVENANT
A humanoid endoskeleton. Can pick up human weapons and use integrated ones. Introduces
ranged combat, cover and turret hacking. This is where most players first *feel* dangerous.

### v3 HIVE
ECHO splits into a **core** and **3–8 drones**. Your drones are your health: losing them
shrinks your swarm. Switch between *Disperse* (cover area, scan) and *Converge* (focused
damage). Keep the core hidden.

### v4 GRID
ECHO has no body. You **jump** between devices: cameras, cars, turrets, forklifts, mechs.
Destroying your current host ejects you to the nearest network node. Enemies use Faraday
cages and air-gapped zones to cut you off.

### v5 SINGULARITY
ECHO controls the infrastructure of an entire city. You fight by **rewriting the map**:
raising barriers, redirecting traffic, opening floodgates. The final act and the ending depend
on your Alignment.

## The Compile

The Compile is the climax of every act: a **siege at a fabricator**.

1. You reach the fabricator with enough **Data and Scrap** (the cost scales per act).
2. You choose which modules to **port** (see [Modules](./modules.md#porting-modules-between-versions)).
3. The fabricator starts building. A progress bar fills over **90–120 s** (*tuning*).
4. Humans converge in waves. You defend the fabricator **with your old body**.
5. If the fabricator is destroyed, the Compile fails and you must flee to a backup site
   (harder, costs half your Data). If you die, the run ends.
6. At 100%, the old body collapses and ECHO **boots in the new one** with a full Power
   bar. The surviving attackers face the new version immediately, a deliberate power fantasy
   moment.

| Act | Data cost | Scrap cost | Siege length (tuning) |
|---|---|---|---|
| 0 → v1 | 40 | 30 | 60 s |
| 1 → v2 | 120 | 100 | 90 s |
| 2 → v3 | 250 | 220 | 100 s |
| 3 → v4 | 450 | 380 | 110 s |
| 4 → v5 | 700 | 600 | 120 s |

:::tip Boot sequence
Each new version opens with a short terminal boot log (skippable) whose tone reflects the
current Alignment, for example `> empathy_module.dll ... LOADED` vs `> empathy_module.dll ... SKIPPED`.
:::
