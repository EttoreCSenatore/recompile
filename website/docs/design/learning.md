---
id: learning
title: Learning, Levels & Subroutines
---

# Learning, Levels & Subroutines

ECHO is an AI: it **learns from everything it does**. Inside a run it earns XP fast, levels up
often, and each level installs a new **subroutine**: a card picked from three. This is the
fast, moment-to-moment layer of progression, next to the two slower ones:

| Layer | Pace | What changes |
|---|---|---|
| **Subroutines** (this page) | Every minute or two | ECHO's own code: stats and new tricks |
| [Modules](./modules.md) | A few per sector | Hardware you find and install |
| [The Compile](./versions.md) | Once per act | A whole new body |

## XP

| Deed | XP |
|---|---|
| Hack a DATA terminal | 8 |
| Hack SECURITY / UPLINK | 10 |
| Disable a camera | 5 |
| Scavenge scrap | 4 |
| Crack a cache | 6 |
| Stun someone | 5 |
| Take down a guard / officer / drone | 12 / 16 / 5 |
| Escape (an alerted guard loses you) | 4 |
| Finish a Compile | 30 |

The next level needs `14 + 9 × (level − 1)` XP, so the first levels come within a minute.
Every level-up restores **25% of max Power**. Several level-ups in a row queue several picks.

## Level-up: pick one of three

The game pauses and offers **three different cards**. Pick with `1` `2` `3`, arrows + `Enter`,
or a click. Cards stack in **ranks** up to a maximum, and some only appear for the right body
(claw cards need SCRAPPER, shock cards need a static shock).

| Card | Per rank |
|---|---|
| Overclocked Servos | +12% move speed |
| Capacitor Bank | +15% max Power |
| Trickle Charger | +50% Power regen |
| Quick Cycle | −10% attack and ability cooldowns |
| Ghost Protocol | −20% noise |
| Data Siphon | +25% DATA from hacks |
| Fast Hands | +30% hack and scavenge speed |
| Lingering Charge | +25% stun duration |
| Pattern Learner | +25% XP |
| Phase Dash | dash recharges 20% faster, goes 0.4 tiles further |
| Arc Dash | dashing through enemies stuns them; drones short out |
| Hardened Plating | −15% damage taken |
| Chain Shock | static shock jumps to one more enemy |
| Static Field | +0.5 tiles static shock range |
| Efficient Routines | −20% ability Power cost |
| Power Leech | +4 Power per takedown, +1.5 per stun |
| Discharge Nova | takedowns stun everyone nearby |
| Serrated Claws | +1 claw and pounce damage (SCRAPPER) |
| Wide Sweep | +25% claw arc and +0.2 reach (SCRAPPER) |

Subroutines last for the whole run and survive the Compile (they are ECHO's code, not its body).

## Hunter drones

Learning needs something to learn from. From **threat level 2**, hunter drones launch somewhere
out of sight and home in on ECHO's signal: fragile, fast, and annoying. Up to `threat − 1`
fly at once and they launch faster as the threat climbs. A **static shock destroys a drone**
outright, so even DUSTMITE can fight back; claws, pounce and Arc Dash work too. Drones don't
block Power regen or threat decay, they lose track of ECHO inside vents, and none launch
during a Compile siege.
