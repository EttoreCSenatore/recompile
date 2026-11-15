---
id: save-and-deploy
title: Saves, Build & Deploy
---

# Saves, Build & Deploy

## Save system

| Data | Storage | When |
|---|---|---|
| Meta-progression (Weights, unlocks, codex, endings seen) | IndexedDB | After each run and each unlock |
| Settings (controls, accessibility, audio) | localStorage | On change |
| Suspended run | IndexedDB | Between sectors only |

### Rules

- **Suspend, not save-scum**: a suspended run is **deleted when loaded**, in standard roguelike
  fashion.
- **Versioned schema**: every save has a `schemaVersion`. Migrations upgrade old saves
  step by step.
- **Validation**: saves are parsed with Zod; invalid data is rejected and the player is told
  (the previous backup is kept).
- **Export / import**: players can export their meta-progression as a JSON file to move between
  browsers. Imports are validated the same way and never executed.
- Storage access is wrapped in `try/catch`, so the game still runs in private windows (with a
  warning that progress will not persist).

## Build

```bash
# Game
cd game
npm ci
npm run dev        # local dev server
npm run test       # unit tests (Vitest)
npm run build      # static build in game/dist

# Docs
cd website
npm ci
npm start          # local docs (English)
npm start -- --locale pt-BR   # local docs (Portuguese)
npm run build      # static build of all locales
```

## Continuous integration

On every pull request, GitHub Actions runs:

1. Install with `npm ci` (lockfile enforced).
2. Typecheck, lint, unit tests.
3. Procedural generation stress test.
4. Playwright smoke test (boot the game, play a scripted sector).
5. `npm audit --audit-level=high`.
6. Docs build (both locales, broken links fail the build).

## Deploy

GitHub Pages hosts both the docs and the game, from one workflow on `main`:

| Path | Content |
|---|---|
| `https://ettorecsenatore.github.io/recompile/` | Documentation (English) |
| `https://ettorecsenatore.github.io/recompile/pt-BR/` | Documentation (Portuguese) |
| `https://ettorecsenatore.github.io/recompile/play/` | The game |

The workflow builds the docs, builds the game into `play/`, and publishes a single Pages
artifact. Builds for **itch.io** are a zipped copy of `game/dist`.
