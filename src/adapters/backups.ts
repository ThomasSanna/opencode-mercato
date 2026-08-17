import * as fs from "node:fs";
import * as path from "node:path";
import {
  getGlobalConfigDir,
  getGlobalConfigPath,
  getLocalConfigDir,
  getLocalConfigPath,
  type InstallScope,
  type PathResolutionOptions,
} from "./paths";

export interface BackupEntry {
  id: string;
  filePath: string;
  targetConfigPath: string;
  scope: InstallScope;
  timestamp: number;
  formattedDate: string;
  sizeBytes: number;
  kindSummary: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  targetPath: string;
  previousBackupPath?: string;
}

/**
 * Scans directories for backup files (.bak) and builds a sorted list of restorable entries.
 */
export function listBackups(
  options: PathResolutionOptions = {}
): BackupEntry[] {
  const entries: BackupEntry[] = [];

  const globalDir = getGlobalConfigDir(options);
  const globalConfig = getGlobalConfigPath(options);
  const localDir = getLocalConfigDir(options);
  const localConfig = getLocalConfigPath(options);

  const checkBackup = (
    backupPath: string,
    targetPath: string,
    scope: InstallScope,
    label: string
  ) => {
    if (!fs.existsSync(backupPath)) return;
    try {
      const stat = fs.statSync(backupPath);
      if (!stat.isFile()) return;

      entries.push({
        id: `${scope}:${path.basename(backupPath)}:${stat.mtimeMs}`,
        filePath: backupPath,
        targetConfigPath: targetPath,
        scope,
        timestamp: stat.mtimeMs,
        formattedDate: new Date(stat.mtimeMs).toISOString().replace("T", " ").slice(0, 19),
        sizeBytes: stat.size,
        kindSummary: label,
      });
    } catch {
      // ignore unreadable file
    }
  };

  // 1. Direct standard backups
  checkBackup(
    `${globalConfig}.bak`,
    globalConfig,
    "global",
    "Global Config Backup"
  );
  checkBackup(
    `${localConfig}.bak`,
    localConfig,
    "local",
    "Local Project Config Backup"
  );

  // 2. Scan directories for additional .bak files
  const scanBackupsInDir = (dir: string, scope: InstallScope) => {
    if (!fs.existsSync(dir)) return;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith(".bak") || file.includes(".bak.")) {
          const fullPath = path.join(dir, file);
          if (
            fullPath === `${globalConfig}.bak` ||
            fullPath === `${localConfig}.bak`
          ) {
            continue; // already added above
          }
          const target = fullPath.replace(/\.bak.*$/, "");
          checkBackup(fullPath, target, scope, `${scope === "global" ? "Global" : "Local"} Backup (${file})`);
        }
      }
    } catch {
      // ignore directory scan errors
    }
  };

  scanBackupsInDir(globalDir, "global");
  scanBackupsInDir(localDir, "local");
  if (options.cwd && options.cwd !== localDir) {
    scanBackupsInDir(options.cwd, "local");
  }

  // Sort newest first
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Restores a backup file to its target configuration path atomically.
 */
export function restoreBackup(
  backupOrPath: BackupEntry | string,
  options: PathResolutionOptions = {}
): RestoreResult {
  const backupPath =
    typeof backupOrPath === "string" ? backupOrPath : backupOrPath.filePath;
  const targetPath =
    typeof backupOrPath === "string"
      ? backupOrPath.replace(/\.bak.*$/, "")
      : backupOrPath.targetConfigPath;

  if (!fs.existsSync(backupPath)) {
    return {
      success: false,
      message: `Backup file does not exist at "${backupPath}"`,
      targetPath,
    };
  }

  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let previousBackupPath: string | undefined;
  if (fs.existsSync(targetPath)) {
    previousBackupPath = `${targetPath}.pre-restore.${Date.now()}.bak`;
    try {
      fs.copyFileSync(targetPath, previousBackupPath);
    } catch {
      // ignore safety backup error
    }
  }

  const tempPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
  try {
    const content = fs.readFileSync(backupPath);
    fs.writeFileSync(tempPath, content);
    fs.renameSync(tempPath, targetPath);

    return {
      success: true,
      message: `Successfully restored backup to ${path.basename(targetPath)}`,
      targetPath,
      previousBackupPath,
    };
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore
      }
    }
    return {
      success: false,
      message: `Failed to restore backup: ${
        err instanceof Error ? err.message : String(err)
      }`,
      targetPath,
    };
  }
}
