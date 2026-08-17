import { describe, expect, test } from "bun:test";
import mainEntry from "../src/index.ts";
import serverEntry from "../src/server.ts";
import tuiEntry from "../src/tui.tsx";

describe("opencode-mercato entries", () => {
  test("main entry exposes the plugin id and setup", () => {
    expect(mainEntry.id).toBe("opencode-mercato");
    expect(typeof mainEntry.setup).toBe("function");
  });

  test("server entry exposes the plugin id", () => {
    expect(serverEntry.id).toBe("opencode-mercato");
  });

  test("tui entry exposes the plugin id", () => {
    expect(tuiEntry.id).toBe("opencode-mercato");
  });
});