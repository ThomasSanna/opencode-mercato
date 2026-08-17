/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import type { SourceProvenance } from "../../core/model";
import { formatSourceProvenance, STRINGS } from "../strings";
import { getTrustColor } from "./badge";

export interface ProvenanceViewProps {
  sources: readonly SourceProvenance[];
}

export function ProvenanceView(props: ProvenanceViewProps): JSX.Element {
  return (
    <box flexDirection="column" gap={0} paddingTop={1} paddingBottom={1}>
      <text fg="#f0f6fc">
        <b>{STRINGS.LABEL_PROVENANCE}</b>
      </text>
      {props.sources.map((src) => {
        const text = formatSourceProvenance(
          src.source,
          src.trust.score,
          src.trust.level
        );
        return (
          <box flexDirection="row" gap={1} paddingLeft={2}>
            <text fg={getTrustColor(src.trust.level)}>
              • {text}
            </text>
            <text fg="#8b949e">
              (id: {src.rawId})
            </text>
          </box>
        );
      })}
    </box>
  );
}
