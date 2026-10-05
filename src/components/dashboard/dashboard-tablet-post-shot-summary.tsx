import { Link } from "@tanstack/react-router";
import { Check, TimerReset } from "lucide-react";

import { DashboardPostShotAnalysis } from "@/components/dashboard/dashboard-post-shot-analysis";
import { TelemetryChart } from "@/components/telemetry-chart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardPostShotSummaryModel } from "./dashboard-view-model";

type PostShotSummaryModel = NonNullable<ReturnType<typeof useDashboardPostShotSummaryModel>>;

/**
 * Replaces the prep board until dismissed: the frozen shot chart keeps the
 * space it had during the shot, and the shot facts plus Shot Analysis sit in a
 * side rail on landscape tablets (stacked below the chart in portrait).
 */
export function DashboardTabletPostShotSummary() {
  const model = useDashboardPostShotSummaryModel();

  if (model == null) {
    return null;
  }

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)]"
      data-testid="dashboard-tablet-post-shot-summary"
    >
      <div className="min-h-[280px] flex-1 overflow-hidden px-2 py-2 md:px-3 md:py-3 lg:min-h-0">
        <TelemetryChart
          className="h-full rounded-[4px] border-0 bg-transparent p-0 shadow-none"
          data={model.telemetry}
          frozen
          layout="tablet"
        />
      </div>

      <aside className="max-h-[50%] shrink-0 overflow-y-auto border-t border-status-success-border/40 bg-status-success-surface/15 lg:max-h-none lg:border-l lg:border-t-0">
        <PostShotFacts model={model} />

        {/* Keyed by localId so taste taps and any analysis are discarded with the summary. */}
        <DashboardPostShotAnalysis key={model.summary.localId} summary={model.summary} />
      </aside>
    </div>
  );
}

function PostShotFacts({ model }: { model: PostShotSummaryModel }) {
  return (
    <div className="border-b border-border/60 px-3 py-2.5 md:px-4">
      <p className="sr-only">Shot complete</p>

      <div className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-status-success-foreground shadow-[0_0_6px_rgba(107,231,159,0.5)]" />
        <div className="min-w-0 flex-1 font-mono text-[0.72rem] uppercase tracking-[0.08em]">
          <p className="truncate font-semibold text-foreground">{model.title}</p>
          <p className="truncate text-muted-foreground">{model.subtitle}</p>
        </div>

        {model.historyShotId ? (
          <Button
            asChild
            className="h-10 rounded-[4px] px-2.5 font-mono text-[0.74rem] font-semibold"
            size="sm"
            variant="secondary"
          >
            <Link search={{ shotId: model.historyShotId }} to="/history">
              <TimerReset className="size-3.5" />
              <span>Shots</span>
            </Link>
          </Button>
        ) : (
          <Button
            className="h-10 rounded-[4px] px-2.5 font-mono text-[0.74rem] font-semibold"
            disabled
            size="sm"
            variant="secondary"
          >
            <TimerReset className="size-3.5" />
            <span>Saving</span>
          </Button>
        )}

        <Button
          className="h-10 rounded-[4px] border-status-success-border bg-status-success-surface px-2.5 font-mono text-[0.74rem] font-semibold text-status-success-foreground hover:brightness-110"
          onClick={model.onDismiss}
          size="sm"
          variant="outline"
        >
          <Check className="size-3.5" />
          <span>Done</span>
        </Button>
      </div>

      <div className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-4">
        <MetricBlock label="Time" tone="hero" value={model.timeValue} />
        <MetricBlock
          deltaLabel={model.yieldDelta?.label}
          deltaTone={model.yieldDelta?.tone}
          detail={model.targetYieldLabel}
          label="Yield"
          value={model.yieldValue}
        />
        <MetricBlock detail={model.targetRatioLabel} label="Ratio" value={model.ratioValue} />
      </div>
    </div>
  );
}

function MetricBlock({
  deltaLabel,
  deltaTone,
  detail,
  label,
  tone,
  value,
}: {
  deltaLabel?: string;
  deltaTone?: "on-target" | "over" | "under";
  detail?: string | null;
  label: string;
  tone?: "hero";
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col font-mono">
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn(
            "font-semibold tabular-nums",
            tone === "hero"
              ? "text-[1.3rem] leading-tight text-status-success-foreground"
              : "text-[1.05rem] leading-tight text-foreground",
          )}
        >
          {value}
        </span>
        {deltaLabel ? (
          <span
            className={cn(
              "text-[0.72rem] font-semibold uppercase tracking-[0.04em]",
              deltaTone === "on-target"
                ? "text-status-success-foreground"
                : "text-status-warning-foreground",
            )}
          >
            {deltaLabel}
          </span>
        ) : null}
      </div>
      <span className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      {detail ? (
        <span className="truncate text-[0.68rem] text-muted-foreground/70">{detail}</span>
      ) : null}
    </div>
  );
}
