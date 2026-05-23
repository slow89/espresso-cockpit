import { create } from "zustand";

import { createBridgeStream, sendBridgeStreamJson } from "@/bridge/bridge-stream-adapter";
import { BridgeClientError, createBridgeClient } from "@/rest/client";
import { displayStateSchema, type DisplayState } from "@/rest/types";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";

type DisplayConnectionState = "idle" | "connecting" | "live" | "error";

interface DisplayStoreState {
  connection: DisplayConnectionState;
  displayState: DisplayState | null;
  error: string | null;
  socket: WebSocket | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  releaseWakeLock: () => Promise<void>;
  requestWakeLock: () => Promise<void>;
  reset: () => void;
  setBrightness: (brightness: number) => Promise<void>;
}

type DisplayCommand =
  | {
      command: "setBrightness";
      brightness: number;
    }
  | {
      command: "requestWakeLock" | "releaseWakeLock";
    };

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

function sendDisplayCommand(socket: WebSocket | null, command: DisplayCommand) {
  sendBridgeStreamJson(socket, command, "Display stream is not connected");
}

export const useDisplayStore = create<DisplayStoreState>((set, get) => ({
  connection: "idle",
  displayState: null,
  error: null,
  socket: null,
  async connect() {
    get().disconnect();

    try {
      const client = getClient();
      const stream = createBridgeStream({
        createSocket: () => client.createDisplaySocket(),
        handlers: {
          onClose: () => {
            set((state) => ({
              connection: "idle",
              displayState: state.socket === stream.socket ? null : state.displayState,
              socket: state.socket === stream.socket ? null : state.socket,
            }));
          },
          onError: () => {
            set({
              connection: "error",
              error: "Live display stream failed",
            });
          },
          onInvalidMessage: (error) => {
            set({
              connection: "error",
              error: error.message,
            });
          },
          onMessage: (displayState) => {
            set({
              connection: "live",
              displayState,
              error: null,
            });
          },
          onOpen: () => {
            set({
              connection: "live",
              error: null,
            });
          },
        },
        schema: displayStateSchema,
        sendErrorMessage: "Display stream is not connected",
      });

      set({
        connection: "connecting",
        displayState: null,
        error: null,
        socket: stream.socket,
      });
    } catch (error) {
      set({
        connection: "error",
        displayState: null,
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

    set({
      connection: "idle",
      displayState: null,
      error: null,
      socket: null,
    });
  },
  async refresh() {
    try {
      const displayState = await getClient().getDisplayState();

      set((state) => ({
        connection: state.connection === "idle" ? state.connection : "live",
        displayState,
        error: null,
      }));
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
    }
  },
  async releaseWakeLock() {
    try {
      sendDisplayCommand(get().socket, {
        command: "releaseWakeLock",
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
  async requestWakeLock() {
    try {
      sendDisplayCommand(get().socket, {
        command: "requestWakeLock",
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
  async setBrightness(brightness) {
    try {
      sendDisplayCommand(get().socket, {
        brightness,
        command: "setBrightness",
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

export const displayStore = useDisplayStore;
