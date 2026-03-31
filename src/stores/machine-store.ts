import { create } from "zustand";

import {
  BridgeClientError,
  createBridgeClient,
} from "@/rest/client";
import { queryClient } from "@/rest/query-client";
import { bridgeQueryKeys } from "@/rest/queries";
import {
  machineWaterLevelsSchema,
  machineSnapshotSchema,
  scaleSnapshotSchema,
  type MachineWaterLevels,
  type MachineStateChange,
  type ScaleSnapshot,
} from "@/rest/types";
import {
  appendTelemetryHistory,
  mergeScaleSnapshotIntoTelemetry,
  type TelemetrySample,
} from "@/lib/telemetry";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { visualizerRuntimeStore } from "@/stores/visualizer-runtime-store";
import { getGatewayOrigin } from "@/rest/queries";

export type LiveConnectionState = "idle" | "connecting" | "live" | "error";

interface MachineState {
  error: string | null;
  lastScaleReconnectAttemptAt: number | null;
  liveConnection: LiveConnectionState;
  machineSocket: WebSocket | null;
  connectScale: () => Promise<void>;
  disconnectScale: () => void;
  reconnectPreferredScale: () => Promise<void>;
  scaleConnection: LiveConnectionState;
  scaleSnapshot: ScaleSnapshot | null;
  scaleSocket: WebSocket | null;
  telemetry: TelemetrySample[];
  waterConnection: LiveConnectionState;
  waterLevels: MachineWaterLevels | null;
  waterSocket: WebSocket | null;
  connectLive: () => Promise<void>;
  disconnectLive: () => void;
  requestState: (nextState: MachineStateChange) => Promise<void>;
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

const preferredScaleReconnectIntervalMs = 5_000;

export const useMachineStore = create<MachineState>((set, get) => ({
  error: null,
  lastScaleReconnectAttemptAt: null,
  liveConnection: "idle",
  machineSocket: null,
  async connectScale() {
    get().disconnectScale();

    try {
      const scaleSocket = getClient().createScaleSnapshotSocket();

      scaleSocket.onopen = () => {
        set({ scaleConnection: "live" });
      };

      scaleSocket.onmessage = (event) => {
        const parsed = scaleSnapshotSchema.safeParse(JSON.parse(event.data));

        if (!parsed.success) {
          set({
            scaleConnection: "error",
            scaleSnapshot: null,
          });
          return;
        }

        set((state) => ({
          scaleConnection: "live",
          scaleSnapshot: parsed.data,
          telemetry: mergeScaleSnapshotIntoTelemetry(state.telemetry, parsed.data),
        }));
      };

      scaleSocket.onerror = () => {
        set({
          scaleConnection: "error",
          scaleSnapshot: null,
        });
      };

      scaleSocket.onclose = () => {
        set((state) => ({
          scaleConnection: "idle",
          scaleSnapshot:
            state.scaleSocket === scaleSocket ? null : state.scaleSnapshot,
          scaleSocket: state.scaleSocket === scaleSocket ? null : state.scaleSocket,
        }));
      };

      set({
        scaleConnection: "connecting",
        scaleSnapshot: null,
        scaleSocket,
      });
    } catch (error) {
      set({
        scaleConnection: "error",
        scaleSnapshot: null,
        error: getErrorMessage(error),
      });
    }
  },
  scaleConnection: "idle",
  scaleSnapshot: null,
  scaleSocket: null,
  telemetry: [],
  waterConnection: "idle",
  waterLevels: null,
  waterSocket: null,
  async connectLive() {
    get().disconnectLive();

    try {
      const client = getClient();
      const machineSocket = client.createMachineSnapshotSocket();
      const waterSocket = client.createMachineWaterLevelsSocket();

      machineSocket.onopen = () => {
        set({ liveConnection: "live", error: null });
      };

      machineSocket.onmessage = (event) => {
        const parsed = machineSnapshotSchema.safeParse(JSON.parse(event.data));

        if (!parsed.success) {
          set({
            liveConnection: "error",
            error: parsed.error.message,
          });
          return;
        }

        const snapshot = parsed.data;
        queryClient.setQueryData(bridgeQueryKeys.machineState(getGatewayOrigin()), snapshot);
        visualizerRuntimeStore.getState().handleSnapshot(snapshot);
        set((state) => ({
          error: null,
          telemetry: appendTelemetryHistory(state.telemetry, snapshot, state.scaleSnapshot),
        }));
      };

      machineSocket.onerror = () => {
        set({
          liveConnection: "error",
          error: "Live machine stream failed",
        });
      };

      machineSocket.onclose = () => {
        set((state) => ({
          machineSocket:
            state.machineSocket === machineSocket ? null : state.machineSocket,
          liveConnection: "idle",
        }));
      };

      waterSocket.onopen = () => {
        set({ waterConnection: "live" });
      };

      waterSocket.onmessage = (event) => {
        const parsed = machineWaterLevelsSchema.safeParse(JSON.parse(event.data));

        if (!parsed.success) {
          set({
            waterConnection: "error",
            waterLevels: null,
          });
          return;
        }

        set({
          waterConnection: "live",
          waterLevels: parsed.data,
        });
      };

      waterSocket.onerror = () => {
        set({
          waterConnection: "error",
          waterLevels: null,
        });
      };

      waterSocket.onclose = () => {
        set((state) => ({
          waterConnection: "idle",
          waterLevels:
            state.waterSocket === waterSocket ? null : state.waterLevels,
          waterSocket: state.waterSocket === waterSocket ? null : state.waterSocket,
        }));
      };

      set({
        liveConnection: "connecting",
        machineSocket,
        waterConnection: "connecting",
        waterSocket,
      });

      await get().connectScale();
    } catch (error) {
      set({
        error: getErrorMessage(error),
        liveConnection: "error",
        scaleConnection: "error",
        waterConnection: "error",
      });
    }
  },
  disconnectLive() {
    const currentMachineSocket = get().machineSocket;
    const currentWaterSocket = get().waterSocket;

    if (currentMachineSocket) {
      currentMachineSocket.onclose = null;
      currentMachineSocket.close();
    }

    if (currentWaterSocket) {
      currentWaterSocket.onclose = null;
      currentWaterSocket.close();
    }

    get().disconnectScale();

    set({
      liveConnection: "idle",
      machineSocket: null,
      telemetry: [],
      waterConnection: "idle",
      waterLevels: null,
      waterSocket: null,
    });
    visualizerRuntimeStore.getState().reset();
  },
  disconnectScale() {
    const currentScaleSocket = get().scaleSocket;

    if (currentScaleSocket) {
      currentScaleSocket.onclose = null;
      currentScaleSocket.close();
    }

    set({
      lastScaleReconnectAttemptAt: null,
      scaleConnection: "idle",
      scaleSnapshot: null,
      scaleSocket: null,
    });
  },
  async reconnectPreferredScale() {
    const now = Date.now();
    const {
      lastScaleReconnectAttemptAt,
      liveConnection,
      scaleConnection,
    } = get();

    if (liveConnection !== "live") {
      return;
    }

    if (scaleConnection === "connecting" || scaleConnection === "live") {
      return;
    }

    if (
      lastScaleReconnectAttemptAt != null &&
      now - lastScaleReconnectAttemptAt < preferredScaleReconnectIntervalMs
    ) {
      return;
    }

    set({
      lastScaleReconnectAttemptAt: now,
    });

    try {
      await getClient().scanDevices({
        quick: true,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
    }
  },
  async requestState(nextState) {
    set({ error: null });

    try {
      await getClient().requestMachineState(nextState);
      await queryClient.invalidateQueries({
        queryKey: bridgeQueryKeys.machineState(getGatewayOrigin()),
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
    }
  },
}));

export const machineStore = useMachineStore;
