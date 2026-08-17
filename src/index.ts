import { Plugin } from "@opencode-ai/plugin";
import { setupTui, openMercato } from "./tui/index";

export { setupTui, openMercato };

/**
 * opencode-mercato — main entry point (OpenCode V2).
 *
 * Core OpenCode V2 plugin definition.
 */
export default Plugin.define({
  id: "opencode-mercato",
  setup: async (_ctx) => {
    // OpenCode V2 core lifecycle
  },
});
