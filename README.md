# opencode-mercato

Mercato — the OpenCode V2 marketplace for everything: plugins, MCP servers,
skills, themes, and agents, inside the TUI.

[![npm version](https://img.shields.io/npm/v/opencode-mercato.svg)](https://www.npmjs.com/package/opencode-mercato)
[![npm downloads](https://img.shields.io/npm/dm/opencode-mercato.svg)](https://www.npmjs.com/package/opencode-mercato)
[![CI](https://github.com/ThomasSanna/opencode-mercato/actions/workflows/ci.yml/badge.svg)](https://github.com/ThomasSanna/opencode-mercato/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## What is Mercato

A unified marketplace for **everything OpenCode**: plugins, MCP servers, skills, themes, and
agents — browsable, comparable, and installable from a modal dialog inside the OpenCode
TUI.

Mercato targets OpenCode **V2 only**. The catalog is **transparently aggregated** from community sources
(see [Credits](#credits)) — Mercato never owns the data, but provides discovery, trust ratings,
safe lifecycle installation, auto-updates, and rollback capabilities.

## Features

- **Everything OpenCode**: Discover plugins, MCP servers, skills, agents, themes, and commands.
- **V2-Native TUI**: Modal dialog loop with keyboard-first navigation and palette integration.
- **Transparent Provenance & Trust**: Multi-source aggregation with trust scoring and security notices.
- **Safe Installation Pipeline**: Pre-install diff preview, conflict refusal, `.bak` backups, and atomic writes.
- **Updates & Version History**: SemVer analysis, auto-update eligibility policy (patch/minor), downgrade picker from NPM history, and content-hash comparison for versionless items.
- **Preferences & Settings**: Configurable auto-update rules, cache TTL, and default target scope (Global vs Local).
- **Restore Journal**: View and restore previous configuration backup snapshots atomically.

## Install

```sh
opencode plugin opencode-mercato
```

## Usage

- **Command**: Type `/mercato` in the prompt line.
- **Command Palette**: Press `Ctrl+P` (or `Cmd+P`) and choose **Mercato**.

### Keyboard Navigation

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate items / actions / options |
| `Enter` / `Return` | Open details / Confirm action / Install version |
| `Tab` / `Shift+Tab` | Cycle kind tabs (`All`, `Plugins`, `MCPs`, `Skills`, `Agents`, `Themes`, `Commands`) / Switch Scope |
| `u` | Open Updates view |
| `s` | Open Settings view |
| `r` | Open Restore Backups view |
| `Esc` | Back to previous screen / Close modal |

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run typecheck
bun test
```

## Credits

Community data sources are credited transparently in
[CREDITS.md](CREDITS.md) — opencode.cafe, awesome-opencode, and the OpenCode
ecosystem docs. Their content is aggregated, never repackaged as ours.

## License

[MIT](LICENSE) © 2026 Thomas Sanna