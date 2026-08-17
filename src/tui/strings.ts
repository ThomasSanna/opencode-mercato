import type { KindFilter } from "../core/search";

export const STRINGS = {
  // Command & Palette
  COMMAND_ID: "mercato.open",
  COMMAND_TITLE: "Mercato",
  COMMAND_DESCRIPTION:
    "Discover and install OpenCode plugins, MCPs, skills, themes, and agents",
  COMMAND_SLASH: "mercato",
  COMMAND_GROUP: "Plugin Manager",

  // App Header & Global
  APP_TITLE: "Mercato",
  APP_SUBTITLE: "OpenCode Marketplace",
  SEARCH_PROMPT: "Search:",
  SEARCH_PLACEHOLDER: "Type to filter by name, tags, or description...",
  STATUS_STALE: "(offline cache)",
  STATUS_FRESH: "(live)",
  STATUS_LOADING: "Loading marketplace catalog...",
  EMPTY_SEARCH: "No matching items found",

  // Item lifecycle status
  STATUS_INSTALLED: "installed",
  STATUS_ENABLED: "enabled",
  STATUS_DISABLED: "disabled",

  // Detail view labels
  DETAIL_HEADER: "Package Details",
  LABEL_KIND: "Kind:",
  LABEL_TRUST: "Trust Level:",
  LABEL_PROVENANCE: "Provenance Sources:",
  LABEL_REPO: "Repository:",
  LABEL_NPM: "NPM Package:",
  LABEL_HOMEPAGE: "Homepage:",
  LABEL_TAGS: "Tags:",
  LABEL_DESCRIPTION: "Description:",
  LABEL_INSTALL_SPEC: "Install Target:",
  LABEL_CURRENT_VERSION: "Current Version:",
  LABEL_LATEST_VERSION: "Latest Version:",
  NONE_SPECIFIED: "none",

  // Detail actions
  ACTION_INSTALL: "Install",
  ACTION_UPDATE: "Update",
  ACTION_VERSIONS: "Version History / Downgrade",
  ACTION_ENABLE: "Enable",
  ACTION_DISABLE: "Disable",
  ACTION_UNINSTALL: "Uninstall",
  ACTION_OPEN_REPO: "Open Repository",
  ACTION_OPEN_NPM: "Open NPM",
  ACTION_OPEN_HOMEPAGE: "Open Homepage",
  ACTION_BACK: "Back to List (Esc)",

  // Confirm screen
  CONFIRM_HEADER: "Installation Preview & Confirmation",
  CONFIRM_SCOPE_LABEL: "Install Target Scope:",
  CONFIRM_SCOPE_GLOBAL: "Global Config",
  CONFIRM_SCOPE_LOCAL: "Project Config",
  CONFIRM_ACTION_INSTALL: "Confirm & Install",
  CONFIRM_ACTION_SWITCH_SCOPE: "Switch Scope",
  CONFIRM_ACTION_CANCEL: "Cancel",
  CONFIRM_WARNINGS_HEADER: "Security & Trust Notice:",
  CONFIRM_DIFF_HEADER: "Planned Changes:",
  CONFIRM_CONFLICT_TITLE: "Conflict Warning:",

  // Updates & Versions screens
  UPDATES_HEADER: "Available Updates",
  UPDATES_ACTION_UPDATE_ALL: "Update All Safe",
  EMPTY_UPDATES: "All installed extensions are up to date!",
  VERSIONS_HEADER: "Version History & Downgrade",
  BADGE_PATCH: "patch",
  BADGE_MINOR: "minor",
  BADGE_MAJOR: "major",
  BADGE_CONTENT: "content",

  // Settings screen
  SETTINGS_HEADER: "Marketplace Settings",
  SETTINGS_HELP:
    "Configure auto-update policies, cache expiration, and default installation scope.",
  LABEL_SETTING_CURRENT: "Current Setting:",
  TOAST_SETTINGS_SAVED: "Settings saved",

  // Restore screen
  RESTORE_HEADER: "Configuration Backups & Restore Journal",
  RESTORE_HELP:
    "Select any previous backup snapshot to restore configuration atomically.",
  EMPTY_RESTORE: "No configuration backups found",
  LABEL_BACKUP_TARGET: "Target:",
  LABEL_BACKUP_PATH: "Backup File:",
  LABEL_BACKUP_DATE: "Created:",
  LABEL_BACKUP_SIZE: "Size:",
  TOAST_RESTORE_SUCCESS: "Backup successfully restored",

  // Keyboard navigation hints
  SHORTCUTS_LIST:
    "↑/↓ Select  •  Enter Details  •  Tab Kind  •  u Updates  •  s Settings  •  r Restore  •  Esc Close",
  SHORTCUTS_DETAIL:
    "Esc Back  •  Enter Perform Action  •  ↑/↓ Choose Action",
  SHORTCUTS_CONFIRM:
    "Enter Confirm  •  Tab Switch Scope  •  Esc Cancel  •  ↑/↓ Navigate",
  SHORTCUTS_UPDATES:
    "↑/↓ Select  •  Enter Update / Details  •  Esc Back to List",
  SHORTCUTS_VERSIONS:
    "↑/↓ Select Version  •  Enter Install Version  •  Esc Cancel",
  SHORTCUTS_SETTINGS:
    "↑/↓ Select  •  Enter/Space Toggle/Cycle  •  Esc Save & Back",
  SHORTCUTS_RESTORE:
    "↑/↓ Select Backup  •  Enter Restore  •  Esc Back to List",
} as const;

export const KIND_TAB_LABELS: Record<KindFilter, string> = {
  all: "All",
  plugin: "Plugins",
  mcp: "MCPs",
  skill: "Skills",
  agent: "Agents",
  theme: "Themes",
  command: "Commands",
};

export function formatItemCount(filtered: number, total: number): string {
  return `${filtered} of ${total} items`;
}

export function formatSourceProvenance(
  source: string,
  score: number,
  level: string
): string {
  return `${source} (${level}, score: ${score})`;
}
