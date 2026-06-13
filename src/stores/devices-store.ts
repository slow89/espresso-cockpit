import { create } from "zustand";

import { createBridgeStream, sendBridgeStreamJson } from "@/bridge/bridge-stream-adapter";
import { BridgeClientError, createBridgeClient } from "@/rest/client";
import { devicesStateSchema, type DeviceSummary, type DevicesConnectionStatus } from "@/rest/types";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { useMachineStore } from "@/stores/machine-store";
import { getScaleDeviceStatus, useScaleStore } from "@/stores/scale-store";

type DevicesConnectionState = "idle" | "connecting" | "live" | "error";

const SCALE_RECONNECT_INTERVAL_MS = 20_000;
let lastScaleReconnectRequestAt: number | null = null;

type DevicesCommand =
  | {
      command: "scan";
      connect?: boolean;
      quick?: boolean;
      scaleOnly?: boolean;
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
  requestScaleReconnect: (options?: { force?: boolean }) => Promise<void>;
  socket: WebSocket | null;
  connect: () => Promise<void>;
  connectDevice: (deviceId: string) => Promise<void>;
  disconnect: () => void;
  disconnectDevice: (deviceId: string) => Promise<void>;
  reset: () => void;
  scan: (options?: { connect?: boolean; quick?: boolean; scaleOnly?: boolean }) => Promise<void>;
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
  sendBridgeStreamJson(socket, command, "Devices stream is not connected");
}

function hasConnectedScale() {
  return getScaleDeviceStatus(useScaleStore.getState().scaleMessage) === "connected";
}

function hasConnectedMachine() {
  if (useMachineStore.getState().liveConnection === "live") {
    return true;
  }

  return useDevicesStore
    .getState()
    .devices.some((device) => device.type === "machine" && device.state === "connected");
}

function shouldRequestScaleReconnect(options?: { force?: boolean }) {
  const devicesState = useDevicesStore.getState();

  if (hasConnectedScale()) {
    lastScaleReconnectRequestAt = null;
    return false;
  }

  if (!hasConnectedMachine()) {
    return false;
  }

  if (devicesState.connection !== "live") {
    return false;
  }

  if (devicesState.scanning) {
    return false;
  }

  if (
    !options?.force &&
    lastScaleReconnectRequestAt !== null &&
    Date.now() - lastScaleReconnectRequestAt < SCALE_RECONNECT_INTERVAL_MS
  ) {
    return false;
  }

  return true;
}

function evaluateDevicesRuntime() {
  if (!shouldRequestScaleReconnect()) {
    return;
  }

  void useDevicesStore.getState().requestScaleReconnect();
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
      const stream = createBridgeStream({
        createSocket: () => getClient().createDevicesSocket(),
        handlers: {
          onClose: () => {
            set((state) => ({
              connection: "idle",
              connectionStatus: state.socket === stream.socket ? null : state.connectionStatus,
              devices: state.socket === stream.socket ? [] : state.devices,
              scanning: state.socket === stream.socket ? false : state.scanning,
              socket: state.socket === stream.socket ? null : state.socket,
            }));
          },
          onError: () => {
            set({
              connection: "error",
              error: "Live devices stream failed",
            });
          },
          onInvalidMessage: (error) => {
            set({
              connection: "error",
              error: error.message,
            });
          },
          onMessage: (devicesState) => {
            set({
              connection: "live",
              connectionStatus: devicesState.connectionStatus ?? null,
              devices: devicesState.devices,
              error: null,
              scanning: devicesState.scanning,
            });

            if (hasConnectedScale()) {
              lastScaleReconnectRequestAt = null;
            }
          },
          onOpen: () => {
            lastScaleReconnectRequestAt = null;
            set({
              connection: "live",
              error: null,
            });
          },
        },
        schema: devicesStateSchema,
        sendErrorMessage: "Devices stream is not connected",
      });

      set({
        connection: "connecting",
        connectionStatus: null,
        devices: [],
        error: null,
        scanning: false,
        socket: stream.socket,
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

    lastScaleReconnectRequestAt = null;

    set({
      connection: "idle",
      connectionStatus: null,
      devices: [],
      error: null,
      scanning: false,
      socket: null,
    });
  },
  async requestScaleReconnect(options) {
    if (!shouldRequestScaleReconnect(options)) {
      return;
    }

    try {
      sendDevicesCommand(get().socket, {
        command: "scan",
        connect: true,
        scaleOnly: true,
      });

      lastScaleReconnectRequestAt = Date.now();

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
        scaleOnly: options?.scaleOnly,
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
      state.scanning === previousState.scanning &&
      state.devices === previousState.devices
    ) {
      return;
    }

    evaluateDevicesRuntime();
  });

  const unsubscribeScale = useScaleStore.subscribe((state, previousState) => {
    if (
      state.scaleConnection === previousState.scaleConnection &&
      getScaleDeviceStatus(state.scaleMessage) === getScaleDeviceStatus(previousState.scaleMessage)
    ) {
      return;
    }

    evaluateDevicesRuntime();
  });

  const unsubscribeMachine = useMachineStore.subscribe((state, previousState) => {
    if (state.liveConnection === previousState.liveConnection) {
      return;
    }

    evaluateDevicesRuntime();
  });

  const intervalId = window.setInterval(() => {
    evaluateDevicesRuntime();
  }, SCALE_RECONNECT_INTERVAL_MS);

  evaluateDevicesRuntime();

  cleanupDevicesRuntime = () => {
    unsubscribeDevices();
    unsubscribeScale();
    unsubscribeMachine();
    window.clearInterval(intervalId);
    cleanupDevicesRuntime = null;
  };

  return cleanupDevicesRuntime;
}
