# M4 — Versions, Updates Engine & Downgrade Design (opencode-mercato)

> Date: 2026-08-17 · Status: approved for implementation
> Scope: Semver engine, update check, auto-update policy (default ON),
> update execution, version history & downgrade picker, updates screen,
> and content-hash updates for versionless items (skills/agents/commands).
> Applies the contract in `AGENTS.md`.

## 1. Context & Objectives

`opencode-mercato` is the OpenCode V2 marketplace for plugins, MCP servers,
skills, themes, and agents inside the OpenCode TUI.
M0 (scaffolding), M1 (data layer aggregation & cache), M2 (TUI shell), and
M3 (Lifecycle engine & installation pipeline) are complete.

M4 delivers the **Versions & Updates Engine**:
1. **Semver Engine** (`src/core/versions.ts`): lightweight, strict semver
   parsing, comparison, and diff classification (`major`, `minor`, `patch`,
   `prerelease`, `downgrade`, `identical`).
2. **Auto-update Policy & Settings** (`src/core/settings.ts`, `src/core/versions.ts`):
   - Default settings (`autoUpdate: true`, `autoUpdateMajor: false`, `cacheTtlHours: 24`, `defaultScope: "global"`).
   - Rules: patch and minor updates within the same major are auto-eligible;
     major updates require explicit user confirmation.
   - Versionless items (skills, agents, commands, themes): content-hash comparison
     detects modifications and offers safe refresh.
3. **Update Detection & State Engine**:
   - Status per item: `up-to-date`, `update-available`, `major-available`, `downgrade-available`, `unknown`.
   - On-demand querying of npm metadata via `npmInfo(pkg)`.
4. **Version History & Downgrade Picker**:
   - Query version history from npm.
   - Dedicated `VersionsScreen` allowing users to select any published version
     to install, upgrade, or downgrade with confirmation diff preview.
5. **Updates Screen (`UpdatesScreen`)**:
   - Central view for all installed items with pending updates.
   - Badges for update severity (`[patch]`, `[minor]`, `[major]`, `[content]`).
   - Single item update and bulk "Update All Safe" actions.
6. **Update Execution**:
   - Atomic update of pinned specs in `opencode.json` with `.bak` backups.
   - Overwrite protection with conflict resolution.

---

## 2. Product Model & Types

### 2.1 Semver & Version Model (`src/core/versions.ts`)

```ts
export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  raw: string;
}

export type VersionDiffType =
  | "major"
  | "minor"
  | "patch"
  | "prerelease"
  | "content"
  | "identical"
  | "downgrade"
  | "unknown";

export type UpdateState =
  | "up-to-date"
  | "update-available"
  | "major-available"
  | "downgrade-available"
  | "unknown";

export interface ItemUpdateInfo {
  itemId: string;
  kind: Kind;
  currentVersion: string | null;
  latestVersion: string | null;
  updateState: UpdateState;
  diffType: VersionDiffType;
  autoEligible: boolean;
}
```

### 2.2 Settings Model (`src/core/settings.ts`)

```ts
export interface MercatoSettings {
  autoUpdate: boolean;
  autoUpdateMajor: boolean;
  cacheTtlHours: number;
  defaultScope: "global" | "local";
  checkUpdatesOnOpen: boolean;
  replaceNativeManager: boolean;
}

export const DEFAULT_SETTINGS: MercatoSettings = {
  autoUpdate: true,
  autoUpdateMajor: false,
  cacheTtlHours: 24,
  defaultScope: "global",
  checkUpdatesOnOpen: true,
  replaceNativeManager: true,
};
```

### 2.3 Flow & Navigation States (`src/core/flow.ts`)

```ts
export interface UpdatesState {
  readonly screen: "updates";
  readonly selectedIndex: number;
  readonly previousListState: ListState;
}

export interface VersionsState {
  readonly screen: "versions";
  readonly item: CatalogItem;
  readonly versions: string[];
  readonly currentVersion: string | null;
  readonly selectedIndex: number;
  readonly previousDetailState: DetailState;
}
```

---

## 3. SemVer & Content Hash Engine

### 3.1 SemVer Parser & Comparator
- Strict parsing regex conforming to SemVer 2.0.0:
  `^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$`
- Standard comparison logic: major -> minor -> patch -> prerelease (presence < non-prerelease, identifier comparisons).
- Diff analysis:
  - If target > current:
    - target.major > current.major -> `"major"`
    - target.minor > current.minor -> `"minor"`
    - target.patch > current.patch -> `"patch"`
    - prerelease difference -> `"prerelease"`
  - If target < current -> `"downgrade"`
  - If target == current -> `"identical"`

### 3.2 Content Hash for Versionless Items
- Skills, agents, commands: use SHA-256 (Node `node:crypto`) of normalized content to detect if upstream source has newer instructions or stubs.
- If current installed content hash !== source content hash -> `diffType: "content"`, `updateState: "update-available"`.

---

## 4. Updates & Downgrade Execution

### 4.1 Reinstall & Update Plan
- When updating or downgrading a plugin from `pkg@1.0.0` to `pkg@1.1.0`:
  1. `createInstallPlan` creates a replace diff for `plugin` array.
  2. Sets `plan.conflict = "none"` when explicitly updating/downgrading.
  3. `executeInstallPlan` with `force: true` writes config atomically, creating `.bak`.
- For MCP servers:
  1. Updates args or npm runner spec with new version.
- For Skills/Agents/Commands:
  1. Backs up previous `.md` file to `.md.bak`.
  2. Writes updated markdown file atomically.

---

## 5. TUI Integration & Screens

1. **`UpdatesScreen` (`src/tui/screens/updates.tsx`)**:
   - Header with update counts: e.g. "Available Updates (3) — 2 safe, 1 major".
   - Rows listing installed items with current -> latest, diff badge (`[patch]`, `[minor]`, `[major]`).
   - Actions: `[Update Selected]`, `[Update All Safe]`, `[Back to Catalog]`.
   - Keys: Up/Down to navigate, Enter to update / view details, `u` / Esc to return.

2. **`VersionsScreen` (`src/tui/screens/versions.tsx`)**:
   - Lists all versions returned by npm / catalog (newest first).
   - Marks currently installed version with `[current]`.
   - Dist-tags indicated (e.g. `[latest]`, `[beta]`).
   - Actions: Enter to choose version -> transitions to `ConfirmScreen` with install plan for that exact version; Esc to return.

3. **`DetailScreen` & `ListScreen` Updates**:
   - DetailScreen:
     - Shows `[Update to vX.Y.Z]` when update is available.
     - Shows `[Version History / Downgrade]` for npm-backed items.
     - Displays `Current Version` and `Latest Version` in metadata box.
   - ListScreen:
     - Shows update badge `[update: vX.Y.Z]` or `[major: vX.Y.Z]` next to installed items.
     - Hotkey `u` jumps straight to `UpdatesScreen`.

---

## 6. Modularity & Quality Bar (AGENTS.md)

- Pure logic in `src/core/versions.ts` and `src/core/settings.ts` with 100% test coverage.
- Thin TUI presentation screens in `src/tui/screens/updates.tsx` and `src/tui/screens/versions.tsx`.
- All user-facing strings centralized in `src/tui/strings.ts`.
- Zero external runtime dependencies added.
- All files < 300 lines.
