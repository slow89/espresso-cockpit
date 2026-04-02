import { useState, type ChangeEvent, type KeyboardEvent } from "react";

import {
  ControlBlock,
  SettingsSection,
  StateCallout,
} from "@/components/settings/settings-shell";
import { useUpdateMachineWaterLevelsMutation } from "@/rest/queries";
import { useMachineStore } from "@/stores/machine-store";
import { useWaterAlertStore } from "@/stores/water-alert-store";

export function SettingsWaterAlertPanel() {
  const waterLevels = useMachineStore((state) => state.waterLevels);
  const resetDismiss = useWaterAlertStore((state) => state.resetDismiss);
  const updateMachineWaterLevelsMutation = useUpdateMachineWaterLevelsMutation();
  const [draft, setDraft] = useState<number | null>(null);
  const refillLevel = waterLevels?.refillLevel ?? null;
  const currentLevel = waterLevels?.currentLevel ?? null;
  const resolvedValue = draft ?? refillLevel ?? 0;
  const isDisabled = refillLevel == null || updateMachineWaterLevelsMutation.isPending;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setDraft(Number(event.target.value));
  }

  async function commit(nextValue = resolvedValue) {
    if (refillLevel == null) {
      setDraft(null);
      return;
    }

    if (nextValue === refillLevel) {
      setDraft(null);
      return;
    }

    const didUpdate = await updateMachineWaterLevelsMutation
      .mutateAsync({
        refillLevel: nextValue,
      })
      .then(() => true)
      .catch(() => false);

    if (didUpdate) {
      useMachineStore.setState((state) => ({
        waterLevels: state.waterLevels
          ? {
              ...state.waterLevels,
              refillLevel: nextValue,
            }
          : state.waterLevels,
      }));
      resetDismiss();
    }

    setDraft(null);
  }

  function handleKeyUp(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
      void commit();
    }
  }

  return (
    <SettingsSection
      description="Bridge-backed DE1 refill warning"
      title="Water Alert"
    >
      <div className="grid gap-2">
        <ControlBlock
          description={
            currentLevel == null
              ? "Waiting for live water level feed"
              : `Current tank level ${formatMillimeters(currentLevel)}`
          }
          label="Alert threshold"
          value={refillLevel == null ? "Waiting" : formatMillimeters(refillLevel)}
        >
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[0.46rem] uppercase tracking-[0.08em] text-muted-foreground/70">
              0 mm
            </span>
            <input
              aria-label="Water alert threshold"
              className="h-1.5 w-full cursor-pointer accent-[#d0a954]"
              disabled={isDisabled}
              max={30}
              min={0}
              onBlur={() => void commit()}
              onChange={handleChange}
              onKeyUp={handleKeyUp}
              onPointerUp={() => void commit()}
              step={5}
              type="range"
              value={resolvedValue}
            />
            <span className="font-mono text-[0.46rem] uppercase tracking-[0.08em] text-muted-foreground/70">
              30 mm
            </span>
          </div>
          {refillLevel == null ? (
            <div className="mt-2">
              <StateCallout tone="neutral">
                Waiting for the bridge to stream machine water levels.
              </StateCallout>
            </div>
          ) : null}
          {updateMachineWaterLevelsMutation.error ? (
            <div className="mt-2">
              <StateCallout tone="error">
                {updateMachineWaterLevelsMutation.error.message}
              </StateCallout>
            </div>
          ) : null}
        </ControlBlock>
      </div>
    </SettingsSection>
  );
}

function formatMillimeters(value: number) {
  const hasFraction = Math.abs(value % 1) > 0.001;
  return `${value.toFixed(hasFraction ? 1 : 0)} mm`;
}
