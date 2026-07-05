import { Link } from "@tanstack/react-router";
import { TimerReset, X } from "lucide-react";

import { DashboardPostShotAnalysis } from "@/components/dashboard/dashboard-post-shot-analysis";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardPostShotSummaryModel } from "./dashboard-view-model";

export function DashboardTabletPostShotSummary() {
  const model = useDashboardPostShotSummaryModel();

  if (model == null) {
    return null;
  }

  return (
    <div
      className="shrink-0 border-b border-status-success-border/40 bg-status-success-surface/15"
      data-testid="dashboard-tablet-post-shot-summary"
    >
      <div className="flex items-start gap-3 px-3 pt-2 md:px-4 md:pt-2.5">
        <div className="min-w-0 flex-1">
          <p className="sr-only">Shot complete</p>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 md:gap-x-4">
            <MetricBlock label="Time" tone="hero" value={model.timeValue} />
            <MetricBlock
              detail={model.targetYieldLabel}
              deltaLabel={model.yieldDelta?.label}
              deltaTone={model.yieldDelta?.tone}
              label="Yield"
              value={model.yieldValue}
            />
            <MetricBlock detail={model.targetRatioLabel} label="Ratio" value={model.ratioValue} />
          </div>

          <p className="mt-1 min-w-0 truncate font-mono text-[0.56rem] uppercase tracking-[0.1em] text-muted-foreground md:text-[0.66rem]">
            {model.title} · {model.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {model.historyShotId ? (
            <Button
              asChild
              className="h-8 rounded-[4px] px-2 font-mono text-[0.6rem] font-semibold md:h-9 md:px-3 md:text-[0.7rem]"
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
              className="h-8 rounded-[4px] px-2 font-mono text-[0.6rem] font-semibold md:h-9 md:px-3 md:text-[0.7rem]"
              disabled
              size="sm"
              variant="secondary"
            >
              <TimerReset className="size-3.5" />
              <span>Saving</span>
            </Button>
          )}

          <Button
            aria-label="Dismiss shot summary"
            className="size-8 rounded-[4px] text-muted-foreground hover:text-foreground md:size-9"
            onClick={model.onDismiss}
            size="icon"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Keyed by localId so taste taps and any analysis are discarded with the summary. */}
      <DashboardPostShotAnalysis key={model.summary.localId} summary={model.summary} />
    </div>
  );
}

function MetricBlock({
  detail,
  deltaLabel,
  deltaTone,
  label,
  tone,
  value,
}: {
  detail?: string | null;
  deltaLabel?: string;
  deltaTone?: "on-target" | "over" | "under";
  label: string;
  tone?: "hero";
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono font-semibold tabular-nums text-foreground",
            tone === "hero"
              ? "text-[1.1rem] text-status-success-foreground md:text-[1.5rem]"
              : "text-[0.88rem] md:text-[1.15rem]",
          )}
        >
          {value}
        </span>
        {deltaLabel ? (
          <span
            className={cn(
              "font-mono text-[0.58rem] font-semibold uppercase tracking-[0.08em] md:text-[0.66rem]",
              deltaTone === "on-target" && "text-status-success-foreground",
              deltaTone === "over" && "text-status-warning-foreground",
              deltaTone === "under" && "text-status-warning-foreground",
            )}
          >
            {deltaLabel}
          </span>
        ) : null}
      </div>
      <span className="mt-0.5 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:text-[0.58rem]">
        {label}
        {detail ? (
          <span className="ml-1 font-normal normal-case text-muted-foreground/70">· {detail}</span>
        ) : null}
      </span>
    </div>
  );
}
