import { describe, expect, test } from "bun:test";
import type { CatalogItem } from "../../src/core/model";
import {
  KIND_FILTER_LIST,
  searchAndFilterCatalog,
} from "../../src/core/search";

const mockItems: CatalogItem[] = [
  {
    id: "https://github.com/foo/plugin-git",
    kind: "plugin",
    name: "git-helper",
    description: "Git integration tools for OpenCode",
    repoUrl: "https://github.com/foo/plugin-git",
    npmSpec: "opencode-plugin-git",
    homepage: null,
    tags: ["git", "vcs", "productivity"],
    installSpec: { cafe: {} },
    sources: [
      {
        source: "cafe",
        trust: { level: "high", score: 30 },
        rawId: "git-helper",
        seenAt: 1000,
      },
    ],
    bestTrust: { level: "high", score: 30 },
  },
  {
    id: "https://github.com/bar/mcp-database",
    kind: "mcp",
    name: "postgres-mcp",
    description: "PostgreSQL Model Context Protocol server",
    repoUrl: "https://github.com/bar/mcp-database",
    npmSpec: null,
    homepage: null,
    tags: ["database", "sql"],
    installSpec: { awesome: {} },
    sources: [
      {
        source: "awesome",
        trust: { level: "medium", score: 20 },
        rawId: "postgres-mcp",
        seenAt: 1000,
      },
    ],
    bestTrust: { level: "medium", score: 20 },
  },
  {
    id: "https://github.com/baz/skill-docker",
    kind: "skill",
    name: "docker-skill",
    description: "Expert Docker workflow and compose skill",
    repoUrl: "https://github.com/baz/skill-docker",
    npmSpec: null,
    homepage: null,
    tags: ["docker", "devops"],
    installSpec: { ecosystem: {} },
    sources: [
      {
        source: "ecosystem",
        trust: { level: "medium", score: 15 },
        rawId: "docker-skill",
        seenAt: 1000,
      },
    ],
    bestTrust: { level: "medium", score: 15 },
  },
];

describe("searchAndFilterCatalog", () => {
  test("returns all items when query is empty and kind is all", () => {
    const res = searchAndFilterCatalog(mockItems);
    expect(res.length).toBe(3);
  });

  test("filters by kind", () => {
    const plugins = searchAndFilterCatalog(mockItems, { kind: "plugin" });
    expect(plugins.length).toBe(1);
    expect(plugins[0].name).toBe("git-helper");

    const mcps = searchAndFilterCatalog(mockItems, { kind: "mcp" });
    expect(mcps.length).toBe(1);
    expect(mcps[0].name).toBe("postgres-mcp");

    const agents = searchAndFilterCatalog(mockItems, { kind: "agent" });
    expect(agents.length).toBe(0);
  });

  test("filters by search query matching name", () => {
    const res = searchAndFilterCatalog(mockItems, { query: "postgres" });
    expect(res.length).toBe(1);
    expect(res[0].name).toBe("postgres-mcp");
  });

  test("filters by search query matching description", () => {
    const res = searchAndFilterCatalog(mockItems, { query: "compose" });
    expect(res.length).toBe(1);
    expect(res[0].name).toBe("docker-skill");
  });

  test("filters by search query matching tags", () => {
    const res = searchAndFilterCatalog(mockItems, { query: "vcs" });
    expect(res.length).toBe(1);
    expect(res[0].name).toBe("git-helper");
  });

  test("filters by multi-token search (AND logic)", () => {
    const res = searchAndFilterCatalog(mockItems, { query: "docker compose" });
    expect(res.length).toBe(1);
    expect(res[0].name).toBe("docker-skill");

    const noMatch = searchAndFilterCatalog(mockItems, {
      query: "docker postgres",
    });
    expect(noMatch.length).toBe(0);
  });

  test("ranks exact name match higher than description match", () => {
    const testItems: CatalogItem[] = [
      {
        ...mockItems[0],
        name: "unrelated",
        description: "has helper in description",
      },
      {
        ...mockItems[1],
        name: "helper",
        description: "exact name match",
      },
    ];

    const res = searchAndFilterCatalog(testItems, { query: "helper" });
    expect(res.length).toBe(2);
    expect(res[0].name).toBe("helper");
  });

  test("KIND_FILTER_LIST includes all kinds and 'all'", () => {
    expect(KIND_FILTER_LIST).toEqual([
      "all",
      "plugin",
      "mcp",
      "skill",
      "agent",
      "theme",
      "command",
    ]);
  });
});
