---
id: resources
title: Resources
---

# Resources

RECOMPILE has three run resources. They are designed to pull the player in different
directions.

| Resource | Icon | Earned from | Spent on |
|---|---|---|---|
| **Data** (DAT) | `◇` | Hacking, scanning, data caches, harvesting | Compile, patching Bugs, rerolling modules |
| **Scrap** (SCR) | `▣` | Destroyed machines, crates, enemy gear | Installing/upgrading modules, Compile, repairs |
| **Power** (PWR) | `ϟ` | Chargers, power cells, draining generators | It *is* your health and your ability fuel |

## Data

- **Hacking** a terminal or camera takes 1–3 s of channelling (*tuning*) and makes quiet noise.
- **Scanning** an enemy (hold the sensor key while it is in your vision) gives a small amount
  of Data and reveals its weaknesses.
- **Harvesting** a downed human gives **3× the Data** of any other source, kills them, and
  costs [Alignment](./alignment.md). This is the central temptation of the game.

## Scrap

- Dropped by machines, vehicles and some enemy gear.
- Heavy enemies drop more but take longer to kill (Power cost).
- Scrap is **lost on death**. Data is partially converted into Weights.

## Power

Power is the defining resource:

- **Damage drains Power.** At 0, ECHO shuts down (death).
- **Abilities cost Power.** The basic attack is free or very cheap; everything strong costs.
- **Max Power** comes from the chassis and battery modules, and grows with each version.
- **Recharging:**
  - *Wall outlets*: slow, silent, safe if unseen.
  - *Power cells*: instant, dropped by enemies and found in crates.
  - *Generators*: drain fast but trigger an alarm.
  - *Passive regen*: very slow, and only out of combat.

:::tip Design intent
Because health and ammo share one bar, a player low on Power must choose between fighting
weakly or retreating to recharge. Aggression is always a gamble.
:::

## Starting values (tuning)

| Version | Max Power | Passive regen | Typical ability cost |
|---|---|---|---|
| v0.1 | 30 | 0.5/s | 8 |
| v1 | 80 | 0.8/s | 12 |
| v2 | 150 | 1/s | 20 |
| v3 | 120 per core + drones | 1/s | 15 |
| v4 | Host-dependent | n/a | 25 |
| v5 | 500 | 2/s | 60 |
