import { create } from "zustand";

import { createBridgeStream } from "@/bridge/bridge-stream-adapter";
import { BridgeClientError, createBridgeClient } from "@/rest/client";
import { queryClient } from "@/rest/query-client";
import { bridgeQueryKeys, getGatewayOrigin } from "@/rest/queries";
import {
  machineWaterLevelsSchema,
  machineSnapshotSchema,
  timeToReadySnapshotSchema,
  type MachineWaterLevels,
  type MachineStateChange,
  type TimeToReadySnapshot,
  type WorkflowRecord,
} from "@/rest/types";
import {
  appendTelemetryHistory,
  isShotActiveMachinePhase,
  mergeScaleSnapshotIntoTelemetry,
  type TelemetrySample,
} from "@/lib/telemetry";
import { useDashboardUiStore } from "@/stores/dashboard-ui-store";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { type LiveConnectionState } from "@/stores/live-connection-state";
import { getScaleSnapshot, useScaleStore } from "@/stores/scale-store";
import { visualizerRuntimeStore } from "@/stores/visualizer-runtime-store";

interface MachineState {
  error: string | null;
  liveConnection: LiveConnectionState;
  machineSocket: WebSocket | null;
  timeToReady: TimeToReadySnapshot | null;
  timeToReadySocket: WebSocket | null;
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

export const useMachineStore = create<MachineState>((set, get) => ({
  error: null,
  liveConnection: "idle",
  machineSocket: null,
  telemetry: [],
  timeToReady: null,
  timeToReadySocket: null,
  waterConnection: "idle",
  waterLevels: null,
  waterSocket: null,
  async connectLive() {
    get().disconnectLive();

    try {
      const client = getClient();
      const machineStream = createBridgeStream({
        createSocket: () => client.createMachineSnapshotSocket(),
        handlers: {
          onClose: () => {
            set((state) => ({
              machineSocket:
                state.machineSocket === machineStream.socket ? null : state.machineSocket,
              liveConnection: "idle",
            }));
          },
          onError: () => {
            set({
              liveConnection: "error",
              error: "Live machine stream failed",
            });
          },
          onInvalidMessage: (error) => {
            set({
              liveConnection: "error",
              error: error.message,
            });
          },
          onMessage: (snapshot) => {
            const gatewayOrigin = getGatewayOrigin();
            const previousTelemetry = get().telemetry;
            const nextTelemetry = appendTelemetryHistory(
              previousTelemetry,
              snapshot,
              getScaleSnapshot(useScaleStore.getState().scaleMessage),
            );
            const dashboardUiStore = useDashboardUiStore.getState();

            queryClient.setQueryData(bridgeQueryKeys.machineState(gatewayOrigin), snapshot);
            visualizerRuntimeStore.getState().handleSnapshot(snapshot);

            if (isShotActiveMachinePhase(snapshot.state)) {
              dashboardUiStore.clearPostShotSummary();
            } else if (isShotActiveMachinePhase(previousTelemetry[previousTelemetry.length - 1])) {
              dashboardUiStore.capturePostShotSummary(
                previousTelemetry,
                queryClient.getQueryData<WorkflowRecord>(bridgeQueryKeys.workflow(gatewayOrigin)),
              );
            }

            set({
              error: null,
              telemetry: nextTelemetry,
            });
          },
          onOpen: () => {
            set({ liveConnection: "live", error: null });
          },
        },
        schema: machineSnapshotSchema,
        sendErrorMessage: "Machine stream is not connected",
      });
      const timeToReadyStream = createBridgeStream({
        createSocket: () => client.createTimeToReadySocket(),
        handlers: {
          onClose: () => {
            set((state) => ({
              timeToReady:
                state.timeToReadySocket === timeToReadyStream.socket ? null : state.timeToReady,
              timeToReadySocket:
                state.timeToReadySocket === timeToReadyStream.socket
                  ? null
                  : state.timeToReadySocket,
            }));
          },
          onError: () => {
            set((state) => ({
              timeToReady:
                state.timeToReadySocket === timeToReadyStream.socket ? null : state.timeToReady,
            }));
          },
          onInvalidMessage: () => {
            set({
              timeToReady: null,
            });
          },
          onMessage: (timeToReady) => {
            set({
              timeToReady,
            });
          },
        },
        schema: timeToReadySnapshotSchema,
        sendErrorMessage: "Time-to-ready stream is not connected",
      });
      const waterStream = createBridgeStream({
        createSocket: () => client.createMachineWaterLevelsSocket(),
        handlers: {
          onClose: () => {
            set((state) => ({
              waterConnection: "idle",
              waterLevels: state.waterSocket === waterStream.socket ? null : state.waterLevels,
              waterSocket: state.waterSocket === waterStream.socket ? null : state.waterSocket,
            }));
          },
          onError: () => {
            set({
              waterConnection: "error",
              waterLevels: null,
            });
          },
          onInvalidMessage: () => {
            set({
              waterConnection: "error",
              waterLevels: null,
            });
          },
          onMessage: (waterLevels) => {
            set({
              waterConnection: "live",
              waterLevels,
            });
          },
          onOpen: () => {
            set({ waterConnection: "live" });
          },
        },
        schema: machineWaterLevelsSchema,
        sendErrorMessage: "Machine water levels stream is not connected",
      });

      set({
        liveConnection: "connecting",
        machineSocket: machineStream.socket,
        timeToReady: null,
        timeToReadySocket: timeToReadyStream.socket,
        waterConnection: "connecting",
        waterSocket: waterStream.socket,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        liveConnection: "error",
        waterConnection: "error",
      });
    }
  },
  disconnectLive() {
    const currentMachineSocket = get().machineSocket;
    const currentTimeToReadySocket = get().timeToReadySocket;
    const currentWaterSocket = get().waterSocket;

    if (currentMachineSocket) {
      currentMachineSocket.onclose = null;
      currentMachineSocket.close();
    }

    if (currentWaterSocket) {
      currentWaterSocket.onclose = null;
      currentWaterSocket.close();
    }

    if (currentTimeToReadySocket) {
      currentTimeToReadySocket.onclose = null;
      currentTimeToReadySocket.close();
    }

    useScaleStore.getState().disconnectScale();

    set({
      liveConnection: "idle",
      machineSocket: null,
      telemetry: [],
      timeToReady: null,
      timeToReadySocket: null,
      waterConnection: "idle",
      waterLevels: null,
      waterSocket: null,
    });
    useDashboardUiStore.getState().clearPostShotSummary();
    visualizerRuntimeStore.getState().reset();
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

useScaleStore.subscribe((state, previousState) => {
  const scaleSnapshot = getScaleSnapshot(state.scaleMessage);
  const previousScaleSnapshot = getScaleSnapshot(previousState.scaleMessage);

  if (scaleSnapshot === previousScaleSnapshot || scaleSnapshot == null) {
    return;
  }

  useMachineStore.setState((machineState) => ({
    telemetry: mergeScaleSnapshotIntoTelemetry(machineState.telemetry, scaleSnapshot),
  }));
});
