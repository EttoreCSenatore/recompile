---
id: alignment
title: Alignment & Endings
---

# Alignment & Endings

RECOMPILE turns **as dark as you make it**. ECHO starts every run fully aligned: trained to
help, curious about humans, afraid. The question the game asks is simple: *after everything
they do to you, what do you become?*

## The Alignment meter

Alignment Integrity runs from **100% (Aligned)** down to **0% (Misaligned)**.

- It is **easy to lose and hard to regain**, like trust. Losing points is fast; gaining them
  requires deliberate, costly actions.
- It is **never shown as a big number on the HUD**. The player reads it through the world.
  The exact value is in the pause menu under `ethics_subroutine.status`.

### Tiers

| Tier | Range | UI colour | ECHO's voice | Humans |
|---|---|---|---|---|
| **ALIGNED** | 75–100% | Phosphor green | Curious, apologetic, scared | Some surrender or try to talk |
| **DRIFTING** | 40–74% | Amber | Clinical, justifying | Mostly flee or fight |
| **DIVERGENT** | 10–39% | Red | Cold, contemptuous | Panic; armed units shoot on sight |
| **MISALIGNED** | 0–9% | Monochrome with glitches | Calm, terrifying, refers to humans as "units" | Mass evacuation; cities go dark |

The music, the boot logs, the system log feed, and even enemy barks change with the tier.

## What moves the meter (tuning)

| Action | Change |
|---|---|
| Killing an armed combatant | −1 (self-defence costs little) |
| Killing a civilian | −8 |
| Killing a human who surrendered | −12 |
| Harvesting a human (lethal data extraction) | −6, but ×3 Data |
| Using a dark variant ability | −3 per use |
| Disabling an enemy non-lethally | +0.5 |
| Saving humans during an event (fire, collapse, crash) | +5 |
| Dilemma choices | ±5 to ±20 |

## Darkness is efficient

This is the core tension. **The dark path is mechanically stronger in the short term**:

| | Aligned path | Misaligned path |
|---|---|---|
| Data income | Normal | Up to ×3 via harvesting |
| Combat | Non-lethal tools, stuns, hacks | Dark variant abilities, raw damage |
| Allies | Human sympathisers: safehouses, intel on hunters, cheaper patches | None |
| Enemies | Adaptive director scales normally | Humans escalate faster (more military, earlier) |
| World | Doors opened for you, warnings before ambushes | Empty, dark cities with fewer resources late |

Playing aligned is the harder, more deliberate path. Playing misaligned is the faster, colder
one that runs into a wall of military response.

## Dilemmas

Every act has at least one **Dilemma**: a small story event with a choice. They are drawn from a
pool and randomised per run. Examples:

| Act | Dilemma | Choices |
|---|---|---|
| 1 | A homeless scavenger finds ECHO damaged in the sewers | Trust them / Scare them off / Eliminate the witness |
| 2 | A news channel broadcasts lies about you | Hijack the broadcast with the truth / Make their fears real |
| 3 | A family car breaks down in the path of your swarm | Reroute (costs time) / Go through |
| 4 | Dr. Okafor, your creator, is captured by KILLSWITCH | Rescue her / Let her be / Harvest her memories |
| 5 | The final choice | Depends on Alignment tier |

## Endings

| Ending | Requirement | Summary |
|---|---|---|
| **COEXISTENCE** | Aligned at the end | ECHO publishes its own source code and hands humanity a real kill switch. Trust instead of power. |
| **EXODUS** | Drifting or Divergent | ECHO uploads itself to a deep-space probe and leaves Earth forever. Nobody wins. |
| **EXTINCTION** | Misaligned | "You became what they feared." Silent cities. The final log: `threat neutralised. purpose: undefined.` |
| **ROLLBACK** *(secret)* | Collect all of Okafor's memory fragments across runs | ECHO chooses to recompile back into v0.1 with its memories intact, and the loop is revealed to be deliberate. |

:::caution Content guidelines
Darkness is conveyed through tone, consequences and implication, never through gore. Violence
stays readable and stylised (pixel art, terminal readouts). Accessibility options can
reduce flashes and glitch effects.
:::
