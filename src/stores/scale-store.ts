import { create } from "zustand";

import { createBridgeStream } from "@/bridge/bridge-stream-adapter";
import { BridgeClientError, createBridgeClient } from "@/rest/client";
import {
  scaleSnapshotMessageSchema,
  type ScaleSnapshot,
  type ScaleSnapshotMessage,
} from "@/rest/types";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { type LiveConnectionState } from "@/stores/live-connection-state";

export type ScaleDeviceStatus = "connected" | "disconnected";

interface ScaleState {
  connectScale: () => Promise<void>;
  disconnectScale: () => void;
  error: string | null;
  scaleConnection: LiveConnectionState;
  scaleMessage: ScaleSnapshotMessage | null;
  scaleSocket: WebSocket | null;
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

export function getScaleDeviceStatus(
  message: ScaleSnapshotMessage | null,
): ScaleDeviceStatus | null {
  if (message == null) {
    return null;
  }

  if (
    "status" in message &&
    (message.status === "connected" || message.status === "disconnected")
  ) {
    return message.status;
  }

  return "connected";
}

export function getScaleSnapshot(message: ScaleSnapshotMessage | null): ScaleSnapshot | null {
  if (message == null || "status" in message) {
    return null;
  }

  return message;
}

export const useScaleStore = create<ScaleState>((set, get) => ({
  async connectScale() {
    get().disconnectScale();

    try {
      const scaleStream = createBridgeStream({
        createSocket: () => getClient().createScaleSnapshotSocket(),
        handlers: {
          onClose: () => {
            set((state) => ({
              scaleConnection: "idle",
              scaleMessage: state.scaleSocket === scaleStream.socket ? null : state.scaleMessage,
              scaleSocket: state.scaleSocket === scaleStream.socket ? null : state.scaleSocket,
            }));
          },
          onError: () => {
            set({
              scaleConnection: "error",
              scaleMessage: null,
            });
          },
          onInvalidMessage: () => {
            set({
              scaleConnection: "error",
              scaleMessage: null,
            });
          },
          onMessage: (message: ScaleSnapshotMessage) => {
            set({
              scaleConnection: "live",
              scaleMessage: message,
            });
          },
          onOpen: () => {
            set({ scaleConnection: "live" });
          },
        },
        schema: scaleSnapshotMessageSchema,
        sendErrorMessage: "Scale stream is not connected",
      });

      set({
        error: null,
        scaleConnection: "connecting",
        scaleMessage: null,
        scaleSocket: scaleStream.socket,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        scaleConnection: "error",
        scaleMessage: null,
      });
    }
  },
  disconnectScale() {
    const currentScaleSocket = get().scaleSocket;

    if (currentScaleSocket) {
      currentScaleSocket.onclose = null;
      currentScaleSocket.close();
    }

    set({
      error: null,
      scaleConnection: "idle",
      scaleMessage: null,
      scaleSocket: null,
    });
  },
  error: null,
  scaleConnection: "idle",
  scaleMessage: null,
  scaleSocket: null,
}));

export const scaleStore = useScaleStore;
