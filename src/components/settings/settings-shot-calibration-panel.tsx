import { useState, type ChangeEvent, type KeyboardEvent } from "react";

import { ControlBlock, SettingsSection, StateCallout } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useBridgeSettingsQuery,
  useMachineCalibrationQuery,
  useUpdateBridgeSettingsMutation,
  useUpdateMachineCalibrationMutation,
} from "@/rest/queries";

const scalePowerModes = [
  {
    label: "Disabled",
    value: "disabled",
  },
  {
    label: "Display off",
    value: "displayOff",
  },
  {
    label: "Disconnect",
    value: "disconnect",
  },
] as const;

export function SettingsShotCalibrationPanel() {
  const settingsQuery = useBridgeSettingsQuery();
  const calibrationQuery = useMachineCalibrationQuery();
  const updateBridgeSettingsMutation = useUpdateBridgeSettingsMutation();
  const updateMachineCalibrationMutation = useUpdateMachineCalibrationMutation();
  const [weightFlowDraft, setWeightFlowDraft] = useState<number | null>(null);
  const [volumeFlowDraft, setVolumeFlowDraft] = useState<number | null>(null);
  const [flowMultiplierDraft, setFlowMultiplierDraft] = useState<number | null>(null);
  const weightFlowMultiplier = settingsQuery.data?.weightFlowMultiplier ?? 1;
  const volumeFlowMultiplier = settingsQuery.data?.volumeFlowMultiplier ?? 0.3;
  const flowMultiplier = calibrationQuery.data?.flowMultiplier ?? 1;
  const resolvedWeightFlowMultiplier = weightFlowDraft ?? weightFlowMultiplier;
  const resolvedVolumeFlowMultiplier = volumeFlowDraft ?? volumeFlowMultiplier;
  const resolvedFlowMultiplier = flowMultiplierDraft ?? flowMultiplier;
  const scalePowerMode = settingsQuery.data?.scalePowerMode ?? "disconnect";
  const isSettingsDisabled =
    settingsQuery.isPending || updateBridgeSettingsMutation.isPending || settingsQuery.isError;
  const isCalibrationDisabled =
    calibrationQuery.isPending ||
    updateMachineCalibrationMutation.isPending ||
    calibrationQuery.isError;

  async function commitWeightFlowMultiplier(nextValue = resolvedWeightFlowMultiplier) {
    const normalizedValue = roundToStep(clamp(nextValue, 0, 5), 0.1);

    if (normalizedValue === weightFlowMultiplier) {
      setWeightFlowDraft(null);
      return;
    }

    await updateBridgeSettingsMutation.mutateAsync({
      weightFlowMultiplier: normalizedValue,
    });
    setWeightFlowDraft(null);
  }

  async function commitVolumeFlowMultiplier(nextValue = resolvedVolumeFlowMultiplier) {
    const normalizedValue = roundToStep(clamp(nextValue, 0, 2), 0.05);

    if (normalizedValue === volumeFlowMultiplier) {
      setVolumeFlowDraft(null);
      return;
    }

    await updateBridgeSettingsMutation.mutateAsync({
      volumeFlowMultiplier: normalizedValue,
    });
    setVolumeFlowDraft(null);
  }

  async function commitFlowMultiplier(nextValue = resolvedFlowMultiplier) {
    const normalizedValue = roundToStep(clamp(nextValue, 0.13, 2), 0.01);

    if (normalizedValue === flowMultiplier) {
      setFlowMultiplierDraft(null);
      return;
    }

    await updateMachineCalibrationMutation.mutateAsync({
      flowMultiplier: normalizedValue,
    });
    setFlowMultiplierDraft(null);
  }

  async function handleScalePowerModeChange(nextMode: (typeof scalePowerModes)[number]["value"]) {
    if (nextMode === scalePowerMode) {
      return;
    }

    await updateBridgeSettingsMutation.mutateAsync({
      scalePowerMode: nextMode,
    });
  }

  return (
    <SettingsSection
      description="Stop-at-weight, fallback volume, scale power"
      title="Shot Calibration"
    >
      <div className="grid gap-2">
        <section className="overflow-hidden rounded-[3px] border border-border/50 bg-panel-strong/60">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 px-2.5 py-1.5">
            <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Stop conditions
            </p>
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.08em] text-muted-foreground/55">
              Weight primary &middot; volume fallback
            </p>
          </div>
          <div className="divide-y divide-border/30">
            <StopConditionRow
              ariaLabel="Weight flow"
              badge="01"
              description="Lower stops later, higher stops earlier"
              disabled={isSettingsDisabled}
              label="Weight"
              max={5}
              maxLabel="5x"
              min={0}
              minLabel="0x"
              onChange={setWeightFlowDraft}
              onCommit={() => void commitWeightFlowMultiplier()}
              role="primary"
              step={0.1}
              value={resolvedWeightFlowMultiplier}
              valueLabel={`${formatNumber(resolvedWeightFlowMultiplier, 2)}x`}
            />
            <StopConditionRow
              ariaLabel="Volume flow"
              badge="02"
              description="Used when scale stop is unavailable"
              disabled={isSettingsDisabled}
              label="Volume"
              max={2}
              maxLabel="2s"
              min={0}
              minLabel="0s"
              onChange={setVolumeFlowDraft}
              onCommit={() => void commitVolumeFlowMultiplier()}
              role="fallback"
              step={0.05}
              value={resolvedVolumeFlowMultiplier}
              valueLabel={`${formatNumber(resolvedVolumeFlowMultiplier, 2)}s`}
            />
          </div>
        </section>

        <ControlBlock
          description="When the machine sleeps"
          label="Scale power"
          value={formatScalePowerMode(scalePowerMode)}
        >
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {scalePowerModes.map((mode) => (
              <Button
                aria-pressed={scalePowerMode === mode.value}
                className="min-h-[34px] rounded-[3px] px-2.5 text-[0.7rem] uppercase tracking-[0.14em]"
                disabled={isSettingsDisabled}
                key={mode.value}
                onClick={() => void handleScalePowerModeChange(mode.value)}
                size="sm"
                variant={scalePowerMode === mode.value ? "default" : "secondary"}
              >
                {mode.label}
              </Button>
            ))}
          </div>
        </ControlBlock>

        <ControlBlock
          description="DE1 flow estimation calibration"
          label="Machine flow"
          value={`${formatNumber(resolvedFlowMultiplier, 2)}x`}
        >
          <div className="mt-2">
            <FlowSlider
              ariaLabel="Machine flow"
              disabled={isCalibrationDisabled}
              max={2}
              maxLabel="2.00x"
              min={0.13}
              minLabel="0.13x"
              onChange={setFlowMultiplierDraft}
              onCommit={() => void commitFlowMultiplier()}
              step={0.01}
              value={resolvedFlowMultiplier}
            />
          </div>
        </ControlBlock>

        {settingsQuery.error ? (
          <StateCallout tone="error">{settingsQuery.error.message}</StateCallout>
        ) : null}
        {calibrationQuery.error ? (
          <StateCallout tone="error">{calibrationQuery.error.message}</StateCallout>
        ) : null}
        {updateBridgeSettingsMutation.error ? (
          <StateCallout tone="error">{updateBridgeSettingsMutation.error.message}</StateCallout>
        ) : null}
        {updateMachineCalibrationMutation.error ? (
          <StateCallout tone="error">{updateMachineCalibrationMutation.error.message}</StateCallout>
        ) : null}
      </div>
    </SettingsSection>
  );
}

