import { describe, expect, test } from "bun:test";
import type { SourceItem } from "../../src/core/model";
import { canonicalKey, mergeCatalog, normalizeRepoUrl } from "../../src/core/merge";

const item = (over: Partial<SourceItem>): SourceItem => ({
  source: "cafe", rawId: "r", kind: "plugin", name: "N", description: "D",
  repoUrl: null, npmSpec: null, homepage: null, tags: [], installSpec: null, fetchedAt: 0, ...over,
});

describe("normalizeRepoUrl", () => {
  test("lowercases scheme/host, drops www and trailing slash", () => {
    expect(normalizeRepoUrl("HTTP://WWW.GitHub.com/Me/Repo/")).toBe("http://github.com/me/repo");
  });
  test("adds https:// when the scheme is missing", () => {
    expect(normalizeRepoUrl("github.com/me/repo")).toBe("https://github.com/me/repo");
  });
  test("sorts query params", () => {
    expect(normalizeRepoUrl("https://github.com/me/repo?b=2&a=1")).toBe("https://github.com/me/repo?a=1&b=2");
  });
});

describe("canonicalKey", () => {
  test("repoUrl wins, npm falls back, name@source is last resort", () => {
    expect(canonicalKey(item({ repoUrl: "https://GitHub.com/Me/Repo/" }))).toBe("https://github.com/me/repo");
    expect(canonicalKey(item({ npmSpec: "My-Pkg" }))).toBe("npm:my-pkg");
    expect(canonicalKey(item({ name: "Thing" }))).toBe("thing@cafe");
  });
});

describe("mergeCatalog", () => {
  test("merges same-repo items across sources with preference order", () => {
    const items: SourceItem[] = [
      item({ source: "awesome", rawId: "a1", name: "P One", description: "B", repoUrl: "https://github.com/me/p1/", tags: ["y"], fetchedAt: 20 }),
      item({ source: "cafe", rawId: "c1", name: "P One", description: "A", repoUrl: "https://github.com/me/p1", tags: ["x"], fetchedAt: 10 }),
      item({ source: "ecosystem", rawId: "e1", name: "P One", description: "C", repoUrl: "https://github.com/me/p1", fetchedAt: 30 }),
    ];
    const merged = mergeCatalog(items);
    expect(merged).toHaveLength(1);
    const m = merged[0]!;
    expect(m).toMatchObject({
      id: "https://github.com/me/p1",
      name: "P One",
      description: "A", // café first (longest is a tie, caf wins by source preference)
      repoUrl: "https://github.com/me/p1",
      tags: ["x", "y"],
      bestTrust: { level: "high", score: 30 },
    });
    expect(m.sources.map((s) => s.source)).toEqual(["cafe", "awesome", "ecosystem"]);
    expect(m.sources.map((s) => s.seenAt)).toEqual([10, 20, 30]);
    expect(Object.keys(m.installSpec)).toEqual(["awesome", "cafe", "ecosystem"]);
  });

  test("repoUrl vs npmSpec do not merge together; name@source is unique", () => {
    const items: SourceItem[] = [
      item({ source: "cafe", rawId: "c1", name: "Same", repoUrl: "https://github.com/me/same" }),
      item({ source: "cafe", rawId: "c2", name: "Same", npmSpec: "same-pkg" }),
      item({ source: "cafe", rawId: "c3", name: "Same" }),
      item({ source: "awesome", rawId: "c4", name: "Same" }),
    ];
    expect(mergeCatalog(items)).toHaveLength(4);
  });

  test("description takes the longest", () => {
    const merged = mergeCatalog([
      item({ source: "cafe", description: "Short", repoUrl: "https://github.com/me/x" }),
      item({ source: "awesome", description: "A much longer description", repoUrl: "https://github.com/me/x" }),
    ]);
    expect(merged[0]!.description).toBe("A much longer description");
  });

  test("preserves first-seen order across groups", () => {
    const merged = mergeCatalog([
      item({ source: "cafe", rawId: "b", name: "Beta", repoUrl: "https://github.com/me/b" }),
      item({ source: "cafe", rawId: "a", name: "Alpha", repoUrl: "https://github.com/me/a" }),
    ]);
    expect(merged.map((m) => m.name)).toEqual(["Beta", "Alpha"]);
  });
});