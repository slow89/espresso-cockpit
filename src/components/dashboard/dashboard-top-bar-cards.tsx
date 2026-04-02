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
import { useDashboardUiStore } from "@/stores/dashboard-ui-store";
import { type LiveConnectionState, useMachineStore } from "@/stores/machine-store";
import { getDashboardActiveRecipe } from "./dashboard-view-model";

export function DashboardRecipeButton() {
  const { data: workflow } = useWorkflowQuery();

  return (
    <Button
      asChild
      className="h-auto min-h-8 min-w-[160px] flex-1 justify-between rounded-[4px] border-border bg-panel-strong/80 px-2.5 py-1 font-mono text-[0.68rem] font-medium text-foreground hover:bg-panel-strong md:flex-none md:max-w-[280px] md:max-xl:min-h-11 md:max-xl:min-w-[200px] md:max-xl:px-3.5 md:max-xl:py-2 md:max-xl:text-[0.88rem]"
      size="sm"
      variant="outline"
    >
      <Link to="/workflows">
        <span className="min-w-0 truncate">{getDashboardActiveRecipe(workflow)}</span>
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted-foreground md:max-xl:text-[0.58rem]">
          Profiles
        </span>
      </Link>
    </Button>
  );
}

export function DevShotToggleButton() {
  const isSimulatedShotActive = useDashboardUiStore((state) => state.isSimulatedShotActive);
  const toggleSimulatedShot = useDashboardUiStore((state) => state.toggleSimulatedShot);

  return (
    <button
      aria-label={isSimulatedShotActive ? "Pause shot simulator" : "Play shot simulator"}
      className={cn(
        "flex min-h-8 min-w-[36px] shrink-0 items-center justify-center rounded-[4px] border border-border bg-panel-strong/80 px-2 text-muted-foreground transition hover:text-foreground md:max-xl:min-h-11 md:max-xl:min-w-[44px]",
        isSimulatedShotActive
          ? "border-status-success-border bg-status-success-surface text-status-success-foreground"
          : "border-border/50",
      )}
      onClick={toggleSimulatedShot}
      title={isSimulatedShotActive ? "Pause shot simulator" : "Play shot simulator"}
      type="button"
    >
      {isSimulatedShotActive ? (
        <Pause className="size-3 md:max-xl:size-4" />
      ) : (
        <Play className="size-3 md:max-xl:size-4" />
      )}
    </button>
  );
}