function StopConditionRow({
  ariaLabel,
  badge,
  description,
  disabled,
  label,
  max,
  maxLabel,
  min,
  minLabel,
  onChange,
  onCommit,
  role,
  step,
  value,
  valueLabel,
}: {
  ariaLabel: string;
  badge: string;
  description: string;
  disabled: boolean;
  label: string;
  max: number;
  maxLabel: string;
  min: number;
  minLabel: string;
  onChange: (value: number) => void;
  onCommit: () => void;
  role: "primary" | "fallback";
  step: number;
  value: number;
  valueLabel: string;
}) {
  return (
    <div className="px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded-[2px] px-1 font-mono text-[0.66rem] font-semibold tracking-[0.08em] tabular-nums",
            role === "primary"
              ? "bg-[#d0a954]/15 text-[#d0a954]"
              : "border border-border/50 text-muted-foreground/65",
          )}
        >
          {badge}
        </span>
        <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-foreground">
          {label} stop
        </p>
        <span className="font-mono text-[0.66rem] text-muted-foreground/40">|</span>
        <p className="truncate font-mono text-[0.67rem] uppercase tracking-[0.06em] text-muted-foreground/65">
          {description}
        </p>
        <p className="ml-auto shrink-0 font-mono text-[0.79rem] font-semibold tabular-nums text-foreground">
          {valueLabel}
        </p>
      </div>
      <div className="mt-2">
        <FlowSlider
          ariaLabel={ariaLabel}
          disabled={disabled}
          max={max}
          maxLabel={maxLabel}
          min={min}
          minLabel={minLabel}
          onChange={onChange}
          onCommit={onCommit}
          step={step}
          value={value}
        />
      </div>
    </div>
  );
}

function FlowSlider({
  ariaLabel,
  disabled,
  max,
  maxLabel,
  min,
  minLabel,
  onChange,
  onCommit,
  step,
  value,
}: {
  ariaLabel: string;
  disabled: boolean;
  max: number;
  maxLabel: string;
  min: number;
  minLabel: string;
  onChange: (value: number) => void;
  onCommit: () => void;
  step: number;
  value: number;
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = Number(event.target.value);

    if (Number.isFinite(nextValue)) {
      onChange(nextValue);
    }
  }

  function handleKeyUp(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
      onCommit();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 font-mono text-[0.68rem] uppercase tracking-[0.08em] tabular-nums text-muted-foreground/70">
        {minLabel}
      </span>
      <input
        aria-label={ariaLabel}
        className="h-1.5 w-full cursor-pointer accent-[#d0a954] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        max={max}
        min={min}
        onBlur={onCommit}
        onChange={handleChange}
        onKeyUp={handleKeyUp}
        onPointerUp={onCommit}
        step={step}
        type="range"
        value={value}
      />
      <span className="shrink-0 font-mono text-[0.68rem] uppercase tracking-[0.08em] tabular-nums text-muted-foreground/70">
        {maxLabel}
      </span>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  const precision = Math.max(0, step.toString().split(".")[1]?.length ?? 0);
  return Number((Math.round(value / step) * step).toFixed(precision));
}

function formatNumber(value: number, maximumFractionDigits: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatScalePowerMode(value: string | null | undefined) {
  if (value === "displayOff") {
    return "Display off";
  }

  if (value === "disabled") {
    return "Disabled";
  }

  if (value === "disconnect") {
    return "Disconnect";
  }

  return value ?? "Unknown";
}
