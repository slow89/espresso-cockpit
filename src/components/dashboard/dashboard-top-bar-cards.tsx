import { Link } from "@tanstack/react-router";
import { Droplets, Pause, Play, Power, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { roundValue } from "@/lib/recipe-utils";
import { cn } from "@/lib/utils";
import {
  useDevicesQuery,
  useMachineStateQuery,
  useRequestMachineStateMutation,
  useTareScaleMutation,
  useUpdateWorkflowMutation,
  useWorkflowQuery,
} from "@/rest/queries";
import { type LiveConnectionState, useMachineStore } from "@/stores/machine-store";
import { getDashboardActiveRecipe } from "./dashboard-view-model";

export function DashboardRecipeButton() {
  const { data: workflow } = useWorkflowQuery();

  return (
    <Button
      asChild
      className="h-auto min-h-8 min-w-[160px] flex-1 justify-between rounded-[3px] border-border/50 bg-panel-strong/60 px-2.5 py-1 font-mono text-[0.68rem] font-medium text-foreground hover:bg-panel-strong md:flex-none md:max-w-[260px] md:max-xl:min-h-10 md:max-xl:min-w-[190px] md:max-xl:px-3 md:max-xl:py-2 md:max-xl:text-[0.78rem]"
      size="sm"
      variant="outline"
    >
      <Link to="/workflows">
        <span className="min-w-0 truncate">{getDashboardActiveRecipe(workflow)}</span>
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted-foreground md:max-xl:text-[0.52rem]">
          Profiles
        </span>
      </Link>
    </Button>
  );
}

export function DevShotToggleButton({
  isSimulatedShotActive,
  onToggleSimulatedShot,
}: {
  isSimulatedShotActive: boolean;
  onToggleSimulatedShot: () => void;
}) {
  return (
    <button
      aria-label={isSimulatedShotActive ? "Pause shot simulator" : "Play shot simulator"}
      className={cn(
        "flex min-h-8 min-w-[36px] shrink-0 items-center justify-center rounded-[3px] border bg-panel-strong/60 px-2 text-muted-foreground transition hover:text-foreground md:max-xl:min-h-9 md:max-xl:min-w-[40px]",
        isSimulatedShotActive
          ? "border-status-success-border bg-status-success-surface text-status-success-foreground"
          : "border-border/50",
      )}
      onClick={onToggleSimulatedShot}
      title={isSimulatedShotActive ? "Pause shot simulator" : "Play shot simulator"}
      type="button"
    >
      {isSimulatedShotActive ? (
        <Pause className="size-3 md:max-xl:size-3.5" />
      ) : (
        <Play className="size-3 md:max-xl:size-3.5" />
      )}
    </button>
  );
}

export function ReservoirStatusCard() {
  const reservoirLevel = useMachineStore((state) => state.waterLevels?.currentLevel ?? null);
  const reservoirRefillLevel = useMachineStore((state) => state.waterLevels?.refillLevel ?? null);
  const level = clampPercentage(reservoirLevel);
  const refillLevel = clampPercentage(reservoirRefillLevel);
  const isLow = level != null && refillLevel != null && level <= refillLevel;

  return (
    <div className="min-w-[120px] flex-1 rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-1 md:flex-none md:max-w-[148px] md:max-xl:min-w-[140px] md:max-xl:px-2.5 md:max-xl:py-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground md:max-xl:text-[0.5rem]">
          <Droplets className="size-2 text-highlight-muted md:max-xl:size-2.5" />
          Res
        </p>
        <p
          className={cn(
            "font-mono text-[0.72rem] font-semibold tabular-nums md:max-xl:text-[0.76rem]",
            isLow ? "text-status-warning-foreground" : "text-foreground",
          )}
        >
          {formatPercentage(level)}
        </p>
      </div>

      <div className="mt-0.5 flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center">
          <div className="relative h-[5px] flex-1 rounded-[1px] bg-panel-strong md:max-xl:h-1.5">
            {refillLevel != null ? (
              <div
                className="absolute inset-y-0 w-px bg-status-warning-foreground/60"
                style={{ left: `${refillLevel}%` }}
              />
            ) : null}
            <div
              className={cn(
                "h-full rounded-[1px] transition-[width] duration-300",
                level == null
                  ? "w-[14%] bg-muted-foreground/35"
                  : isLow
                    ? "bg-status-warning-foreground"
                    : level < 35
                      ? "bg-highlight-muted"
                      : "bg-status-success-foreground",
              )}
              style={{ width: `${level ?? 14}%` }}
            />
          </div>
        </div>
        <p className="shrink-0 font-mono text-[0.42rem] uppercase tracking-[0.06em] text-muted-foreground/70 md:max-xl:text-[0.46rem]">
          {level == null
            ? "No feed"
            : isLow
              ? "Refill"
              : refillLevel == null
                ? "OK"
                : `${refillLevel.toFixed(0)}%`}
        </p>
      </div>
    </div>
  );
}

export function ScaleStatusCard() {
  const scaleConnection = useMachineStore((state) => state.scaleConnection);
  const scaleSnapshot = useMachineStore((state) => state.scaleSnapshot);
  const { data: devices } = useDevicesQuery();
  const tareScaleMutation = useTareScaleMutation();
  const updateWorkflowMutation = useUpdateWorkflowMutation();
  const connectedScale = devices?.find(
    (device) => device.type === "scale" && device.state === "connected",
  );
  const isPaired = Boolean(connectedScale);
  const weight = connectedScale ? scaleSnapshot?.weight ?? null : null;
  const batteryLevel = connectedScale ? scaleSnapshot?.batteryLevel ?? null : null;
  const canUseScaleWeightForDose =
    isPaired &&
    weight != null &&
    Number.isFinite(weight) &&
    weight > 0;

  function handleSetDoseFromScale() {
    if (!canUseScaleWeightForDose || weight == null) {
      return;
    }

    updateWorkflowMutation.mutate({
      context: {
        targetDoseWeight: roundValue(weight, 0.1),
      },
    });
  }

  if (!isPaired) {
    return (
      <div className="min-w-[200px] flex-[1.1] rounded-[3px] border border-status-warning-border/60 bg-status-warning-surface/60 px-2.5 py-1 md:flex-none md:max-w-[300px] md:max-xl:min-w-[250px] md:max-xl:px-3 md:max-xl:py-1.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 md:grid-cols-[minmax(0,1fr)_8ch_auto] md:items-center md:max-xl:gap-x-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="flex items-center gap-1 font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-status-warning-foreground md:max-xl:text-[0.5rem]">
                <Scale className="size-2 md:max-xl:size-2.5" />
                Scale
              </p>
              <span className="font-mono text-[0.42rem] font-semibold uppercase tracking-[0.06em] text-status-warning-foreground/80 md:max-xl:text-[0.46rem]">
                {getScaleStatusLabel(isPaired, scaleConnection)}
              </span>
            </div>
            <p className="mt-0.5 truncate font-mono text-[0.5rem] uppercase tracking-[0.06em] text-foreground/60 md:max-xl:text-[0.52rem]">
              No scale paired
            </p>
          </div>

          <p className="col-start-1 row-start-2 whitespace-nowrap font-mono text-[0.82rem] font-semibold tabular-nums text-muted-foreground md:col-start-2 md:row-start-1 md:justify-self-end md:text-[0.88rem] md:max-xl:text-[0.92rem]">
            {formatScaleWeight(weight)}
          </p>

          <Button
            asChild
            className="col-start-2 row-span-2 row-start-1 h-[22px] rounded-[3px] border-status-warning-border/50 bg-panel-strong/60 px-2 font-mono text-[0.48rem] text-foreground hover:bg-panel-strong md:col-start-3 md:row-span-1 md:max-xl:h-7 md:max-xl:px-2.5 md:max-xl:text-[0.5rem]"
            size="sm"
            variant="outline"
          >
            <Link to="/settings">Pair in Setup</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[200px] flex-[1.1] rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-1 md:flex-none md:max-w-[300px] md:max-xl:min-w-[250px] md:max-xl:px-3 md:max-xl:py-1.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 md:grid-cols-[minmax(0,1fr)_8ch_auto] md:items-center md:max-xl:gap-x-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="flex items-center gap-1 font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground md:max-xl:text-[0.5rem]">
              <Scale className="size-2 text-status-info-foreground md:max-xl:size-2.5" />
              Scale
            </p>
            {batteryLevel != null ? (
              <p className="shrink-0 font-mono text-[0.44rem] tabular-nums uppercase tracking-[0.06em] text-muted-foreground/70 md:max-xl:text-[0.48rem]">
                {batteryLevel.toFixed(0)}%
              </p>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-0.5 truncate font-mono text-[0.5rem] uppercase tracking-[0.06em] md:max-xl:text-[0.52rem]",
              isPaired ? "text-status-info-foreground" : "text-status-warning-foreground",
            )}
          >
            {getScaleStatusLabel(isPaired, scaleConnection)}
          </p>
        </div>

        <p className="col-start-1 row-start-2 whitespace-nowrap font-mono text-[0.82rem] font-semibold tabular-nums text-foreground md:col-start-2 md:row-start-1 md:justify-self-end md:text-[0.88rem] md:max-xl:text-[0.92rem]">
          {formatScaleWeight(weight)}
        </p>

        <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-center gap-1 justify-self-end md:col-start-3 md:row-span-1">
          <Button
            className="h-[22px] rounded-[3px] border-status-info-border/50 bg-status-info-surface/60 px-2 font-mono text-[0.48rem] text-status-info-foreground hover:brightness-110 md:max-xl:h-7 md:max-xl:px-2.5 md:max-xl:text-[0.5rem]"
            disabled={scaleConnection !== "live" || tareScaleMutation.isPending}
            onClick={() => tareScaleMutation.mutate()}
            size="sm"
            variant="outline"
          >
            {tareScaleMutation.isPending ? "Taring" : "Tare"}
          </Button>
          <Button
            className="h-[22px] rounded-[3px] border-status-success-border/50 bg-status-success-surface/60 px-2 font-mono text-[0.48rem] text-status-success-foreground hover:brightness-110 md:max-xl:h-7 md:max-xl:px-2.5 md:max-xl:text-[0.5rem]"
            disabled={!canUseScaleWeightForDose || updateWorkflowMutation.isPending}
            onClick={handleSetDoseFromScale}
            size="sm"
            variant="outline"
          >
            Use dose
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MachineStatusCard() {
  const liveConnection = useMachineStore((state) => state.liveConnection);
  const machineError = useMachineStore((state) => state.error);
  const { data: snapshot, error: machineQueryError } = useMachineStateQuery();
  const { error: workflowQueryError } = useWorkflowQuery();
  const requestMachineStateMutation = useRequestMachineStateMutation();
  const hasQueryError = Boolean(machineError || machineQueryError || workflowQueryError);
  const isMachinePoweredOn = snapshot?.state.state !== "sleeping";
  const isMachinePowerDisabled = snapshot == null || hasQueryError;
  const connectionLabel = getMachineConnectionLabel(liveConnection, hasQueryError);

  function handleToggleMachinePower() {
    if (snapshot == null) {
      return;
    }

    requestMachineStateMutation.mutate(
      snapshot.state.state === "sleeping" ? "idle" : "sleeping",
    );
  }

  return (
    <div className="flex min-h-8 min-w-[100px] shrink-0 items-center justify-between gap-2 rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 md:max-xl:min-h-9 md:max-xl:min-w-[116px] md:max-xl:px-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="shrink-0 font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground md:max-xl:text-[0.5rem]">
          Machine
        </p>
        {connectionLabel ? (
          <p className="truncate font-mono text-[0.44rem] font-medium uppercase tracking-[0.06em] text-status-warning-foreground md:max-xl:text-[0.48rem]">
            {connectionLabel}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center">
        <button
          aria-label={
            requestMachineStateMutation.isPending
              ? isMachinePoweredOn
                ? "Turning off machine"
                : "Turning on machine"
              : isMachinePoweredOn
                ? "Sleep machine"
                : "Wake machine"
          }
          className={cn(
            "flex size-6 items-center justify-center rounded-[3px] border transition disabled:cursor-not-allowed disabled:opacity-50 md:max-xl:size-9",
            isMachinePoweredOn
              ? "border-status-success-border/60 bg-status-success-surface/80 text-status-success-foreground hover:brightness-110"
              : "border-border/50 bg-panel-strong text-muted-foreground hover:bg-panel",
          )}
          disabled={isMachinePowerDisabled || requestMachineStateMutation.isPending}
          onClick={handleToggleMachinePower}
          type="button"
        >
          <Power className="size-3 md:max-xl:size-4" />
        </button>
      </div>
    </div>
  );
}

function clampPercentage(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return Math.min(100, Math.max(0, value));
}

function formatPercentage(value: number | null) {
  if (value == null) {
    return "--";
  }

  return `${value.toFixed(0)}%`;
}

function formatScaleWeight(weight: number | null) {
  if (weight == null || Number.isNaN(weight)) {
    return "--.- g";
  }

  return `${weight.toFixed(1)} g`;
}

function getScaleStatusLabel(
  isPaired: boolean,
  scaleConnection: LiveConnectionState,
) {
  if (!isPaired && scaleConnection === "connecting") {
    return "Looking";
  }

  if (!isPaired) {
    return "Unpaired";
  }

  if (scaleConnection === "connecting") {
    return "Pairing";
  }

  if (scaleConnection === "error") {
    return "Stream lost";
  }

  return "Paired";
}

function getMachineConnectionLabel(
  liveConnection: LiveConnectionState,
  hasQueryError: boolean,
) {
  if (hasQueryError || liveConnection === "error") {
    return "Error";
  }

  if (liveConnection === "connecting") {
    return "Connecting";
  }

  if (liveConnection === "idle") {
    return "Offline";
  }

  return null;
}
