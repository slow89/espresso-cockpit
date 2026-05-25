import { Link } from "@tanstack/react-router";
import { Check, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TelemetryChart } from "@/components/telemetry-chart";
import { cn } from "@/lib/utils";
import {
  type DashboardPostShotSummaryMetric,
  useDashboardPostShotSummaryModel,
} from "./dashboard-view-model";

export function DashboardTabletPostShotSummary() {
  const model = useDashboardPostShotSummaryModel();

  if (model == null) {
    return null;
  }

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col px-2 py-2 md:px-3 md:py-3"
      data-testid="dashboard-tablet-post-shot-summary"
    >
      <div className="grid h-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2.5">
        <PostShotHeaderBar model={model} />
        <div className="h-full min-h-0 overflow-hidden">
          <TelemetryChart
            className="h-full rounded-[4px] border-0 bg-transparent p-0 shadow-none"
            data={model.telemetry}
            layout="tablet"
          />
        </div>
      </div>
    </div>
  );
}

function PostShotHeaderBar({
  model,
}: {
  model: NonNullable<ReturnType<typeof useDashboardPostShotSummaryModel>>;
}) {
  return (
    <div className="shrink-0 border-b border-border/70">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-2.5 py-1.5 md:px-4 md:py-2">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <span className="block size-2 shrink-0 rounded-full bg-status-success-foreground shadow-[0_0_6px_rgba(107,231,159,0.5)] md:size-2.5" />
          <p className="shrink-0 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-status-success-foreground md:text-[0.84rem]">
            Shot complete
          </p>
          <span className="shrink-0 font-mono text-[0.5rem] text-muted-foreground/60 md:text-[0.62rem]">
            |
          </span>
          <p className="min-w-0 truncate font-mono text-[0.62rem] font-semibold tabular-nums text-foreground md:text-[0.82rem]">
            {model.title}
          </p>
          <span className="shrink-0 font-mono text-[0.5rem] text-muted-foreground/60 md:text-[0.62rem]">
            ·
          </span>
          <p className="min-w-0 truncate font-mono text-[0.6rem] tabular-nums text-muted-foreground md:text-[0.78rem]">
            {model.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-stretch gap-1.5">
          {model.historyShotId ? (
            <Button
              asChild
              className="h-8 rounded-[4px] px-2 font-mono text-[0.6rem] font-semibold md:h-9 md:px-3 md:text-[0.72rem]"
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
              className="h-8 rounded-[4px] px-2 font-mono text-[0.6rem] font-semibold md:h-9 md:px-3 md:text-[0.72rem]"
              disabled
              size="sm"
              variant="secondary"
            >
              <TimerReset className="size-3.5" />
              <span>Saving</span>
            </Button>
          )}

          <Button
            className="h-8 rounded-[4px] border-status-success-border bg-status-success-surface px-2 font-mono text-[0.6rem] font-semibold text-status-success-foreground hover:brightness-110 md:h-9 md:px-3 md:text-[0.72rem]"
            onClick={model.onDismiss}
            size="sm"
            variant="outline"
          >
            <Check className="size-3.5" />
            <span>Done</span>
          </Button>
        </div>
      </div>

      <div className="flex items-stretch">
        {model.metrics.map((metric, i) => (
          <PostShotMetricCell index={i} key={metric.label} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function PostShotMetricCell({
  index,
  metric,
}: {
  index: number;
  metric: DashboardPostShotSummaryMetric;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col justify-center px-2.5 py-1.5",
        index > 0 && "border-l border-border/60",
      )}
    >
      <p className="truncate font-mono text-[0.44rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {metric.label}
      </p>
      <p className="mt-0.5 truncate font-mono text-[0.74rem] font-semibold tabular-nums text-foreground">
        {metric.value}
      </p>
    </div>
  );
}
