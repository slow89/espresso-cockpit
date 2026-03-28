import { create } from "zustand";

type DashboardUiState = {
  isSimulatedShotActive: boolean;
  reset: () => void;
  toggleSimulatedShot: () => void;
};

const defaultDashboardUiState = {
  isSimulatedShotActive: false,
} satisfies Pick<DashboardUiState, "isSimulatedShotActive">;

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  ...defaultDashboardUiState,
  reset: () =>
    set({
      ...defaultDashboardUiState,
    }),
  toggleSimulatedShot: () =>
    set((state) => ({
      isSimulatedShotActive: !state.isSimulatedShotActive,
    })),
}));

export const dashboardUiDefaultState = defaultDashboardUiState;
