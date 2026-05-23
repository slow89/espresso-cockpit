import { type z } from "zod";

import { BridgeClientError } from "@/rest/client";

const OPEN_WEB_SOCKET_STATE = 1;

export type BridgeStreamInvalidMessageError = SyntaxError | z.ZodError;

type BridgeStreamHandlers<TPayload> = {
  onClose?: () => void;
  onError?: () => void;
  onInvalidMessage?: (error: BridgeStreamInvalidMessageError) => void;
  onMessage: (payload: TPayload) => void;
  onOpen?: () => void;
};

export type BridgeStreamHandle = {
  close: () => void;
  sendJson: (command: unknown) => void;
  socket: WebSocket;
};

export function createBridgeStream<TSchema extends z.ZodTypeAny>({
  createSocket,
  handlers,
  schema,
  sendErrorMessage,
}: {
  createSocket: () => WebSocket;
  handlers: BridgeStreamHandlers<z.infer<TSchema>>;
  schema: TSchema;
  sendErrorMessage: string;
}): BridgeStreamHandle {
  const socket = createSocket();

  socket.onopen = () => {
    handlers.onOpen?.();
  };

  socket.onmessage = (event) => {
    let payload: unknown;

    try {
      payload = JSON.parse(event.data);
    } catch (error) {
      handlers.onInvalidMessage?.(error as SyntaxError);
      return;
    }

    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      handlers.onInvalidMessage?.(parsed.error);
      return;
    }

    handlers.onMessage(parsed.data);
  };

  socket.onerror = () => {
    handlers.onError?.();
  };

  socket.onclose = () => {
    handlers.onClose?.();
  };

  return {
    close() {
      socket.onclose = null;
      socket.close();
    },
    sendJson(command) {
      sendBridgeStreamJson(socket, command, sendErrorMessage);
    },
    socket,
  };
}

export function sendBridgeStreamJson(
  socket: WebSocket | null,
  command: unknown,
  errorMessage: string,
) {
  if (socket == null || socket.readyState !== OPEN_WEB_SOCKET_STATE) {
    throw new BridgeClientError(errorMessage);
  }

  socket.send(JSON.stringify(command));
}
