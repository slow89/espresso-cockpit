import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { useBridgeConfigStore } from "@/stores/bridge-config-store";

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
      lastScaleReconnectAttemptAt: null,
      liveConnection: "idle",
      machineSocket: null,
      scaleConnection: "idle",
      scaleSnapshot: null,
      scaleSocket: null,
      telemetry: [],
      waterConnection: "idle",
      waterLevels: null,
      waterSocket: null,
    });
  });

  it("connects the machine, water, and scale streams and stores incoming telemetry", async () => {
    await useMachineStore.getState().connectLive();

    expect(MockWebSocket.instances.map((socket) => socket.url)).toEqual([
      "ws://bridge.local:8080/ws/v1/machine/snapshot",
      "ws://bridge.local:8080/ws/v1/machine/waterLevels",
      "ws://bridge.local:8080/ws/v1/scale/snapshot",
    ]);

    MockWebSocket.instances[0]?.emitOpen();
    MockWebSocket.instances[1]?.emitOpen();
    MockWebSocket.instances[2]?.emitOpen();
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
    MockWebSocket.instances[1]?.emitMessage({
      currentLevel: 48,
      refillLevel: 25,
    });
    MockWebSocket.instances[2]?.emitMessage({
      batteryLevel: 82,
      timerValue: 8,
      timestamp: "2026-03-28T20:00:08.000Z",
      weight: 15.4,
      weightFlow: 1.2,
    });

    expect(useMachineStore.getState()).toMatchObject({
      liveConnection: "live",
      scaleConnection: "live",
      waterConnection: "live",
      waterLevels: {
        currentLevel: 48,
        refillLevel: 25,
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

  it("throttles preferred-scale reconnect scans", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => [],
      ok: true,
    } as Response);

    useMachineStore.setState({
      lastScaleReconnectAttemptAt: null,
      liveConnection: "live",
      scaleConnection: "idle",
    });

    await useMachineStore.getState().reconnectPreferredScale();
    await useMachineStore.getState().reconnectPreferredScale();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-03-28T20:00:06.000Z"));
    await useMachineStore.getState().reconnectPreferredScale();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
