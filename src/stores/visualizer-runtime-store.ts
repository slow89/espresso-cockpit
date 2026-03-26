import { create } from "zustand";

import { showVisualizerToast } from "@/lib/toast";
import { isVisualizerEnabled } from "@/lib/visualizer";
import { queryClient } from "@/rest/query-client";
import {
  bridgeQueryKeys,
  getGatewayOrigin,
} from "@/rest/queries";
import type {
  MachineSnapshot,
  VisualizerPluginSettings,
} from "@/rest/types";

interface VisualizerRuntimeState {
  handleSnapshot: (snapshot: MachineSnapshot) => void;
  lastMachineState: string | null;
  reset: () => void;
}

export const useVisualizerRuntimeStore = create<VisualizerRuntimeState>((set, get) => ({
  handleSnapshot(snapshot) {
    const previousState = get().lastMachineState;
    const currentState = snapshot.state.state;
    const visualizerSettings = queryClient.getQueryData<VisualizerPluginSettings>(
      bridgeQueryKeys.visualizerSettings(getGatewayOrigin()),
    );

    if (
      previousState === "espresso" &&
      currentState !== "espresso" &&
      isVisualizerEnabled(visualizerSettings)
    ) {
      showVisualizerToast("Uploading to Visualizer");
    }

    set({ lastMachineState: currentState });
  },
  lastMachineState: null,
  reset() {
    set({ lastMachineState: null });
  },
}));

export const visualizerRuntimeStore = useVisualizerRuntimeStore;
