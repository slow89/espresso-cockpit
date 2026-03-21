import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Square,
  Zap,
} from "lucide-react";

import { TelemetryChart } from "@/components/telemetry-chart";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTimestamp } from "@/lib/utils";
import {
  useMachineStateQuery,
  useShotsQuery,
  useUpdateWorkflowMutation,
  useWorkflowQuery,
} from "@/rest/queries";
import { useMachineStore } from "@/stores/machine-store";

export function DashboardPage() {
  const liveConnection = useMachineStore((state) => state.liveConnection);
  const machineError = useMachineStore((state) => state.error);
  const telemetry = useMachineStore((state) => state.telemetry);
  const requestState = useMachineStore((state) => state.requestState);
  const { data: snapshot, error: machineQueryError } = useMachineStateQuery();
  const { data: workflow, error: workflowQueryError } = useWorkflowQuery();
  const { data: shots } = useShotsQuery();
  const updateWorkflowMutation = useUpdateWorkflowMutation();

  const isOffline = Boolean(machineError || machineQueryError || workflowQueryError);
  const activeRecipe = workflow?.profile?.title ?? workflow?.name ?? "PSPH";
  const isShotRunning = snapshot?.state.state === "espresso";
  const statusLabel = isOffline
    ? "Offline"
    : snapshot?.state.substate === "ready"
      ? "Ready"
      : startCase(snapshot?.state.substate ?? snapshot?.state.state ?? "Idle");

  const targetDose = workflow?.context?.targetDoseWeight;
  const targetYield = workflow?.context?.targetYield;
  const ratio =
    targetDose && targetYield ? `${(targetYield / targetDose).toFixed(1)}:1` : "1:2.0";

  const isUpdatingWorkflow = updateWorkflowMutation.isPending;

  function updateWorkflow(patch: Record<string, unknown>) {
    updateWorkflowMutation.mutate(patch);
  }

  function updateDose(nextDose: number) {
    updateWorkflow({
      context: {
        targetDoseWeight: roundValue(nextDose, 0.1),
      },
    });
  }

  function updateYield(nextYield: number) {
    updateWorkflow({
      context: {
        targetYield: roundValue(nextYield, 0.1),
      },
    });
  }

  function updateBrewTemperature(nextTemperature: number) {
    const nextSteps = workflow?.profile?.steps?.map((step) => {
      if (
        typeof step === "object" &&
        step !== null &&
        "temperature" in step &&
        typeof step.temperature === "number"
      ) {
        return {
          ...step,
          temperature: nextTemperature,
        };
      }

      return step;
    });

    if (!nextSteps?.length) {
      return;
    }

    updateWorkflow({
      profile: {
        steps: nextSteps,
      },
    });
  }

  function updateSteamDuration(nextDuration: number) {
    updateWorkflow({
      steamSettings: {
        duration: roundValue(nextDuration, 1),
      },
    });
  }

  function updateFlushDuration(nextDuration: number) {
    updateWorkflow({
      rinseData: {
        duration: roundValue(nextDuration, 1),
      },
    });
  }

  function updateHotWaterVolume(nextVolume: number) {
    updateWorkflow({
      hotWaterData: {
        volume: roundValue(nextVolume, 1),
      },
    });
  }

  const controlRows = [
    {
      label: "Dose",
      value: formatPrimaryNumber(targetDose, "g", "18g", 0),
      detail: undefined,
      activePresetValue: targetDose ?? 18,
      presets: [
        { label: "16g", value: 16 },
        { label: "18g", value: 18 },
        { label: "20g", value: 20 },
        { label: "22g", value: 22 },
      ],
      tint: "text-[#5876d8]",
      onDecrease: () => updateDose(Math.max(8, Math.round((targetDose ?? 18) - 1))),
      onIncrease: () => updateDose(Math.round((targetDose ?? 18) + 1)),
      onPresetClick: (value: number) => updateDose(value),
    },
    {
      label: "Drink",
      value: formatPrimaryNumber(targetYield, "g", "36g", 0),
      detail: `(${ratio})`,
      activePresetValue: targetDose && targetYield ? targetYield / targetDose : 2.0,
      presets: [
        { label: "1:1.5", value: 1.5 },
        { label: "1:2.0", value: 2.0 },
        { label: "1:2.5", value: 2.5 },
        { label: "1:3.0", value: 3.0 },
      ],
      tint: "text-[#5876d8]",
      onDecrease: () => updateYield(Math.max(1, Math.round((targetYield ?? 36) - 1))),
      onIncrease: () => updateYield(Math.round((targetYield ?? 36) + 1)),
      onPresetClick: (value: number) =>
        updateYield((targetDose ?? 18) * value),
    },
    {
      label: "Brew",
      value: formatPrimaryNumber(snapshot?.mixTemperature, "°C", "87°C", 0),
      detail: undefined,
      activePresetValue: snapshot?.mixTemperature ?? 87,
      presets: [
        { label: "75°C", value: 75 },
        { label: "80°C", value: 80 },
        { label: "85°C", value: 85 },
        { label: "92°C", value: 92 },
      ],
      tint: "text-[#5876d8]",
      onDecrease: () =>
        updateBrewTemperature(Math.max(70, Math.round((snapshot?.mixTemperature ?? 87) - 1))),
      onIncrease: () =>
        updateBrewTemperature(Math.round((snapshot?.mixTemperature ?? 87) + 1)),
      onPresetClick: (value: number) => updateBrewTemperature(value),
    },
    {
      label: "Steam",
      value: formatPrimaryNumber(workflow?.steamSettings?.duration, "s", "50s", 0),
      detail: formatSecondaryNumber(workflow?.steamSettings?.flow, "", "1.5"),
      activePresetValue: workflow?.steamSettings?.duration ?? 50,
      presets: [
        { label: "15s", value: 15 },
        { label: "30s", value: 30 },
        { label: "45s", value: 45 },
        { label: "60s", value: 60 },
      ],
      tint: "text-[#5876d8]",
      onDecrease: () =>
        updateSteamDuration(Math.max(5, (workflow?.steamSettings?.duration ?? 50) - 5)),
      onIncrease: () => updateSteamDuration((workflow?.steamSettings?.duration ?? 50) + 5),
      onPresetClick: (value: number) => updateSteamDuration(value),
    },
    {
      label: "Flush",
      value: formatPrimaryNumber(workflow?.rinseData?.duration, "s", "10s", 0),
      detail: undefined,
      activePresetValue: workflow?.rinseData?.duration ?? 10,
      presets: [
        { label: "5s", value: 5 },
        { label: "10s", value: 10 },
        { label: "15s", value: 15 },
        { label: "20s", value: 20 },
      ],
      tint: "text-[#5876d8]",
      onDecrease: () =>
        updateFlushDuration(Math.max(1, (workflow?.rinseData?.duration ?? 10) - 1)),
      onIncrease: () => updateFlushDuration((workflow?.rinseData?.duration ?? 10) + 1),
      onPresetClick: (value: number) => updateFlushDuration(value),
    },
    {
      label: "Hot Water",
      value: formatPrimaryNumber(workflow?.hotWaterData?.volume, "ml", "50ml", 0),
      detail: formatPrimaryNumber(
        workflow?.hotWaterData?.targetTemperature,
        "°C",
        "75°C",
        0,
      ),
      activePresetValue: workflow?.hotWaterData?.volume ?? 50,
      presets: [
        { label: "50ml", value: 50 },
        { label: "100ml", value: 100 },
        { label: "150ml", value: 150 },
        { label: "200ml", value: 200 },
      ],
      tint: "text-[#5876d8]",
      onDecrease: () =>
        updateHotWaterVolume(Math.max(10, (workflow?.hotWaterData?.volume ?? 50) - 10)),
      onIncrease: () => updateHotWaterVolume((workflow?.hotWaterData?.volume ?? 50) + 10),
      onPresetClick: (value: number) => updateHotWaterVolume(value),
    },
  ] as const;

  const extractionRows = [
    {
      label: "Preinfusion",
      values: ["-", "-", "-", "-", "-", "-"],
    },
    {
      label: "Extraction",
      values: [
        "-",
        metricCell(targetYield, "g", 0),
        "-",
        metricCell(snapshot?.mixTemperature, "°C", 0),
        metricCell(snapshot?.flow, "", 1),
        metricCell(snapshot?.pressure, "", 1),
      ],
    },
    {
      label: "Total",
      values: ["-", metricCell(targetYield, "g", 0), "-", "-", "-", "-"],
    },
  ];

  const latestShot = shots?.[0];
  const latestShotDose = latestShot?.context?.targetDoseWeight;
  const latestShotYield = latestShot?.weight ?? latestShot?.context?.targetYield;

  return (
    <div>
      <div className="panel min-h-[calc(100svh-6.5rem)] overflow-hidden rounded-none border-x-0 border-t-0 bg-[#0d141d]/96">
        <section className="border-b border-border px-4 py-4 md:px-6">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0 flex gap-5">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="min-h-[56px] min-w-[212px] justify-between rounded-[18px] border-[#3a4a67] bg-[#121a25] px-5 text-base text-foreground hover:bg-[#17212e]"
                  variant="outline"
                >
                  <Link to="/workflows">
                    <span className="truncate">{activeRecipe}</span>
                    <span className="text-sm text-muted-foreground">Profiles</span>
                  </Link>
                </Button>
                <Button
                  className={cn(
                    "min-h-[56px] min-w-[168px] rounded-[18px] px-5 text-base",
                    isShotRunning
                      ? "border-[#734341] bg-[#5b2927] text-white hover:bg-[#67302d]"
                      : "border-[#4d6ad0] bg-[#4f67ae] text-white hover:bg-[#5a73bf]",
                  )}
                  disabled={isOffline}
                  onClick={() => void requestState(isShotRunning ? "idle" : "espresso")}
                >
                  {isShotRunning ? <Square className="size-4" /> : <Zap className="size-4" />}
                  {isShotRunning ? "Stop shot" : "Start shot"}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.95rem] text-muted-foreground">
                <StatusMetric
                  accent={false}
                  label="Mix"
                  value={metricCell(snapshot?.mixTemperature, "°C")}
                />
                <StatusMetric
                  accent={false}
                  label="Group"
                  value={metricCell(snapshot?.groupTemperature, "°C")}
                />
                <StatusMetric
                  accent={false}
                  label="Steam"
                  value={metricCell(snapshot?.steamTemperature, "°C", 0)}
                />
                <StatusMetric
                  accent
                  label="Flow"
                  value={metricCell(snapshot?.flow, " ml/s")}
                />
              </div>
            </div>

            <div className="text-left xl:text-right">
              <p
                className={cn(
                  "text-[1.1rem] font-semibold tracking-[-0.02em]",
                  isOffline ? "text-[#e1a36f]" : "text-[#20b89b]",
                )}
              >
                {statusLabel}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{liveConnection}</p>
            </div>
          </div>
        </section>

        <section className="grid xl:grid-cols-[264px_minmax(0,1fr)]">
          <aside className="border-b border-border xl:border-b-0 xl:border-r">
            {controlRows.map((row) => (
              <ControlRailRow
                activePresetValue={row.activePresetValue}
                disabled={isUpdatingWorkflow}
                key={row.label}
                detail={row.detail}
                label={row.label}
                onDecrease={row.onDecrease}
                onIncrease={row.onIncrease}
                onPresetClick={row.onPresetClick}
                presets={row.presets}
                tint={row.tint}
                value={row.value}
              />
            ))}
          </aside>

          <div className="min-w-0 xl:flex xl:flex-col">
            <div className="px-3 py-3 md:px-5 md:py-4 xl:flex-1">
              <TelemetryChart
                className="rounded-[0px] border-0 bg-transparent p-0 shadow-none"
                data={telemetry}
                mode="minimal"
              />
            </div>
          </div>
        </section>

        {/* <section className="grid border-t border-border xl:grid-cols-[0.95fr_1.35fr]">
          <div className="border-b border-border px-6 py-4 xl:border-b-0 xl:border-r">
            <p className="text-center text-[0.95rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Shot history
            </p>

            <div className="mt-4 flex items-center justify-between gap-4">
              <button
                aria-label="Previous shot"
                className="rounded-full p-2 text-muted-foreground transition hover:text-foreground"
                type="button"
              >
                <ChevronLeft className="size-6" />
              </button>

              <div className="text-center">
                <p className="text-[2rem] font-display leading-none text-foreground">
                  {formatRelativeTimestamp(latestShot?.timestamp)}
                </p>
                <p className="mt-4 text-[1rem] text-foreground">
                  {latestShot?.workflow?.name ?? activeRecipe}
                </p>
                <p className="mt-2 text-[1rem] text-muted-foreground">
                  {metricCell(latestShotDose, "g", 0)} | {metricCell(latestShotYield, "g", 0)}
                </p>
              </div>

              <button
                aria-label="Next shot"
                className="rounded-full p-2 text-muted-foreground transition hover:text-foreground"
                type="button"
              >
                <ChevronRight className="size-6" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto px-4 py-4 md:px-6">
            <table className="w-full min-w-[620px] border-separate border-spacing-y-3 text-left">
              <thead>
                <tr className="text-[0.95rem] font-semibold tracking-[0.02em] text-muted-foreground">
                  <th className="w-[180px] px-3"> </th>
                  <th className="px-3">Time</th>
                  <th className="px-3">Grams</th>
                  <th className="px-3">mL</th>
                  <th className="px-3">°C</th>
                  <th className="px-3">mL/s</th>
                  <th className="px-3">Pressure</th>
                </tr>
              </thead>
              <tbody>
                {extractionRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-3 py-2 text-[1rem] font-semibold text-muted-foreground">
                      {row.label}
                    </td>
                    {row.values.map((value, index) => (
                      <td
                        key={`${row.label}-${index}`}
                        className="px-3 py-2 text-[1rem] font-medium text-foreground"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section> */}
      </div>
    </div>
  );
}

