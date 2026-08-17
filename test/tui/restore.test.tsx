import { describe, expect, it } from "bun:test";
import { testRender } from "@opentui/solid";
import type { BackupEntry } from "../../src/adapters/backups";
import { RestoreScreen } from "../../src/tui/screens/restore";

describe("RestoreScreen", () => {
  it("renders empty state when no backups exist", async () => {
    const el = await testRender(() => (
      <RestoreScreen backups={[]} selectedIndex={0} />
    ));
    expect(el).toBeDefined();
  });

  it("renders list of backups with active selection", async () => {
    const mockBackups: BackupEntry[] = [
      {
        id: "b1",
        filePath: "/path/to/opencode.json.bak",
        targetConfigPath: "/path/to/opencode.json",
        scope: "global",
        timestamp: Date.now(),
        formattedDate: "2026-08-17 12:00:00",
        sizeBytes: 120,
        kindSummary: "Global Config Backup",
      },
    ];

    const el = await testRender(() => (
      <RestoreScreen backups={mockBackups} selectedIndex={0} />
    ));
    expect(el).toBeDefined();
  });
});
