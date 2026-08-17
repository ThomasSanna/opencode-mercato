# M4 — Versions, Updates Engine & Downgrade Implementation Plan

> Date: 2026-08-17 · Status: ready for execution
> Scope: Semver engine, update check, auto-update policy (default ON),
> update execution, version history & downgrade picker, updates screen,
> and content-hash updates for versionless items (skills/agents/commands).
> Applies the contract in `AGENTS.md`.

## Task Breakdown

### Task 1: Settings Engine (`src/core/settings.ts` + `test/core/settings.test.ts`)
- Model `MercatoSettings`: `autoUpdate` (default true), `autoUpdateMajor` (default false), `cacheTtlHours` (default 24), `defaultScope` (default "global"), `checkUpdatesOnOpen` (default true), `replaceNativeManager` (default true).
- `DEFAULT_SETTINGS` object.
- `parseSettings(raw)` and `mergeSettings(base, overrides)`.
- Unit tests in `test/core/settings.test.ts`.

### Task 2: SemVer, Content-Hash & Policy Engine (`src/core/versions.ts` + `test/core/versions.test.ts`)
- Strict SemVer parser conforming to SemVer 2.0.0 (`parseSemver`).
- SemVer comparator (`compareSemver`).
- Version diff classifier (`semverDiff`: major, minor, patch, prerelease, identical, downgrade).
- Auto-update policy evaluator (`isAutoUpdateEligible`).
- Content-hash helper (`computeContentHash`).
- Item update checker (`checkItemUpdate`, `getUpdateState`).
- Unit tests in `test/core/versions.test.ts`.

### Task 3: Config & Snapshot Version Extraction (`src/adapters/config.ts`, `src/adapters/snapshot.ts`)
- `extractPackageVersion(spec: string): string | null` in `src/adapters/config.ts`.
- Extract installed plugin versions in `ConfigSnapshot.installedPlugins: Record<string, string | null>`.
- Extract installed file hashes in `ConfigSnapshot.fileHashes: Record<string, string>`.
- Unit tests in `test/adapters/config.test.ts` and `test/adapters/snapshot.test.ts`.

### Task 4: Exact Version / Downgrade Install Planner (`src/core/install-plan.ts`)
- Support `targetVersion` option in `createInstallPlan(item, scope, context, options)`.
- When updating/downgrading from `pkg@1.0.0` to `pkg@1.2.0` or `pkg@0.9.0`, generate appropriate replace diffs and summaries.
- For versionless items, support updating file content when content hash differs.
- Unit tests in `test/core/install-plan.test.ts`.

### Task 5: Flow State Machine Updates (`src/core/flow.ts` + `test/core/flow.test.ts`)
- Add `UpdatesState` and `VersionsState` types.
- Navigation transitions:
  - `openUpdates(listState)` -> `UpdatesState`
  - `backFromUpdates(updatesState)` -> `ListState`
  - `moveUpdatesSelection(updatesState, delta, total)` -> `UpdatesState`
  - `openVersions(detailState, versions, currentVersion)` -> `VersionsState`
  - `backFromVersions(versionsState)` -> `DetailState`
  - `moveVersionsSelection(versionsState, delta, total)` -> `VersionsState`
- Unit tests in `test/core/flow.test.ts`.

### Task 6: TUI Screens for Updates and Versions (`src/tui/screens/updates.tsx`, `src/tui/screens/versions.tsx`, `src/tui/strings.ts`)
- `src/tui/screens/updates.tsx`: screen displaying pending updates with severity badges, update actions.
- `src/tui/screens/versions.tsx`: screen displaying version list with `[current]` marker, selection cursor.
- Add user-facing strings to `src/tui/strings.ts`.
- Tests in `test/tui/updates.test.tsx`, `test/tui/versions.test.tsx`, `test/tui/strings.test.ts`.

### Task 7: TUI Dialog Integration & Update Actions (`src/tui/dialog.tsx`, `src/tui/screens/detail.tsx`, `src/tui/screens/list.tsx`)
- DetailScreen: show update action `[Update to vX.Y.Z]` when update is available; show `[Version History / Downgrade]` for npm packages.
- ListScreen: show update badge indicator next to items with updates; `u` hotkey to open UpdatesScreen.
- Dialog: handle `updates` and `versions` screen rendering, keyboard navigation, and execution of updates/downgrades.
- Unit and component tests in `test/tui/dialog.test.tsx`, `test/tui/screens.test.tsx`.

### Task 8: Full Verification Gate
- Run `tsc --noEmit` and `bun test` ensuring 100% pass rate with zero errors.
- Confirm adherence to `AGENTS.md` (no god files, modularity, strict TS, ports & adapters).
