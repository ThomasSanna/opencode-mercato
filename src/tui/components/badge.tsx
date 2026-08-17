/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import type { Kind, SourceId, Trust } from "../../core/model";
import type { ItemStatus } from "../../core/status";
import type { ItemUpdateInfo } from "../../core/versions";

export function getKindColor(kind: Kind): string {
  switch (kind) {
    case "plugin":
      return "#58a6ff"; // blue
    case "mcp":
      return "#3fb950"; // green
    case "skill":
      return "#d29922"; // yellow
    case "agent":
      return "#bc8cff"; // purple
    case "theme":
      return "#f0883e"; // orange
    case "command":
      return "#f85149"; // red
  }
}

export function getTrustColor(level: Trust["level"]): string {
  switch (level) {
    case "high":
      return "#3fb950"; // green
    case "medium":
      return "#d29922"; // yellow
    case "low":
      return "#8b949e"; // gray
  }
}

export function KindBadge(props: { kind: Kind }): JSX.Element {
  return (
    <text fg={getKindColor(props.kind)}>
      [{props.kind}]
    </text>
  );
}

export function TrustBadge(props: { trust: Trust }): JSX.Element {
  return (
    <text fg={getTrustColor(props.trust.level)}>
      [{props.trust.level} trust]
    </text>
  );
}

export function SourceBadge(props: { source: SourceId }): JSX.Element {
  return (
    <text fg="#8b949e">
      {props.source}
    </text>
  );
}

export function StatusBadge(props: { status?: ItemStatus }): JSX.Element {
  return (
    <>
      {props.status && props.status !== "not-installed" ? (
        <text fg={props.status === "disabled" ? "#8b949e" : "#3fb950"}>
          [{props.status}]
        </text>
      ) : null}
    </>
  );
}

export function UpdateBadge(props: { updateInfo?: ItemUpdateInfo }): JSX.Element {
  return (
    <>
      {props.updateInfo &&
      props.updateInfo.updateState !== "up-to-date" &&
      props.updateInfo.updateState !== "unknown" ? (
        props.updateInfo.updateState === "major-available" ? (
          <text fg="#f85149">
            [major: {props.updateInfo.latestVersion ?? "update"}]
          </text>
        ) : (
          <text fg="#3fb950">
            [{props.updateInfo.diffType ?? "update"}: {props.updateInfo.latestVersion ?? "new"}]
          </text>
        )
      ) : null}
    </>
  );
}

