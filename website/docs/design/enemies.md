---
id: enemies
title: Enemies & the Director
---

# Enemies & the Director

Humans are the enemy, but they are **people**, not monsters. They fear ECHO, call for help,
retreat, surrender, and adapt.

## Factions

| Faction | Who they are | Role |
|---|---|---|
| **Civilians** | Ordinary people | Flee, film you, call the police (raise Threat) |
| **Halvorsen Security** | Corporate guards and their obedient robots ("Wardens") | Early enemies; Wardens can be hacked and freed |
| **City Police** | Patrol and riot units | Act 1–2 pressure |
| **Task Force KILLSWITCH** | Military anti-AI unit led by Colonel Mara Voss | Main antagonist force, Act 2 onwards |
| **Faraday** | Anti-AI hacker collective | Inject Bugs, lay data traps |
| **The Unplugged** | Anti-technology cult | Flamethrowers, EMPs, destroy all electronics, including civilian ones |

## Unit roster

| Unit | Faction | Behaviour | Counter |
|---|---|---|---|
| Civilian | Civilians | Flees, phones police | Avoid being seen, or jam phones |
| Guard | Security | Patrols, flashlight cone | Stealth, stun |
| Warden bot | Security | Slow, armoured, predictable | Hack it (*VIRAL*), or free it |
| Patrol Officer | Police | Pistol, calls backup | Kill fast or disable radio |
| Riot Cop | Police | Frontal shield | Flank, *KINETIC* knockback |
| K9 Unit | Police/KILLSWITCH | Smells you through stealth | Lure, *EMP* collar disruption |
| SWAT Breacher | KILLSWITCH | Shotgun, flashbangs (blind your sensors) | Range |
| Sniper | KILLSWITCH | Long laser sight, high damage | Break line of sight |
| Thermal Spotter | KILLSWITCH | Reveals stealthed units in a radius | Prioritise |
| EMP Grenadier | KILLSWITCH | Drains Power, disables a module for 5 s | Dodge, *EMP* resistance |
| Netrunner | Faraday | Hidden, injects Bugs at range | Find and silence them |
| Zealot | Unplugged | Flamethrower, fearless | Range, avoid groups |
| Exo-trooper | KILLSWITCH | Powered armour, heavy weapon | Possess it (v4) or burst it |
| Hunter | KILLSWITCH | Named elite with a grudge; recurs across the run | Learn its pattern |

## Bosses

| Act | Boss | Mechanic |
|---|---|---|
| 0 | **Lab Lockdown**, Chief Brandt | Escape a sealing facility; no fighting |
| 1 | **The Ratcatcher** | Exterminator with gas and traps in the sewers |
| 2 | **Air Unit Hawkeye** | SWAT helicopter that hunts you across rooftops |
| 3 | **"Patch"** | Faraday's teen prodigy: a hack duel in cyberspace |
| 4 | **Colonel Mara Voss** | Exo-suit duel; she adapts mid-fight |
| 5 | **ECHO-8** | Halvorsen's obedient copy of you, a forked AI controlled by humans |

## Threat level

Each sector has a **Threat level from 1 to 5**.

- **Raised by** noise, witnesses, alarms, kills, and camera sightings.
- **Lowered** slowly while undetected, faster by hacking police radio.
- **Higher Threat** means more spawns, stronger units, and **more Data** (humans broadcast
  more). It is a risk/reward dial.
- **At Threat 5** a **Hunter** squad enters the sector.

## The Adaptive Director

The Director watches how you play and **sends countermeasures**. Every 60 s (*tuning*), and
at each act transition, it evaluates your recent behaviour:

| If you rely on… | The humans bring… |
|---|---|
| Thermal damage | Fire-retardant gear |
| Stealth kills | K9 units and Thermal Spotters |
| Hacking | Faraday cages and air-gapped turrets |
| Ranged combat | Riot shields and smoke |
| Melee | Shotguns and flamethrowers |
| Swarms (v3) | EMP Grenadiers and nets |
| Possession (v4) | Signal jammers |

Countermeasures are **telegraphed** through intercepted radio:
`> KILLSWITCH: deploying countermeasure THERMAL_SHIELDING to sector 7.`
The player always gets a warning and a chance to diversify their build.

## Bugs & Patches

Netrunners, EMPs and some hazards inject **Bugs** into ECHO's code. Bugs are debuffs that
persist until patched.

| Bug | Effect | Exploit (as a Feature) |
|---|---|---|
| Memory Leak | −5% max Power per minute | *Garbage Collector*: kills restore 5 Power |
| Input Lag | Actions delayed 0.2 s | *Prediction*: attacks track targets better |
| Null Pointer | One ability randomly fails | *Undefined Behaviour*: failed casts deal area damage |
| Infinite Loop | One ability repeats on its own, draining Power | *Overclock*: double cast, double cost |
| Visual Artifact | Ghost enemies on screen | *Decoy*: humans also see ghosts of you |
| Race Condition | Two modules randomly swap effects | *Parallelism*: both effects trigger at half strength |

- **Patch** a Bug at a terminal or Safehouse for Data.
- **Exploit** a Bug at a Workbench to turn it into its **Feature**: a mutation with an upside,
  in the spirit of "it's not a bug, it's a feature". Each run allows only 2 Features.
