import type { CatalogItem, SourceId } from "./model";

export type WarningSeverity = "info" | "warning" | "caution";

export interface PlanWarning {
  severity: WarningSeverity;
  title: string;
  message: string;
}

export interface McpDefinition {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  type?: string;
  [key: string]: unknown;
}

/**
 * Sanitizes an item name to be safe for filenames and JSON identifiers.
 */
export function sanitizeIdentifier(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extracts or derives an MCP server configuration from a CatalogItem.
 */
export function extractMcpConfig(item: CatalogItem): McpDefinition {
  for (const source of ["cafe", "awesome", "ecosystem"] as SourceId[]) {
    const raw = item.installSpec[source];
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.command === "string") {
        return {
          command: obj.command,
          args: Array.isArray(obj.args) ? obj.args.map(String) : undefined,
          env:
            obj.env && typeof obj.env === "object"
              ? (obj.env as Record<string, string>)
              : undefined,
          type: typeof obj.type === "string" ? obj.type : undefined,
        };
      }
    }
  }

  if (item.npmSpec) {
    return {
      command: "npx",
      args: ["-y", item.npmSpec],
    };
  }

  return {
    command: "node",
    args: [`./${sanitizeIdentifier(item.name)}.js`],
  };
}

/**
 * Generates default skill markdown content with frontmatter.
 */
export function generateSkillContent(item: CatalogItem): string {
  const name = sanitizeIdentifier(item.name);
  return `---
name: ${name}
description: ${item.description || item.name}
---

# ${item.name}

${item.description}
`;
}

/**
 * Generates default agent markdown content with frontmatter.
 */
export function generateAgentContent(item: CatalogItem): string {
  const name = sanitizeIdentifier(item.name);
  return `---
name: ${name}
description: ${item.description || item.name}
---

You are the ${item.name} agent.
${item.description}
`;
}

/**
 * Generates default command markdown content.
 */
export function generateCommandContent(item: CatalogItem): string {
  return `# ${item.name}

${item.description}
`;
}

/**
 * Generates security and trust warnings for a catalog item.
 */
export function generateWarnings(item: CatalogItem): PlanWarning[] {
  const warnings: PlanWarning[] = [];

  if (item.bestTrust.level !== "high") {
    warnings.push({
      severity: "warning",
      title: "Community Extension",
      message: `Sourced from ${item.sources.map((s) => s.source).join(", ")} (trust level: ${item.bestTrust.level}). Please review the repository before installation.`,
    });
  }

  if (item.kind === "plugin") {
    warnings.push({
      severity: "info",
      title: "Plugin Execution",
      message: "Plugins run in the OpenCode process with full Node.js access.",
    });
  } else if (item.kind === "mcp") {
    const mcp = extractMcpConfig(item);
    const cmdStr = `${mcp.command} ${mcp.args?.join(" ") ?? ""}`.trim();
    warnings.push({
      severity: "caution",
      title: "MCP Command Execution",
      message: `MCP servers execute arbitrary external commands:\nCommand: ${cmdStr}`,
    });
  }

  return warnings;
}
