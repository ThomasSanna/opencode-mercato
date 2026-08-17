# M5 — Polish: Settings Screen, Restore UI, Toasts & Windows Path Coverage Implementation Plan

> Date: 2026-08-17 · Status: ready for execution
> Scope: Settings management & TUI screen, Restore backups journal & UI,
> Toast notification component & lifecycle, Windows path coverage & normalization.
> Applies the contract in `AGENTS.md`.

## Task Breakdown

### Task 1: Core Settings Helpers & Definition (`src/core/settings.ts` + `test/core/settings.test.ts`)
- Define `SETTING_DEFINITIONS` metadata (keys, labels, descriptions, toggle/cycle options).
- Add helper functions: `toggleSetting(settings, key)` and `cycleSetting(settings, key)`.
- Unit tests in `test/core/settings.test.ts`.

### Task 2: Persistent Settings Adapter (`src/adapters/settings.ts` + `test/adapters/settings.test.ts`)
- `loadSettings(options)`: Reads and parses `mercato.json` in global config directory, falling back to defaults.
- `saveSettings(settings, options)`: Writes `mercato.json` atomically with backup/temp file.
- Unit tests in `test/adapters/settings.test.ts`.

### Task 3: Backups & Restore Adapter (`src/adapters/backups.ts` + `test/adapters/backups.test.ts`)
- `listBackups(options)`: Discovers `.bak` and snapshot files in global and local config directories.
- `restoreBackup(backup, options)`: Atomically restores a backup to its target path with a pre-restore safety copy.
- Unit tests in `test/adapters/backups.test.ts`.

### Task 4: Windows Path Normalization & Coverage (`src/adapters/paths.ts` + `test/adapters/paths.test.ts`)
- Add `normalizePath(p: string): string` to normalize backslashes/forward slashes.
- Harden `getGlobalConfigDir`, `getLocalConfigDir`, `getScopeConfigPath`, and `getScopeBaseDir` for Windows drive letters, APPDATA, USERPROFILE, and cross-platform edge cases.
- Comprehensive unit tests in `test/adapters/paths.test.ts`.

### Task 5: Flow State Machine Updates (`src/core/flow.ts` + `test/core/flow.test.ts`)
- Add `SettingsState` and `RestoreState` interface definitions.
- Implement transitions:
  - `openSettings(listState)` -> `SettingsState`
  - `backFromSettings(settingsState)` -> `ListState`
  - `moveSettingsSelection(settingsState, delta, total)` -> `SettingsState`
  - `openRestore(listState)` -> `RestoreState`
  - `backFromRestore(restoreState)` -> `ListState`
  - `moveRestoreSelection(restoreState, delta, total)` -> `RestoreState`
- Unit tests in `test/core/flow.test.ts`.

### Task 6: Toast Component & User-Facing Strings (`src/tui/components/toast.tsx`, `src/tui/strings.ts` + `test/tui/strings.test.ts`)
- Create `src/tui/components/toast.tsx` presenting styled transient status banners.
- Centralize all new user-facing strings in `src/tui/strings.ts` (settings, restore, toasts, shortcuts).
- Unit tests in `test/tui/strings.test.ts` and `test/tui/toast.test.tsx`.

### Task 7: TUI Screens for Settings and Restore (`src/tui/screens/settings.tsx`, `src/tui/screens/restore.tsx` + tests)
- `src/tui/screens/settings.tsx`: Render settings list with active values `[ON]`/`[OFF]`/`[24h]`, cursor, and description box.
- `src/tui/screens/restore.tsx`: Render backups journal with timestamps, file size, scope, and restore actions.
- Component tests in `test/tui/settings.test.tsx` and `test/tui/restore.test.tsx`.

### Task 8: Dialog & Key Handlers Integration (`src/tui/dialog.tsx`, `src/tui/handlers.ts` + tests)
- Integrate settings and backups loading/saving in dialog state.
- Support `s` (Settings), `r` (Restore), `u` (Updates) shortcuts in list screen.
- Key navigation in SettingsScreen (toggle/cycle with Enter/Space/Arrows) and RestoreScreen (restore with Enter).
- Toast display upon actions (restore, toggle, install, etc.).
- Unit tests in `test/tui/handlers.test.ts` and `test/tui/dialog.test.tsx`.

### Task 9: Full Verification Gate
- Run `bun test` and `tsc --noEmit` ensuring 100% pass rate with zero errors.
- Confirm adherence to `AGENTS.md` (no god files, modularity, strict TS, ports & adapters).
