import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WaterAlertState {
  /** Percentage threshold at which the refill overlay appears (0 = disabled) */
  alertThreshold: number;
  /** Whether the user has dismissed the overlay for the current low-water event */
  dismissed: boolean;
  setAlertThreshold: (threshold: number) => void;
  dismiss: () => void;
  resetDismiss: () => void;
}

export const useWaterAlertStore = create<WaterAlertState>()(
  persist(
    (set) => ({
      alertThreshold: 10,
      dismissed: false,
      setAlertThreshold: (threshold) =>
        set((state) =>
          state.alertThreshold === threshold
            ? state
            : {
                alertThreshold: threshold,
                dismissed: false,
              },
        ),
      dismiss: () => set({ dismissed: true }),
      resetDismiss: () => set({ dismissed: false }),
    }),
    {
      name: "espresso-cockpit-water-alert",
      partialize: (state) => ({ alertThreshold: state.alertThreshold }),
    },
  ),
);
