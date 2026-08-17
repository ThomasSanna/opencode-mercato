# M3 — Lifecycle & Installation Design (opencode-mercato)

> Date: 2026-08-17 · Status: approved for implementation
> Scope: Installation pipeline (preview, backup, conflict refusal, atomic write)
> for plugins, MCP servers, skills, agents, commands, and themes; enable/disable
> toggle; status detection; trust & security warnings; TUI confirm screen.
> Applies the contract in `AGENTS.md`.

## 1. Context & Objectives

`opencode-mercato` is the OpenCode V2 marketplace for plugins, MCP servers,
skills, themes, and agents inside the OpenCode TUI.
M0 (scaffolding), M1 (data layer aggregation & cache), and M2 (TUI shell: list,
detail, search, kind filters) are complete.

M3 delivers the **Lifecycle Engine**:
1. Detecting installation and enable/disable status for any catalog item.
2. Computing per-kind install plans with dry-run preview, diff, security warnings,
   and conflict detection.
3. Executing installation with pre-install backups, JSONC config patching
   (`comment-json`), atomic file writing, and conflict refusal.
4. Enabling/disabling installed items (live for plugins; config-level for MCPs).
5. Providing the TUI `ConfirmScreen` and interactive detail actions (`Install`,
   `Enable`, `Disable`, `Uninstall`).

## 2. Goals & Non-goals

### Goals
- **Per-kind Install Planners** (`src/core/install-plan.ts`):
  - Pure functions that compute target paths, config patches, file writes,
    security warnings, and diff previews.
  - Support scopes: `global` (`~/.config/opencode` or `%APPDATA%\opencode`) and
    `local` (project `./opencode.json` / `./.opencode`).
  - Supported kinds: `plugin`, `mcp`, `skill`, `agent`, `command`, `theme`.
- **JSONC Config Adapter** (`src/adapters/config.ts`):
  - Parse and serialize `opencode.json` / `opencode.jsonc` using `comment-json`
    to preserve user comments, spacing, and key order.
  - Pre-write `.bak` backup creation and journaled snapshots.
  - Atomic writing via temporary file rename (`.tmp` -> target).
- **File Install Adapter** (`src/adapters/install/copy.ts`):
  - Copy and write skills (`.opencode/skills/<name>/SKILL.md`), agents
    (`.opencode/agent/<name>.md`), and commands (`.opencode/command/<name>.md`).
  - Conflict refusal: never overwrite different existing files without explicit
    confirmation.
- **Security & Trust Warnings** (`src/core/trust.ts`, `src/core/install-plan.ts`):
  - Warn on non-high-trust sources.
  - Warn on npm lifecycle scripts for plugins.
  - Explicitly display MCP `command`, `args`, and `env` in previews (security
    transparency against arbitrary code execution).
- **Status Engine** (`src/core/status.ts`):
  - Detect `not-installed` | `installed` | `enabled` | `disabled` from config &
    filesystem state.
- **TUI Integration**:
  - `ConfirmScreen` rendering install plan, diff, warnings, scope toggle, and
    confirm/cancel buttons.
  - Updated `DetailScreen` with dynamic status badge and actions (Install,
    Enable, Disable, Uninstall).
  - Updated `ListScreen` with status badges.
  - Updated `flow.ts` state machine.

### Non-goals (M4+)
- Semver auto-update scheduler / background polling (M4).
- Downgrade version history selector (M4).
- Settings screen for auto-update configuration (M5).
- Restoring backups via TUI history screen (M5).

## 3. Product Model & Types

```ts
export type InstallScope = "global" | "local";

export type ItemStatus = "not-installed" | "installed" | "enabled" | "disabled";

export interface ConfigSnapshot {
  globalConfigPath: string;
  localConfigPath: string | null;
  globalConfig: Record<string, unknown>;
  localConfig: Record<string, unknown> | null;
  installedPluginNames: string[];
  disabledPluginNames: string[];
  configuredMcpServers: Record<string, { enabled?: boolean; command?: string }>;
  existingFiles: string[];
}

export type WarningSeverity = "info" | "warning" | "caution";

export interface PlanWarning {
  severity: WarningSeverity;
  title: string;
  message: string;
}

export interface ConfigDiffEntry {
  path: string; // e.g. "plugin", "mcp.context7"
  action: "add" | "remove" | "replace";
  oldValue?: unknown;
  newValue?: unknown;
}

export interface FileDiffEntry {
  filePath: string;
  action: "create" | "update" | "delete";
  contentPreview?: string;
}

export type ConflictType = "none" | "identical" | "conflict";

export interface InstallPlan {
  item: CatalogItem;
  scope: InstallScope;
  targetConfigPath: string;
  targetFiles: FileDiffEntry[];
  configDiffs: ConfigDiffEntry[];
  warnings: PlanWarning[];
  conflict: ConflictType;
  conflictDetails?: string;
  summary: string;
}

export interface InstallResult {
  ok: boolean;
  message: string;
  backupPath?: string;
  error?: string;
}
```

## 4. Per-Kind Install Planners

