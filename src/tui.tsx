import { Plugin } from "@opencode-ai/plugin/tui";

/**
 * opencode-mercato — TUI entry (OpenCode V2).
 *
 * Renders the Mercato dialog screens (list, detail, confirm, updates,
 * settings, restore). Presentation only; all decisions live in `src/core`.
 */
export default Plugin.define({
  id: "opencode-mercato",
  setup: async (ctx) => {
    // M2+: palette command, dialog screen loop, api.ui usage
    void ctx;
  },
});