# opencode-mercato — Architecture & Design

> Status: **Implemented (M0–M5 complete)** · Date: 2026-08-17
> Applies the contract in `AGENTS.md`: strict TS, ports & adapters, thin entry,
> no god files, tests mirror modules, **extremely lightweight** (zero runtime
> deps beyond the pinned SDK), V2 only, English only.
> Package name: **`opencode-mercato`** (verified free on npm, 2026-08-16).

## 1. Vision

A VS Code-style marketplace — but for **everything** OpenCode: plugins, MCP
servers, skills, themes, and agents — inside the OpenCode TUI. The command
`/mercato` (and palette entry `Mercato`) opens a modal where the user can
**browse, search, install, enable, disable, update, downgrade** any item,
toggle **auto-update** (ON by default), and open the npm or GitHub page of any
item.

Inspired by `Mirrowel/opencode-souk` (same concept, different execution — see
§2). The catalog is **not ours**: it is transparently aggregated from the three
community sources (§5), credited in the repo (`CREDITS.md`).

## 2. Inspiration — opencode-souk (borrow patterns, build fresh)

Souk is dormant, unfinished, built on V1-era constraints (no tests, god-file
`tui.tsx` ~2k lines, unpinned deps, no version management). V2 gives us real
TUI primitives (dialog stack, palette layers, live plugin toggling) — our
plugin is V2-native and strictly better.

- **Borrow** (patterns, not code):
  - Dialog **screen-loop** controller: `api.ui.dialog.replace` + Promise-based
    `showXOnce()` + re-render loop per action.
  - Palette command via `api.keymap.registerLayer` (`namespace: "palette"`,
    `slashName`) + `api.mode.push("mercato.dialog")` to block background input.
  - Deactivate `internal:plugin-manager` and take over its role
    (`api.plugins.deactivate`).
  - Install pipeline: **preview (dry-run) → backup → refuse conflicts →
    atomic write**.
  - **Per-kind install planners** (plugin / mcp / agent / command / skill /
    theme) with a preview step before any write.
  - Provenance + **trust score per data source**, merged by canonical repo URL.
  - JSONC-preserving config patching (`comment-json`).
- **Avoid**: god-file TUI, unpinned deps, live-count assertions, no-test CI.

## 3. Product model

| Kind | What it is | Install target |
|---|---|---|
| `plugin` | OpenCode plugin (server/tui/dual) | `api.plugins.install` (fallback `opencode plugin` CLI) |
| `mcp` | MCP server config | `opencode.json` `mcp` block + runtime `client.mcp.add/connect` |
| `skill` | `.opencode/skills/<name>/SKILL.md` | copy into `.opencode/skills/` (user or project) |
| `agent` | `.opencode/agent/*.md` | copy into `.opencode/agent/` |
| `theme` | theme package (`oc-themes` entrypoint) or theme config | config `theme` + npm install |
| *(command)* | `.opencode/command/*.md` | copy into `.opencode/command/` — supported if sources expose them |

| Concept | Meaning |
|---|---|
| **Item** | One entry in the merged catalog: kind, name, description, source(s), repo/npm URL, install spec. |
| **Status** | `not-installed` · `installed` · `enabled` / `disabled` (runtime map). |
| **Update state** | `up-to-date` · `update-available` (patch/minor) · `major-available` · `unknown` (offline). |
| **Scope** | `global` (`~/.config/opencode/` — `%APPDATA%\opencode` on Windows) or `local` (project `.opencode/`). |

## 4. Architecture overview

**Dual entrypoint**, installed as one npm package:

```
exports["./server"]  → src/server/index.ts   (Plugin.define: tools, config hook, lifecycle)
exports["./tui"]     → src/tui/index.tsx     (tui(api): dialog screens, palette, keymap, kv)
```

The **TUI layer is presentation only**; all decisions live in a pure,
headless-testable core. Ports & adapters keep SDK/IO access thin and mocked in
tests.

```
┌────────────── TUI (SolidJS screens) ──────────────┐
│ palette cmd → dialog stack → screen loop           │
│ screens render flow state (pure state → JSX)       │
└──────────────┬────────────────────────────────────┘
               │ actions (install, toggle, update…)
┌──────────────▼────────────────────────────────────┐
│ core/  flow.ts (state machine, pure + tested)      │
│        settings.ts, versions.ts, merge.ts,          │
│        trust.ts, install-plan.ts                   │
└──────────────┬────────────────────────────────────┘
               │ ports (interfaces, mocked in tests)
┌──────────────▼────────────────────────────────────┐
│ adapters/ sources/cafe.ts awesome.ts ecosystem.ts │
│           npm.ts (per-item, on demand)             │
│           install/plugin.ts mcp.ts copy.ts theme.ts│
│           config.ts (JSONC, atomic, backup)        │
│           cache.ts (file + TTL + offline)          │
└───────────────────────────────────────────────────┘
```

