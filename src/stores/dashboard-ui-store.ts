import { create } from "zustand";

import {
  buildDashboardPostShotSummary,
  type DashboardPostShotSummary,
} from "@/lib/dashboard-post-shot-summary";
import type { TelemetrySample } from "@/lib/telemetry";
import type { WorkflowRecord } from "@/rest/types";

type DashboardUiState = {
  capturePostShotSummary: (telemetry: TelemetrySample[], workflow?: WorkflowRecord | null) => void;
  clearPostShotSummary: () => void;
  dismissPostShotSummary: () => void;
  isSimulatedShotActive: boolean;
  postShotSummary: DashboardPostShotSummary | null;
  reset: () => void;
  toggleSimulatedShot: () => void;
};

const defaultDashboardUiState = {
  isSimulatedShotActive: false,
  postShotSummary: null,
} satisfies Pick<DashboardUiState, "isSimulatedShotActive" | "postShotSummary">;

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  ...defaultDashboardUiState,
  capturePostShotSummary: (telemetry, workflow) => {
    const postShotSummary = buildDashboardPostShotSummary({
      telemetry,
      workflow,
    });

    if (postShotSummary == null) {
      return;
    }

    set({
      isSimulatedShotActive: false,
      postShotSummary,
    });
  },
  clearPostShotSummary: () =>
    set({
      postShotSummary: null,
    }),
  dismissPostShotSummary: () =>
    set({
      postShotSummary: null,
    }),
  reset: () =>
    set({
      ...defaultDashboardUiState,
    }),
  toggleSimulatedShot: () =>
    set((state) => ({
      isSimulatedShotActive: !state.isSimulatedShotActive,
      postShotSummary: !state.isSimulatedShotActive ? null : state.postShotSummary,
    })),
}));

export const dashboardUiDefaultState = defaultDashboardUiState;
