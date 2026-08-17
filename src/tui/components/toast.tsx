/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";

export interface ToastProps {
  message?: string | null;
}

export function Toast(props: ToastProps): JSX.Element {
  if (!props.message) {
    return <box />;
  }

  return (
    <box
      flexDirection="row"
      paddingLeft={1}
      paddingRight={1}
      border={["top", "bottom", "left", "right"]}
      borderColor="#58a6ff"
      backgroundColor="#161b22"
    >
      <text fg="#58a6ff">
        <b>[Notice]</b>
      </text>
      <text fg="#c9d1d9"> {props.message}</text>
    </box>
  );
}