## 5. Data layer — aggregation, not ownership

The catalog is **transparently aggregated** from three community sources
(credited in `CREDITS.md`, linked in README; licenses respected; nothing
repackaged as ours):

| Source | Access | Trust |
|---|---|---|
| **opencode.cafe** | Convex API query `extensions:listAllApproved` | high (approval list) |
| **awesome-opencode** | `registry.json` in the repo | medium |
| **OpenCode ecosystem docs** | `ecosystem.mdx` table (opencode.ai) | medium |

- **Merge**: normalize each source → **dedupe by canonical repo URL** → keep
  provenance array + trust score per item (best install spec wins).
- **Freshness**: refetch on manual refresh; on-disk cache with TTL (6–24 h);
  **offline degrades to last cached snapshot**.
- **npm registry** (`registry.npmjs.org/<pkg>`): live versions, dist-tags,
  publish dates — **queried per item, on demand**, never for the whole catalog.
- Downloads (`api.npmjs.org/downloads/point/last-month/<pkg>`) as a trust
  signal, long TTL.
- GitHub API is **not** a data source (rate limits); GitHub is a hyperlink.
- **No network work at plugin load** — load must be zero-cost.

## 6. TUI layer

- **Entry**: palette command `Mercato` (`slashName: "mercato"`, category
  `Plugin Manager`) via `api.keymap.registerLayer`; `api.mode.push` while the
  dialog is open; deactivate `internal:plugin-manager` and replace it.
- **Screen loop** (borrowed from Souk, modularized): `flow.ts` state machine
  (`list → detail → confirm → installing → updates → settings → restore →
  exit`) is the tested core; `screens/*.tsx` are thin renderers.
- **Screens**: list (kind filter/tabs, search, status + update badges) ·
  detail (provenance per source, trust signals, versions, install/update/
  downgrade actions, npm/GitHub links) · confirm (config diff preview +
  warnings) · updates (available updates + policy) · settings (auto-update
  toggle, cache, scope) · restore (backups journal).
- **Helpers**: `DialogSelect`/`DialogConfirm`/`DialogPrompt`, `toast`,
  `api.kv` for UI prefs, `api.theme.current`. Keybinds per screen via
  `registerLayer`. All user-facing strings centralized and tested.

## 7. Lifecycle engine

