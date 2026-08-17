/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import type { ScreenName } from "../../core/flow";
import { STRINGS } from "../strings";

export interface KeymapHelpProps {
  screen: ScreenName;
}

export function KeymapHelp(props: KeymapHelpProps): JSX.Element {
  let text: string = STRINGS.SHORTCUTS_LIST;
  if (props.screen === "detail") {
    text = STRINGS.SHORTCUTS_DETAIL;
  } else if (props.screen === "confirm") {
    text = STRINGS.SHORTCUTS_CONFIRM;
  } else if (props.screen === "updates") {
    text = STRINGS.SHORTCUTS_UPDATES;
  } else if (props.screen === "versions") {
    text = STRINGS.SHORTCUTS_VERSIONS;
  } else if (props.screen === "settings") {
    text = STRINGS.SHORTCUTS_SETTINGS;
  } else if (props.screen === "restore") {
    text = STRINGS.SHORTCUTS_RESTORE;
  }

  return (
    <box
      paddingTop={1}
      border={["top"]}
      borderColor="#30363d"
    >
      <text fg="#8b949e">
        {text}
      </text>
    </box>
  );
}
