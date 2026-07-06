import { useEffect, useState } from "react";
import { Square } from "lucide-react";

import { useDashboardActiveUtilityAction } from "@/components/dashboard/dashboard-view-model";
import type { DashboardUtilityAction } from "@/lib/dashboard-utils";
import { cn } from "@/lib/utils";
import {
  useMachineStateQuery,
  useRequestMachineStateMutation,
  useWorkflowQuery,
} from "@/rest/queries";

const utilityTitles: Record<DashboardUtilityAction, string> = {
  flush: "Flushing",
  hotWater: "Hot Water",
  steam: "Steaming",
};

export function DashboardUtilityScreen() {
  const action = useDashboardActiveUtilityAction();
  const { data: snapshot } = useMachineStateQuery();
  const { data: workflow } = useWorkflowQuery();
  const requestMachineStateMutation = useRequestMachineStateMutation();
  const elapsedSeconds = useElapsedSeconds(action);

  if (action == null) {
    return null;
  }

  const targetDurationSeconds =
    action === "flush"
      ? (workflow?.rinseData?.duration ?? null)
      : action === "steam"
        ? (workflow?.steamSettings?.duration ?? null)
        : null;
  const metrics = buildUtilityMetrics(action, snapshot, workflow?.hotWaterData?.volume);

  function handleStop() {
    requestMachineStateMutation.mutate("idle");
  }

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-4 md:gap-6"
      data-testid="dashboard-utility-screen"
    >
      <div className="text-center">
        <p className="font-mono text-[0.8rem] font-semibold uppercase tracking-[0.24em] text-highlight-muted md:text-[0.9rem]">
          {utilityTitles[action]}
        </p>
        <p className="mt-1 font-mono text-[2.6rem] font-semibold tabular-nums leading-none text-foreground md:text-[3.4rem]">
          {formatElapsed(elapsedSeconds)}
          {targetDurationSeconds != null ? (
            <span className="text-[1.1rem] text-muted-foreground md:text-[1.3rem]">
              {` / ${targetDurationSeconds.toFixed(0)}s`}
            </span>
          ) : null}
        </p>
      </div>

      {targetDurationSeconds != null && targetDurationSeconds > 0 ? (
        <div className="h-[7px] w-full max-w-[420px] overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-highlight-muted transition-all duration-500"
            style={{
              width: `${Math.min(100, (elapsedSeconds / targetDurationSeconds) * 100)}%`,
            }}
          />
        </div>
      ) : null}

      <div className="flex w-full max-w-[520px] items-stretch justify-center gap-2 md:gap-3">
        {metrics.map((metric) => (
          <div
            className="min-w-0 flex-1 rounded-[4px] border border-border bg-panel-strong/80 px-3 py-2 text-center"
            key={metric.label}
          >
            <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 font-mono text-[1.1rem] font-semibold tabular-nums text-foreground md:text-[1.3rem]">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <button
        className={cn(
          "flex min-h-[64px] w-full max-w-[420px] items-center justify-center gap-2 rounded-[6px] border-2 border-destructive/60 bg-destructive/15 font-mono text-[1.05rem] font-bold uppercase tracking-[0.14em] text-destructive transition hover:bg-destructive/25 disabled:cursor-not-allowed disabled:opacity-50",
        )}
        disabled={requestMachineStateMutation.isPending}
        onClick={handleStop}
        type="button"
      >
        <Square className="size-5 fill-current" />
        {requestMachineStateMutation.isPending ? "Stopping" : "Stop"}
      </button>
    </div>
  );
}

function useElapsedSeconds(action: DashboardUtilityAction | null) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setElapsedSeconds(0);

    if (action == null) {
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds((Date.now() - startedAt) / 1000);
    }, 250);

    return () => window.clearInterval(interval);
  }, [action]);

  return elapsedSeconds;
}

function buildUtilityMetrics(
  action: DashboardUtilityAction,
  snapshot: ReturnType<typeof useMachineStateQuery>["data"],
  hotWaterTargetVolume: number | null | undefined,
) {
  const flow = { label: "Flow", value: formatMetric(snapshot?.flow, " ml/s", 1) };

  switch (action) {
    case "steam":
      return [{ label: "Steam", value: formatMetric(snapshot?.steamTemperature, "°C", 0) }, flow];
    case "hotWater":
      return [
        { label: "Water", value: formatMetric(snapshot?.mixTemperature, "°C", 0) },
        flow,
        { label: "Target", value: formatMetric(hotWaterTargetVolume, " ml", 0) },
      ];
    default:
      return [{ label: "Group", value: formatMetric(snapshot?.groupTemperature, "°C", 0) }, flow];
  }
}

function formatMetric(value: number | null | undefined, suffix: string, digits: number) {
  if (value == null || Number.isNaN(value)) {
    return `--${suffix}`;
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function formatElapsed(seconds: number) {
  return `${seconds.toFixed(0)}s`;
}
