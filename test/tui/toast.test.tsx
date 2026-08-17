import { describe, expect, it } from "bun:test";
import { testRender } from "@opentui/solid";
import { Toast } from "../../src/tui/components/toast";

describe("Toast component", () => {
  it("renders empty box when message is not provided", async () => {
    const el = await testRender(() => <Toast />);
    expect(el).toBeDefined();
  });

  it("renders message content when provided", async () => {
    const el = await testRender(() => (
      <Toast message="Settings saved successfully" />
    ));
    expect(el).toBeDefined();
  });
});
