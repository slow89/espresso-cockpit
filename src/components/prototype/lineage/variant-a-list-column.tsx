// PROTOTYPE — throwaway. Variant A: History swaps the Library's list column to the versions, like
// the Removed list (ticket 11). The detail pane shows the selected version and what changed.
import { ArrowLeft } from "lucide-react";

import { WorkflowFrameChart } from "@/components/workflows/workflow-frame-chart";
import { buildFramePreviewData } from "@/lib/workflow-frame-preview";
import { cn } from "@/lib/utils";

import { getTitle } from "../app-placement/fixtures";
import { useProtoStore } from "../app-placement/proto-store";
import { diffProfiles, formatWhen, type Version } from "./lineage-model";
import { ChangeList, VersionActions, VersionBadges, changeSummary } from "./lineage-bits";
import { useLineageStore, useOpenLineage } from "./lineage-store";

export const variantAName = "History in the list column";

export function VariantAHistoryColumn() {
  const lineage = useOpenLineage();
  const close = useLineageStore((state) => state.close);
  const select = useLineageStore((state) => state.select);
  const setSelected = useProtoStore((state) => state.setSelected);
  if (!lineage) return null;
  const title = getTitle(lineage.current ?? lineage.versions[0].record);

  return (
    <section className="flex min-h-0 flex-col border-r border-border/40 bg-panel/60">
      <button
        className="flex h-11 shrink-0 items-center gap-2 border-b border-border/30 px-3 text-left font-mono text-[0.78rem] font-semibold"
        onClick={close}
        type="button"
      >
        <ArrowLeft className="size-4" /> Profiles
        <span className="truncate text-muted-foreground">· History of {title}</span>
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {lineage.versions.map((version) => (
          <div key={version.record.id}>
            <button
              className={cn(
                "flex min-h-[52px] w-full flex-col justify-center gap-0.5 border-b border-border/30 px-3 text-left",
                lineage.selected.record.id === version.record.id
                  ? "bg-primary/15"
                  : "hover:bg-panel-strong/40",
              )}
              onClick={() => select(version.record.id)}
              type="button"
            >
              <span className="flex items-center gap-1.5 font-mono text-[0.8rem] font-semibold">
                {formatWhen(version.record.createdAt)}
                <VersionBadges version={version} />
              </span>
              <span className="truncate font-mono text-[0.7rem] text-muted-foreground">
                {changeSummary(version)}
              </span>
            </button>
            {version.forks.map((fork) => (
              <button
                className="flex min-h-[40px] w-full items-center gap-2 border-b border-border/30 pl-6 pr-3 text-left font-mono text-[0.72rem] text-muted-foreground"
                key={fork.id}
                onClick={() => {
                  close();
                  setSelected(fork.id);
                }}
                type="button"
              >
                ↳ Copied to <span className="font-semibold text-foreground">{getTitle(fork)}</span> ›
              </button>
            ))}
          </div>
        ))}
        <p className="px-3 py-3 font-mono text-[0.7rem] text-muted-foreground">
          {lineage.origin.label}
        </p>
      </div>
    </section>
  );
}

export function VariantAVersionDetail() {
  const lineage = useOpenLineage();
  const compareTo = useLineageStore((state) => state.compareTo);
  const setCompareTo = useLineageStore((state) => state.setCompareTo);
  if (!lineage) return null;
  const { selected, current } = lineage;
  const changes =
    compareTo === "current" && current && current.id !== selected.record.id
      ? diffProfiles(current.profile, selected.record.profile)
      : selected.changes;

  return <DetailBody changes={changes} compareTo={selected.state === "current" ? "previous" : compareTo} key={selected.record.id} onCompare={setCompareTo} version={selected} />;
}

function DetailBody({
  changes,
  compareTo,
  onCompare,
  version,
}: {
  changes: ReturnType<typeof diffProfiles>;
  compareTo: "previous" | "current";
  onCompare: (value: "previous" | "current") => void;
  version: Version;
}) {
  return (
    <section className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/30 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-mono text-[1rem] font-semibold">{getTitle(version.record)}</p>
          <VersionBadges version={version} />
        </div>
        <p className="mt-0.5 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted-foreground">
          Saved {formatWhen(version.record.createdAt)} · {version.record.profile.steps?.length ?? 0} steps
        </p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_250px] gap-2 p-2">
        <WorkflowFrameChart
          className="h-full"
          layout="tablet"
          onSelectFrame={() => {}}
          preview={buildFramePreviewData(version.record.profile)}
          selectedFrameIndex={-1}
        />
        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="flex gap-1">
            {(["previous", "current"] as const).map((key) => (
              <button
                className={cn(
                  "min-h-9 flex-1 rounded-[4px] border px-1 disabled:opacity-40 font-mono text-[0.66rem] font-semibold uppercase leading-3",
                  compareTo === key
                    ? "border-highlight/50 bg-highlight/12 text-highlight"
                    : "border-border/50 text-muted-foreground",
                )}
                disabled={key === "current" && version.state === "current"}
                key={key}
                onClick={() => onCompare(key)}
                type="button"
              >
                {key === "previous" ? "What this save changed" : "Going back changes"}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChangeList
              changes={changes}
              empty={compareTo === "current" ? "This is the current version." : "First version."}
            />
          </div>
        </div>
      </div>
      <VersionActions version={version} />
    </section>
  );
}
