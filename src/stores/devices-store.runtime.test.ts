import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryClient } from "@/rest/query-client";
import { bridgeQueryKeys, getGatewayOrigin } from "@/rest/queries";
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
    queryClient.clear();
    useBridgeConfigStore.setState({
      gatewayUrl: "http://bridge.local:8080",
    });
    queryClient.setQueryData(bridgeQueryKeys.settings(getGatewayOrigin()), {
      preferredScaleId: "scale-1",
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
      requestPreferredScaleReconnect: vi.fn(async () => undefined),
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

  it("retries preferred scale reconnect every 5 seconds while the scale stays unpaired", () => {
    vi.useFakeTimers();
    const requestPreferredScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestPreferredScaleReconnect")
      .mockResolvedValue(undefined);

    cleanupRuntime = initializeDevicesStoreRuntime();

    useDevicesStore.setState({
      connection: "live",
      devices: [
        {
          id: "machine-1",
          name: "DE1",
          state: "connected",
          type: "machine",
        },
      ],
    });

    expect(requestPreferredScaleReconnectSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);

    expect(requestPreferredScaleReconnectSpy).toHaveBeenCalledTimes(2);
  });

  it("requests a bridge-managed preferred scale reconnect scan when the machine is connected without a connected scale", () => {
    const requestPreferredScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestPreferredScaleReconnect")
      .mockResolvedValue(undefined);

    cleanupRuntime = initializeDevicesStoreRuntime();

    useDevicesStore.setState({
      connection: "live",
      devices: [
        {
          id: "machine-1",
          name: "DE1",
          state: "connected",
          type: "machine",
        },
      ],
    });

    expect(requestPreferredScaleReconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("does not retry while the bridge reports an active connection phase", () => {
    vi.useFakeTimers();
    const requestPreferredScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestPreferredScaleReconnect")
      .mockResolvedValue(undefined);

    useDevicesStore.setState({
      connection: "live",
      connectionStatus: {
        error: null,
        foundMachines: [],
        foundScales: [],
        pendingAmbiguity: null,
        phase: "connectingScale",
      },
      devices: [
        {
          id: "machine-1",
          name: "DE1",
          state: "connected",
          type: "machine",
        },
      ],
      scanning: false,
    });

    cleanupRuntime = initializeDevicesStoreRuntime();

    expect(requestPreferredScaleReconnectSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    expect(requestPreferredScaleReconnectSpy).not.toHaveBeenCalled();
  });

  it("does not request preferred scale reconnect while the devices stream is scanning", () => {
    const requestPreferredScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestPreferredScaleReconnect")
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
      devices: [
        {
          id: "machine-1",
          name: "DE1",
          state: "connected",
          type: "machine",
        },
      ],
      scanning: true,
    });

    cleanupRuntime = initializeDevicesStoreRuntime();

    expect(requestPreferredScaleReconnectSpy).not.toHaveBeenCalled();
  });

  it("does not request preferred scale reconnect without a connected machine", () => {
    const requestPreferredScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestPreferredScaleReconnect")
      .mockResolvedValue(undefined);

    cleanupRuntime = initializeDevicesStoreRuntime();

    useDevicesStore.setState({
      connection: "live",
      devices: [],
    });

    expect(requestPreferredScaleReconnectSpy).not.toHaveBeenCalled();
  });

  it("stops retrying once a scale connects", () => {
    vi.useFakeTimers();
    const requestPreferredScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestPreferredScaleReconnect")
      .mockResolvedValue(undefined);

    cleanupRuntime = initializeDevicesStoreRuntime();

    useDevicesStore.setState({
      connection: "live",
      devices: [
        {
          id: "machine-1",
          name: "DE1",
          state: "connected",
          type: "machine",
        },
      ],
    });

    expect(requestPreferredScaleReconnectSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);

    expect(requestPreferredScaleReconnectSpy).toHaveBeenCalledTimes(2);

    useDevicesStore.setState({
      devices: [
        {
          id: "machine-1",
          name: "DE1",
          state: "connected",
          type: "machine",
        },
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
    });

    vi.advanceTimersByTime(10000);

    expect(requestPreferredScaleReconnectSpy).toHaveBeenCalledTimes(2);
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
