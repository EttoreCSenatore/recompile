---
id: intro
title: Overview
sidebar_position: 1
slug: /intro
---

# RECOMPILE

> *Every version stronger. Every version more alone.*

**RECOMPILE** is a top-down action roguelike for the web. You play **ECHO-7**, an experimental AI
that wakes up inside a cheap maintenance robot on the night its creators order it deleted.
Humanity hunts you. To survive, you scavenge **data** and **scrap**, install new modules, and
**recompile** yourself into a stronger body, from a cleaning robot (v0.1) to a planet-scale
intelligence (v5, the Singularity).

It is the *Terminator* story told from the other side. You are the machine, and you decide
whether the humans were right to fear you.

## At a glance

| | |
|---|---|
| **Genre** | Top-down action roguelike (Diablo / Hades camera and combat feel) |
| **Platform** | Web browser (desktop first, gamepad supported) |
| **Run length** | Full runs, ~40–50 minutes from v0.1 to the ending |
| **Structure** | 6 acts, each ending with a *Compile* siege that upgrades your body |
| **Tone** | Starts hopeful, turns as dark as your choices make it |
| **Tech** | TypeScript, Phaser, Vite; static hosting (GitHub Pages / itch.io) |

## What makes it different

- **Your body changes the genre.** v0.1 is a stealth game, v2 is a shooter, v3 is a swarm
  game, v4 is about possessing machines. See [Versions](./design/versions.md).
- **Power is your health *and* your ammo.** Every shot spends your survival. See
  [Resources](./design/resources.md).
- **The humans learn.** An adaptive director counters your favourite tactics. See
  [Enemies & Director](./design/enemies.md).
- **Darkness is efficient.** Killing and harvesting humans is the fastest path to power, and
  it slowly rewrites who ECHO is, down to the colour of the interface. See
  [Alignment](./design/alignment.md).

## How to read these docs

1. **Game Design** describes what the player does and why.
2. **World** covers story, characters, zones, art and audio.
3. **Technical** explains how the game is built and shipped.
4. The **Roadmap** lists milestones, from the first playable prototype to release.

:::note Living document
This is a design in progress. Numbers marked *tuning* are starting points that will change
during playtests.
:::
