import { create } from "zustand";

import { BridgeClientError, createBridgeClient } from "@/rest/client";
import { devicesStateSchema, type DeviceSummary, type DevicesConnectionStatus } from "@/rest/types";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { useMachineStore } from "@/stores/machine-store";

type DevicesConnectionState = "idle" | "connecting" | "live" | "error";

const AUTO_CONNECT_INTERVAL_MS = 3000;
let lastAutoConnectRequestAt = 0;

type DevicesCommand =
  | {
      command: "scan";
      connect?: boolean;
      quick?: boolean;
    }
  | {
      command: "connect" | "disconnect";
      deviceId: string;
    };

interface DevicesStoreState {
  connection: DevicesConnectionState;
  connectionStatus: DevicesConnectionStatus | null;
  devices: DeviceSummary[];
  error: string | null;
  scanning: boolean;
  requestAutoConnect: () => Promise<void>;
  socket: WebSocket | null;
  connect: () => Promise<void>;
  connectDevice: (deviceId: string) => Promise<void>;
  disconnect: () => void;
  disconnectDevice: (deviceId: string) => Promise<void>;
  reset: () => void;
  scan: (options?: { connect?: boolean; quick?: boolean }) => Promise<void>;
}

function getClient() {
  return createBridgeClient(useBridgeConfigStore.getState().gatewayUrl);
}

function getErrorMessage(error: unknown) {
  if (error instanceof BridgeClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected bridge error";
}

function sendDevicesCommand(socket: WebSocket | null, command: DevicesCommand) {
  if (socket == null || socket.readyState !== 1) {
    throw new BridgeClientError("Devices stream is not connected");
  }

  socket.send(JSON.stringify(command));
}

function getConnectedScaleId() {
  return (
    useDevicesStore
      .getState()
      .devices.find((device) => device.type === "scale" && device.state === "connected")?.id ?? null
  );
}

function shouldRequestAutoConnect() {
  const devicesState = useDevicesStore.getState();
  const machineState = useMachineStore.getState();
  const devicesPhase = devicesState.connectionStatus?.phase ?? null;

  if (getConnectedScaleId()) {
    return false;
  }

  if (devicesState.connection !== "live" || machineState.liveConnection !== "live") {
    return false;
  }

  if (devicesState.scanning || (devicesPhase !== "idle" && devicesPhase !== "ready")) {
    return false;
  }

  if (Date.now() - lastAutoConnectRequestAt < AUTO_CONNECT_INTERVAL_MS) {
    return false;
  }

  return true;
}

function syncScaleFeed() {
  const machineState = useMachineStore.getState();
  const connectedScaleId = getConnectedScaleId();

  if (!connectedScaleId) {
    machineState.disconnectScale();
    return;
  }

  if (machineState.scaleConnection === "connecting" || machineState.scaleConnection === "live") {
    return;
  }

  void machineState.connectScale();
}

function evaluateDevicesRuntime() {
  syncScaleFeed();

  if (!shouldRequestAutoConnect()) {
    return;
  }

  void useDevicesStore.getState().requestAutoConnect();
}

export const useDevicesStore = create<DevicesStoreState>((set, get) => ({
  connection: "idle",
  connectionStatus: null,
  devices: [],
  error: null,
  scanning: false,
  socket: null,
  async connect() {
    get().disconnect();

    try {
      const socket = getClient().createDevicesSocket();

      socket.onopen = () => {
        lastAutoConnectRequestAt = 0;
        set({
          connection: "live",
          error: null,
        });
      };

      socket.onmessage = (event) => {
        const parsed = devicesStateSchema.safeParse(JSON.parse(event.data));

        if (!parsed.success) {
          set({
            connection: "error",
            error: parsed.error.message,
          });
          return;
        }

        set({
          connection: "live",
          connectionStatus: parsed.data.connectionStatus ?? null,
          devices: parsed.data.devices,
          error: null,
          scanning: parsed.data.scanning,
        });

        if (
          parsed.data.devices.some(
            (device) => device.type === "scale" && device.state === "connected",
          )
        ) {
          lastAutoConnectRequestAt = 0;
        }
      };

      socket.onerror = () => {
        set({
          connection: "error",
          error: "Live devices stream failed",
        });
      };

      socket.onclose = () => {
        set((state) => ({
          connection: "idle",
          connectionStatus: state.socket === socket ? null : state.connectionStatus,
          devices: state.socket === socket ? [] : state.devices,
          scanning: state.socket === socket ? false : state.scanning,
          socket: state.socket === socket ? null : state.socket,
        }));
      };

      set({
        connection: "connecting",
        connectionStatus: null,
        devices: [],
        error: null,
        scanning: false,
        socket,
      });
    } catch (error) {
      set({
        connection: "error",
        connectionStatus: null,
        devices: [],
        error: getErrorMessage(error),
        scanning: false,
      });
    }
  },
  async connectDevice(deviceId) {
    try {
      sendDevicesCommand(get().socket, {
        command: "connect",
        deviceId,
      });

      set({
        error: null,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
    }
  },
  disconnect() {
    const socket = get().socket;

    if (socket) {
      socket.onclose = null;
      socket.close();
    }

    lastAutoConnectRequestAt = 0;

    set({
      connection: "idle",
      connectionStatus: null,
      devices: [],
      error: null,
      scanning: false,
      socket: null,
    });
  },
  async requestAutoConnect() {
    if (!shouldRequestAutoConnect()) {
      return;
    }

    try {
      sendDevicesCommand(get().socket, {
        command: "scan",
        connect: true,
      });

      lastAutoConnectRequestAt = Date.now();

      set({
        error: null,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
    }
  },
  async disconnectDevice(deviceId) {
    try {
      sendDevicesCommand(get().socket, {
        command: "disconnect",
        deviceId,
      });

      set({
        error: null,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
    }
  },
  reset() {
    get().disconnect();
  },
  async scan(options) {
    try {
      sendDevicesCommand(get().socket, {
        command: "scan",
        connect: options?.connect,
        quick: options?.quick,
      });

      set({
        error: null,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
    }
  },
}));

export const devicesStore = useDevicesStore;

let cleanupDevicesRuntime: (() => void) | null = null;

export function initializeDevicesStoreRuntime() {
  if (cleanupDevicesRuntime) {
    return cleanupDevicesRuntime;
  }

  const unsubscribeDevices = useDevicesStore.subscribe((state, previousState) => {
    if (
      state.connection === previousState.connection &&
      state.connectionStatus?.phase === previousState.connectionStatus?.phase &&
      state.scanning === previousState.scanning &&
      state.devices === previousState.devices
    ) {
      return;
    }

    evaluateDevicesRuntime();
  });

  const unsubscribeMachine = useMachineStore.subscribe((state, previousState) => {
    if (
      state.liveConnection === previousState.liveConnection &&
      state.scaleConnection === previousState.scaleConnection
    ) {
      return;
    }

    evaluateDevicesRuntime();
  });

  const intervalId = window.setInterval(() => {
    evaluateDevicesRuntime();
  }, AUTO_CONNECT_INTERVAL_MS);

  evaluateDevicesRuntime();

  cleanupDevicesRuntime = () => {
    unsubscribeDevices();
    unsubscribeMachine();
    window.clearInterval(intervalId);
    cleanupDevicesRuntime = null;
  };

  return cleanupDevicesRuntime;
}
