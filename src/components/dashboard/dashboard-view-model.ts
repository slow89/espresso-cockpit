import type { DashboardPrepStatus } from "@/lib/dashboard-utils";
import {
  getPostShotActualRatio,
  getPostShotDurationSeconds,
  getPostShotFinalWeight,
  getPostShotHistoryShotId,
} from "@/lib/dashboard-post-shot-summary";
import {
  formatSecondaryNumber,
  getDashboardPrepStatus,
  getDashboardPresentationMode,
  getDashboardUtilityAction,
  type DashboardPresentationMode,
  type DashboardUtilityAction,
} from "@/lib/dashboard-utils";
import {
  formatBrewRatio,
  formatPrimaryNumber,
  roundValue,
  type RecipePreset,
} from "@/lib/recipe-utils";
import {
  useLatestShotQuery,
  useMachineStateQuery,
  useUpdateWorkflowMutation,
  useWorkflowQuery,
} from "@/rest/queries";
import type { WorkflowRecord } from "@/rest/types";
import { useDashboardUiStore } from "@/stores/dashboard-ui-store";
import { useMachineStore } from "@/stores/machine-store";

export type DashboardShotSummaryItem = {
  label: string;
  value: string;
};

export type DashboardPostShotYieldDelta = {
  label: string;
  tone: "on-target" | "over" | "under";
};

export type DashboardControlRow = {
  activePresetValue: number;
  detail?: string;
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onPresetClick: (value: number) => void;
  presets: ReadonlyArray<RecipePreset>;
  tint: string;
  value: string;
};

export type DashboardRecipeControls = {
  doseActivePresetValue: number;
  dosePresets: ReadonlyArray<RecipePreset>;
  doseValue: string;
  drinkActivePresetValue: number;
  drinkDetail: string;
  drinkPresets: ReadonlyArray<RecipePreset>;
  drinkValue: string;
  onDecreaseDose: () => void;
  onDecreaseDrink: () => void;
  onIncreaseDose: () => void;
  onIncreaseDrink: () => void;
  onSelectDosePreset: (value: number) => void;
  onSelectDrinkPreset: (value: number) => void;
};

type DashboardWorkflowControls = {
  brewTemperature: number | undefined;
  isUpdatingWorkflow: boolean;
  updateBrewTemperature: (nextTemperature: number) => void;
  updateDose: (nextDose: number) => void;
  updateFlushDuration: (nextDuration: number) => void;
  updateHotWaterVolume: (nextVolume: number) => void;
  updateSteamDuration: (nextDuration: number) => void;
  updateYield: (nextYield: number) => void;
  workflow: ReturnType<typeof useWorkflowQuery>["data"];
};

const dosePresets = [
  { label: "16g", value: 16 },
  { label: "18g", value: 18 },
  { label: "20g", value: 20 },
  { label: "22g", value: 22 },
] as const satisfies ReadonlyArray<RecipePreset>;

const drinkPresets = [
  { label: "1:1.5", value: 1.5 },
  { label: "1:2.0", value: 2.0 },
  { label: "1:2.5", value: 2.5 },
  { label: "1:3.0", value: 3.0 },
] as const satisfies ReadonlyArray<RecipePreset>;

