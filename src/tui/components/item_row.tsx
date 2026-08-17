/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import type { CatalogItem } from "../../core/model";
import type { ItemStatus } from "../../core/status";
import type { ItemUpdateInfo } from "../../core/versions";
import { KindBadge, StatusBadge, TrustBadge, UpdateBadge } from "./badge";

export interface ItemRowProps {
  item: CatalogItem;
  isSelected: boolean;
  status?: ItemStatus;
  updateInfo?: ItemUpdateInfo;
}

export function ItemRow(props: ItemRowProps): JSX.Element {
  return (
    <box
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={0}
      paddingBottom={0}
      backgroundColor={props.isSelected ? "#161b22" : undefined}
    >
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row" gap={1}>
          <text fg={props.isSelected ? "#58a6ff" : "#8b949e"}>
            <b>{props.isSelected ? "›" : " "}</b>
          </text>
          <text fg={props.isSelected ? "#58a6ff" : "#f0f6fc"}>
            <b>{props.item.name}</b>
          </text>
          <KindBadge kind={props.item.kind} />
          {props.status && <StatusBadge status={props.status} />}
          {props.updateInfo && <UpdateBadge updateInfo={props.updateInfo} />}
        </box>
        <TrustBadge trust={props.item.bestTrust} />
      </box>

      <box paddingLeft={3}>
        <text fg="#8b949e">
          {props.item.description}
        </text>
      </box>
    </box>
  );
}