1. **`plugin`**:
   - Package spec: `npmSpec` or `id` (e.g. `"opencode-plugin-git"`).
   - Target: `opencode.json` `plugin` array (e.g. `["opencode-plugin-git"]`).
   - Warnings:
     - Low/medium trust warning if not verified on opencode.cafe.
     - Notice that plugin will run in host OpenCode process.
   - Conflict: if already present in `plugin` array.

2. **`mcp`**:
   - MCP spec extracted from `installSpec.cafe` / `installSpec.awesome` / `installSpec.ecosystem`.
   - Fallback structure: `{ command: string, args?: string[], env?: Record<string, string>, type?: string }`.
   - Target: `opencode.json` `mcp` dictionary (`mcp[serverName] = { command, args, env }`).
   - Warnings:
     - **CAUTION**: Arbitrary command execution. Shows exact `command`, `args`, and `env`.
   - Conflict: if `mcp[serverName]` already exists with differing configuration.

3. **`skill`**:
   - Target: `<scopeDir>/skills/<name>/SKILL.md` (where scopeDir is `.opencode` or `~/.config/opencode`).
   - Content: extracted from `installSpec` or default generated skill stub with frontmatter.
   - Conflict: if target file already exists and content differs.

4. **`agent`**:
   - Target: `<scopeDir>/agent/<name>.md`.
   - Content: markdown agent definition.
   - Conflict: if target file exists and content differs.

5. **`command`**:
   - Target: `<scopeDir>/command/<name>.md`.
   - Content: markdown slash command definition.
   - Conflict: if target file exists and content differs.

6. **`theme`**:
   - Target: `opencode.json` `theme` property.
   - Conflict: if `theme` is already set to a different theme.

## 5. Config Adapter (`src/adapters/config.ts`)

- Uses `comment-json` for lossless JSONC parsing and stringifying.
- Path resolution:
  - Global: `%APPDATA%\opencode\opencode.json` (Windows) / `~/.config/opencode/opencode.json` (POSIX).
  - Local: `./opencode.json` or `./.opencode/opencode.json` relative to cwd.
- Atomic write:
  1. Ensure parent directory exists.
  2. Write backup `.bak` file before making any changes.
  3. Write updated JSONC to `<target>.tmp.<pid>.<timestamp>`.
  4. Atomic rename temporary file to `<target>`.
- Operations:
  - `readConfig(path)`: returns parsed JSONC object (or empty object if not found).
  - `writeConfig(path, config)`: atomic write with `.bak` creation.
  - `addPlugin(config, pluginSpec)`: idempotently appends to `plugin` array.
  - `removePlugin(config, pluginSpec)`: removes from `plugin` array.
  - `addMcpServer(config, name, serverDef)`: sets `mcp[name] = serverDef`.
  - `removeMcpServer(config, name)`: deletes `mcp[name]`.
  - `setTheme(config, themeName)`: sets `theme = themeName`.

## 6. Execution Pipeline

When user clicks `[Confirm & Install]`:
1. `plan = createInstallPlan(item, scope, snapshot)`
2. If `plan.conflict === "conflict"`, refuse installation or show conflict warning.
3. Create backup of modified files / config.
4. Execute file writes (for skills/agents/commands).
5. Apply config modifications (for plugins/MCPs/themes) atomically.
6. Return `InstallResult`.
7. TUI shows toast and transitions back to Detail or List with updated status.

## 7. TUI Flow & Screens

- `src/core/flow.ts`:
  - New screen: `confirm` (`ConfirmState`: `screen: "confirm"`, `item`, `plan`, `scope`, `selectedActionIndex`, `previousState`).
  - Transitions:
    - `openConfirm(detailState, plan)` -> `ConfirmState`
    - `toggleConfirmScope(confirmState)` -> toggles scope between `global` and `local`, recalculates plan
    - `cancelConfirm(confirmState)` -> returns to `DetailState`
- `src/tui/screens/confirm.tsx`:
  - Renders Header, Target Item & Badges, Scope selector, Plan Summary, Warnings, Diff, and Actions (`[Confirm]`, `[Switch Scope]`, `[Cancel]`).
- `src/tui/screens/detail.tsx`:
  - Shows dynamic actions based on status:
    - If `not-installed`: `[Install]`, `[Open Repo]`, `[Open npm]`, `[Back]`
    - If `installed`/`enabled`: `[Disable]`, `[Uninstall]`, `[Open Repo]`, `[Open npm]`, `[Back]`
    - If `installed`/`disabled`: `[Enable]`, `[Uninstall]`, `[Open Repo]`, `[Open npm]`, `[Back]`
- `src/tui/components/item_row.tsx` & `list.tsx`:
  - Show status badge indicator `[installed]` or `[disabled]` next to kind badge.

## 8. Modularity & Quality Bar (AGENTS.md)

- Ports & adapters: all filesystem and IO operations live in `src/adapters/`.
- Pure business logic: `src/core/install-plan.ts` and `src/core/status.ts` are pure and 100% testable without mocks.
- Zero runtime dependencies beyond `comment-json`, `@opencode-ai/plugin`, `@opentui/solid`, `solid-js`.
- Strict TS, no `as any`, no `@ts-ignore`.
- Unit tests mirror `src/` modules in `test/`.
