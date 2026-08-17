/** @jsxImportSource @opentui/solid */
import type { Context } from "@opencode-ai/plugin/tui/context";
import { MercatoDialog } from "./dialog";
import { STRINGS } from "./strings";

export function openMercato(ctx: Context): void {
  ctx.ui.dialog.set({ size: "large", centered: true });
  const popMode = ctx.keymap.mode.push("mercato.dialog");

  ctx.ui.dialog.show(
    () => (
      <MercatoDialog
        onClose={() => {
          ctx.ui.dialog.clear();
        }}
        showToast={(message) => {
          ctx.ui.toast.show({ message });
        }}
      />
    ),
    () => {
      popMode();
    }
  );
}

export function setupTui(ctx: Context): void {
  const command = {
    id: STRINGS.COMMAND_ID,
    title: STRINGS.COMMAND_TITLE,
    description: STRINGS.COMMAND_DESCRIPTION,
    group: STRINGS.COMMAND_GROUP,
    palette: true as const,
    suggested: true,
    slash: {
      name: STRINGS.COMMAND_SLASH,
      aliases: ["market"],
    },
    run: () => {
      openMercato(ctx);
    },
  };

  // Register in base interactive mode
  ctx.keymap.layer(() => ({
    commands: [command],
  }));

  // Register in global mode
  ctx.keymap.layer(() => ({
    mode: "global",
    commands: [command],
  }));
}
