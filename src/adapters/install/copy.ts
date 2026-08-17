import * as fs from "node:fs";
import * as path from "node:path";

export interface FileInstallResult {
  ok: boolean;
  filePath: string;
  backupPath?: string;
  error?: string;
}

/**
 * Writes or updates a file atomically with backup creation and conflict handling.
 */
export function installFile(
  filePath: string,
  content: string,
  force = false
): FileInstallResult {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let backupPath: string | undefined;

  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    if (existing.trim() === content.trim()) {
      return { ok: true, filePath };
    }

    if (!force) {
      return {
        ok: false,
        filePath,
        error: `File "${filePath}" already exists with conflicting content. Use force to overwrite.`,
      };
    }

    backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
  }

  const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, content, "utf8");
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore
      }
    }
    return {
      ok: false,
      filePath,
      error: `Failed to write file "${filePath}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  return { ok: true, filePath, backupPath };
}

/**
 * Removes a file and its parent folder if empty.
 */
export function removeFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  try {
    fs.unlinkSync(filePath);
    const parent = path.dirname(filePath);
    if (fs.existsSync(parent) && fs.readdirSync(parent).length === 0) {
      try {
        fs.rmdirSync(parent);
      } catch {
        // ignore
      }
    }
    return true;
  } catch {
    return false;
  }
}
