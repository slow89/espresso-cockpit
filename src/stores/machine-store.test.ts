import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { dashboardUiDefaultState, useDashboardUiStore } from "@/stores/dashboard-ui-store";
import { useScaleStore } from "@/stores/scale-store";

import { useMachineStore } from "./machine-store";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = 0;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({} as CloseEvent);
  }

  emitMessage(data: unknown) {
    this.onmessage?.({
      data: JSON.stringify(data),
    } as MessageEvent);
  }

  emitRawMessage(data: string) {
    this.onmessage?.({
      data,
    } as MessageEvent);
  }

  emitOpen() {
    this.readyState = 1;
    this.onopen?.({} as Event);
  }
}

describe("useMachineStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T20:00:00.000Z"));
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);

    useBridgeConfigStore.setState({
      gatewayUrl: "http://bridge.local:8080",
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
    useDashboardUiStore.setState({
      ...dashboardUiDefaultState,
    });
    useScaleStore.setState({
      error: null,
      scaleConnection: "idle",
      scaleMessage: null,
      scaleSocket: null,
    });
  });

  it("connects the machine, water, and scale streams and stores incoming telemetry", async () => {
    await useMachineStore.getState().connectLive();
    await useScaleStore.getState().connectScale();

    expect(MockWebSocket.instances.map((socket) => socket.url)).toEqual([
      "ws://bridge.local:8080/ws/v1/machine/snapshot",
      "ws://bridge.local:8080/ws/v1/plugins/time-to-ready.reaplugin/timeToReady",
      "ws://bridge.local:8080/ws/v1/machine/waterLevels",
      "ws://bridge.local:8080/ws/v1/scale/snapshot",
    ]);

    MockWebSocket.instances[0]?.emitOpen();
    MockWebSocket.instances[2]?.emitOpen();
    MockWebSocket.instances[3]?.emitOpen();
    MockWebSocket.instances[1]?.emitMessage({
      currentTemp: 90,
      remainingTimeMs: null,
      status: "insufficient_data",
      targetTemp: 93,
      timestamp: 1_743_194_400_000,
    });
    MockWebSocket.instances[0]?.emitMessage({
      flow: 2.4,
      groupTemperature: 93,
      mixTemperature: 93,
      pressure: 8.8,
      profileFrame: 2,
      state: {
        state: "espresso",
        substate: "pouring",
      },
      steamTemperature: 135,
      targetFlow: 0,
      targetGroupTemperature: 93,
      targetMixTemperature: 93,
      targetPressure: 0,
      timestamp: "2026-03-28T20:00:08.000Z",
    });
    MockWebSocket.instances[2]?.emitMessage({
      currentLevel: 48,
      refillLevel: 25,
    });
    MockWebSocket.instances[3]?.emitMessage({
      status: "connected",
    });
    MockWebSocket.instances[3]?.emitMessage({
      batteryLevel: 82,
      timerValue: 8,
      timestamp: "2026-03-28T20:00:08.000Z",
      weight: 15.4,
      weightFlow: 1.2,
    });

    expect(useMachineStore.getState()).toMatchObject({
      liveConnection: "live",
      waterConnection: "live",
      waterLevels: {
        currentLevel: 48,
        refillLevel: 25,
      },
      timeToReady: {
        currentTemp: 90,
        remainingTimeMs: null,
        status: "insufficient_data",
        targetTemp: 93,
        timestamp: 1_743_194_400_000,
      },
    });
    expect(useScaleStore.getState()).toMatchObject({
      scaleConnection: "live",
      scaleMessage: {
        batteryLevel: 82,
        timerValue: 8,
        timestamp: "2026-03-28T20:00:08.000Z",
        weight: 15.4,
        weightFlow: 1.2,
      },
    });
    expect(useMachineStore.getState().telemetry.at(-1)).toMatchObject({
      pressure: 8.8,
      state: "espresso",
      substate: "pouring",
      weight: 15.4,
      weightFlow: 1.2,
    });
  });

  it("captures a frozen post-shot summary when a meaningful shot ends", async () => {
    await useMachineStore.getState().connectLive();

    MockWebSocket.instances[0]?.emitOpen();
    MockWebSocket.instances[0]?.emitMessage({
      flow: 0,
      groupTemperature: 93,
      mixTemperature: 93,
      pressure: 0,
      profileFrame: 0,
      state: {
        state: "espresso",
        substate: "preparingForShot",
      },
      steamTemperature: 135,
      targetFlow: 0,
      targetGroupTemperature: 93,
      targetMixTemperature: 93,
      targetPressure: 0,
      timestamp: "2026-03-28T20:00:00.000Z",
    });
    MockWebSocket.instances[0]?.emitMessage({
      flow: 2.4,
      groupTemperature: 93,
      mixTemperature: 93,
      pressure: 8.8,
      profileFrame: 2,
      state: {
        state: "espresso",
        substate: "pouring",
      },
      steamTemperature: 135,
      targetFlow: 0,
      targetGroupTemperature: 93,
      targetMixTemperature: 93,
      targetPressure: 0,
      timestamp: "2026-03-28T20:00:06.000Z",
    });
    MockWebSocket.instances[0]?.emitMessage({
      flow: 0,
      groupTemperature: 93,
      mixTemperature: 93,
      pressure: 0,
      profileFrame: 0,
      state: {
        state: "idle",
        substate: "idle",
      },
      steamTemperature: 135,
      targetFlow: 0,
      targetGroupTemperature: 93,
      targetMixTemperature: 93,
      targetPressure: 0,
      timestamp: "2026-03-28T20:00:07.000Z",
    });

    expect(useDashboardUiStore.getState().postShotSummary).toMatchObject({
      endedAt: "2026-03-28T20:00:06.000Z",
      startedAt: "2026-03-28T20:00:00.000Z",
      telemetry: [
        expect.objectContaining({ state: "espresso", substate: "preparingForShot" }),
        expect.objectContaining({ state: "espresso", substate: "pouring" }),
      ],
    });
  });

  it("clears a captured post-shot summary when the machine enters sleeping state", async () => {
    await useMachineStore.getState().connectLive();

    MockWebSocket.instances[0]?.emitOpen();
    MockWebSocket.instances[0]?.emitMessage({
      flow: 0,
      groupTemperature: 93,
      mixTemperature: 93,
      pressure: 0,
      profileFrame: 0,
      state: { state: "espresso", substate: "preparingForShot" },
      steamTemperature: 135,
      targetFlow: 0,
      targetGroupTemperature: 93,
      targetMixTemperature: 93,
      targetPressure: 0,
      timestamp: "2026-03-28T20:00:00.000Z",
    });
    MockWebSocket.instances[0]?.emitMessage({
      flow: 2.4,
      groupTemperature: 93,
      mixTemperature: 93,
      pressure: 8.8,
      profileFrame: 2,
      state: { state: "espresso", substate: "pouring" },
      steamTemperature: 135,
      targetFlow: 0,
      targetGroupTemperature: 93,
      targetMixTemperature: 93,
      targetPressure: 0,
      timestamp: "2026-03-28T20:00:06.000Z",
    });
    MockWebSocket.instances[0]?.emitMessage({
      flow: 0,
      groupTemperature: 93,
      mixTemperature: 93,
      pressure: 0,
      profileFrame: 0,
      state: { state: "idle", substate: "idle" },
      steamTemperature: 135,
      targetFlow: 0,
      targetGroupTemperature: 93,
      targetMixTemperature: 93,
      targetPressure: 0,
      timestamp: "2026-03-28T20:00:07.000Z",
    });

    expect(useDashboardUiStore.getState().postShotSummary).not.toBeNull();

    MockWebSocket.instances[0]?.emitMessage({
      flow: 0,
      groupTemperature: 60,
      mixTemperature: 60,
      pressure: 0,
      profileFrame: 0,
      state: { state: "sleeping", substate: "idle" },
      steamTemperature: 60,
      targetFlow: 0,
      targetGroupTemperature: 93,
      targetMixTemperature: 93,
      targetPressure: 0,
      timestamp: "2026-03-28T20:05:00.000Z",
    });

    expect(useDashboardUiStore.getState().postShotSummary).toBeNull();
  });

  it("marks the live machine stream as errored when it receives malformed payloads", async () => {
    await useMachineStore.getState().connectLive();

    MockWebSocket.instances[0]?.emitOpen();
    MockWebSocket.instances[0]?.emitMessage({
      state: "bad-payload",
      timestamp: "2026-03-28T20:00:00.000Z",
    });

    expect(useMachineStore.getState().liveConnection).toBe("error");
    expect(useMachineStore.getState().error).toContain("state");
  });

  it("clears time-to-ready without changing the live machine connection when the plugin stream is malformed", async () => {
    await useMachineStore.getState().connectLive();

    useMachineStore.setState({
      timeToReady: {
        currentTemp: 90,
        remainingTimeMs: null,
        status: "insufficient_data",
        targetTemp: 93,
        timestamp: 1_743_194_400_000,
      },
    });

    MockWebSocket.instances[0]?.emitOpen();
    MockWebSocket.instances[1]?.emitMessage({
      status: "not-a-real-status",
    });

    expect(useMachineStore.getState()).toMatchObject({
      liveConnection: "live",
      timeToReady: null,
    });
  });

  it("marks the water stream as errored when it receives malformed payloads", async () => {
    await useMachineStore.getState().connectLive();

    MockWebSocket.instances[2]?.emitOpen();
    MockWebSocket.instances[2]?.emitMessage({
      currentLevel: "full",
    });

    expect(useMachineStore.getState()).toMatchObject({
      waterConnection: "error",
      waterLevels: null,
    });
  });

  it("does not run close handlers when disconnecting live streams explicitly", async () => {
    await useMachineStore.getState().connectLive();

    const machineSocket = MockWebSocket.instances[0];
    const timeToReadySocket = MockWebSocket.instances[1];
    const waterSocket = MockWebSocket.instances[2];

    const machineCloseSpy = vi.spyOn(machineSocket!, "close");
    const timeToReadyCloseSpy = vi.spyOn(timeToReadySocket!, "close");
    const waterCloseSpy = vi.spyOn(waterSocket!, "close");

    useMachineStore.getState().disconnectLive();

    expect(machineCloseSpy).toHaveBeenCalled();
    expect(timeToReadyCloseSpy).toHaveBeenCalled();
    expect(waterCloseSpy).toHaveBeenCalled();
    expect(useMachineStore.getState()).toMatchObject({
      liveConnection: "idle",
      machineSocket: null,
      timeToReadySocket: null,
      waterConnection: "idle",
      waterSocket: null,
    });
  });
});
