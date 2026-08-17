/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import { createMemo } from "solid-js";
import type { CatalogItem } from "../../core/model";
import {
  getLifecycleActions,
  type ItemStatus,
  type LifecycleAction,
} from "../../core/status";
import type { ItemUpdateInfo } from "../../core/versions";
import { KindBadge, StatusBadge, TrustBadge, UpdateBadge } from "../components/badge";
import { KeymapHelp } from "../components/keymap_help";
import { ProvenanceView } from "../components/provenance_view";
import { STRINGS } from "../strings";

export type DetailAction = LifecycleAction;

export function getDetailActions(
  item: CatalogItem,
  status: ItemStatus = "not-installed",
  updateInfo?: ItemUpdateInfo
): DetailAction[] {
  return getLifecycleActions(item, status, updateInfo);
}

export interface DetailScreenProps {
  item: CatalogItem;
  selectedActionIndex: number;
  status?: ItemStatus;
  updateInfo?: ItemUpdateInfo;
}

export function DetailScreen(props: DetailScreenProps): JSX.Element {
  const actions = createMemo(() =>
    getDetailActions(props.item, props.status ?? "not-installed", props.updateInfo)
  );


  return (
    <box flexDirection="column" padding={1} width="100%" gap={1}>
      {/* Header */}
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
            — {STRINGS.DETAIL_HEADER}
          </text>
        </box>
      </box>

      {/* Title & Badges */}
      <box flexDirection="row" justifyContent="space-between" paddingTop={1}>
        <box flexDirection="row" gap={1}>
          <text fg="#f0f6fc">
            <b>{props.item.name}</b>
          </text>
          <KindBadge kind={props.item.kind} />
          <StatusBadge status={props.status} />
          {props.updateInfo && <UpdateBadge updateInfo={props.updateInfo} />}
        </box>
        <TrustBadge trust={props.item.bestTrust} />
      </box>

      {/* Description */}
      <box paddingLeft={1} paddingTop={0} paddingBottom={1}>
        <text fg="#c9d1d9">
          {props.item.description}
        </text>
      </box>

      {/* Metadata Table */}
      <box
        flexDirection="column"
        padding={1}
        backgroundColor="#161b22"
        borderColor="#30363d"
        border={true}
      >
        {props.updateInfo?.currentVersion && (
          <box flexDirection="row" gap={1}>
            <text fg="#8b949e">
              <b>{STRINGS.LABEL_CURRENT_VERSION}</b>
            </text>
            <text fg="#f0f6fc">
              {props.updateInfo.currentVersion}
            </text>
          </box>
        )}
        {props.updateInfo?.latestVersion && (
          <box flexDirection="row" gap={1}>
            <text fg="#8b949e">
              <b>{STRINGS.LABEL_LATEST_VERSION}</b>
            </text>
            <text fg="#f0f6fc">
              {props.updateInfo.latestVersion}
            </text>
          </box>
        )}

        <box flexDirection="row" gap={1}>
          <text fg="#8b949e">
            <b>{STRINGS.LABEL_REPO}</b>
          </text>
          <text fg="#f0f6fc">
            {props.item.repoUrl ?? STRINGS.NONE_SPECIFIED}
          </text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg="#8b949e">
            <b>{STRINGS.LABEL_NPM}</b>
          </text>
          <text fg="#f0f6fc">
            {props.item.npmSpec ?? STRINGS.NONE_SPECIFIED}
          </text>
        </box>
        {props.item.homepage && (
          <box flexDirection="row" gap={1}>
            <text fg="#8b949e">
              <b>{STRINGS.LABEL_HOMEPAGE}</b>
            </text>
            <text fg="#f0f6fc">
              {props.item.homepage}
            </text>
          </box>
        )}
        <box flexDirection="row" gap={1}>
          <text fg="#8b949e">
            <b>{STRINGS.LABEL_TAGS}</b>
          </text>
          <text fg="#f0f6fc">
            {props.item.tags.length > 0
              ? props.item.tags.join(", ")
              : STRINGS.NONE_SPECIFIED}
          </text>
        </box>
      </box>

      {/* Provenance */}
      <ProvenanceView sources={props.item.sources} />

      {/* Actions */}
      <box flexDirection="column" gap={0} paddingTop={1}>
        <text fg="#f0f6fc">
          <b>Actions:</b>
        </text>
        {actions().map((act, idx) => {
          const isSel = () => idx === props.selectedActionIndex;
          return (
            <box
              flexDirection="row"
              gap={1}
              paddingLeft={1}
              backgroundColor={isSel() ? "#1f6feb22" : undefined}
            >
              <text fg={isSel() ? "#58a6ff" : "#8b949e"}>
                <b>{isSel() ? "›" : " "}</b>
              </text>
              <text fg={isSel() ? "#58a6ff" : "#f0f6fc"}>
                {isSel() ? <b>{act.label}</b> : act.label}
              </text>
            </box>
          );
        })}
      </box>

      <KeymapHelp screen="detail" />
    </box>
  );
}
