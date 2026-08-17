# M3 — Lifecycle & Installation Implementation Plan (opencode-mercato)

> Date: 2026-08-17 · Status: ready for execution
> Scope: Complete implementation of M3 Lifecycle & Installation as specified in
> `docs/superpowers/specs/2026-08-17-mercato-m3-lifecycle-design.md` and `docs/architecture.md`.
> Applies strict TypeScript, ports & adapters, zero extraneous dependencies, and
> test-driven modular development per `AGENTS.md`.

---

## Overview & Architecture Alignment

M3 implements the installation and lifecycle pipeline for all OpenCode kinds
(`plugin`, `mcp`, `skill`, `agent`, `command`, `theme`):
- **Core Pure Logic (`src/core/`)**:
  - `install-plan.ts`: Pure functions generating install plans, config diffs,
    file diffs, trust warnings, and conflict detection.
  - `status.ts`: Status calculation (`not-installed` | `installed` | `enabled` |
    `disabled`) and detail action generation.
  - `flow.ts`: Updated state machine with `ConfirmState` and transition actions.
- **Adapters (`src/adapters/`)**:
  - `paths.ts`: Cross-platform path resolution for global and local OpenCode config
    and directory roots.
  - `config.ts`: Lossless JSONC reading, atomic write with `.bak` backups, and
    patch operations via `comment-json`.
  - `install/copy.ts`: File copy/write for skills, agents, commands with
    conflict-refusal and backups.
  - `install/executor.ts`: High-level executor orchestrating backups, config
    patches, file operations, and rollback on error.
  - `snapshot.ts`: Snapshot builder gathering config and filesystem state for
    status evaluation.
- **TUI Layer (`src/tui/`)**:
  - `screens/confirm.tsx`: Confirm/preview screen rendering plan diff, warnings,
    scope toggle, and action buttons.
  - `screens/detail.tsx` & `screens/list.tsx`: Dynamic status badges and
    actions (Install / Enable / Disable / Uninstall).
  - `dialog.tsx`: Event loop handling confirm screen actions, scope toggling, and
    installation execution with toasts.

---

## Tasks Breakdown

### Task 1: Path Resolution & Config Snapshot Types
- **Files**:
  - `src/adapters/paths.ts`
  - `src/core/status.ts`
  - `test/adapters/paths.test.ts`
- **Responsibility**: Cross-platform resolution of global OpenCode config path
  (Windows `%APPDATA%\opencode` vs POSIX `~/.config/opencode`), project local
  root (`./.opencode` / `./opencode.json`), and snapshot interface.

### Task 2: Config Adapter (JSONC, Atomic Write, Backups)
- **Files**:
  - `src/adapters/config.ts`
  - `test/adapters/config.test.ts`
- **Responsibility**: JSONC reading/writing using `comment-json`, atomic write
  via `.tmp` file and rename, automatic `.bak` creation, `addPlugin`,
  `removePlugin`, `addMcpServer`, `removeMcpServer`, `setTheme`.

### Task 3: Per-Kind Install Planners (Pure Core)
- **Files**:
  - `src/core/install-plan.ts`
  - `test/core/install-plan.test.ts`
- **Responsibility**: Generate `InstallPlan` for any `CatalogItem` (plugin,
  mcp, skill, agent, command, theme):
  - Extract install spec payload.
  - Generate target file diffs and config diffs.
  - Generate security warnings (low trust, npm scripts, MCP command caution).
  - Detect conflicts (identical, none, or conflicting existing config/files).

### Task 4: Installation Execution Adapters
- **Files**:
  - `src/adapters/install/copy.ts`
  - `src/adapters/install/executor.ts`
  - `test/adapters/install/executor.test.ts`
- **Responsibility**: Execute an `InstallPlan` or uninstall action:
  - Create pre-execution backup.
  - Write files atomically with conflict-refusal.
  - Patch JSONC config atomically.
  - Rollback on failure and report structured `InstallResult`.

### Task 5: Status Evaluation & Snapshot Loading
- **Files**:
  - `src/core/status.ts`
  - `src/adapters/snapshot.ts`
  - `test/core/status.test.ts`
- **Responsibility**: Pure status evaluator returning `ItemStatus` (`not-installed`,
  `installed`, `enabled`, `disabled`) and detail screen actions.

### Task 6: TUI Confirm Screen & Strings
- **Files**:
  - `src/tui/strings.ts`
  - `src/tui/screens/confirm.tsx`
  - `test/tui/confirm.test.tsx`
- **Responsibility**: Render confirm/preview screen with target item, scope,
  warnings, diffs, and action buttons.

### Task 7: Flow State Machine Update
- **Files**:
  - `src/core/flow.ts`
  - `test/core/flow.test.ts`
- **Responsibility**: Add `ConfirmState`, `openConfirm`, `cancelConfirm`,
  `toggleConfirmScope`, and `moveConfirmAction` transitions to the pure state
  machine.

### Task 8: TUI Dialog Integration & Status Badges
- **Files**:
  - `src/tui/dialog.tsx`
  - `src/tui/screens/detail.tsx`
  - `src/tui/screens/list.tsx`
  - `src/tui/components/item_row.tsx`
  - `test/tui/dialog.test.tsx`
- **Responsibility**: Wire the confirm screen into the dialog loop, handle
  installation and enable/disable/uninstall actions, display status badges in
  list and detail screens, show toast notifications.

### Task 9: Final Quality Gate & Verification
- Run full typecheck (`bun run typecheck`), full test suite (`bun test`),
  validate formatting, verify no regressions and adherence to AGENTS.md.
