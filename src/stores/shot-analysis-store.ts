import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ShotAnalysisProviderId } from "@/lib/shot-analysis";

interface ShotAnalysisSettingsState {
  /** Operator-supplied API key for the selected provider. Skin-local: never sent to the Bridge. */
  apiKey: string;
  /** OpenAI-compatible endpoint base URL. Unused for Anthropic. */
  baseUrl: string;
  /** Model id; empty selects the provider default (Anthropic only). */
  model: string;
  provider: ShotAnalysisProviderId;
  /** JSON of the last deploy-time provision payload applied, so each payload applies once. */
  provisionStamp: string;
  clearApiKey: () => void;
  setApiKey: (apiKey: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  setModel: (model: string) => void;
  setProvider: (provider: ShotAnalysisProviderId) => void;
}

export const useShotAnalysisSettingsStore = create<ShotAnalysisSettingsState>()(
  persist(
    (set) => ({
      apiKey: "",
      baseUrl: "",
      clearApiKey: () => set({ apiKey: "" }),
      model: "",
      provider: "anthropic",
      provisionStamp: "",
      setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),
      setBaseUrl: (baseUrl) => set({ baseUrl: baseUrl.trim() }),
      setModel: (model) => set({ model: model.trim() }),
      setProvider: (provider) => set({ provider }),
    }),
    {
      name: "espresso-cockpit-shot-analysis",
      partialize: (state) => ({
        apiKey: state.apiKey,
        baseUrl: state.baseUrl,
        model: state.model,
        provider: state.provider,
        provisionStamp: state.provisionStamp,
      }),
    },
  ),
);
