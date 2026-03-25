import { Link } from "@tanstack/react-router";
import { Droplets, Power, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LiveConnectionState } from "@/stores/machine-store";

export function DashboardTopBar({
  activeRecipe,
  isOffline,
  isMachinePowerDisabled,
  isMachinePowerPending,
  isMachinePoweredOn,
  isScalePaired,
  isScaleTaring,
  isScaleWeightActionDisabled,
  liveConnection,
  onToggleMachinePower,
  onSetDoseFromScale,
  onTareScale,
  reservoirLevel,
  reservoirRefillLevel,
  scaleBatteryLevel,
  scaleConnection,
  scaleWeight,
  statusLabel,
}: {
  activeRecipe: string;
  isOffline: boolean;
  isMachinePowerDisabled: boolean;
  isMachinePowerPending: boolean;
  isMachinePoweredOn: boolean;
  isScalePaired: boolean;
  isScaleTaring: boolean;
  isScaleWeightActionDisabled: boolean;
  liveConnection: LiveConnectionState;
  onToggleMachinePower: () => void;
  onSetDoseFromScale: () => void;
  onTareScale: () => void;
  reservoirLevel: number | null;
  reservoirRefillLevel: number | null;
  scaleBatteryLevel: number | null;
  scaleConnection: LiveConnectionState;
  scaleWeight: number | null;
  statusLabel: string;
}) {
  return (
    <section className="shrink-0 border-b border-border px-2.5 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] md:px-4 md:pb-2.5 md:pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] xl:px-3 xl:pb-1.5 xl:pt-[calc(env(safe-area-inset-top,0px)+0.375rem)]">
      <div className="flex flex-wrap items-stretch gap-1 md:max-xl:gap-2">
        <Button
          asChild
          className="h-auto min-h-8 min-w-[190px] flex-1 justify-between rounded-[10px] border-border bg-panel px-2.5 py-1 font-mono text-[0.72rem] font-medium text-foreground hover:bg-panel-muted md:flex-none md:max-w-[320px] md:max-xl:min-h-11 md:max-xl:min-w-[240px] md:max-xl:rounded-[12px] md:max-xl:px-3.5 md:max-xl:py-2 md:max-xl:text-[0.8rem]"
          size="sm"
          variant="outline"
        >
          <Link to="/workflows">
            <span className="min-w-0 truncate">{activeRecipe}</span>
            <span className="text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground md:max-xl:text-[0.64rem]">
              Profiles
            </span>
          </Link>
        </Button>

        <ReservoirStatusCard
          reservoirLevel={reservoirLevel}
          reservoirRefillLevel={reservoirRefillLevel}
        />

        <ScaleStatusCard
          batteryLevel={scaleBatteryLevel}
          isPaired={isScalePaired}
          isTaring={isScaleTaring}
          isWeightActionDisabled={isScaleWeightActionDisabled}
          onSetDoseFromScale={onSetDoseFromScale}
          onTareScale={onTareScale}
          scaleConnection={scaleConnection}
          weight={scaleWeight}
        />

        <div className="flex min-w-[184px] flex-1 items-stretch justify-end gap-1 md:ml-auto md:flex-none md:max-xl:min-w-[232px] md:max-xl:gap-2">
          <div className="flex min-h-8 min-w-[184px] shrink-0 items-center justify-between gap-2 rounded-[10px] border border-border bg-panel px-2.5 md:max-xl:min-h-11 md:max-xl:min-w-[232px] md:max-xl:rounded-[12px] md:max-xl:px-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <p className="shrink-0 font-mono text-[0.5rem] font-medium uppercase tracking-[0.16em] text-muted-foreground md:max-xl:text-[0.58rem]">
                Machine
              </p>
              <p
                className={cn(
                  "min-w-0 truncate font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] md:max-xl:text-[0.78rem]",
                  isOffline ? "text-status-warning-foreground" : "text-status-success-foreground",
                )}
                title={statusLabel}
              >
                {statusLabel}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                aria-label={
                  isMachinePowerPending
                    ? isMachinePoweredOn
                      ? "Turning off machine"
                      : "Turning on machine"
                    : isMachinePoweredOn
                      ? "Sleep machine"
                      : "Wake machine"
                }
                className={cn(
                  "flex size-6 items-center justify-center rounded-[7px] border transition disabled:cursor-not-allowed disabled:opacity-50 md:max-xl:size-9 md:max-xl:rounded-[10px]",
                  isMachinePoweredOn
                    ? "border-status-success-border bg-status-success-surface text-status-success-foreground hover:brightness-95"
                    : "border-border bg-panel-strong text-muted-foreground hover:bg-panel-muted",
                )}
                disabled={isMachinePowerDisabled || isMachinePowerPending}
                onClick={onToggleMachinePower}
                type="button"
              >
                <Power className="size-3.5 md:max-xl:size-[18px]" />
              </button>
              <p
                className={cn(
                  "shrink-0 font-mono text-[0.54rem] uppercase tracking-[0.1em] md:max-xl:text-[0.62rem]",
                  isOffline ? "text-status-warning-foreground" : "text-foreground",
                )}
              >
                {formatConnectionLabel(liveConnection)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReservoirStatusCard({
  reservoirLevel,
  reservoirRefillLevel,
}: {
  reservoirLevel: number | null;
  reservoirRefillLevel: number | null;
}) {
  const level = clampPercentage(reservoirLevel);
  const refillLevel = clampPercentage(reservoirRefillLevel);
  const isLow = level != null && refillLevel != null && level <= refillLevel;

  return (
    <div className="min-w-[138px] flex-1 rounded-[10px] border border-border bg-panel px-2.5 py-1 md:flex-none md:max-w-[168px] md:max-xl:min-w-[168px] md:max-xl:rounded-[12px] md:max-xl:px-3 md:max-xl:py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-mono text-[0.5rem] font-medium uppercase tracking-[0.16em] text-muted-foreground md:max-xl:text-[0.58rem]">
          <Droplets className="size-2.5 text-highlight-muted md:max-xl:size-3" />
          Reservoir
        </p>
        <p
          className={cn(
            "font-mono text-[0.74rem] font-semibold md:max-xl:text-[0.86rem]",
            isLow ? "text-status-warning-foreground" : "text-foreground",
          )}
        >
          {formatPercentage(level)}
        </p>
      </div>

      <div className="mt-0.5 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center">
          <div className="relative h-2 flex-1 rounded-full border border-status-warning-border bg-panel-strong p-[1px] md:max-xl:h-2.5">
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
              "ml-1 h-2 w-1 rounded-r-full border border-l-0 border-status-warning-border md:max-xl:h-2.5 md:max-xl:w-1.5",
              isLow ? "bg-status-warning-foreground" : "bg-panel-strong",
            )}
          />
        </div>
        <p className="shrink-0 font-mono text-[0.48rem] uppercase tracking-[0.12em] text-muted-foreground md:max-xl:text-[0.56rem]">
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

function ScaleStatusCard({
  batteryLevel,
  isPaired,
  isTaring,
  isWeightActionDisabled,
  onSetDoseFromScale,
  onTareScale,
  scaleConnection,
  weight,
}: {
  batteryLevel: number | null;
  isPaired: boolean;
  isTaring: boolean;
  isWeightActionDisabled: boolean;
  onSetDoseFromScale: () => void;
  onTareScale: () => void;
  scaleConnection: LiveConnectionState;
  weight: number | null;
}) {
  return (
    <div className="min-w-[228px] flex-[1.1] rounded-[10px] border border-border bg-panel px-2.5 py-1 md:flex-none md:max-w-[348px] md:max-xl:min-w-[304px] md:max-xl:rounded-[12px] md:max-xl:px-3.5 md:max-xl:py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:flex-nowrap md:max-xl:gap-x-4 md:max-xl:gap-y-2">
        <div className="min-w-[112px] flex-1">
          <div className="flex items-center gap-2">
            <p className="flex items-center gap-1.5 font-mono text-[0.5rem] font-medium uppercase tracking-[0.16em] text-muted-foreground md:max-xl:text-[0.58rem]">
              <Scale className="size-2.5 text-status-info-foreground md:max-xl:size-3" />
              Scale
            </p>
            {batteryLevel != null ? (
              <p className="shrink-0 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground md:max-xl:text-[0.58rem]">
                {batteryLevel.toFixed(0)}%
              </p>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-0.5 font-mono text-[0.54rem] uppercase tracking-[0.12em] md:max-xl:text-[0.62rem]",
              isPaired ? "text-status-info-foreground" : "text-status-warning-foreground",
            )}
          >
            {getScaleStatusLabel(isPaired, scaleConnection)}
          </p>
        </div>

        <p className="shrink-0 font-mono text-[0.88rem] font-semibold text-foreground md:text-[0.94rem] md:max-xl:text-[1.02rem]">
          {formatScaleWeight(weight)}
        </p>

        <div className="flex shrink-0 items-center gap-1 md:max-xl:gap-1.5">
          <Button
            className="h-[26px] rounded-[8px] border-status-info-border bg-status-info-surface px-2 text-[0.54rem] text-status-info-foreground hover:brightness-95 md:max-xl:h-9 md:max-xl:rounded-[10px] md:max-xl:px-3 md:max-xl:text-[0.6rem]"
            disabled={!isPaired || isTaring}
            onClick={onTareScale}
            size="sm"
            variant="outline"
          >
            {isTaring ? "Taring" : "Tare"}
          </Button>
          <Button
            className="h-[26px] rounded-[8px] border-status-success-border bg-status-success-surface px-2 text-[0.54rem] text-status-success-foreground hover:brightness-95 md:max-xl:h-9 md:max-xl:rounded-[10px] md:max-xl:px-3 md:max-xl:text-[0.6rem]"
            disabled={isWeightActionDisabled}
            onClick={onSetDoseFromScale}
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

function formatConnectionLabel(liveConnection: LiveConnectionState) {
  if (liveConnection === "live") {
    return "Stream live";
  }

  if (liveConnection === "connecting") {
    return "Connecting";
  }

  if (liveConnection === "error") {
    return "Stream error";
  }

  return "Standby";
}
