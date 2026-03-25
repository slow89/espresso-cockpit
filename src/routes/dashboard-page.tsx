import { DashboardControlRail } from "@/components/dashboard/dashboard-control-rail";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { TelemetryChart } from "@/components/telemetry-chart";
import { formatSecondaryNumber, getStatusLabel } from "@/lib/dashboard-utils";
import { formatBrewRatio, formatPrimaryNumber, roundValue } from "@/lib/recipe-utils";
import {
  useDevicesQuery,
  useMachineStateQuery,
  useRequestMachineStateMutation,
  useTareScaleMutation,
  useUpdateWorkflowMutation,
  useWorkflowQuery,
} from "@/rest/queries";
import { useMachineStore } from "@/stores/machine-store";

export function DashboardPage() {
  const liveConnection = useMachineStore((state) => state.liveConnection);
  const machineError = useMachineStore((state) => state.error);
  const scaleConnection = useMachineStore((state) => state.scaleConnection);
  const scaleSnapshot = useMachineStore((state) => state.scaleSnapshot);
  const telemetry = useMachineStore((state) => state.telemetry);
  const waterLevels = useMachineStore((state) => state.waterLevels);
  const { data: snapshot, error: machineQueryError } = useMachineStateQuery();
  const { data: devices } = useDevicesQuery();
  const { data: workflow, error: workflowQueryError } = useWorkflowQuery();
  const requestMachineStateMutation = useRequestMachineStateMutation();
  const tareScaleMutation = useTareScaleMutation();
  const updateWorkflowMutation = useUpdateWorkflowMutation();

  const hasQueryError = Boolean(machineError || machineQueryError || workflowQueryError);
  const isOffline = liveConnection !== "live" || hasQueryError;
  const isMachinePoweredOn = snapshot?.state.state !== "sleeping";
  const isMachinePowerDisabled = snapshot == null || hasQueryError;
  const activeRecipe = workflow?.profile?.title ?? workflow?.name ?? "PSPH";
  const statusLabel = getStatusLabel({
    isOffline,
    liveConnection,
    machineSubstate: snapshot?.state.substate,
    machineState: snapshot?.state.state,
  });

  const targetDose = workflow?.context?.targetDoseWeight;
  const targetYield = workflow?.context?.targetYield;
  const ratio = formatBrewRatio(targetDose, targetYield);
  const isUpdatingWorkflow = updateWorkflowMutation.isPending;
  const connectedScale = devices?.find(
    (device) => device.type === "scale" && device.state === "connected",
  );
  const isScalePaired = Boolean(connectedScale || scaleConnection === "live");
  const scaleWeight = scaleSnapshot?.weight ?? null;
  const canUseScaleWeightForDose =
    isScalePaired &&
    scaleWeight != null &&
    Number.isFinite(scaleWeight) &&
    scaleWeight > 0;

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

  const dosePresets = [
    { label: "16g", value: 16 },
    { label: "18g", value: 18 },
    { label: "20g", value: 20 },
    { label: "22g", value: 22 },
  ] as const;
  const drinkPresets = [
    { label: "1:1.5", value: 1.5 },
    { label: "1:2.0", value: 2.0 },
    { label: "1:2.5", value: 2.5 },
    { label: "1:3.0", value: 3.0 },
  ] as const;

  const recipeControls = {
    doseActivePresetValue: targetDose ?? 18,
    dosePresets,
    doseValue: formatPrimaryNumber(targetDose, "g", "18g", 0),
    drinkActivePresetValue: targetDose && targetYield ? targetYield / targetDose : 2.0,
    drinkDetail: `(${ratio})`,
    drinkPresets,
    drinkValue: formatPrimaryNumber(targetYield, "g", "36g", 0),
    onDecreaseDose: () => updateDose(Math.max(8, Math.round((targetDose ?? 18) - 1))),
    onDecreaseDrink: () => updateYield(Math.max(1, Math.round((targetYield ?? 36) - 1))),
    onIncreaseDose: () => updateDose(Math.round((targetDose ?? 18) + 1)),
    onIncreaseDrink: () => updateYield(Math.round((targetYield ?? 36) + 1)),
    onSelectDosePreset: (value: number) => updateDose(value),
    onSelectDrinkPreset: (value: number) => updateYield((targetDose ?? 18) * value),
  };

  const controlRows = [
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
      tint: "text-highlight-muted",
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
      tint: "text-highlight-muted",
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
      tint: "text-highlight-muted",
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
      tint: "text-highlight-muted",
      onDecrease: () =>
        updateHotWaterVolume(Math.max(10, (workflow?.hotWaterData?.volume ?? 50) - 10)),
      onIncrease: () => updateHotWaterVolume((workflow?.hotWaterData?.volume ?? 50) + 10),
      onPresetClick: (value: number) => updateHotWaterVolume(value),
    },
  ] as const;

  return (
    <div>
      <div className="panel min-h-[calc(100svh-var(--app-footer-height))] overflow-hidden rounded-none border-x-0 border-t-0 bg-shell md:flex md:h-[calc(100svh-var(--app-footer-height))] md:flex-col">
        <DashboardTopBar
          activeRecipe={activeRecipe}
          isOffline={isOffline}
          isMachinePowerDisabled={isMachinePowerDisabled}
          isMachinePowerPending={requestMachineStateMutation.isPending}
          isMachinePoweredOn={isMachinePoweredOn}
          isScalePaired={isScalePaired}
          isScaleTaring={tareScaleMutation.isPending}
          isScaleWeightActionDisabled={!canUseScaleWeightForDose || isUpdatingWorkflow}
          liveConnection={liveConnection}
          onToggleMachinePower={() => {
            if (snapshot == null) {
              return;
            }

            requestMachineStateMutation.mutate(
              snapshot.state.state === "sleeping" ? "idle" : "sleeping",
            );
          }}
          onSetDoseFromScale={() => {
            if (
              isScalePaired &&
              scaleWeight != null &&
              Number.isFinite(scaleWeight) &&
              scaleWeight > 0
            ) {
              updateDose(scaleWeight);
            }
          }}
          onTareScale={() => tareScaleMutation.mutate()}
          reservoirLevel={waterLevels?.currentLevel ?? null}
          reservoirRefillLevel={waterLevels?.refillLevel ?? null}
          scaleBatteryLevel={scaleSnapshot?.batteryLevel ?? null}
          scaleConnection={scaleConnection}
          scaleWeight={scaleWeight}
          statusLabel={statusLabel}
        />

        <section className="grid md:h-full md:min-h-0 md:flex-1 md:grid-cols-[272px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden xl:grid-cols-[296px_minmax(0,1fr)]">
          <DashboardControlRail
            controlRows={controlRows}
            recipeControls={recipeControls}
            workflowDisabled={isUpdatingWorkflow}
          />

          <div className="min-w-0 md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden">
            <div className="px-2 py-2 md:flex-1 md:min-h-0 md:overflow-hidden md:px-3 md:py-3 md:max-xl:px-4 md:max-xl:py-4 xl:px-4">
              <TelemetryChart
                className="h-full rounded-[18px] border-0 bg-transparent p-0 shadow-none"
                data={telemetry}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