function readStepTemperature(step: Record<string, unknown>) {
  const temperature = step.temperature;

  if (typeof temperature === "number" && Number.isFinite(temperature)) {
    return temperature;
  }

  if (typeof temperature === "string") {
    const parsed = Number(temperature);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function getWorkflowBrewTemperature(workflow: WorkflowRecord | null | undefined) {
  for (const step of workflow?.profile?.steps ?? []) {
    if (typeof step !== "object" || step === null) {
      continue;
    }

    const temperature = readStepTemperature(step);

    if (temperature !== undefined) {
      return temperature;
    }
  }

  return undefined;
}

function useDashboardWorkflowControls(): DashboardWorkflowControls {
  const { data: snapshot } = useMachineStateQuery();
  const { data: workflow } = useWorkflowQuery();
  const updateWorkflowMutation = useUpdateWorkflowMutation();
  const brewTemperature =
    getWorkflowBrewTemperature(workflow) ??
    snapshot?.targetMixTemperature ??
    snapshot?.mixTemperature;

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
    if (brewTemperature === undefined) {
      return;
    }

    const temperatureDelta = nextTemperature - brewTemperature;
    let didUpdateStepTemperature = false;
    const nextSteps = workflow?.profile?.steps?.map((step) => {
      if (typeof step === "object" && step !== null) {
        const stepTemperature = readStepTemperature(step);

        if (stepTemperature === undefined) {
          return step;
        }

        didUpdateStepTemperature = true;

        return {
          ...step,
          temperature: roundValue(stepTemperature + temperatureDelta, 0.1),
        };
      }

      return step;
    });

    if (!nextSteps?.length || !didUpdateStepTemperature) {
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

  return {
    brewTemperature,
    isUpdatingWorkflow: updateWorkflowMutation.isPending,
    updateBrewTemperature,
    updateDose,
    updateFlushDuration,
    updateHotWaterVolume,
    updateSteamDuration,
    updateYield,
    workflow,
  };
}

export function useDashboardControlPanelModel(): {
  controlRows: ReadonlyArray<DashboardControlRow>;
  recipeControls: DashboardRecipeControls;
  workflowDisabled: boolean;
} {
  const {
    brewTemperature,
    isUpdatingWorkflow,
    updateBrewTemperature,
    updateDose,
    updateFlushDuration,
    updateHotWaterVolume,
    updateSteamDuration,
    updateYield,
    workflow,
  } = useDashboardWorkflowControls();
  const targetDose = workflow?.context?.targetDoseWeight;
  const targetYield = workflow?.context?.targetYield;
  const ratio = formatBrewRatio(targetDose, targetYield);

  return {
    controlRows: [
      {
        activePresetValue: brewTemperature ?? 87,
        detail: undefined,
        label: "Brew",
        onDecrease: () =>
          updateBrewTemperature(Math.max(70, Math.round((brewTemperature ?? 87) - 1))),
        onIncrease: () => updateBrewTemperature(Math.round((brewTemperature ?? 87) + 1)),
        onPresetClick: (value) => updateBrewTemperature(value),
        presets: [
          { label: "75°C", value: 75 },
          { label: "80°C", value: 80 },
          { label: "85°C", value: 85 },
          { label: "92°C", value: 92 },
        ],
        tint: "text-highlight-muted",
        value: formatPrimaryNumber(brewTemperature, "°C", "87°C", 0),
      },
      {
        activePresetValue: workflow?.steamSettings?.duration ?? 50,
        detail: formatSecondaryNumber(workflow?.steamSettings?.flow, "", "1.5"),
        label: "Steam",
        onDecrease: () =>
          updateSteamDuration(Math.max(5, (workflow?.steamSettings?.duration ?? 50) - 5)),
        onIncrease: () => updateSteamDuration((workflow?.steamSettings?.duration ?? 50) + 5),
        onPresetClick: (value) => updateSteamDuration(value),
        presets: [
          { label: "15s", value: 15 },
          { label: "30s", value: 30 },
          { label: "45s", value: 45 },
          { label: "60s", value: 60 },
        ],
        tint: "text-highlight-muted",
        value: formatPrimaryNumber(workflow?.steamSettings?.duration, "s", "50s", 0),
      },
      {
        activePresetValue: workflow?.rinseData?.duration ?? 10,
        detail: undefined,
        label: "Flush",
        onDecrease: () =>
          updateFlushDuration(Math.max(1, (workflow?.rinseData?.duration ?? 10) - 1)),
        onIncrease: () => updateFlushDuration((workflow?.rinseData?.duration ?? 10) + 1),
        onPresetClick: (value) => updateFlushDuration(value),
        presets: [
          { label: "5s", value: 5 },
          { label: "10s", value: 10 },
          { label: "15s", value: 15 },
          { label: "20s", value: 20 },
        ],
        tint: "text-highlight-muted",
        value: formatPrimaryNumber(workflow?.rinseData?.duration, "s", "10s", 0),
      },
      {
        activePresetValue: workflow?.hotWaterData?.volume ?? 50,
        detail: formatPrimaryNumber(workflow?.hotWaterData?.targetTemperature, "°C", "75°C", 0),
        label: "Hot Water",
        onDecrease: () =>
          updateHotWaterVolume(Math.max(10, (workflow?.hotWaterData?.volume ?? 50) - 10)),
        onIncrease: () => updateHotWaterVolume((workflow?.hotWaterData?.volume ?? 50) + 10),
        onPresetClick: (value) => updateHotWaterVolume(value),
        presets: [
          { label: "50ml", value: 50 },
          { label: "100ml", value: 100 },
          { label: "150ml", value: 150 },
          { label: "200ml", value: 200 },
        ],
        tint: "text-highlight-muted",
        value: formatPrimaryNumber(workflow?.hotWaterData?.volume, "ml", "50ml", 0),
      },
    ] as const,
    recipeControls: {
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
      onSelectDosePreset: (value) => updateDose(value),
      onSelectDrinkPreset: (value) => updateYield((targetDose ?? 18) * value),
    },
    workflowDisabled: isUpdatingWorkflow,
  };
}

export function useDashboardShotSummaryItems(): ReadonlyArray<DashboardShotSummaryItem> {
  const { data: snapshot } = useMachineStateQuery();
  const { data: workflow } = useWorkflowQuery();
  const targetDose = workflow?.context?.targetDoseWeight;
  const targetYield = workflow?.context?.targetYield;
  const brewTemperature =
    getWorkflowBrewTemperature(workflow) ??
    snapshot?.targetMixTemperature ??
    snapshot?.mixTemperature;

  return [
    { label: "Recipe", value: getDashboardActiveRecipe(workflow) },
    { label: "Dose", value: formatPrimaryNumber(targetDose, "g", "18g", 0) },
    { label: "Yield", value: formatPrimaryNumber(targetYield, "g", "36g", 0) },
    { label: "Ratio", value: formatBrewRatio(targetDose, targetYield) },
    {
      label: "Brew",
      value: formatPrimaryNumber(brewTemperature, "°C", "87°C", 0),
    },
  ] satisfies ReadonlyArray<DashboardShotSummaryItem>;
}

export function useDashboardPrepStatusModel(): DashboardPrepStatus {
  const liveConnection = useMachineStore((state) => state.liveConnection);
  const machineError = useMachineStore((state) => state.error);
  const timeToReady = useMachineStore((state) => state.timeToReady);
  const { data: snapshot, error: machineQueryError } = useMachineStateQuery();
  const { error: workflowQueryError } = useWorkflowQuery();
  const isOffline =
    liveConnection !== "live" || Boolean(machineError || machineQueryError || workflowQueryError);

  return getDashboardPrepStatus({
    isOffline,
    snapshot,
    timeToReady,
  });
}

export function useDashboardPresentationMode(): DashboardPresentationMode {
  const isSimulatedShotActive = useDashboardUiStore((state) => state.isSimulatedShotActive);
  const postShotSummary = useDashboardUiStore((state) => state.postShotSummary);
  const telemetry = useMachineStore((state) => state.telemetry);
  const { data: snapshot } = useMachineStateQuery();

  return getDashboardPresentationMode({
    postShotSummary,
    simulatedShotActive: isSimulatedShotActive,
    snapshot,
    telemetry,
  });
}

export function useDashboardShotActive(): boolean {
  return useDashboardPresentationMode() === "shot";
}

export function useDashboardActiveUtilityAction(): DashboardUtilityAction | null {
  const { data: snapshot } = useMachineStateQuery();

  return getDashboardUtilityAction(snapshot);
}

export function getDashboardActiveRecipe(workflow: WorkflowRecord | null | undefined) {
  return workflow?.profile?.title ?? workflow?.name ?? "PSPH";
}

export function useDashboardPostShotSummaryModel() {
  const summary = useDashboardUiStore((state) => state.postShotSummary);
  const dismissPostShotSummary = useDashboardUiStore((state) => state.dismissPostShotSummary);
  const latestShotQuery = useLatestShotQuery({
    enabled: summary != null,
    refetchInterval: summary == null ? false : 1_000,
  });

  if (summary == null) {
    return null;
  }

  const durationSeconds = getPostShotDurationSeconds(summary.telemetry);
  const finalWeight = getPostShotFinalWeight(summary.telemetry);
  const actualRatio = getPostShotActualRatio(summary);
  const targetDose = summary.workflow.targetDoseWeight;
  const targetYield = summary.workflow.targetYield;
  const historyShotId = getPostShotHistoryShotId(summary, latestShotQuery.data);
  const title = summary.workflow.profileTitle ?? summary.workflow.name ?? "Shot complete";
  const targetRatio =
    targetDose != null && targetYield != null && targetDose > 0 ? targetYield / targetDose : null;

  return {
    historyShotId,
    onDismiss: dismissPostShotSummary,
    summary,
    ratioValue: actualRatio == null ? "--" : `1:${actualRatio.toFixed(1)}`,
    subtitle: summary.workflow.coffeeName ?? "No coffee saved",
    targetRatioLabel: targetRatio == null ? null : `target 1:${targetRatio.toFixed(1)}`,
    targetYieldLabel: targetYield == null ? null : `target ${targetYield.toFixed(0)} g`,
    telemetry: summary.telemetry,
    timeValue: durationSeconds == null ? "--.-s" : formatShotDuration(durationSeconds),
    title,
    yieldDelta: buildYieldDelta(finalWeight, targetYield),
    yieldValue: finalWeight == null ? "--.- g" : `${finalWeight.toFixed(1)} g`,
  };
}

function buildYieldDelta(
  actual: number | null,
  target: number | null,
): DashboardPostShotYieldDelta | null {
  if (actual == null || target == null || Number.isNaN(actual) || Number.isNaN(target)) {
    return null;
  }

  const delta = actual - target;
  const rounded = Math.round(delta * 10) / 10;

  if (Math.abs(rounded) < 0.5) {
    return { label: "on target", tone: "on-target" };
  }

  const sign = rounded > 0 ? "+" : "";

  return {
    label: `${sign}${rounded.toFixed(1)} g`,
    tone: rounded > 0 ? "over" : "under",
  };
}

function formatShotDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0.0s";
  }

  return `${seconds.toFixed(1)}s`;
}