export function ReservoirStatusCard() {
  const reservoirLevel = useMachineStore((state) => state.waterLevels?.currentLevel ?? null);
  const reservoirRefillLevel = useMachineStore((state) => state.waterLevels?.refillLevel ?? null);
  const isLow =
    reservoirLevel != null &&
    reservoirRefillLevel != null &&
    reservoirLevel <= reservoirRefillLevel;
  const statusLabel =
    reservoirLevel == null
      ? "No feed"
      : isLow
        ? "Refill"
        : reservoirRefillLevel == null
          ? "Live"
          : `Warn ${formatMillimeters(reservoirRefillLevel)}`;

  return (
    <div className="min-w-[120px] flex-1 rounded-[4px] border border-border bg-panel-strong/80 px-2.5 py-1 md:flex-none md:max-w-[160px] md:max-xl:min-w-[150px] md:max-xl:px-3 md:max-xl:py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 font-mono text-[0.46rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground md:max-xl:text-[0.58rem]">
          <Droplets className="size-2 text-highlight-muted md:max-xl:size-3" />
          Res
        </p>
        <p
          className={cn(
            "font-mono text-[0.72rem] font-semibold tabular-nums md:max-xl:text-[0.88rem]",
            isLow ? "text-status-warning-foreground" : "text-foreground",
          )}
        >
          {formatMillimeters(reservoirLevel)}
        </p>
      </div>

      <div className="mt-1 grid gap-0.5">
        <p className="shrink-0 font-mono text-[0.42rem] font-medium uppercase tracking-[0.06em] text-muted-foreground/90 md:max-xl:text-[0.52rem]">
          {statusLabel}
        </p>
        <p className="font-mono text-[0.42rem] uppercase tracking-[0.06em] text-muted-foreground/70 md:max-xl:text-[0.52rem]">
          {reservoirRefillLevel == null
            ? "Threshold unavailable"
            : `Threshold ${formatMillimeters(reservoirRefillLevel)}`}
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
      <div className="min-w-[200px] flex-[1.1] animate-pulse rounded-[4px] border-2 border-status-warning-foreground/70 bg-status-warning-surface px-2.5 py-1 shadow-[0_0_8px_0_rgba(var(--color-status-warning-foreground)/0.15)] md:flex-none md:max-w-[380px] md:max-xl:min-w-[310px] md:max-xl:px-3.5 md:max-xl:py-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 md:grid-cols-[minmax(0,1fr)_8ch_auto] md:items-center md:max-xl:gap-x-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="flex items-center gap-1 font-mono text-[0.5rem] font-bold uppercase tracking-[0.08em] text-status-warning-foreground md:max-xl:text-[0.62rem]">
                <Scale className="size-2.5 md:max-xl:size-3.5" />
                Scale
              </p>
              <span className="rounded-sm bg-status-warning-foreground/20 px-1.5 py-0.5 font-mono text-[0.44rem] font-bold uppercase tracking-[0.06em] text-status-warning-foreground md:max-xl:text-[0.54rem]">
                {getScaleStatusLabel(isPaired, scaleConnection)}
              </span>
            </div>
            <p className="mt-0.5 truncate font-mono text-[0.5rem] font-medium uppercase tracking-[0.06em] text-status-warning-foreground/80 md:max-xl:text-[0.58rem]">
              No scale paired
            </p>
          </div>

          <p className="col-start-1 row-start-2 whitespace-nowrap font-mono text-[0.82rem] font-semibold tabular-nums text-muted-foreground md:col-start-2 md:row-start-1 md:justify-self-end md:text-[0.88rem] md:max-xl:text-[1.05rem]">
            {formatScaleWeight(weight)}
          </p>

          <Button
            asChild
            className="col-start-2 row-span-2 row-start-1 h-[22px] rounded-[4px] border-status-warning-foreground/50 bg-status-warning-foreground/15 px-2 font-mono text-[0.48rem] font-semibold text-status-warning-foreground hover:bg-status-warning-foreground/25 md:col-start-3 md:row-span-1 md:max-xl:h-8 md:max-xl:px-3 md:max-xl:text-[0.58rem]"
            size="sm"
            variant="outline"
          >
            <Link to="/settings">Pair in Setup</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isScaleDisconnected = scaleConnection === "error" || scaleConnection === "idle";

  return (
    <div
      className={cn(
        "min-w-[200px] flex-[1.1] rounded-[4px] border px-2.5 py-1 md:flex-none md:max-w-[380px] md:max-xl:min-w-[310px] md:max-xl:px-3.5 md:max-xl:py-2",
        isScaleDisconnected
          ? "border-2 border-destructive/60 bg-destructive/10"
          : "border-border bg-panel-strong/80",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 md:grid-cols-[minmax(0,1fr)_8ch_auto] md:items-center md:max-xl:gap-x-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                "flex items-center gap-1 font-mono text-[0.46rem] font-semibold uppercase tracking-[0.08em] md:max-xl:text-[0.58rem]",
                isScaleDisconnected ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <Scale
                className={cn(
                  "size-2 md:max-xl:size-3",
                  isScaleDisconnected ? "text-destructive" : "text-status-info-foreground",
                )}
              />
              Scale
            </p>
            {batteryLevel != null && !isScaleDisconnected ? (
              <p className="shrink-0 font-mono text-[0.44rem] tabular-nums uppercase tracking-[0.06em] text-muted-foreground/90 md:max-xl:text-[0.54rem]">
                {batteryLevel.toFixed(0)}%
              </p>
            ) : null}
            {isScaleDisconnected ? (
              <span className="rounded-sm bg-destructive/20 px-1.5 py-0.5 font-mono text-[0.44rem] font-bold uppercase tracking-[0.06em] text-destructive md:max-xl:text-[0.54rem]">
                {getScaleStatusLabel(isPaired, scaleConnection)}
              </span>
            ) : null}
          </div>
          {!isScaleDisconnected ? (
            <p className="mt-0.5 truncate font-mono text-[0.5rem] uppercase tracking-[0.06em] text-status-info-foreground md:max-xl:text-[0.58rem]">
              {getScaleStatusLabel(isPaired, scaleConnection)}
            </p>
          ) : (
            <p className="mt-0.5 truncate font-mono text-[0.5rem] font-medium uppercase tracking-[0.06em] text-destructive/80 md:max-xl:text-[0.58rem]">
              Connection lost
            </p>
          )}
        </div>

        <p className="col-start-1 row-start-2 whitespace-nowrap font-mono text-[0.82rem] font-semibold tabular-nums text-foreground md:col-start-2 md:row-start-1 md:justify-self-end md:text-[0.88rem] md:max-xl:text-[1.05rem]">
          {formatScaleWeight(weight)}
        </p>

        <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-center gap-1 justify-self-end md:col-start-3 md:row-span-1">
          <Button
            className="h-[22px] rounded-[4px] border-status-info-border bg-status-info-surface px-2 font-mono text-[0.48rem] font-semibold text-status-info-foreground hover:brightness-110 md:max-xl:h-9 md:max-xl:px-3.5 md:max-xl:text-[0.62rem]"
            disabled={scaleConnection !== "live" || tareScaleMutation.isPending}
            onClick={() => tareScaleMutation.mutate()}
            size="sm"
            variant="outline"
          >
            {tareScaleMutation.isPending ? "Taring" : "Tare"}
          </Button>
          <Button
            className="h-[22px] rounded-[4px] border-status-success-border bg-status-success-surface px-2 font-mono text-[0.48rem] font-semibold text-status-success-foreground hover:brightness-110 md:max-xl:h-9 md:max-xl:px-3.5 md:max-xl:text-[0.62rem]"
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
    <div className="flex min-h-8 min-w-[100px] shrink-0 items-center justify-between gap-2 rounded-[4px] border border-border bg-panel-strong/80 px-2.5 md:max-xl:min-h-11 md:max-xl:min-w-[130px] md:max-xl:px-3.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="shrink-0 font-mono text-[0.46rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground md:max-xl:text-[0.58rem]">
          Machine
        </p>
        {connectionLabel ? (
          <p className="truncate font-mono text-[0.44rem] font-semibold uppercase tracking-[0.06em] text-status-warning-foreground md:max-xl:text-[0.54rem]">
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
            "flex size-6 items-center justify-center rounded-[4px] border transition disabled:cursor-not-allowed disabled:opacity-50 md:max-xl:size-10",
            isMachinePoweredOn
              ? "border-status-success-border bg-status-success-surface text-status-success-foreground hover:brightness-110"
              : "border-border bg-panel-strong text-muted-foreground hover:bg-panel",
          )}
          disabled={isMachinePowerDisabled || requestMachineStateMutation.isPending}
          onClick={handleToggleMachinePower}
          type="button"
        >
          <Power className="size-3 md:max-xl:size-5" />
        </button>
      </div>
    </div>
  );
}

function formatMillimeters(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-- mm";
  }

  const hasFraction = Math.abs(value % 1) > 0.001;
  return `${value.toFixed(hasFraction ? 1 : 0)} mm`;
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
