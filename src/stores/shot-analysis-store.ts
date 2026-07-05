import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ShotAnalysisSettingsState {
  /** Operator-supplied Anthropic API key. Skin-local: never sent to the Bridge. */
  apiKey: string;
  clearApiKey: () => void;
  setApiKey: (apiKey: string) => void;
}

export const useShotAnalysisSettingsStore = create<ShotAnalysisSettingsState>()(
  persist(
    (set) => ({
      apiKey: "",
      clearApiKey: () => set({ apiKey: "" }),
      setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),
    }),
    {
      name: "espresso-cockpit-shot-analysis",
      partialize: (state) => ({ apiKey: state.apiKey }),
    },
  ),
);
