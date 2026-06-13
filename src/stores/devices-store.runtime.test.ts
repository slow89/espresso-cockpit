import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { initializeDevicesStoreRuntime, useDevicesStore } from "@/stores/devices-store";
import { useMachineStore } from "@/stores/machine-store";
import { useScaleStore } from "@/stores/scale-store";

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
      requestScaleReconnect: vi.fn(async () => undefined),
      reset: vi.fn(() => undefined),
      scan: vi.fn(async () => undefined),
      scanning: false,
      socket: null,
    });
    useMachineStore.setState({
      error: null,
      liveConnection: "idle",
      machineSocket: null,
      telemetry: [],
      timeToReady: null,
      timeToReadySocket: null,
      waterConnection: "idle",
      waterLevels: null,
      waterSocket: null,
    });
    useScaleStore.setState({
      error: null,
      scaleConnection: "idle",
      scaleMessage: null,
      scaleSocket: null,
    });
  });

  it("retries scale-only reconnect every 20 seconds while the scale stays disconnected", () => {
    vi.useFakeTimers();
    const requestScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestScaleReconnect")
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

    expect(requestScaleReconnectSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20_000);

    expect(requestScaleReconnectSpy).toHaveBeenCalledTimes(2);
  });

  it("requests a bridge-managed scale-only reconnect scan when the machine is connected without a connected scale", () => {
    const requestScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestScaleReconnect")
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

    expect(requestScaleReconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("requests scale reconnect when the machine stream is live before the devices row updates", () => {
    const requestScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestScaleReconnect")
      .mockResolvedValue(undefined);

    useDevicesStore.setState({
      connection: "live",
      devices: [],
    });

    cleanupRuntime = initializeDevicesStoreRuntime();

    expect(requestScaleReconnectSpy).not.toHaveBeenCalled();

    useMachineStore.setState({
      liveConnection: "live",
    });

    expect(requestScaleReconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("does not let connection status phase block scale reconnect", () => {
    const requestScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestScaleReconnect")
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

    expect(requestScaleReconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("does not request scale reconnect while the devices stream is scanning", () => {
    const requestScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestScaleReconnect")
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

    expect(requestScaleReconnectSpy).not.toHaveBeenCalled();
  });

  it("requests scale reconnect after the scan flag clears even if the phase is stale", () => {
    const requestScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestScaleReconnect")
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

    expect(requestScaleReconnectSpy).not.toHaveBeenCalled();

    useDevicesStore.setState({
      scanning: false,
    });

    expect(requestScaleReconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("does not request scale reconnect without a connected machine", () => {
    const requestScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestScaleReconnect")
      .mockResolvedValue(undefined);

    cleanupRuntime = initializeDevicesStoreRuntime();

    useDevicesStore.setState({
      connection: "live",
      devices: [],
    });

    expect(requestScaleReconnectSpy).not.toHaveBeenCalled();
  });

  it("stops retrying once a scale connects", () => {
    vi.useFakeTimers();
    const requestScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestScaleReconnect")
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

    expect(requestScaleReconnectSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20_000);

    expect(requestScaleReconnectSpy).toHaveBeenCalledTimes(2);

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
    useScaleStore.setState({
      scaleConnection: "live",
      scaleMessage: {
        status: "connected",
      },
    });

    const callsAfterScaleConnect = requestScaleReconnectSpy.mock.calls.length;

    vi.advanceTimersByTime(40_000);

    expect(requestScaleReconnectSpy).toHaveBeenCalledTimes(callsAfterScaleConnect);
  });

  it("keeps retrying when the devices list has a stale connected scale without scale stream proof", () => {
    vi.useFakeTimers();
    const requestScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestScaleReconnect")
      .mockResolvedValue(undefined);

    useScaleStore.setState({
      scaleConnection: "live",
      scaleMessage: null,
    });

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
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
    });
    const callsAfterStaleScaleRow = requestScaleReconnectSpy.mock.calls.length;
    expect(callsAfterStaleScaleRow).toBeGreaterThan(0);

    vi.advanceTimersByTime(20_000);

    expect(requestScaleReconnectSpy.mock.calls.length).toBeGreaterThan(callsAfterStaleScaleRow);
  });

  it("requests scale reconnect when the scale stream reports disconnected", () => {
    const requestScaleReconnectSpy = vi
      .spyOn(useDevicesStore.getState(), "requestScaleReconnect")
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
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
    });
    useScaleStore.setState({
      scaleConnection: "live",
      scaleMessage: {
        status: "connected",
      },
    });

    const callsAfterConnectedProof = requestScaleReconnectSpy.mock.calls.length;

    useScaleStore.setState({
      scaleMessage: {
        status: "disconnected",
      },
    });

    expect(requestScaleReconnectSpy.mock.calls.length).toBeGreaterThan(callsAfterConnectedProof);
  });

  it("does not connect or disconnect the scale feed when scale device rows change", () => {
    const connectScaleSpy = vi
      .spyOn(useScaleStore.getState(), "connectScale")
      .mockResolvedValue(undefined);
    const disconnectScaleSpy = vi
      .spyOn(useScaleStore.getState(), "disconnectScale")
      .mockImplementation(() => undefined);

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

    useDevicesStore.setState({
      devices: [],
    });

    expect(connectScaleSpy).not.toHaveBeenCalled();
    expect(disconnectScaleSpy).not.toHaveBeenCalled();
  });
});
