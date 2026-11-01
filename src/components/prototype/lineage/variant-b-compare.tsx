// PROTOTYPE — throwaway. Variant B: History opens a full-screen compare over the nav, like the
// editor. A narrow version rail on the left; on the right the selected version's Step chart sits
// above the current one, changed Steps outlined, with the field-by-field changes below.
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

import { getTitle } from "../app-placement/fixtures";
import { ProtoButton } from "../app-placement/shared";
import { changedStepIndexes, diffProfiles, formatDay, formatWhen } from "./lineage-model";
import { ChangeList, VersionActions, VersionBadges } from "./lineage-bits";
import { useLineageStore, useOpenLineage } from "./lineage-store";
import { StepChart } from "./step-chart";

export const variantBName = "Full-screen compare";

export function VariantBCompare() {
  const lineage = useOpenLineage();
  const close = useLineageStore((state) => state.close);
  const select = useLineageStore((state) => state.select);
  if (!lineage) return null;
  const { current, selected } = lineage;
  const isCurrent = current?.id === selected.record.id;
  const changes = current && !isCurrent ? diffProfiles(current.profile, selected.record.profile) : [];
  const highlight = changedStepIndexes(changes);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border/40 bg-panel-strong/30 px-2">
        <ProtoButton onClick={close} tone="ghost">
          <ArrowLeft className="size-4" /> Library
        </ProtoButton>
        <p className="font-mono text-[0.95rem] font-semibold">
          History · {getTitle(current ?? selected.record)}
        </p>
        <p className="ml-auto font-mono text-[0.7rem] text-muted-foreground">{lineage.origin.label}</p>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[208px_minmax(0,1fr)]">
        <nav className="min-h-0 overflow-y-auto border-r border-border/40 bg-panel/60">
          {lineage.versions.map((version) => (
            <button
              className={cn(
                "flex min-h-[48px] w-full flex-col justify-center border-b border-border/30 px-2.5 text-left",
                selected.record.id === version.record.id ? "bg-primary/15" : "hover:bg-panel-strong/40",
              )}
              key={version.record.id}
              onClick={() => select(version.record.id)}
              type="button"
            >
              <span className="flex flex-wrap items-center gap-1 font-mono text-[0.78rem] font-semibold">
                {formatDay(version.record.createdAt)}
                <VersionBadges version={version} />
              </span>
              <span className="font-mono text-[0.66rem] text-muted-foreground">
                {version.changes.length} change{version.changes.length === 1 ? "" : "s"}
                {version.forks.length ? ` · ${version.forks.length} cop${version.forks.length === 1 ? "y" : "ies"}` : ""}
              </span>
            </button>
          ))}
        </nav>
        <section className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-1 p-2">
            <ChartLabel text={`This version · ${formatWhen(selected.record.createdAt)}`} />
            <StepChart className="h-[108px] shrink-0" highlight={highlight} profile={selected.record.profile} />
            {current && !isCurrent ? (
              <>
                <ChartLabel text={`Current · ${formatWhen(current.createdAt)}`} />
                <StepChart className="h-[108px] shrink-0" highlight={highlight} profile={current.profile} />
              </>
            ) : null}
            <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
              <p className="mb-0.5 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                {isCurrent ? "What this save changed" : "Going back changes"}
              </p>
              <ChangeList
                changes={isCurrent ? selected.changes : changes}
                empty={isCurrent ? "First version." : "Same Steps as the current version."}
              />
            </div>
          </div>
          <VersionActions version={selected} />
        </section>
      </div>
    </div>
  );
}

function ChartLabel({ text }: { text: string }) {
  return (
    <p className="font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">{text}</p>
  );
}
