# opencode-mercato

Mercato — the OpenCode V2 marketplace for everything: plugins, MCP servers,
skills, themes, and agents, inside the TUI.

[![npm version](https://img.shields.io/npm/v/opencode-mercato.svg)](https://www.npmjs.com/package/opencode-mercato) <!-- pending first release -->
[![npm downloads](https://img.shields.io/npm/dm/opencode-mercato.svg)](https://www.npmjs.com/package/opencode-mercato) <!-- pending first release -->
[![CI](https://github.com/ThomasSanna/opencode-mercato/actions/workflows/ci.yml/badge.svg)](https://github.com/ThomasSanna/opencode-mercato/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## What is Mercato

A market of **everything OpenCode**: plugins, MCP servers, skills, themes, and
agents — browsable, comparable, and installable from a modal inside the OpenCode
TUI. Mercato targets OpenCode **V2 only**. The catalog is transparently
aggregated from community sources (see [Credits](#credits)) — Mercato never
owns the data, it just makes it browsable.

## Install

<!-- Pending first release: the package is not published to npm yet. -->

```sh
opencode plugin opencode-mercato
```

## Usage

<!-- Pending first release: command and palette entry will be implemented in M2. -->

- Open the palette and run **Mercato** to browse the market.
- `/mercato` command: same entry point from the input line.

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