import type { ConfigSnapshot } from "../adapters/snapshot";
import {
  generateAgentContent,
  generateCommandContent,
  generateSkillContent,
  sanitizeIdentifier,
} from "./install-plan";
import type { CatalogItem } from "./model";
import { DEFAULT_SETTINGS, type MercatoSettings } from "./settings";
import { getItemStatus } from "./status";
import {
  checkItemUpdate,
  computeContentHash,
  type ItemUpdateInfo,
} from "./versions";

export interface UpdateItemEntry {
  item: CatalogItem;
  info: ItemUpdateInfo;
}

export interface CatalogUpdatesResult {
  updates: Record<string, ItemUpdateInfo>;
  availableUpdates: UpdateItemEntry[];
}

/**
 * Evaluates available updates for all installed items in a catalog against the current configuration snapshot.
 */
export function evaluateCatalogUpdates(
  items: readonly CatalogItem[],
  snapshot: ConfigSnapshot,
  npmVersionsMap: Record<string, { latest: string; versions?: string[] }> = {},
  settings: MercatoSettings = DEFAULT_SETTINGS
): CatalogUpdatesResult {
  const updates: Record<string, ItemUpdateInfo> = {};
  const availableUpdates: UpdateItemEntry[] = [];

  for (const item of items) {
    const status = getItemStatus(item, snapshot);
    if (status === "not-installed") continue;

    const idName = sanitizeIdentifier(item.name);

    if (item.kind === "plugin") {
      const pkgName = item.npmSpec ? item.npmSpec.split("@")[0]! : item.id;
      const installedVersion = snapshot.installedPluginVersions[pkgName] ?? null;
      const npmData = npmVersionsMap[pkgName];
      const latestVersion = npmData ? npmData.latest : null;

      const info = checkItemUpdate(item, installedVersion, latestVersion, settings);
      updates[item.id] = info;
      if (
        info.updateState === "update-available" ||
        info.updateState === "major-available"
      ) {
        availableUpdates.push({ item, info });
      }
    } else if (
      item.kind === "skill" ||
      item.kind === "agent" ||
      item.kind === "command"
    ) {
      const extension =
        item.kind === "skill"
          ? `/skills/${idName}/skill.md`
          : `/${item.kind}/${idName}.md`;

      const matchedPath = snapshot.existingFiles.find((f) =>
        f.toLowerCase().endsWith(extension)
      );

      const installedHash = matchedPath
        ? snapshot.fileHashes[matchedPath] ?? null
        : null;

      let sourceContent = "";
      if (item.kind === "skill") sourceContent = generateSkillContent(item);
      else if (item.kind === "agent") sourceContent = generateAgentContent(item);
      else if (item.kind === "command") sourceContent = generateCommandContent(item);

      const sourceHash = computeContentHash(sourceContent);
      const info = checkItemUpdate(item, installedHash, sourceHash, settings);
      updates[item.id] = info;
      if (
        info.updateState === "update-available" ||
        info.updateState === "major-available"
      ) {
        availableUpdates.push({ item, info });
      }
    }
  }

  return { updates, availableUpdates };
}
