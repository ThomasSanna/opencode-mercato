/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import { STRINGS } from "../strings";

export interface SearchBarProps {
  query: string;
}

export function SearchBar(props: SearchBarProps): JSX.Element {
  const hasQuery = props.query.length > 0;

  return (
    <box
      flexDirection="row"
      paddingTop={1}
      paddingBottom={1}
      border={["bottom"]}
      borderColor="#30363d"
    >
      <text fg="#58a6ff">
        <b>{STRINGS.SEARCH_PROMPT}</b>{" "}
      </text>
      {hasQuery ? (
        <text fg="#f0f6fc">
          {props.query}▍
        </text>
      ) : (
        <text fg="#8b949e">
          {STRINGS.SEARCH_PLACEHOLDER}
        </text>
      )}
    </box>
  );
}
