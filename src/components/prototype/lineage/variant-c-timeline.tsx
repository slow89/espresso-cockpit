// PROTOTYPE — throwaway. Variant C: History replaces the whole Library body with a timeline. A rail
// of dots runs down the left, Copies branch off to the right of the version they came from, and
// tapping a version expands it in place with its Step chart, changes, and actions.
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

import { getTitle } from "../app-placement/fixtures";
import { useProtoStore } from "../app-placement/proto-store";
import { ProtoButton } from "../app-placement/shared";
import { changedStepIndexes, diffProfiles, formatWhen, type Version } from "./lineage-model";
import { ChangeList, VersionActions, VersionBadges, changeSummary } from "./lineage-bits";
import { useLineageStore, useOpenLineage } from "./lineage-store";
import { StepChart } from "./step-chart";

export const variantCName = "Timeline, expand in place";

export function VariantCTimeline() {
  const lineage = useOpenLineage();
  const close = useLineageStore((state) => state.close);
  if (!lineage) return null;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/30 px-2">
        <ProtoButton onClick={close} tone="ghost">
          <ArrowLeft className="size-4" /> Profiles
        </ProtoButton>
        <p className="font-mono text-[0.9rem] font-semibold">
          History · {getTitle(lineage.current ?? lineage.versions[0].record)}
        </p>
        <p className="ml-auto pr-2 font-mono text-[0.7rem] text-muted-foreground">
          {lineage.versions.length} versions
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1">
        {lineage.versions.map((version) => (
          <TimelineRow
            current={lineage.current}
            isSelected={lineage.selected.record.id === version.record.id}
            key={version.record.id}
            version={version}
          />
        ))}
        <div className="flex items-center gap-3 py-2 pl-[9px]">
          <span className="size-3 rounded-full border-2 border-dashed border-muted-foreground/60" />
          <p className="font-mono text-[0.72rem] text-muted-foreground">{lineage.origin.label}</p>
        </div>
      </div>
    </section>
  );
}

function TimelineRow({
  current,
  isSelected,
  version,
}: {
  current: Version["record"] | null;
  isSelected: boolean;
  version: Version;
}) {
  const select = useLineageStore((state) => state.select);
  const close = useLineageStore((state) => state.close);
  const setSelected = useProtoStore((state) => state.setSelected);
  const goingBack =
    current && current.id !== version.record.id ? diffProfiles(current.profile, version.record.profile) : [];

  return (
    <div className="flex gap-3">
      <div className="flex w-[30px] shrink-0 flex-col items-center">
        <span
          className={cn(
            "mt-4 size-3 shrink-0 rounded-full border-2",
            version.state === "current"
              ? "border-status-success-foreground bg-status-success-foreground"
              : version.state === "retired"
                ? "border-highlight bg-transparent"
                : "border-muted-foreground bg-panel",
          )}
        />
        <span className="w-px flex-1 bg-border" />
      </div>
      <div className={cn("min-w-0 flex-1 border-b border-border/30", isSelected && "pb-1")}>
        <div className="flex items-center gap-2">
          <button
            className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-left"
            onClick={() => select(version.record.id)}
            type="button"
          >
            <span className="w-[118px] shrink-0 font-mono text-[0.8rem] font-semibold">
              {formatWhen(version.record.createdAt)}
            </span>
            <span className="flex shrink-0 gap-1">
              <VersionBadges version={version} />
            </span>
            <span className="truncate font-mono text-[0.72rem] text-muted-foreground">
              {changeSummary(version)}
            </span>
          </button>
          {version.forks.map((fork) => (
            <button
              className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 font-mono text-[0.7rem]"
              key={fork.id}
              onClick={() => {
                close();
                setSelected(fork.id);
              }}
              type="button"
            >
              ⑂ {getTitle(fork)} ›
            </button>
          ))}
        </div>
        {isSelected ? (
          <div className="mb-1 grid grid-cols-[minmax(0,1fr)_300px] gap-2 rounded-[4px] border border-border/50 bg-panel/60 p-2">
            <StepChart
              className="h-[120px]"
              highlight={changedStepIndexes(version.changes)}
              profile={version.record.profile}
            />
            <div className="min-h-0 space-y-1 overflow-y-auto">
              <ChangeList changes={version.changes} empty="First version." />
              {goingBack.length ? (
                <>
                  <p className="pt-1 font-mono text-[0.66rem] uppercase tracking-[0.08em] text-muted-foreground">
                    Going back changes
                  </p>
                  <ChangeList changes={goingBack} empty="" />
                </>
              ) : null}
            </div>
            <div className="col-span-2 -mx-2 -mb-2">
              <VersionActions version={version} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
