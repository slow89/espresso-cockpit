import { beforeEach, describe, expect, it, vi } from "vitest";

import { showVisualizerToast } from "@/lib/toast";
import { queryClient } from "@/rest/query-client";
import { bridgeQueryKeys, getGatewayOrigin } from "@/rest/queries";
import type { MachineSnapshot, MachineState } from "@/rest/types";
import { visualizerRuntimeStore } from "@/stores/visualizer-runtime-store";

vi.mock("@/lib/toast", () => ({
  showVisualizerToast: vi.fn(),
}));

function buildSnapshot(state: MachineState): MachineSnapshot {
  return {
    flow: 0,
    groupTemperature: 93,
    mixTemperature: 93,
    pressure: 0,
    profileFrame: 0,
    state: {
      state,
      substate: state,
    },
    steamTemperature: 135,
    targetFlow: 0,
    targetGroupTemperature: 93,
    targetMixTemperature: 93,
    targetPressure: 0,
    timestamp: new Date().toISOString(),
  };
}

describe("visualizerRuntimeStore", () => {
  beforeEach(() => {
    vi.mocked(showVisualizerToast).mockReset();
    visualizerRuntimeStore.getState().reset();
    queryClient.removeQueries({
      queryKey: bridgeQueryKeys.visualizerSettings(getGatewayOrigin()),
    });
  });

  it("shows one toast when a shot ends and visualizer is enabled", () => {
    queryClient.setQueryData(bridgeQueryKeys.visualizerSettings(getGatewayOrigin()), {
      AutoUpload: true,
      Password: "secret",
      Username: "brew-user",
    });

    visualizerRuntimeStore.getState().handleSnapshot(buildSnapshot("idle"));
    visualizerRuntimeStore.getState().handleSnapshot(buildSnapshot("espresso"));
    visualizerRuntimeStore.getState().handleSnapshot(buildSnapshot("idle"));

    expect(showVisualizerToast).toHaveBeenCalledTimes(1);
    expect(showVisualizerToast).toHaveBeenCalledWith("Uploading to Visualizer");
  });

  it("does not show a toast when visualizer is disabled", () => {
    queryClient.setQueryData(bridgeQueryKeys.visualizerSettings(getGatewayOrigin()), {
      AutoUpload: false,
      Password: "secret",
      Username: "brew-user",
    });

    visualizerRuntimeStore.getState().handleSnapshot(buildSnapshot("espresso"));
    visualizerRuntimeStore.getState().handleSnapshot(buildSnapshot("idle"));

    expect(showVisualizerToast).not.toHaveBeenCalled();
  });

  it("does not duplicate toasts across repeated non-espresso snapshots", () => {
    queryClient.setQueryData(bridgeQueryKeys.visualizerSettings(getGatewayOrigin()), {
      AutoUpload: true,
      Password: "secret",
      Username: "brew-user",
    });

    visualizerRuntimeStore.getState().handleSnapshot(buildSnapshot("espresso"));
    visualizerRuntimeStore.getState().handleSnapshot(buildSnapshot("idle"));
    visualizerRuntimeStore.getState().handleSnapshot(buildSnapshot("idle"));

    expect(showVisualizerToast).toHaveBeenCalledTimes(1);
  });
});
