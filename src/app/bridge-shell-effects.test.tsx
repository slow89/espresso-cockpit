import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { useDisplayStore } from "@/stores/display-store";
import { useMachineStore } from "@/stores/machine-store";
import { usePresenceStore } from "@/stores/presence-store";

import { BridgeShellEffects } from "./bridge-shell-effects";

const queryMocks = vi.hoisted(() => ({
  useDevicesQuery: vi.fn(),
}));

vi.mock("@/rest/queries", async () => {
  const actual = await vi.importActual<typeof import("@/rest/queries")>("@/rest/queries");

  return {
    ...actual,
    useDevicesQuery: queryMocks.useDevicesQuery,
  };
});

describe("BridgeShellEffects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBridgeConfigStore.setState({
      gatewayUrl: "http://bridge.local:8080",
    });
  });

  it("owns device polling and reconnects the scale feed when a paired scale exists", async () => {
    const connectLiveSpy = vi
      .spyOn(useMachineStore.getState(), "connectLive")
      .mockResolvedValue(undefined);
    const connectScaleSpy = vi
      .spyOn(useMachineStore.getState(), "connectScale")
      .mockResolvedValue(undefined);
    vi.spyOn(useMachineStore.getState(), "disconnectLive").mockImplementation(() => undefined);
    vi.spyOn(useDisplayStore.getState(), "connect").mockResolvedValue(undefined);
    vi.spyOn(useDisplayStore.getState(), "disconnect").mockImplementation(() => undefined);
    vi.spyOn(usePresenceStore.getState(), "signalPresence").mockResolvedValue(undefined);

    queryMocks.useDevicesQuery.mockReturnValue({
      data: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
      error: null,
    });

    render(<BridgeShellEffects />);

    expect(queryMocks.useDevicesQuery).toHaveBeenCalledWith({
      refetchInterval: 2_000,
    });

    await waitFor(() => {
      expect(connectLiveSpy).toHaveBeenCalledTimes(1);
      expect(connectScaleSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("disconnects the scale feed when the bridge no longer reports a paired scale", async () => {
    let devices = [
      {
        id: "scale-1",
        name: "Acaia Lunar",
        state: "connected",
        type: "scale",
      },
    ];

    vi.spyOn(useMachineStore.getState(), "connectLive").mockResolvedValue(undefined);
    vi.spyOn(useMachineStore.getState(), "disconnectLive").mockImplementation(() => undefined);
    vi.spyOn(useDisplayStore.getState(), "connect").mockResolvedValue(undefined);
    vi.spyOn(useDisplayStore.getState(), "disconnect").mockImplementation(() => undefined);
    vi.spyOn(usePresenceStore.getState(), "signalPresence").mockResolvedValue(undefined);
    const disconnectScaleSpy = vi
      .spyOn(useMachineStore.getState(), "disconnectScale")
      .mockImplementation(() => undefined);

    queryMocks.useDevicesQuery.mockImplementation(() => ({
      data: devices,
      error: null,
    }));

    const { rerender } = render(<BridgeShellEffects />);

    devices = [];
    rerender(<BridgeShellEffects />);

    await waitFor(() => {
      expect(disconnectScaleSpy).toHaveBeenCalled();
    });
  });
});
