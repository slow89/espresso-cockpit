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
      className="h-auto min-h-8 min-w-[190px] flex-1 justify-between rounded-[10px] border-border bg-panel px-2.5 py-1 font-mono text-[0.72rem] font-medium text-foreground hover:bg-panel-muted md:flex-none md:max-w-[300px] md:max-xl:min-h-10 md:max-xl:min-w-[220px] md:max-xl:rounded-[11px] md:max-xl:px-3 md:max-xl:py-1.5 md:max-xl:text-[0.76rem]"
      size="sm"
      variant="outline"
    >
      <Link to="/workflows">
        <span className="min-w-0 truncate">{getDashboardActiveRecipe(workflow)}</span>
        <span className="text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground md:max-xl:text-[0.62rem]">
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
        "flex min-h-8 min-w-[42px] shrink-0 items-center justify-center rounded-[10px] border bg-panel px-2.5 text-muted-foreground transition hover:border-highlight/50 hover:text-foreground md:max-xl:min-h-10 md:max-xl:min-w-[46px] md:max-xl:rounded-[11px]",
        isSimulatedShotActive
          ? "border-status-success-border bg-status-success-surface text-status-success-foreground"
          : "border-border",
      )}
      onClick={onToggleSimulatedShot}
      title={isSimulatedShotActive ? "Pause shot simulator" : "Play shot simulator"}
      type="button"
    >
      {isSimulatedShotActive ? (
        <Pause className="size-3.5 md:max-xl:size-4" />
      ) : (
        <Play className="size-3.5 md:max-xl:size-4" />
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
    <div className="min-w-[138px] flex-1 rounded-[10px] border border-border bg-panel px-2.5 py-1 md:flex-none md:max-w-[156px] md:max-xl:min-w-[156px] md:max-xl:rounded-[11px] md:max-xl:px-2.5 md:max-xl:py-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-mono text-[0.5rem] font-medium uppercase tracking-[0.16em] text-muted-foreground md:max-xl:text-[0.56rem]">
          <Droplets className="size-2.5 text-highlight-muted md:max-xl:size-[11px]" />
          Reservoir
        </p>
        <p
          className={cn(
            "font-mono text-[0.74rem] font-semibold md:max-xl:text-[0.8rem]",
            isLow ? "text-status-warning-foreground" : "text-foreground",
          )}
        >
          {formatPercentage(level)}
        </p>
      </div>

      <div className="mt-0.5 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center">
          <div className="relative h-2 flex-1 rounded-full border border-status-warning-border bg-panel-strong p-[1px] md:max-xl:h-[9px]">
            {refillLevel != null ? (
              <div
                className="absolute inset-y-[1px] w-px bg-status-warning-foreground"
                style={{ left: `${refillLevel}%` }}
              />
            ) : null}
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
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
          <div
            className={cn(
              "ml-1 h-2 w-1 rounded-r-full border border-l-0 border-status-warning-border md:max-xl:h-[9px] md:max-xl:w-[5px]",
              isLow ? "bg-status-warning-foreground" : "bg-panel-strong",
            )}
          />
        </div>
        <p className="shrink-0 font-mono text-[0.48rem] uppercase tracking-[0.12em] text-muted-foreground md:max-xl:text-[0.54rem]">
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
      <div className="min-w-[228px] flex-[1.1] rounded-[10px] border border-status-warning-border bg-status-warning-surface px-2.5 py-1 md:flex-none md:max-w-[324px] md:max-xl:min-w-[284px] md:max-xl:rounded-[11px] md:max-xl:px-3 md:max-xl:py-1.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 md:grid-cols-[minmax(0,1fr)_8ch_auto] md:items-center md:max-xl:gap-x-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="flex items-center gap-1.5 font-mono text-[0.5rem] font-medium uppercase tracking-[0.16em] text-status-warning-foreground md:max-xl:text-[0.56rem]">
                <Scale className="size-2.5 md:max-xl:size-[11px]" />
                Scale
              </p>
              <p className="shrink-0 rounded-full border border-status-warning-border px-1.5 py-0.5 font-mono text-[0.48rem] font-semibold uppercase tracking-[0.14em] text-status-warning-foreground md:max-xl:text-[0.52rem]">
                {getScaleStatusLabel(isPaired, scaleConnection)}
              </p>
            </div>
            <p className="mt-0.5 truncate font-mono text-[0.54rem] uppercase tracking-[0.12em] text-foreground md:max-xl:text-[0.58rem]">
              No scale paired
            </p>
          </div>

          <p className="col-start-1 row-start-2 whitespace-nowrap font-mono text-[0.88rem] font-semibold tabular-nums text-muted-foreground md:col-start-2 md:row-start-1 md:justify-self-end md:text-[0.94rem] md:max-xl:text-[0.98rem]">
            {formatScaleWeight(weight)}
          </p>

          <Button
            asChild
            className="col-start-2 row-span-2 row-start-1 h-[26px] rounded-[8px] border-status-warning-border bg-panel px-2 text-[0.54rem] text-foreground hover:bg-panel-muted md:col-start-3 md:row-span-1 md:max-xl:h-8 md:max-xl:rounded-[9px] md:max-xl:px-2.5 md:max-xl:text-[0.56rem]"
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
    <div className="min-w-[228px] flex-[1.1] rounded-[10px] border border-border bg-panel px-2.5 py-1 md:flex-none md:max-w-[324px] md:max-xl:min-w-[284px] md:max-xl:rounded-[11px] md:max-xl:px-3 md:max-xl:py-1.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 md:grid-cols-[minmax(0,1fr)_8ch_auto] md:items-center md:max-xl:gap-x-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="flex items-center gap-1.5 font-mono text-[0.5rem] font-medium uppercase tracking-[0.16em] text-muted-foreground md:max-xl:text-[0.56rem]">
              <Scale className="size-2.5 text-status-info-foreground md:max-xl:size-[11px]" />
              Scale
            </p>
            {batteryLevel != null ? (
              <p className="shrink-0 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground md:max-xl:text-[0.56rem]">
                {batteryLevel.toFixed(0)}%
              </p>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-0.5 truncate font-mono text-[0.54rem] uppercase tracking-[0.12em] md:max-xl:text-[0.58rem]",
              isPaired ? "text-status-info-foreground" : "text-status-warning-foreground",
            )}
          >
            {getScaleStatusLabel(isPaired, scaleConnection)}
          </p>
        </div>

        <p className="col-start-1 row-start-2 whitespace-nowrap font-mono text-[0.88rem] font-semibold tabular-nums text-foreground md:col-start-2 md:row-start-1 md:justify-self-end md:text-[0.94rem] md:max-xl:text-[0.98rem]">
          {formatScaleWeight(weight)}
        </p>

        <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-center gap-1 justify-self-end md:col-start-3 md:row-span-1 md:max-xl:gap-1">
          <Button
            className="h-[26px] rounded-[8px] border-status-info-border bg-status-info-surface px-2 text-[0.54rem] text-status-info-foreground hover:brightness-95 md:max-xl:h-8 md:max-xl:rounded-[9px] md:max-xl:px-2.5 md:max-xl:text-[0.56rem]"
            disabled={scaleConnection !== "live" || tareScaleMutation.isPending}
            onClick={() => tareScaleMutation.mutate()}
            size="sm"
            variant="outline"
          >
            {tareScaleMutation.isPending ? "Taring" : "Tare"}
          </Button>
          <Button
            className="h-[26px] rounded-[8px] border-status-success-border bg-status-success-surface px-2 text-[0.54rem] text-status-success-foreground hover:brightness-95 md:max-xl:h-8 md:max-xl:rounded-[9px] md:max-xl:px-2.5 md:max-xl:text-[0.56rem]"
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
    <div className="flex min-h-8 min-w-[112px] shrink-0 items-center justify-between gap-2 rounded-[10px] border border-border bg-panel px-2.5 md:max-xl:min-h-10 md:max-xl:min-w-[128px] md:max-xl:rounded-[11px] md:max-xl:px-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="shrink-0 font-mono text-[0.5rem] font-medium uppercase tracking-[0.16em] text-muted-foreground md:max-xl:text-[0.56rem]">
          Machine
        </p>
        {connectionLabel ? (
          <p className="truncate font-mono text-[0.5rem] font-medium uppercase tracking-[0.16em] text-status-warning-foreground md:max-xl:text-[0.56rem]">
            ({connectionLabel})
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
            "flex size-6 items-center justify-center rounded-[7px] border transition disabled:cursor-not-allowed disabled:opacity-50 md:max-xl:size-8 md:max-xl:rounded-[9px]",
            isMachinePoweredOn
              ? "border-status-success-border bg-status-success-surface text-status-success-foreground hover:brightness-95"
              : "border-border bg-panel-strong text-muted-foreground hover:bg-panel-muted",
          )}
          disabled={isMachinePowerDisabled || requestMachineStateMutation.isPending}
          onClick={handleToggleMachinePower}
          type="button"
        >
          <Power className="size-3.5 md:max-xl:size-4" />
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
