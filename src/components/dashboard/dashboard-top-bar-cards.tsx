import { Link } from "@tanstack/react-router";
import { Droplets, Pause, Play, Power, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { roundValue } from "@/lib/recipe-utils";
import { cn } from "@/lib/utils";
import {
  useMachineStateQuery,
  useRequestMachineStateMutation,
  useTareScaleMutation,
  useUpdateWorkflowMutation,
  useWorkflowQuery,
} from "@/rest/queries";
import { useDashboardUiStore } from "@/stores/dashboard-ui-store";
import { useDevicesStore } from "@/stores/devices-store";
import { type LiveConnectionState, useMachineStore } from "@/stores/machine-store";
import { getDashboardActiveRecipe } from "./dashboard-view-model";

export function DashboardRecipeButton() {
  const { data: workflow } = useWorkflowQuery();

  return (
    <Button
      asChild
      className="h-auto min-h-8 min-w-[160px] flex-1 justify-between rounded-[4px] border-border bg-panel-strong/80 px-2.5 py-1 font-mono text-[0.68rem] font-medium text-foreground hover:bg-panel-strong md:flex-none md:max-w-[280px]"
      size="sm"
      variant="outline"
    >
      <Link to="/workflows">
        <span className="min-w-0 truncate">{getDashboardActiveRecipe(workflow)}</span>
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted-foreground">
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
        "flex min-h-8 min-w-[36px] shrink-0 items-center justify-center rounded-[4px] border border-border bg-panel-strong/80 px-2 text-muted-foreground transition hover:text-foreground",
        isSimulatedShotActive
          ? "border-status-success-border bg-status-success-surface text-status-success-foreground"
          : "border-border/50",
      )}
      onClick={toggleSimulatedShot}
      title={isSimulatedShotActive ? "Pause shot simulator" : "Play shot simulator"}
      type="button"
    >
      {isSimulatedShotActive ? <Pause className="size-3" /> : <Play className="size-3" />}
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
  const hasLevel = reservoirLevel != null;
  const hasThreshold = reservoirRefillLevel != null;

  // Calculate fill percentage for the visual bar (cap at 100%)
  const fillPercent =
    hasLevel && hasThreshold && reservoirRefillLevel > 0
      ? Math.min(100, Math.round((reservoirLevel / (reservoirRefillLevel * 4)) * 100))
      : null;
  const thresholdPercent = hasThreshold ? Math.min(100, Math.round((1 / 4) * 100)) : null;

  return (
    <div
      className={cn(
        "w-[150px] shrink-0 rounded-[4px] border px-3 py-1.5",
        isLow
          ? "border-status-warning-foreground/50 bg-status-warning-surface"
          : "border-border bg-panel-strong/80",
      )}
    >
      {/* Header row: label + level value */}
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "flex items-center gap-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.08em]",
            isLow ? "text-status-warning-foreground" : "text-muted-foreground",
          )}
        >
          <Droplets
            className={cn(
              "size-3",
              isLow ? "text-status-warning-foreground" : "text-highlight-muted",
            )}
          />
          Res
        </p>
        <p
          className={cn(
            "min-w-[7ch] text-right font-mono text-[0.92rem] font-semibold tabular-nums",
            isLow ? "text-status-warning-foreground" : "text-foreground",
          )}
        >
          {formatMillimeters(reservoirLevel)}
        </p>
      </div>

      {/* Visual level bar */}
      <div className="mt-2 mb-1">
        <div className="relative h-[7px] w-full overflow-hidden rounded-full bg-border/60">
          {fillPercent != null && (
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                isLow ? "bg-status-warning-foreground" : "bg-highlight-muted",
              )}
              style={{ width: `${fillPercent}%` }}
            />
          )}
          {thresholdPercent != null && (
            <div
              className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-muted-foreground/60"
              style={{ left: `${thresholdPercent}%` }}
              title={`Refill at ${formatMillimeters(reservoirRefillLevel)}`}
            />
          )}
        </div>
        {/* Bar legend */}
        <div className="mt-0.5 flex items-center justify-between">
          <p className="font-mono text-[0.5rem] uppercase tracking-[0.06em] text-muted-foreground/70">
            {hasThreshold ? `Refill @ ${formatMillimeters(reservoirRefillLevel)}` : "No threshold"}
          </p>
          {isLow && (
            <p className="font-mono text-[0.5rem] font-bold uppercase tracking-[0.06em] text-status-warning-foreground">
              Low
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ScaleStatusCard() {
  const devicesConnection = useDevicesStore((state) => state.connection);
  const scaleConnection = useMachineStore((state) => state.scaleConnection);
  const scanDevices = useDevicesStore((state) => state.scan);
  const scanningDevices = useDevicesStore((state) => state.scanning);
  const scaleSnapshot = useMachineStore((state) => state.scaleSnapshot);
  const devices = useDevicesStore((state) => state.devices);
  const tareScaleMutation = useTareScaleMutation();
  const updateWorkflowMutation = useUpdateWorkflowMutation();
  const connectedScale = devices?.find(
    (device) => device.type === "scale" && device.state === "connected",
  );
  const isPaired = Boolean(connectedScale);
  const weight = connectedScale ? (scaleSnapshot?.weight ?? null) : null;
  const batteryLevel = connectedScale ? (scaleSnapshot?.batteryLevel ?? null) : null;
  const canUseScaleWeightForDose =
    isPaired && weight != null && Number.isFinite(weight) && weight > 0;

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

  function handleRefreshScale() {
    void scanDevices();
  }

  if (!isPaired) {
    return (
      <div className="min-w-[200px] flex-[1.1] animate-pulse rounded-[4px] border-2 border-status-warning-foreground/70 bg-status-warning-surface px-3 py-1.5 shadow-[0_0_8px_0_rgba(var(--color-status-warning-foreground)/0.15)] md:flex-none md:max-w-[380px]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 md:grid-cols-[minmax(0,1fr)_8ch_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="flex items-center gap-1 font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] text-status-warning-foreground">
                <Scale className="size-3.5" />
                Scale
              </p>
              <span className="rounded-sm bg-status-warning-foreground/20 px-1.5 py-0.5 font-mono text-[0.55rem] font-bold uppercase tracking-[0.06em] text-status-warning-foreground">
                {getScaleStatusLabel(isPaired, scaleConnection)}
              </span>
            </div>
            <p className="mt-0.5 truncate font-mono text-[0.6rem] font-medium uppercase tracking-[0.06em] text-status-warning-foreground/80">
              No scale paired
            </p>
          </div>

          <p className="col-start-1 row-start-2 whitespace-nowrap font-mono text-[1rem] font-semibold tabular-nums text-muted-foreground md:col-start-2 md:row-start-1 md:justify-self-end md:text-[1.05rem] md:max-xl:text-[1.2rem]">
            {formatScaleWeight(weight)}
          </p>

          <Button
            className="col-start-2 row-span-2 row-start-1 h-full min-h-0 rounded-[4px] border-status-warning-foreground/50 bg-status-warning-foreground/15 px-4 font-mono text-[0.75rem] font-semibold text-status-warning-foreground hover:bg-status-warning-foreground/25 md:col-start-3 md:row-span-1"
            disabled={devicesConnection !== "live" || scanningDevices}
            onClick={handleRefreshScale}
            size="sm"
            variant="outline"
          >
            {scanningDevices ? "Scanning" : "Refresh"}
          </Button>
        </div>
      </div>
    );
  }

  const isScaleDisconnected = scaleConnection === "error" || scaleConnection === "idle";

  return (
    <div
      className={cn(
        "min-w-[200px] flex-[1.1] rounded-[4px] border px-3 py-1.5 md:flex-none md:max-w-[380px]",
        isScaleDisconnected
          ? "border-2 border-destructive/60 bg-destructive/10"
          : "border-border bg-panel-strong/80",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 md:grid-cols-[minmax(0,1fr)_8ch_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                "flex items-center gap-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.08em]",
                isScaleDisconnected ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <Scale
                className={cn(
                  "size-3",
                  isScaleDisconnected ? "text-destructive" : "text-status-info-foreground",
                )}
              />
              Scale
            </p>
            {batteryLevel != null && !isScaleDisconnected ? (
              <p className="shrink-0 font-mono text-[0.55rem] tabular-nums uppercase tracking-[0.06em] text-muted-foreground/90">
                {batteryLevel.toFixed(0)}%
              </p>
            ) : null}
            {isScaleDisconnected ? (
              <span className="rounded-sm bg-destructive/20 px-1.5 py-0.5 font-mono text-[0.55rem] font-bold uppercase tracking-[0.06em] text-destructive">
                {getScaleStatusLabel(isPaired, scaleConnection)}
              </span>
            ) : null}
          </div>
          {!isScaleDisconnected ? (
            <p className="mt-0.5 truncate font-mono text-[0.6rem] uppercase tracking-[0.06em] text-status-info-foreground">
              {getScaleStatusLabel(isPaired, scaleConnection)}
            </p>
          ) : (
            <p className="mt-0.5 truncate font-mono text-[0.6rem] font-medium uppercase tracking-[0.06em] text-destructive/80">
              Connection lost
            </p>
          )}
        </div>

        <p className="col-start-1 row-start-2 whitespace-nowrap font-mono text-[1rem] font-semibold tabular-nums text-foreground md:col-start-2 md:row-start-1 md:justify-self-end md:text-[1.05rem] md:max-xl:text-[1.2rem]">
          {formatScaleWeight(weight)}
        </p>

        {isScaleDisconnected ? (
          <Button
            className="col-start-2 row-span-2 row-start-1 h-full min-h-0 rounded-[4px] border-destructive/40 bg-destructive/10 px-4 font-mono text-[0.75rem] font-semibold text-destructive hover:bg-destructive/15 md:col-start-3 md:row-span-1"
            disabled={devicesConnection !== "live" || scanningDevices}
            onClick={handleRefreshScale}
            size="sm"
            variant="outline"
          >
            {scanningDevices ? "Scanning" : "Refresh"}
          </Button>
        ) : (
          <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-stretch gap-1 self-stretch justify-self-end md:col-start-3 md:row-span-1">
            <Button
              className="h-full min-h-0 min-w-[70px] rounded-[4px] border-status-info-border bg-status-info-surface px-4 font-mono text-[0.75rem] font-semibold text-status-info-foreground hover:brightness-110"
              disabled={scaleConnection !== "live" || tareScaleMutation.isPending}
              onClick={() => tareScaleMutation.mutate()}
              size="sm"
              variant="outline"
            >
              {tareScaleMutation.isPending ? "Taring" : "Tare"}
            </Button>
            <Button
              className="h-full min-h-0 min-w-[88px] rounded-[4px] border-status-success-border bg-status-success-surface px-4 font-mono text-[0.75rem] font-semibold text-status-success-foreground hover:brightness-110"
              disabled={!canUseScaleWeightForDose || updateWorkflowMutation.isPending}
              onClick={handleSetDoseFromScale}
              size="sm"
              variant="outline"
            >
              Use dose
            </Button>
          </div>
        )}
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

    requestMachineStateMutation.mutate(snapshot.state.state === "sleeping" ? "idle" : "sleeping");
  }

  return (
    <div className="flex min-h-8 min-w-[136px] shrink-0 items-stretch justify-between gap-2 rounded-[4px] border border-border bg-panel-strong/80 px-2.5">
      <div className="flex min-w-0 items-center gap-1.5 self-center">
        <p className="shrink-0 font-mono text-[0.46rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Machine
        </p>
        {connectionLabel ? (
          <p className="truncate font-mono text-[0.44rem] font-semibold uppercase tracking-[0.06em] text-status-warning-foreground">
            {connectionLabel}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 self-stretch">
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
            "flex h-full min-h-0 min-w-[52px] items-center justify-center gap-1 rounded-[4px] border px-2 transition disabled:cursor-not-allowed disabled:opacity-50",
            isMachinePoweredOn
              ? "border-status-success-border bg-status-success-surface text-status-success-foreground hover:brightness-110"
              : "border-border bg-panel-strong text-muted-foreground hover:bg-panel",
          )}
          disabled={isMachinePowerDisabled || requestMachineStateMutation.isPending}
          onClick={handleToggleMachinePower}
          type="button"
        >
          <Power className="size-4 shrink-0" />
          <span className="font-mono text-[0.5rem] font-semibold uppercase tracking-[0.06em]">
            {isMachinePoweredOn ? "Sleep" : "Wake"}
          </span>
        </button>
      </div>
    </div>
  );
}

function formatMillimeters(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "--.- mm";
  }

  return `${value.toFixed(1)} mm`;
}

function formatScaleWeight(weight: number | null) {
  if (weight == null || Number.isNaN(weight)) {
    return "--.- g";
  }

  return `${weight.toFixed(1)} g`;
}

function getScaleStatusLabel(isPaired: boolean, scaleConnection: LiveConnectionState) {
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

function getMachineConnectionLabel(liveConnection: LiveConnectionState, hasQueryError: boolean) {
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