function ControlRailRow({
  activePresetValue,
  detail,
  disabled,
  label,
  onDecrease,
  onIncrease,
  onPresetClick,
  presets,
  tint,
  value,
}: {
  activePresetValue: number;
  detail?: string;
  disabled: boolean;
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onPresetClick: (value: number) => void;
  presets: ReadonlyArray<{ label: string; value: number }>;
  tint: string;
  value: string;
}) {
  return (
    <div className="border-b border-border px-3 py-3 last:border-b-0">
      <div className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-3">
        <p className={cn("pt-2.5 text-[0.9rem] font-semibold tracking-[-0.02em]", tint)}>
          {label}
        </p>

        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2">
          <ControlButton
            ariaLabel={`Decrease ${label}`}
            disabled={disabled}
            onClick={onDecrease}
          >
            <Minus className="size-4" />
          </ControlButton>

          <div className="min-w-0 text-center">
            <p className="text-[0.96rem] font-semibold text-foreground">{value}</p>
            {detail ? (
              <p className="mt-0.5 text-[0.78rem] text-muted-foreground">{detail}</p>
            ) : null}
          </div>

          <ControlButton
            ariaLabel={`Increase ${label}`}
            disabled={disabled}
            onClick={onIncrease}
          >
            <Plus className="size-4" />
          </ControlButton>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 text-[0.78rem] font-medium text-muted-foreground">
        {presets.map((preset) => (
          <button
            key={preset.label}
            className={cn(
              "rounded-[10px] px-1 py-1 text-left transition",
              isPresetActive(activePresetValue, preset.value)
                ? "bg-muted/70 text-foreground"
                : "hover:bg-muted/45 hover:text-foreground",
            )}
            disabled={disabled}
            onClick={() => onPresetClick(preset.value)}
            type="button"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ControlButton({
  ariaLabel,
  children,
  disabled,
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#10161f] bg-[#11171f] text-foreground transition hover:bg-[#171e29] disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function isPresetActive(currentValue: number, presetValue: number) {
  return Math.abs(currentValue - presetValue) < 0.11;
}

function roundValue(value: number, digits: number) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function StatusMetric({
  accent,
  label,
  value,
}: {
  accent?: boolean;
  label: string;
  value: string;
}) {
  return (
    <p className={cn(accent ? "text-[#5a76d3]" : "")}>
      <span className="font-semibold text-foreground">{label}</span>{" "}
      <span>{value}</span>
    </p>
  );
}

function formatPrimaryNumber(
  value: number | null | undefined,
  suffix: string,
  fallback: string,
  digits = 1,
) {
  if (value == null || Number.isNaN(value)) {
    return fallback;
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function formatSecondaryNumber(
  value: number | null | undefined,
  suffix: string,
  fallback: string,
  digits = 1,
) {
  if (value == null || Number.isNaN(value)) {
    return fallback;
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function metricCell(
  value: number | null | undefined,
  suffix: string,
  digits = 1,
) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function startCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
