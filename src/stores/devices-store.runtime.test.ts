import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { initializeDevicesStoreRuntime, useDevicesStore } from "@/stores/devices-store";
import { useMachineStore } from "@/stores/machine-store";

describe("devices store runtime", () => {
  let cleanupRuntime: (() => void) | undefined;

  afterEach(() => {
    cleanupRuntime?.();
    cleanupRuntime = undefined;
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useBridgeConfigStore.setState({
      gatewayUrl: "http://bridge.local:8080",
    });
    useDevicesStore.setState({
      connection: "idle",
      connectionStatus: {
        error: null,
        foundMachines: [],
        foundScales: [],
        pendingAmbiguity: null,
        phase: "idle",
      },
      connect: vi.fn(async () => undefined),
      connectDevice: vi.fn(async () => undefined),
      devices: [],
      disconnect: vi.fn(() => undefined),
      disconnectDevice: vi.fn(async () => undefined),
      error: null,
      requestAutoConnect: vi.fn(async () => undefined),
      reset: vi.fn(() => undefined),
      scan: vi.fn(async () => undefined),
      scanning: false,
      socket: null,
    });
    useMachineStore.setState({
      error: null,
      liveConnection: "idle",
      machineSocket: null,
      scaleConnection: "idle",
      scaleSnapshot: null,
      scaleSocket: null,
      telemetry: [],
      timeToReady: null,
      timeToReadySocket: null,
      waterConnection: "idle",
      waterLevels: null,
      waterSocket: null,
    });
  });

  it("retries auto-connect every 3 seconds while the scale stays unpaired", () => {
    vi.useFakeTimers();
    const requestAutoConnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestAutoConnect")
      .mockResolvedValue(undefined);

    cleanupRuntime = initializeDevicesStoreRuntime();

    useDevicesStore.setState({
      connection: "live",
    });
    useMachineStore.setState({
      liveConnection: "live",
    });

    expect(requestAutoConnectSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3000);

    expect(requestAutoConnectSpy).toHaveBeenCalledTimes(2);
  });

  it("requests a gateway-managed auto-connect scan when both streams are live without a connected scale", () => {
    const requestAutoConnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestAutoConnect")
      .mockResolvedValue(undefined);

    cleanupRuntime = initializeDevicesStoreRuntime();

    useDevicesStore.setState({
      connection: "live",
    });
    useMachineStore.setState({
      liveConnection: "live",
    });

    expect(requestAutoConnectSpy).toHaveBeenCalledTimes(1);
  });

  it("does not request auto-connect while the devices stream is scanning", () => {
    const requestAutoConnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestAutoConnect")
      .mockResolvedValue(undefined);

    useDevicesStore.setState({
      connection: "live",
      connectionStatus: {
        error: null,
        foundMachines: [],
        foundScales: [],
        pendingAmbiguity: null,
        phase: "scanning",
      },
      scanning: true,
    });

    cleanupRuntime = initializeDevicesStoreRuntime();

    useMachineStore.setState({
      liveConnection: "live",
    });

    expect(requestAutoConnectSpy).not.toHaveBeenCalled();
  });

  it("connects the scale feed when a connected scale appears", () => {
    const connectScaleSpy = vi
      .spyOn(useMachineStore.getState(), "connectScale")
      .mockResolvedValue(undefined);

    cleanupRuntime = initializeDevicesStoreRuntime();

    useDevicesStore.setState({
      devices: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
    });

    expect(connectScaleSpy).toHaveBeenCalledTimes(1);
  });

  it("disconnects the scale feed when the connected scale disappears", () => {
    const disconnectScaleSpy = vi
      .spyOn(useMachineStore.getState(), "disconnectScale")
      .mockImplementation(() => undefined);

    useDevicesStore.setState({
      devices: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
    });

    cleanupRuntime = initializeDevicesStoreRuntime();

    useDevicesStore.setState({
      devices: [],
    });

    expect(disconnectScaleSpy).toHaveBeenCalled();
  });
});
