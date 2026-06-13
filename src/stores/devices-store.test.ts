import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { useMachineStore } from "@/stores/machine-store";
import { useScaleStore } from "@/stores/scale-store";

import { useDevicesStore } from "./devices-store";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = 0;
  sent: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({} as CloseEvent);
  }

  send(data: string) {
    this.sent.push(data);
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

describe("useDevicesStore", () => {
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
    useMachineStore.setState({
      error: null,
      liveConnection: "live",
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

    useDevicesStore.getState().reset();
  });

  it("connects to the devices stream and stores the latest snapshot", async () => {
    await useDevicesStore.getState().connect();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toBe("ws://bridge.local:8080/ws/v1/devices");

    MockWebSocket.instances[0]?.emitOpen();
    MockWebSocket.instances[0]?.emitMessage({
      connectionStatus: {
        error: null,
        foundMachines: [],
        foundScales: [],
        pendingAmbiguity: null,
        phase: "ready",
      },
      devices: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
      scanning: false,
      timestamp: "2026-04-04T00:00:00.000Z",
    });

    expect(useDevicesStore.getState()).toMatchObject({
      connection: "live",
      devices: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
      scanning: false,
    });
  });

  it("sends device commands through the devices socket", async () => {
    await useDevicesStore.getState().connect();
    MockWebSocket.instances[0]?.emitOpen();

    await useDevicesStore.getState().scan({ connect: false });
    await useDevicesStore.getState().connectDevice("scale-1");
    await useDevicesStore.getState().disconnectDevice("scale-1");

    expect(MockWebSocket.instances[0]?.sent).toEqual([
      JSON.stringify({
        command: "scan",
        connect: false,
        quick: undefined,
      }),
      JSON.stringify({
        command: "connect",
        deviceId: "scale-1",
      }),
      JSON.stringify({
        command: "disconnect",
        deviceId: "scale-1",
      }),
    ]);
  });

  it("requests one immediate bridge-managed scale-only reconnect scan through the devices socket", async () => {
    await useDevicesStore.getState().connect();
    MockWebSocket.instances[0]?.emitOpen();
    MockWebSocket.instances[0]?.emitMessage({
      connectionStatus: {
        error: null,
        foundMachines: [],
        foundScales: [],
        pendingAmbiguity: null,
        phase: "idle",
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
      timestamp: "2026-04-04T00:00:00.000Z",
    });

    await useDevicesStore.getState().requestScaleReconnect();
    await useDevicesStore.getState().requestScaleReconnect();

    expect(MockWebSocket.instances[0]?.sent).toEqual([
      JSON.stringify({
        command: "scan",
        connect: true,
        scaleOnly: true,
      }),
    ]);

    MockWebSocket.instances[0]?.emitMessage({
      connectionStatus: {
        error: null,
        foundMachines: [],
        foundScales: [],
        pendingAmbiguity: null,
        phase: "ready",
      },
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
      scanning: false,
      timestamp: "2026-04-04T00:00:00.000Z",
    });
  });
});
