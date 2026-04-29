import { create } from "zustand";

import { BridgeClientError, createBridgeClient } from "@/rest/client";
import { queryClient } from "@/rest/query-client";
import { bridgeQueryKeys, bridgeSettingsQueryOptions, getGatewayOrigin } from "@/rest/queries";
import {
  devicesStateSchema,
  type BridgeSettings,
  type DeviceSummary,
  type DevicesConnectionStatus,
} from "@/rest/types";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { useMachineStore } from "@/stores/machine-store";

type DevicesConnectionState = "idle" | "connecting" | "live" | "error";

const PREFERRED_SCALE_RECONNECT_INTERVAL_MS = 5000;
const reconnectBlockedPhases = new Set<DevicesConnectionStatus["phase"]>([
  "scanning",
  "connectingMachine",
  "connectingScale",
]);
let lastPreferredScaleReconnectRequestAt = 0;

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
  requestPreferredScaleReconnect: () => Promise<void>;
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

function hasConnectedMachine() {
  return useDevicesStore
    .getState()
    .devices.some((device) => device.type === "machine" && device.state === "connected");
}

function shouldRequestPreferredScaleReconnect() {
  const devicesState = useDevicesStore.getState();

  if (getConnectedScaleId()) {
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
    devicesState.connectionStatus?.phase &&
    reconnectBlockedPhases.has(devicesState.connectionStatus.phase)
  ) {
    return false;
  }

  if (Date.now() - lastPreferredScaleReconnectRequestAt < PREFERRED_SCALE_RECONNECT_INTERVAL_MS) {
    return false;
  }

  return true;
}

async function getPreferredScaleId() {
  const gatewayOrigin = getGatewayOrigin();
  const cachedSettings = queryClient.getQueryData<BridgeSettings>(
    bridgeQueryKeys.settings(gatewayOrigin),
  );

  if (cachedSettings) {
    return cachedSettings.preferredScaleId ?? null;
  }

  try {
    const settings = await queryClient.fetchQuery(bridgeSettingsQueryOptions(gatewayOrigin));
    return settings.preferredScaleId ?? null;
  } catch {
    return null;
  }
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

  if (!shouldRequestPreferredScaleReconnect()) {
    return;
  }

  void useDevicesStore.getState().requestPreferredScaleReconnect();
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
        lastPreferredScaleReconnectRequestAt = 0;
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
          lastPreferredScaleReconnectRequestAt = 0;
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

    lastPreferredScaleReconnectRequestAt = 0;

    set({
      connection: "idle",
      connectionStatus: null,
      devices: [],
      error: null,
      scanning: false,
      socket: null,
    });
  },
  async requestPreferredScaleReconnect() {
    if (!shouldRequestPreferredScaleReconnect()) {
      return;
    }

    const preferredScaleId = await getPreferredScaleId();

    if (!preferredScaleId || !shouldRequestPreferredScaleReconnect()) {
      return;
    }

    try {
      sendDevicesCommand(get().socket, {
        command: "scan",
        connect: true,
      });

      lastPreferredScaleReconnectRequestAt = Date.now();

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
  }, PREFERRED_SCALE_RECONNECT_INTERVAL_MS);

  evaluateDevicesRuntime();

  cleanupDevicesRuntime = () => {
    unsubscribeDevices();
    unsubscribeMachine();
    window.clearInterval(intervalId);
    cleanupDevicesRuntime = null;
  };

  return cleanupDevicesRuntime;
}
