import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBridgeConfigStore } from "@/stores/bridge-config-store";

import { getScaleDeviceStatus, getScaleSnapshot, useScaleStore } from "./scale-store";

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

describe("useScaleStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);

    useBridgeConfigStore.setState({
      gatewayUrl: "http://bridge.local:8080",
    });
    useScaleStore.setState({
      error: null,
      scaleConnection: "idle",
      scaleMessage: null,
      scaleSocket: null,
    });
  });

  it("connects to the scale snapshot stream", async () => {
    await useScaleStore.getState().connectScale();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toBe("ws://bridge.local:8080/ws/v1/scale/snapshot");
    expect(useScaleStore.getState()).toMatchObject({
      scaleConnection: "connecting",
      scaleMessage: null,
      scaleSocket: MockWebSocket.instances[0],
    });
  });

  it("keeps the scale stream open when the bridge emits scale status frames", async () => {
    await useScaleStore.getState().connectScale();

    const scaleSocket = MockWebSocket.instances[0];

    scaleSocket?.emitOpen();
    scaleSocket?.emitMessage({
      status: "connected",
    });

    expect(useScaleStore.getState()).toMatchObject({
      scaleConnection: "live",
      scaleMessage: {
        status: "connected",
      },
      scaleSocket,
    });
    expect(getScaleDeviceStatus(useScaleStore.getState().scaleMessage)).toBe("connected");
    expect(getScaleSnapshot(useScaleStore.getState().scaleMessage)).toBeNull();
    expect(MockWebSocket.instances).toHaveLength(1);

    useScaleStore.setState({
      scaleMessage: {
        batteryLevel: 82,
        timerValue: 8,
        timestamp: "2026-03-28T20:00:08.000Z",
        weight: 15.4,
        weightFlow: 1.2,
      },
    });

    scaleSocket?.emitMessage({
      status: "disconnected",
    });

    expect(useScaleStore.getState()).toMatchObject({
      scaleConnection: "live",
      scaleMessage: {
        status: "disconnected",
      },
      scaleSocket,
    });
    expect(getScaleDeviceStatus(useScaleStore.getState().scaleMessage)).toBe("disconnected");
    expect(getScaleSnapshot(useScaleStore.getState().scaleMessage)).toBeNull();
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("marks the scale device connected when snapshot frames arrive", async () => {
    await useScaleStore.getState().connectScale();

    MockWebSocket.instances[0]?.emitOpen();
    MockWebSocket.instances[0]?.emitMessage({
      batteryLevel: 82,
      timerValue: 8,
      timestamp: "2026-03-28T20:00:08.000Z",
      weight: 15.4,
      weightFlow: 1.2,
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
    expect(getScaleDeviceStatus(useScaleStore.getState().scaleMessage)).toBe("connected");
    expect(getScaleSnapshot(useScaleStore.getState().scaleMessage)).toMatchObject({
      weight: 15.4,
      weightFlow: 1.2,
    });
  });

  it("marks the scale stream as errored when it receives malformed payloads", async () => {
    await useScaleStore.getState().connectScale();

    MockWebSocket.instances[0]?.emitOpen();
    MockWebSocket.instances[0]?.emitMessage({
      status: "not-a-scale-status",
    });

    expect(useScaleStore.getState()).toMatchObject({
      scaleConnection: "error",
      scaleMessage: null,
    });
  });

  it("does not run the scale close handler when disconnecting the scale explicitly", async () => {
    await useScaleStore.getState().connectScale();

    const scaleSocket = MockWebSocket.instances[0];
    const scaleCloseSpy = vi.spyOn(scaleSocket!, "close");

    useScaleStore.setState({
      scaleConnection: "live",
      scaleMessage: {
        batteryLevel: 82,
        timerValue: 8,
        timestamp: "2026-03-28T20:00:08.000Z",
        weight: 15.4,
        weightFlow: 1.2,
      },
    });

    useScaleStore.getState().disconnectScale();

    expect(scaleCloseSpy).toHaveBeenCalled();
    expect(useScaleStore.getState()).toMatchObject({
      scaleConnection: "idle",
      scaleMessage: null,
      scaleSocket: null,
    });
  });
});
