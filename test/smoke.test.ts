import { describe, expect, test } from "bun:test";
import serverEntry from "../src/server.ts";
import tuiEntry from "../src/tui.tsx";

describe("opencode-mercato entries", () => {
  test("server entry exposes the plugin id", () => {
    expect(serverEntry.id).toBe("opencode-mercato");
  });

  test("tui entry exposes the plugin id", () => {
    expect(tuiEntry.id).toBe("opencode-mercato");
  });
});