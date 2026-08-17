# M5 — Polish: Settings Screen, Restore UI, Toasts & Windows Path Coverage Design

> Date: 2026-08-17 · Status: approved for implementation
> Scope: Settings management & TUI screen, Restore backups journal & UI,
> Toast notification component & lifecycle, Windows path coverage & normalization.
> Applies the contract in `AGENTS.md`.

## 1. Context & Objectives

`opencode-mercato` is the OpenCode V2 marketplace for plugins, MCP servers,
skills, themes, and agents inside the OpenCode TUI.
M0 (scaffolding), M1 (data layer aggregation & cache), M2 (TUI shell),
M3 (Lifecycle engine & installation pipeline), and M4 (Versions & updates engine)
are complete.

M5 completes the v1.1 milestone with **Polish & System Integrations**:
1. **Settings Engine & Persistence** (`src/core/settings.ts`, `src/adapters/settings.ts`):
   - Load and save user preferences to disk (`mercato.json` in global config dir).
   - Dynamic toggling and cycling of settings: `autoUpdate`, `autoUpdateMajor`,
     `cacheTtlHours`, `defaultScope`, `checkUpdatesOnOpen`, `replaceNativeManager`.
2. **Settings TUI Screen** (`src/tui/screens/settings.tsx`):
   - Interactive settings screen with toggles, cycle options, descriptions, and keyboard controls.
3. **Restore Backups Engine & Screen** (`src/adapters/backups.ts`, `src/tui/screens/restore.tsx`):
   - Journal and discovery of backup files (`.bak` files from config writes and pre-install snapshots).
   - Atomic rollback / restore action with pre-restore safety snapshot.
   - Interactive `RestoreScreen` showing available backups, timestamps, scopes, and restore actions.
4. **Toast Overlay & Visual Feedback** (`src/tui/components/toast.tsx`, `src/tui/dialog.tsx`):
   - Floating notification banner in the TUI dialog for immediate feedback (install, update, restore, toggle, errors) with timer dismiss.
5. **Windows Path Coverage & Cross-Platform Normalization** (`src/adapters/paths.ts`):
   - Hardened support for Windows drives (`C:\`, `D:\`), backslash normalization, `%APPDATA%`, `%USERPROFILE%`, and POSIX `$XDG_CONFIG_HOME` / `~/.config/opencode`.
6. **Keymap & Flow Navigation** (`src/core/flow.ts`, `src/tui/handlers.ts`, `src/tui/strings.ts`):
   - Seamless shortcuts from catalog: `s` (Settings), `r` (Restore), `u` (Updates).

---

## 2. Product Model & Types

### 2.1 Settings Model & Persistence (`src/core/settings.ts`, `src/adapters/settings.ts`)

```ts
export interface MercatoSettings {
  autoUpdate: boolean;
  autoUpdateMajor: boolean;
  cacheTtlHours: number;
  defaultScope: InstallScope;
  checkUpdatesOnOpen: boolean;
  replaceNativeManager: boolean;
}

export type SettingKey = keyof MercatoSettings;

export interface SettingOptionDef {
  key: SettingKey;
  label: string;
  description: string;
  type: "boolean" | "cycle";
  options?: unknown[];
}
```

### 2.2 Backup Journal Model (`src/adapters/backups.ts`)

```ts
export interface BackupEntry {
  id: string;
  filePath: string;
  targetConfigPath: string;
  scope: InstallScope;
  timestamp: number;
  formattedDate: string;
  sizeBytes: number;
  kindSummary: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  targetPath: string;
  previousBackupPath?: string;
}
```

### 2.3 Flow State Machine (`src/core/flow.ts`)

```ts
export interface SettingsState {
  readonly screen: "settings";
  readonly selectedIndex: number;
  readonly previousListState: ListState;
}

export interface RestoreState {
  readonly screen: "restore";
  readonly selectedIndex: number;
  readonly previousListState: ListState;
}
```

---

## 3. Architecture & Implementation

### 3.1 Settings Management (`src/adapters/settings.ts`)
- File location: `path.join(getGlobalConfigDir(options), "mercato.json")`.
- `loadSettings(options)`: Reads and parses JSON with `parseSettings()` fallback to `DEFAULT_SETTINGS`.
- `saveSettings(settings, options)`: Writes `mercato.json` atomically with comment support.

### 3.2 Backup Journal & Restore (`src/adapters/backups.ts`)
- Scans global and local config directories for `.bak` files (e.g. `opencode.json.bak`, `opencode.json.bak.*`).
- Extracts metadata: modification date, file size, scope, config snapshot preview.
- `restoreBackup(backup, options)`:
  1. Makes a safety backup of current target config before overwriting.
  2. Copies the backup content to the target config path atomically.
  3. Returns a structured `RestoreResult`.

### 3.3 Toast Component (`src/tui/components/toast.tsx`)
- Box component positioned at the bottom of the dialog.
- Styled with distinct theme borders / colors for success, info, and error notifications.
- Managed by `showToast(msg)` with optional auto-dismiss timer.

### 3.4 Cross-Platform Path Normalization (`src/adapters/paths.ts`)
- `normalizePath(p: string): string`: Normalizes forward/backward slashes.
- Enhanced Windows tests covering drive letters (`E:\...`), environment variables (`APPDATA`, `USERPROFILE`, `LOCALAPPDATA`), and path concatenation.

---

## 4. TUI Screens & Navigation

1. **`SettingsScreen` (`src/tui/screens/settings.tsx`)**:
   - Lists each setting with title, current value (highlighted `[ON]` / `[OFF]`, `[24h]`, `[global]`), and explanatory description.
   - Keys:
     - `↑` / `↓`: Move selection cursor.
     - `Enter` / `Space` / `←` / `→`: Toggle or cycle option.
     - `Esc`: Save and return to List screen.

2. **`RestoreScreen` (`src/tui/screens/restore.tsx`)**:
   - Lists available backup snapshots sorted newest first with timestamp and file size.
   - Displays metadata of the selected backup (scope, path, target).
   - Keys:
     - `↑` / `↓`: Navigate backups.
     - `Enter`: Restore selected backup (triggers toast and refreshes snapshot).
     - `Esc`: Return to List screen.

3. **`ListScreen` & Footer Updates**:
   - Footer shortcuts: `↑/↓ Select • Enter Details • Tab Kind • u Updates • s Settings • r Restore • Esc Close`.
   - Keys `s` and `r` navigate to Settings and Restore screens when search query is empty.

---

## 5. Testing & Modularity

- Pure modules with 100% test coverage:
  - `test/core/settings.test.ts`
  - `test/adapters/settings.test.ts`
  - `test/adapters/backups.test.ts`
  - `test/adapters/paths.test.ts`
  - `test/tui/settings.test.tsx`
  - `test/tui/restore.test.tsx`
  - `test/tui/toast.test.tsx`
- All files strictly under 300 lines conforming to `AGENTS.md`.
