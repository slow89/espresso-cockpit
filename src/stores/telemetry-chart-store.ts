import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  telemetryAllSeriesIds,
  telemetryDefaultSeriesIds,
  type TelemetryChartPreferences,
  type TelemetrySeriesFamily,
  type TelemetrySeriesId,
} from "@/lib/telemetry";

type TelemetryPresetId = TelemetryChartPreferences["activePreset"];

interface TelemetryChartState extends TelemetryChartPreferences {
  toggleLane: (family: TelemetrySeriesFamily) => void;
  toggleSeries: (seriesId: TelemetrySeriesId) => void;
  setPreset: (preset: Exclude<TelemetryPresetId, "custom">) => void;
  resetToDefaultPreset: () => void;
}

export const telemetryChartDefaultLaneVisibility: Record<TelemetrySeriesFamily, boolean> = {
  pressure: true,
  flow: true,
  weight: true,
  temperature: true,
  progress: true,
};

export const telemetryChartDefaultPreferences: TelemetryChartPreferences = {
  selectedSeriesIds: telemetryDefaultSeriesIds,
  laneVisibility: telemetryChartDefaultLaneVisibility,
  activePreset: "live-shot",
};

function uniqueSeriesIds(seriesIds: TelemetrySeriesId[]) {
  const knownIds = new Set(telemetryAllSeriesIds);

  return [...new Set(seriesIds)].filter(
    (seriesId): seriesId is TelemetrySeriesId => knownIds.has(seriesId),
  );
}

function buildPresetSelection(preset: Exclude<TelemetryPresetId, "custom">): TelemetrySeriesId[] {
  if (preset === "all-signals") {
    return telemetryAllSeriesIds;
  }

      return telemetryDefaultSeriesIds;
}

export const useTelemetryChartStore = create<TelemetryChartState>()(
  persist(
    (set) => ({
      ...telemetryChartDefaultPreferences,
      toggleLane: (family) =>
        set((state) => ({
          laneVisibility: {
            ...state.laneVisibility,
            [family]: !state.laneVisibility[family],
          },
        })),
      toggleSeries: (seriesId) =>
        set((state) => {
          const hasSeries = state.selectedSeriesIds.includes(seriesId);
          const nextSeriesIds = hasSeries
            ? state.selectedSeriesIds.filter((currentSeriesId) => currentSeriesId !== seriesId)
            : [...state.selectedSeriesIds, seriesId];

          return {
            selectedSeriesIds: uniqueSeriesIds(nextSeriesIds),
            activePreset: "custom" as const,
          };
        }),
      setPreset: (preset) =>
        set({
          selectedSeriesIds: buildPresetSelection(preset),
          activePreset: preset,
        }),
      resetToDefaultPreset: () =>
        set({
          ...telemetryChartDefaultPreferences,
        }),
    }),
    {
      name: "espresso-cockpit-telemetry-chart",
      partialize: (state) => ({
        selectedSeriesIds: uniqueSeriesIds(state.selectedSeriesIds),
        laneVisibility: state.laneVisibility,
        activePreset: state.activePreset,
      }),
      merge: (persistedState, currentState) => {
        const nextState = persistedState as Partial<TelemetryChartPreferences> | undefined;

        return {
          ...currentState,
          selectedSeriesIds: uniqueSeriesIds(
            nextState?.selectedSeriesIds ?? currentState.selectedSeriesIds,
          ),
          laneVisibility: {
            ...currentState.laneVisibility,
            ...nextState?.laneVisibility,
          },
          activePreset: nextState?.activePreset ?? currentState.activePreset,
        };
      },
    },
  ),
);
