# Changelog

## 1.0.0 (2026-08-16)


### Features

* atomic file cache with TTL and per-source meta (M1) ([61d1842](https://github.com/ThomasSanna/opencode-mercato/commit/61d1842a61a2ed87697245ddbb4e26478b8c0ae3))
* catalog refresh orchestrator with per-source isolation (M1) ([9c2abbb](https://github.com/ThomasSanna/opencode-mercato/commit/9c2abbb4c6c03ba8c1012475fc61a99d2eb3b70d))
* core data model and source trust (M1) ([8b2dc10](https://github.com/ThomasSanna/opencode-mercato/commit/8b2dc101887bf86716a2dbc2c59d330c357e3141))
* merge source items by canonical key (M1) ([0eda717](https://github.com/ThomasSanna/opencode-mercato/commit/0eda717904057b315e0613a0937bf84f98bf9057))
* normalize per-source payloads into SourceItem (M1) ([2cbdea7](https://github.com/ThomasSanna/opencode-mercato/commit/2cbdea76d5001b408ea4ccb36932388652b79420))
* on-demand npm metadata adapter (M1) ([f5aefd0](https://github.com/ThomasSanna/opencode-mercato/commit/f5aefd09eed1e195d23cd3828f9a4877f5a46034))
* source adapters for cafe, awesome, ecosystem (M1) ([14f281f](https://github.com/ThomasSanna/opencode-mercato/commit/14f281f09d6b8b89502cc9fc89ab562346701980))


### Bug Fixes

* correct test import paths in M1 plan (../src/ → ../../src/) ([1dff03f](https://github.com/ThomasSanna/opencode-mercato/commit/1dff03f659c809ce0df3973497b60e3fb59bf38f))
* guard malformed repo URLs in canonical key (M1) ([e8fbc56](https://github.com/ThomasSanna/opencode-mercato/commit/e8fbc564eb4e74a6d1eb34c77d65d5809491f27e))
* honor caller signal in fetchWithTimeout (M1) ([c207389](https://github.com/ThomasSanna/opencode-mercato/commit/c2073892692b5b2831cb88cf799c0e39b81b53fe))
* report stale flag and fetchedAt truthfully on failed refresh (M1) ([664fa74](https://github.com/ThomasSanna/opencode-mercato/commit/664fa74b6cb83d2d7fc02eb9dee4bade64662d1b))
* stop aliasing global SOURCE_TRUST in merged items (M1) ([761182b](https://github.com/ThomasSanna/opencode-mercato/commit/761182b2d2115aa35e66d2fab161e7f1419563e0))