| Action | Mechanism |
|---|---|
| **Install** | Preview (diff + warnings) → per-kind planner → backup → write. Plugin: `api.plugins.install(spec, {global})`, fallback `opencode plugin <pkg>@<exact>`. MCP: config patch + `client.mcp.add/connect`. Skill/agent/command: fetch from the source repo's conventional path, copy with conflict-refusal. Theme: config patch (+ npm install if package). |
| **Enable / disable** | Plugins: `api.plugins.activate/deactivate` — live, no restart (self-deactivation guarded). Other kinds: presence in config/files. |
| **Update check** | Only when the market opens (never at load). Only for **installed** items. Persist last-check + last-failure; backoff. |
| **Auto-update** | Toggle **ON by default**, per-item override. **Per-kind policy**: *plugins/MCPs* — patch/minor auto within the same major, major always confirmed; *skills/agents/themes/commands* — versionless file copies, "update" = content-hash refresh from the source, applied only when content actually changed (never blind re-copy). |
| **Update execution** | Reinstall pinned new exact version with `--force` semantics (OpenCode's cache short-circuits otherwise); toast + "restart required" for loaded plugins. |
| **Downgrade** | Pick exact version from history → reinstall pinned. |
| **Uninstall** | Deactivate → remove from config (atomic JSONC patch + backup) → offer cache cleanup. |

## 8. Security & trust

- **Provenance transparency**: every item shows its source(s) and trust level;
  aggregated data is credited, never claimed as ours.
- **Warnings**: installs outside the high-trust source show maintainer,
  license, publish date, downloads, and a lifecycle-scripts notice. Never
  `--ignore-scripts` silently — warn instead.
- **MCP caution**: MCP servers get extra attention (arbitrary command
  execution by design) — show the `command`/`args`/`env` in the preview.
- **Backups**: pre-install snapshot + journal (limit N, restorable in UI).
- **Conflict refusal**: never overwrite differing existing values without
  explicit user choice.
- **No secrets**: public repo rule from AGENTS.md applies to CREDITS and
  sources too.

## 9. Settings (per-user, `api.kv` + settings file)

`autoUpdate` (default `true`) · `autoUpdateMajor` (default `false`) ·
`cacheTtlHours` (default `24`) · `defaultScope` (**global** by default,
switchable per install) · dialog size · trust threshold for warning banners ·
`replaceNativeManager` (default `true` — see §13.3).

## 10. Module layout

```
src/
  index.ts                  # thin re-export (AGENTS.md rule)
  server/index.ts           # Plugin.define entry (V2 SDK only)
  tui/index.tsx             # tui(api) entry: palette cmd, keymap, dialog loop
  core/
    flow.ts                 # state machine list→…→exit (pure, tested)
    merge.ts                # source normalization + dedupe by repo URL (pure)
    trust.ts                # trust scores + warning policy (pure)
    install-plan.ts         # per-kind install plans (pure)
    versions.ts             # semver policy: auto-update decision (pure)
    settings.ts             # settings model + defaults (pure)
  adapters/
    sources/cafe.ts awesome.ts ecosystem.ts   # one adapter per source
    npm.ts                  # registry.npmjs.org per-item queries (HTTP)
    install/plugin.ts mcp.ts copy.ts theme.ts # per-kind installers
    config.ts               # JSONC patch, atomic write, backups, conflicts
    cache.ts                # file cache + TTL + offline fallback
  tui/
    screens/list.tsx detail.tsx confirm.tsx updates.tsx settings.tsx restore.tsx
    components/…            # shared small UI pieces
    strings.ts              # all user-facing strings (tested)
test/                       # mirrors src/ one-to-one
CREDITS.md                  # sources credited transparently
docs/                       # this doc + workflow
.github/                    # CI: typecheck + tests + release-please (reference parity)
```

Dependencies: `@opencode-ai/plugin` (pinned EXACT), `@opencode-ai/plugin/tui`,
`comment-json` (JSONC patching), `solid-js` + `@opentui/solid` (TUI rendering,
devPeer). Nothing else.

## 11. MVP scope & roadmap

**MVP (M0–M3)**
- M0 Scaffold: package.json dual exports, tsconfig strict, CI (typecheck +
  tests), CREDITS.md.
- M1 Data: source adapters (cafe, awesome, ecosystem), merge/dedupe, npm
  client, cache + TTL, offline fallback — pure, tested.
- M2 TUI shell: palette command, dialog screen loop, list + detail over cached
  data, search, kind tabs.
- M3 Lifecycle: install (preview/backup/conflict-refuse) for plugins + MCPs +
  skills/agents, enable/disable, trust signals.

**v1.1 (M4–M5)**
- M4 Versions: update check, auto-update policy (default ON), update
  execution, downgrade with history. Themes + commands kinds.
- M5 Polish: settings screen, restore UI, toasts, Windows path coverage.

**v2 (cut-likely)**
- Trending, README one-command install badge, ratings (needs a backend —
  almost certainly cut), dependency/compat checks.

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Source breakage (Convex API, table formats change) | Adapter per source + fixture-based tests; one broken source degrades to the others |
| Config corruption / race with OpenCode watcher | Atomic rename + `.bak` + validate before write; prefer SDK APIs over hand-editing |
| Update of loaded plugin breaks session | "Restart required" messaging; never self-reinstall |
| npm child-process hang / Windows resolution | Timeout + kill + streamed progress; prefer `api.plugins.install` |
| Malicious item from a low-trust source | Trust scores + provenance + preview warnings + MCP-specific caution |
| Scope creep (ratings, sandboxing, Forge-like bloat) | YAGNI — cut from MVP, revisit only on evidence |
| Souk-style god file | AGENTS.md limits: one screen per module, <300 lines, flow in core |

## 13. Decisions log

1. **Name: `opencode-mercato`** (2026-08-16). Rejected: `opencode-market`,
   `opencode-marketplace`, `opencode-hub` (taken), `opencode-bazaar` (too
   close to souk), `opencode-agora` (squatting risk after unpublish).
2. **Auto-update**: per-kind policies (§7); scope global by default,
   switchable per install (§9).
3. **`internal:plugin-manager`**: replaced for now (Souk pattern: deactivate
   and take over), `replaceNativeManager` setting (default `true`) as
   fallback.
