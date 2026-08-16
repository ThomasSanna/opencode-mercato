import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mapAwesomeKind,
  mapCafeKind,
  normalizeAwesome,
  normalizeCafe,
  normalizeEcosystem,
  normalizeSource,
} from "../../src/core/normalize";

const CAFE_RAW = {
  status: "success",
  value: [
    { _id: "c1", type: "plugin", productId: "p1", displayName: "P One", description: "A", repoUrl: "https://github.com/me/p1", tags: ["x"] },
    { _id: "c2", type: "mcp-server", productId: "m1", displayName: "Mcp One", description: "M", repoUrl: "https://github.com/me/m1" },
    { _id: "c3", type: "slash-command", productId: "sc1", displayName: "Sc One" },
    { _id: "c4", type: "unknown-thing", productId: "u1", displayName: "U One" },
    { _id: "c5", type: "plugin", productId: "p-empty", displayName: "" },
  ],
};

const AWESOME_RAW = [
  { productId: "p1", type: "plugins", displayName: "P One", repoUrl: "github.com/me/p1", tagline: "T", tags: ["y"] },
  { productId: "ag1", type: "agents", displayName: "Agentic", description: "AG", repoUrl: "https://github.com/me/ag" },
  { productId: "prj", type: "projects", displayName: "Proj" },
  { productId: "pe", type: "plugins", displayName: "" },
];

describe("mapCafeKind", () => {
  test("pins the cafe kind mapping", () => {
    expect(mapCafeKind("plugin")).toBe("plugin");
    expect(mapCafeKind("tool")).toBe("plugin");
    expect(mapCafeKind("web-view")).toBe("plugin");
    expect(mapCafeKind("mcp-server")).toBe("mcp");
    expect(mapCafeKind("slash-command")).toBe("command");
    expect(mapCafeKind("mystery")).toBeNull();
  });
});

describe("mapAwesomeKind", () => {
  test("pins the awesome kind mapping", () => {
    expect(mapAwesomeKind("plugins")).toBe("plugin");
    expect(mapAwesomeKind("agents")).toBe("agent");
    expect(mapAwesomeKind("themes")).toBe("theme");
    expect(mapAwesomeKind("projects")).toBeNull();
    expect(mapAwesomeKind("resources")).toBeNull();
  });
});

describe("normalizeCafe", () => {
  test("maps entries, skips unknown types, keeps raw install spec", () => {
    const items = normalizeCafe(CAFE_RAW, 1000);
    expect(items.map((i) => i.rawId)).toEqual(["c1", "c2", "c3"]);
    expect(items.map((i) => i.name)).not.toContain("");
    expect(items.map((i) => i.rawId)).not.toContain("p-empty");
    expect(items[0]).toMatchObject({
      source: "cafe", kind: "plugin", name: "P One", description: "A",
      repoUrl: "https://github.com/me/p1", npmSpec: null, tags: ["x"], fetchedAt: 1000,
    });
    expect(items[1].kind).toBe("mcp");
    expect(items[2].kind).toBe("command");
    expect((items[0].installSpec as Record<string, unknown>).type).toBe("plugin");
    expect(items[0].installSpec as Record<string, unknown>).toMatchObject({ productId: "p1" });
  });

  test("throws when payload.value is not an array", () => {
    expect(() => normalizeCafe({ status: "success" }, 0)).toThrow(/array/i);
  });
});

describe("normalizeAwesome", () => {
  test("maps entries, skips projects/resources, prefers description over tagline", () => {
    const items = normalizeAwesome(AWESOME_RAW, 2000);
    expect(items.map((i) => i.rawId)).toEqual(["p1", "ag1"]);
    expect(items.map((i) => i.name)).not.toContain("");
    expect(items.map((i) => i.rawId)).not.toContain("pe");
    expect(items[0]).toMatchObject({ kind: "plugin", name: "P One", description: "T", repoUrl: "github.com/me/p1", tags: ["y"], fetchedAt: 2000 });
    expect(items[1].kind).toBe("agent");
    expect(items[1].description).toBe("AG");
  });

  test("throws when payload is not an array", () => {
    expect(() => normalizeAwesome({}, 0)).toThrow(/array/i);
  });
});

const MDX = `| [Orphan](https://example.com/o) | O |
# Ecosystem
## Plugins
| Name | Description |
| --- | --- |
| [P One](https://github.com/me/p1) | C |
| [NPK](https://www.npmjs.com/package/npk-thing) | npm pkg |
## Projects
| Name | Description |
| --- | --- |
| [Proj](https://example.com/p) | P |
## Agents
| Name | Description |
| --- | --- |
| [Agentic](https://github.com/me/agentic) | AG2 |
## Mystery
| Name | Description |
| --- | --- |
| [Weird](https://example.com/w) | W |
`;

describe("normalizeEcosystem", () => {
  test("parses groups, skips Projects/unknown groups, extracts npm spec", () => {
    const items = normalizeEcosystem(MDX, 3000);
    expect(items.map((i) => i.rawId)).toEqual(["https://github.com/me/p1", "npk-thing", "https://github.com/me/agentic"]);
    expect(items.map((i) => i.name)).not.toContain("Orphan");
    expect(items.map((i) => i.rawId)).not.toContain("https://example.com/o");
    const plugin = items[0];
    expect(plugin).toMatchObject({ kind: "plugin", name: "P One", description: "C", repoUrl: "https://github.com/me/p1", npmSpec: null, fetchedAt: 3000 });
    expect(items[1]).toMatchObject({ kind: "plugin", name: "NPK", repoUrl: null, npmSpec: "npk-thing" });
    expect(items[2]).toMatchObject({ kind: "agent", name: "Agentic" });
  });

  test("throws when payload is not a string", () => {
    expect(() => normalizeEcosystem(42, 0)).toThrow(/string/i);
  });
});

describe("normalizeSource", () => {
  test("dispatches by source", () => {
    expect(normalizeSource({ source: "cafe", payload: CAFE_RAW, fetchedAt: 0 }).length).toBe(3);
    expect(normalizeSource({ source: "ecosystem", payload: MDX, fetchedAt: 0 }).length).toBe(3);
    expect(normalizeSource({ source: "awesome", payload: AWESOME_RAW, fetchedAt: 0 })).toEqual(
      normalizeAwesome(AWESOME_RAW, 0),
    );
  });
});

describe("real fixtures", () => {
  const cafeFixture = readFileSync(join(import.meta.dir, "../fixtures/cafe.json"), "utf8");
  const awesomeFixture = readFileSync(join(import.meta.dir, "../fixtures/awesome.json"), "utf8");
  const ecoFixture = readFileSync(join(import.meta.dir, "../fixtures/ecosystem.mdx"), "utf8");

  test("every fixture entry normalizes without throwing and satisfies shape invariants", () => {
    const items = [
      ...normalizeCafe(JSON.parse(cafeFixture) as unknown, 1),
      ...normalizeAwesome(JSON.parse(awesomeFixture) as unknown, 1),
      ...normalizeEcosystem(ecoFixture, 1),
    ];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(["plugin", "mcp", "skill", "agent", "theme", "command"]).toContain(item.kind);
      expect(item.name.length).toBeGreaterThan(0);
      expect(["cafe", "awesome", "ecosystem"]).toContain(item.source);
    }
  });
});