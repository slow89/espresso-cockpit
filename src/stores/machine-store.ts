import { create } from "zustand";

import {
  BridgeClientError,
  createBridgeClient,
} from "@/rest/client";
import { queryClient } from "@/rest/query-client";
import { bridgeQueryKeys } from "@/rest/queries";
import {
  machineSnapshotSchema,
  type MachineStateChange,
} from "@/rest/types";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";

type LiveConnectionState = "idle" | "connecting" | "live" | "error";

interface MachineState {
  error: string | null;
  liveConnection: LiveConnectionState;
  socket: WebSocket | null;
  telemetry: Array<{
    timestamp: string;
    pressure: number;
    flow: number;
    temperature: number;
  }>;
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

export const useMachineStore = create<MachineState>((set, get) => ({
  error: null,
  liveConnection: "idle",
  socket: null,
  telemetry: [],
  async connectLive() {
    get().disconnectLive();

    try {
      const socket = getClient().createMachineSnapshotSocket();

      socket.onopen = () => {
        set({ liveConnection: "live", error: null });
      };

      socket.onmessage = (event) => {
        const parsed = machineSnapshotSchema.safeParse(JSON.parse(event.data));

        if (!parsed.success) {
          set({
            liveConnection: "error",
            error: parsed.error.message,
          });
          return;
        }

        const snapshot = parsed.data;
        queryClient.setQueryData(bridgeQueryKeys.machineState(), snapshot);
        set((state) => ({
          error: null,
          telemetry: [
            ...state.telemetry,
            {
              timestamp: snapshot.timestamp,
              pressure: snapshot.pressure,
              flow: snapshot.flow,
              temperature: snapshot.mixTemperature,
            },
          ].slice(-180),
        }));
      };

      socket.onerror = () => {
        set({
          liveConnection: "error",
          error: "Live machine stream failed",
        });
      };

      socket.onclose = () => {
        set((state) => ({
          socket: state.socket === socket ? null : state.socket,
          liveConnection: "idle",
        }));
      };

      set({
        socket,
        liveConnection: "connecting",
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        liveConnection: "error",
      });
    }
  },
  disconnectLive() {
    const currentSocket = get().socket;

    if (currentSocket) {
      currentSocket.onclose = null;
      currentSocket.close();
    }

    set({
      socket: null,
      liveConnection: "idle",
      telemetry: [],
    });
  },
  async requestState(nextState) {
    set({ error: null });

    try {
      await getClient().requestMachineState(nextState);
      await queryClient.invalidateQueries({
        queryKey: bridgeQueryKeys.machineState(),
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
    }
  },
}));

export const machineStore = useMachineStore;
