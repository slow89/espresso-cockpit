import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  WorkflowFrameChartPreset,
  WorkflowFrameFamily,
  WorkflowFrameSeriesId,
} from "@/lib/workflow-frame-preview";

export type WorkflowFrameChartPreferences = {
  activePreset: WorkflowFrameChartPreset;
  laneVisibility: Record<WorkflowFrameFamily, boolean>;
  selectedSeriesIds: WorkflowFrameSeriesId[];
};

interface WorkflowFrameChartState extends WorkflowFrameChartPreferences {
  resetToDefaultPreset: (defaultSeriesIds: WorkflowFrameSeriesId[]) => void;
  setPreset: (
    preset: Exclude<WorkflowFrameChartPreset, "custom">,
    seriesIds: WorkflowFrameSeriesId[],
  ) => void;
  toggleLane: (family: WorkflowFrameFamily) => void;
  toggleSeries: (
    seriesId: WorkflowFrameSeriesId,
    availableSeriesIds: WorkflowFrameSeriesId[],
    defaultSeriesIds: WorkflowFrameSeriesId[],
  ) => void;
}

export const workflowFrameChartDefaultLaneVisibility: Record<WorkflowFrameFamily, boolean> = {
  pressure: true,
  flow: true,
  temperature: true,
  progress: true,
  other: true,
};

export const workflowFrameChartDefaultPreferences: WorkflowFrameChartPreferences = {
  activePreset: "core-frames",
  laneVisibility: workflowFrameChartDefaultLaneVisibility,
  selectedSeriesIds: [],
};

function uniqueSeriesIds(seriesIds: WorkflowFrameSeriesId[], availableSeriesIds?: WorkflowFrameSeriesId[]) {
  const knownIds = availableSeriesIds ? new Set(availableSeriesIds) : null;

  return [...new Set(seriesIds)].filter((seriesId) => (knownIds ? knownIds.has(seriesId) : true));
}

export function sanitizeWorkflowFrameSelection({
  activePreset,
  allSeriesIds,
  defaultSeriesIds,
  selectedSeriesIds,
}: {
  activePreset: WorkflowFrameChartPreset;
  allSeriesIds: WorkflowFrameSeriesId[];
  defaultSeriesIds: WorkflowFrameSeriesId[];
  selectedSeriesIds: WorkflowFrameSeriesId[];
}) {
  const filtered = uniqueSeriesIds(selectedSeriesIds, allSeriesIds);

  if (activePreset === "all-series") {
    return allSeriesIds;
  }

  if (activePreset === "core-frames") {
    return defaultSeriesIds;
  }

  return filtered.length > 0 ? filtered : defaultSeriesIds;
}

export function deriveWorkflowFrameActivePreset({
  allSeriesIds,
  defaultSeriesIds,
  selectedSeriesIds,
}: {
  allSeriesIds: WorkflowFrameSeriesId[];
  defaultSeriesIds: WorkflowFrameSeriesId[];
  selectedSeriesIds: WorkflowFrameSeriesId[];
}): WorkflowFrameChartPreset {
  if (allSeriesIds.length === 0) {
    return "core-frames";
  }

  const normalizedSelected = [...selectedSeriesIds].sort().join("|");
  const normalizedAll = [...allSeriesIds].sort().join("|");
  const normalizedDefault = [...defaultSeriesIds].sort().join("|");

  if (normalizedSelected === normalizedAll) {
    return "all-series";
  }

  if (normalizedSelected === normalizedDefault) {
    return "core-frames";
  }

  return "custom";
}

export const useWorkflowFrameChartStore = create<WorkflowFrameChartState>()(
  persist(
    (set) => ({
      ...workflowFrameChartDefaultPreferences,
      resetToDefaultPreset: (defaultSeriesIds) =>
        set({
          activePreset: "core-frames",
          selectedSeriesIds: uniqueSeriesIds(defaultSeriesIds),
        }),
      setPreset: (preset, seriesIds) =>
        set({
          activePreset: preset,
          selectedSeriesIds: uniqueSeriesIds(seriesIds),
        }),
      toggleLane: (family) =>
        set((state) => ({
          laneVisibility: {
            ...state.laneVisibility,
            [family]: !state.laneVisibility[family],
          },
        })),
      toggleSeries: (seriesId, availableSeriesIds, defaultSeriesIds) =>
        set((state) => {
          const hasSeries = state.selectedSeriesIds.includes(seriesId);
          const nextSeriesIds = hasSeries
            ? state.selectedSeriesIds.filter((currentSeriesId) => currentSeriesId !== seriesId)
            : [...state.selectedSeriesIds, seriesId];
          const sanitized = uniqueSeriesIds(nextSeriesIds, availableSeriesIds);

          return {
            activePreset: "custom" as const,
            selectedSeriesIds: sanitized.length > 0 ? sanitized : uniqueSeriesIds(defaultSeriesIds),
          };
        }),
    }),
    {
      name: "espresso-cockpit-workflow-frame-chart",
      partialize: (state) => ({
        activePreset: state.activePreset,
        laneVisibility: state.laneVisibility,
        selectedSeriesIds: uniqueSeriesIds(state.selectedSeriesIds),
      }),
      merge: (persistedState, currentState) => {
        const nextState = persistedState as Partial<WorkflowFrameChartPreferences> | undefined;

        return {
          ...currentState,
          activePreset: nextState?.activePreset ?? currentState.activePreset,
          laneVisibility: {
            ...currentState.laneVisibility,
            ...nextState?.laneVisibility,
          },
          selectedSeriesIds: uniqueSeriesIds(
            nextState?.selectedSeriesIds ?? currentState.selectedSeriesIds,
          ),
        };
      },
    },
  ),
);
