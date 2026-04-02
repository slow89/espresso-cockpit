import { create } from "zustand";

interface WaterAlertState {
  /** Whether the user has dismissed the overlay for the current low-water event */
  dismissed: boolean;
  dismiss: () => void;
  resetDismiss: () => void;
}

export const useWaterAlertStore = create<WaterAlertState>((set) => ({
  dismissed: false,
  dismiss: () => set({ dismissed: true }),
  resetDismiss: () => set({ dismissed: false }),
}));
