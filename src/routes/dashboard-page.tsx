import { DashboardControlRail } from "@/components/dashboard/dashboard-control-rail";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { TelemetryChart } from "@/components/telemetry-chart";
import { formatSecondaryNumber, getStatusLabel } from "@/lib/dashboard-utils";
import { formatBrewRatio, formatPrimaryNumber, roundValue } from "@/lib/recipe-utils";
import {
  useMachineStateQuery,
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
  const updateWorkflowMutation = useUpdateWorkflowMutation();

  const hasQueryError = Boolean(machineError || machineQueryError || workflowQueryError);
  const isOffline = liveConnection !== "live" || hasQueryError;
  const activeRecipe = workflow?.profile?.title ?? workflow?.name ?? "PSPH";
  const isShotRunning = snapshot?.state.state === "espresso";
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
      tint: "text-[#d99826]",
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
      tint: "text-[#d99826]",
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
      tint: "text-[#d99826]",
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
      tint: "text-[#d99826]",
      onDecrease: () =>
        updateHotWaterVolume(Math.max(10, (workflow?.hotWaterData?.volume ?? 50) - 10)),
      onIncrease: () => updateHotWaterVolume((workflow?.hotWaterData?.volume ?? 50) + 10),
      onPresetClick: (value: number) => updateHotWaterVolume(value),
    },
  ] as const;

  return (
    <div>
      <div className="panel min-h-[calc(100svh-6.5rem)] overflow-hidden rounded-none border-x-0 border-t-0 bg-[#08090b]/98 md:flex md:h-[calc(100svh-6.5rem)] md:flex-col">
        <DashboardTopBar
          activeRecipe={activeRecipe}
          isOffline={isOffline}
          isShotRunning={isShotRunning}
          liveConnection={liveConnection}
          onToggleShot={() => void requestState(isShotRunning ? "idle" : "espresso")}
          statusLabel={statusLabel}
        />

        <section className="grid md:min-h-0 md:flex-1 md:grid-cols-[228px_minmax(0,1fr)] xl:grid-cols-[264px_minmax(0,1fr)]">
          <DashboardControlRail
            controlRows={controlRows}
            disabled={isUpdatingWorkflow}
            recipeControls={recipeControls}
          />

          <div className="min-w-0 md:flex md:min-h-0 md:flex-col">
            <div className="px-2 py-2 md:flex-1 md:min-h-0 md:px-3 md:py-3 xl:px-4">
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
