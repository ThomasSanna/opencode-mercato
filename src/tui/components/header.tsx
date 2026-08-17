/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import { formatItemCount, STRINGS } from "../strings";

export interface HeaderProps {
  filteredCount: number;
  totalCount: number;
  stale?: boolean;
}

export function Header(props: HeaderProps): JSX.Element {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingBottom={1}
      border={["bottom"]}
      borderColor="#30363d"
    >
      <box flexDirection="row" gap={1}>
        <text fg="#58a6ff">
          <b>{STRINGS.APP_TITLE}</b>
        </text>
        <text fg="#8b949e">
          — {STRINGS.APP_SUBTITLE}
        </text>
      </box>
      <box flexDirection="row" gap={1}>
        <text fg="#8b949e">
          {formatItemCount(props.filteredCount, props.totalCount)}
        </text>
        {props.stale && (
          <text fg="#d29922">
            {STRINGS.STATUS_STALE}
          </text>
        )}
      </box>
    </box>
  );
}
