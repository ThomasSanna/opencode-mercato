# AGENTS.md — opencode-mercato

`opencode-mercato` is the public marketplace for **everything OpenCode**: a
curated store where users discover, compare, and install plugins, MCP servers,
skills, themes, and agents — inside the OpenCode TUI. OpenCode **V2 only**.

The catalog is **transparently aggregated** (never owned) from community
sources — opencode.cafe, awesome-opencode, and the OpenCode ecosystem docs —
credited in `CREDITS.md`.

> This file is the contract for every agent and contributor working in this
> repo. If a rule here conflicts with a general instruction, this file wins.

## 1. Quality bar

The repository is **public** and must keep a great quality and organized
structure. Copy the structure and quality of the reference repositories — do
not reinvent:

- **Reference (external):** https://github.com/code-yeongyu/oh-my-openagent/
- **Reference (ours — same CI/CD, structure, and quality):**
  `E:\programmes\apps\opencode-plugins\opencode-tell-sessions`
- **Inspiration (concept only — dormant, V1-era, borrow patterns, don't fork):**
  https://github.com/Mirrowel/opencode-souk

Before starting any task, look at how the reference solves the same problem
(folder layout, CI workflows, docs, release automation) and mirror it.

## 2. Repository layout & modularity

| Path | Purpose |
|---|---|
| `src/` | Source code, organized by domain — one folder per feature. |
| `src/index.ts` | Thin entry point. Exports only what the loader needs; no business logic. |
| `src/server.ts` | Server plugin entry (`exports["./server"]`) — thin `Plugin.define` adapter. |
| `src/tui.tsx` | TUI plugin entry (`exports["./tui"]`) — dialog screens, palette, keymap. |
| `src/core/` | Pure, headless-testable logic (flow, versions, settings, integrity). |
| `src/adapters/` | Thin SDK/IO adapters (sources, npm, install, config, cache) — one port each. |
| `CREDITS.md` | Community data sources credited transparently (opencode.cafe, awesome-opencode, ecosystem docs). |
| `test/` | Tests, mirroring the `src/` structure. |
| `.opencode/` | Skills (`skills/`) and commands (`command/`) shipped with the repo. |
| `docs/` | Design specs, workflow docs, and plans. |
| `.github/` | CI/CD workflows and PR templates, matching the reference repo. |

### Modularity rules

- **Everything is in english.** All code, identifiers, comments, commit messages, issues, and docs
  are in English.
- **Everything is a module.**
- **One concern per module.** A file does one thing and names it.
- **Thin entry point.** Logic lives in modules, never in the entry file.
- **Ports & adapters.** Separate pure logic from IO/SDK adapters: pure
  functions are unit-tested directly; adapters stay thin and only wrap the
  OpenCode V2 SDK (`@opencode-ai/plugin`), so the core logic stays agnostic.
- **No circular imports.** If two modules depend on each other, extract the
  shared part into a third module.
- **No god files.** Split a file that exceeds ~300 lines or handles more than
  one concern.
- **Tests mirror modules.** `test/helpers.test.ts` ↔ `src/helpers.ts`.
- **Structure changes are documented.** If the layout table above becomes
  stale, update it in the same commit that changed the structure.

## 3. Code quality rules

- **Strict TypeScript.** `strict: true`. No `as any`, no `@ts-ignore`, no
  `@ts-expect-error`. If types fight you, fix the types.
- **Extremely lightweight.** Zero or near-zero runtime dependencies — prefer
  Node built-ins and the OpenCode SDK. Every added dependency must be
  justified; no heavy frameworks, no unnecessary abstractions, fast startup.
- **English only.** All code, identifiers, comments, commit messages, issues,
  and docs in English.
- **Every behavior change ships with a test.** The CI gate runs the test suite
  and the typecheck on every push/PR.
- **Bugfix rule.** Fix minimally; never refactor while fixing. A bugfix PR
  contains the fix and its test — nothing else.
- **No dead code.** No unused exports, parameters, or dependencies. Delete or
  justify.
- **Explicit over clever.** Prefer readable, boring code over clever one-liners.
- **No magic values.** Constants are named and colocated with their use.
- **Errors are handled.** No silent `catch {}`; propagate or log with context.
- **No leftover `console.log`.** Use a proper logger or remove before commit.
- **Small commits.** One concern per commit; each commit builds and passes
  tests on its own.

## 4. Guidelines

- **Karpathy's guidelines.** Always read and adhere to Karpathy's guidelines (`karpathy-guidelines` skill) before writing, modifying, or refactoring code:
  1. *Think Before Coding:* State assumptions explicitly, never assume, surface tradeoffs and simpler alternatives.
  2. *Simplicity First:* Minimum code that solves the problem, nothing speculative, no single-use abstractions or unrequested configurability.
  3. *Surgical Changes:* Touch only what you must, match existing style, clean up only your own orphans, never refactor adjacent working code.
  4. *Goal-Driven Execution:* Define verifiable success criteria, write tests to reproduce/verify, iterate until confirmed.
- **OpenCode is a moving target:** Verify against official docs before using an API, and prefer docs over assumptions.
- **OpenCode V2:** https://opencode.ai/v2/docs/build/plugins,
  https://opencode.ai/v2/docs/api, https://opencode.ai/v2/docs/build
- **V2 only.** Plugins in this repo target OpenCode V2 exclusively; V1 APIs
  (legacy `@opencode-ai/sdk`, `plugin()` exports) are out of scope.
- **Transparency.** The catalog aggregates third-party data (opencode.cafe,
  awesome-opencode, ecosystem docs). Credit sources in `CREDITS.md`, link them
  in the README, respect their licenses, and never repackage their content as
  ours. Any new data source must be added to `CREDITS.md` in the same commit.
- Use **web search** for anything not covered by the docs; they change often.
- Record the OpenCode version you validated against in the PR description.

## 5. Workflow rules

- **Public repo only.** Never commit secrets, tokens, or internal-only
  content. Scan for credentials and local absolute paths before committing.
- **Branching.** Branch from `dev` with `feat/`, `fix/`, `refactor:`,
  `chore/`, `docs/` prefixes; PRs merge back to `dev`; releases are cut from
  `main` (see reference workflow).
- **Commit style.** `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `i18n:`.
- **CI/CD parity.** Match the reference repo's workflows: typecheck + tests on
  every push/PR; release automation (e.g. Release Please) from `main`.
- **Lockfiles.** Never edit lockfiles by hand; use the package manager
  (`bun install` / `bun add`).
- **Pinned versions.** Pin `@opencode-ai/plugin` and related OpenCode packages
  EXACTLY — OpenCode V2 is pre-1.0 and a version mismatch breaks the plugin at
  runtime; never loosen a pin.
- **User-facing strings.** If a change alters a user-facing string (tool
  description, message format), update the corresponding test assertions in
  the same commit — tests assert exact strings.
