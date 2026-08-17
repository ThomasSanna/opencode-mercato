import { Plugin } from "@opencode-ai/plugin";

/**
 * opencode-mercato — server entry (OpenCode V2).
 *
 * Headless server plugin definition. Interactive dialog and slash command
 * execution are handled by the TUI layer in `src/tui.tsx`.
 */
export default Plugin.define({
  id: "opencode-mercato",
  setup: async (_ctx) => {
    // Headless server lifecycle hook
  },
});