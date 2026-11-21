---
id: project-practices
title: Project Practices (lessons from Kaladrius)
---

# Project Practices (lessons from Kaladrius)

[Kaladrius](https://github.com/facchini-miguel/kaladrius) is an open-source clinic management system
(Python, Django, PostgreSQL), so it has nothing to teach us about **gameplay**. What it does very well is
**run a project**: every version has release notes written once and shown everywhere, every important
choice is logged, CI checks that nothing drifts out of sync, and the product, the docs and the README speak
the same languages. This page compares the two projects and turns what is worth taking into milestone
**M2.5: Foundations** on the [roadmap](../roadmap.md).

## Side by side

| Practice | Kaladrius | RECOMPILE today | Verdict |
|---|---|---|---|
| Licence | Apache 2.0, plus a `NOTICE` that keeps the name and logo out of it | **No licence at all**: legally nobody may reuse anything | **Adopt** (your choice of licence) |
| Contributor docs | `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, `CODEOWNERS` | None | **Adopt** (short versions) |
| README | Current version, CI badge, demo link, task table, three languages | Bilingual, but the status still says "M2.2, next: 3D" | **Adopt**: keep it current, checked by a test |
| Version number | SemVer, `0.x` until real use, one source of truth | `package.json` frozen at `0.1.0`, no tags, no releases | **Adopt** |
| Release notes | `releases.yaml` feeds the in-app "What's new", the API, the footer and GitHub Releases | Only the roadmap and PR descriptions | **Adapt**: one `releases` file feeding an in-game "What's new", a docs changelog and GitHub Releases |
| Decision log | Numbered table, date, reason, *superseded by* | Decisions live in the roadmap and in PRs (Phaser → Three.js, CC0 packs, Space = dash…) | **Adopt** |
| Glossary | Yes | Terms spread across pages (Compile, Power, port, subroutine…) | **Adopt** |
| User manual vs design spec | Separate: the manual says what exists, project docs say what is planned | Mixed: the controls page lists keys that are not in the game yet (scan, consumables, map) | **Adapt**: a "How to play" page for the playable build; design pages mark what is planned |
| Interface languages | Three, and CI fails if a text is not translated | Docs EN + PT-BR, but the **game itself is English only** | **Adapt**: game UI in EN + PT-BR, with a test that every text has both |
| Docs parity | Built in CI in three languages | Built in CI; nothing checks that every EN page has a PT-BR twin | **Adopt**: a test for it |
| Coverage | Measured in CI, 90% minimum | Not measured | **Adopt** for `game/src/sim/` (rules), not the renderer |
| Pinned CI | Actions pinned to a commit SHA, `persist-credentials: false`, minimal permissions | Actions pinned to tags | **Adopt** |
| Dependabot | Grouped, 7-day cooldown (a compromised release is usually pulled within days) | Weekly, no cooldown, game deps ungrouped | **Adopt** |
| One version of the runtime | `.python-version` read by CI, image and locks, checked by a test | Node 24 written twice in CI | **Adopt**: `.nvmrc` + `node-version-file` |
| Sample data / demo | Commands to seed, remove and simulate data | `?seed=` only | **Adapt**: playtest flags (`?level=`, `?version=`, `?xp=`) and a debug panel |
| Packaging, Docker, PostgreSQL, monitoring, multi-tenant | Central to a server product | A static web game on GitHub Pages | **Skip** |
| Third language (Spanish) | Yes | No | **Later**, if there is an audience |

## M2.5: Foundations

Small steps, each one pull request, in this order. None of them changes how the game plays, so they can be
done before (or between) the gameplay milestones.

### Step 1: Licence and the front door

- [ ] **Choose a licence** (decision for the owner). Suggested: MIT or Apache 2.0 for the code; the story,
      names and logo kept out of it with a `NOTICE`, like Kaladrius does. Third-party models stay CC0 (see `CREDITS.md`).
- [ ] `LICENSE`, `NOTICE`, short `CONTRIBUTING.md` (branch, tests, both languages), `SECURITY.md`,
      `CODE_OF_CONDUCT.md`.
- [ ] README: current status (M2.4 done), version, CI badge, play link, a task table (dev, test, e2e, docs,
      import scripts).

### Step 2: Versions and "What's new"

- [ ] SemVer from **0.5.0** (M2.4 + pacing + Learning). Minor for each milestone or feature, patch for fixes;
      `1.0.0` is the itch.io release (M7).
- [ ] One `releases` file (version, date, title and notes in EN + PT-BR, kind: new / improvement / fix).
- [ ] It feeds: an in-game **What's new** on the title screen (and a "new version" dot until it is opened),
      a **Changelog** page in the docs, and the GitHub Release text; each release gets a git tag.
- [ ] Tests: the file is valid, the newest version equals `package.json`, the README shows it.

### Step 3: Decisions and words

- [ ] **Decision log** page, back-filled with the choices made so far (Phaser 4, then Three.js; renderer-agnostic
      sim; CC0 Quaternius packs; hand-modelled ECHO bodies; Space = dash; XP/subroutines; hunter drones; audit gate
      for the unpatched picomatch advisory…), each with date, reason and *superseded by*.
- [ ] **Glossary**: ECHO, version, Compile, port, Power, DATA, SCRAP, threat, module, tag, subroutine, iteration, hunter.

### Step 4: CI and supply chain

- [ ] Pin every action to a commit SHA (tag in a comment); `persist-credentials: false` everywhere; least permissions per job.
- [ ] Dependabot: 7-day cooldown, grouped minor/patch updates for the game too.
- [ ] `.nvmrc` as the single Node version, read by CI (`node-version-file`).
- [ ] Coverage for `game/src/sim/` with a floor (measure first, then set it a few points below).
- [ ] A test that every EN docs page has a PT-BR twin with the same headings.

### Step 5: Players first

- [ ] **Game UI in EN + PT-BR**: texts moved to a dictionary, language picked from the browser and switchable on
      the title screen, a test that every key exists in both languages.
- [ ] **How to play** page (what the current build really has); design pages mark planned features as *planned*.
- [ ] **Playtest flags**: `?level=undercity`, `?version=v1`, `?xp=`, `?threat=` and a small debug panel (off in
      production builds), so balance changes can be checked in seconds.

When M2.5 is done, continue with **M2.3: Run structure**.
