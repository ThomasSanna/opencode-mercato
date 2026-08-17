import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import type { CatalogItem, SourceProvenance } from "../../src/core/model";
import {
  getKindColor,
  getTrustColor,
  KindBadge,
  SourceBadge,
  StatusBadge,
  TrustBadge,
} from "../../src/tui/components/badge";
import { Header } from "../../src/tui/components/header";
import { ItemRow } from "../../src/tui/components/item_row";
import { KeymapHelp } from "../../src/tui/components/keymap_help";
import { ProvenanceView } from "../../src/tui/components/provenance_view";
import { SearchBar } from "../../src/tui/components/search_bar";
import { KindTabs } from "../../src/tui/components/tabs";

const mockItem: CatalogItem = {
  id: "https://github.com/foo/bar",
  kind: "plugin",
  name: "bar-plugin",
  description: "A wonderful plugin",
  repoUrl: "https://github.com/foo/bar",
  npmSpec: "opencode-bar",
  homepage: "https://bar.dev",
  tags: ["git", "tools"],
  installSpec: { cafe: {} },
  sources: [
    {
      source: "cafe",
      trust: { level: "high", score: 30 },
      rawId: "bar-plugin",
      seenAt: 1000,
    },
  ],
  bestTrust: { level: "high", score: 30 },
};

describe("TUI components", () => {
  test("badge colors match kind and trust definitions", () => {
    expect(getKindColor("plugin")).toBe("#58a6ff");
    expect(getKindColor("mcp")).toBe("#3fb950");
    expect(getKindColor("skill")).toBe("#d29922");
    expect(getKindColor("agent")).toBe("#bc8cff");
    expect(getKindColor("theme")).toBe("#f0883e");
    expect(getKindColor("command")).toBe("#f85149");

    expect(getTrustColor("high")).toBe("#3fb950");
    expect(getTrustColor("medium")).toBe("#d29922");
    expect(getTrustColor("low")).toBe("#8b949e");
  });

  test("Badge components render JSX without throwing", async () => {
    const kb = await testRender(() => <KindBadge kind="plugin" />);
    expect(kb).toBeDefined();

    const tb = await testRender(() => (
      <TrustBadge trust={{ level: "high", score: 30 }} />
    ));
    expect(tb).toBeDefined();

    const sb = await testRender(() => <SourceBadge source="cafe" />);
    expect(sb).toBeDefined();

    const stb1 = await testRender(() => <StatusBadge status="enabled" />);
    expect(stb1).toBeDefined();

    const stb2 = await testRender(() => <StatusBadge status="not-installed" />);
    expect(stb2).toBeDefined();
  });

  test("Header renders title and counts", async () => {
    const h = await testRender(() => (
      <Header filteredCount={5} totalCount={10} stale={true} />
    ));
    expect(h).toBeDefined();
  });

  test("KindTabs renders active tab", async () => {
    const t = await testRender(() => (
      <KindTabs activeKind="mcp" counts={{ mcp: 3, all: 10 }} />
    ));
    expect(t).toBeDefined();
  });

  test("SearchBar renders search prompt", async () => {
    const s1 = await testRender(() => <SearchBar query="" />);
    expect(s1).toBeDefined();

    const s2 = await testRender(() => <SearchBar query="git" />);
    expect(s2).toBeDefined();
  });

  test("ItemRow renders selected and non-selected states", async () => {
    const r1 = await testRender(() => (
      <ItemRow item={mockItem} isSelected={true} status="enabled" />
    ));
    expect(r1).toBeDefined();

    const r2 = await testRender(() => (
      <ItemRow item={mockItem} isSelected={false} status="not-installed" />
    ));
    expect(r2).toBeDefined();
  });

  test("ProvenanceView renders sources list", async () => {
    const sources: SourceProvenance[] = [
      {
        source: "cafe",
        trust: { level: "high", score: 30 },
        rawId: "item-1",
        seenAt: 1000,
      },
      {
        source: "awesome",
        trust: { level: "medium", score: 20 },
        rawId: "item-1",
        seenAt: 1000,
      },
    ];

    const pv = await testRender(() => <ProvenanceView sources={sources} />);
    expect(pv).toBeDefined();
  });

  test("KeymapHelp renders for all screen variants", async () => {
    const kh1 = await testRender(() => <KeymapHelp screen="list" />);
    expect(kh1).toBeDefined();

    const kh2 = await testRender(() => <KeymapHelp screen="detail" />);
    expect(kh2).toBeDefined();

    const kh3 = await testRender(() => <KeymapHelp screen="confirm" />);
    expect(kh3).toBeDefined();

    const kh4 = await testRender(() => <KeymapHelp screen="updates" />);
    expect(kh4).toBeDefined();

    const kh5 = await testRender(() => <KeymapHelp screen="versions" />);
    expect(kh5).toBeDefined();

    const kh6 = await testRender(() => <KeymapHelp screen="settings" />);
    expect(kh6).toBeDefined();

    const kh7 = await testRender(() => <KeymapHelp screen="restore" />);
    expect(kh7).toBeDefined();
  });
});
