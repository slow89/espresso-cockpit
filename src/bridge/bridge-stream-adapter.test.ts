import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { BridgeClientError } from "@/rest/client";

import { createBridgeStream } from "./bridge-stream-adapter";

class MockWebSocket {
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = 0;
  sent: string[] = [];

  close() {
    this.readyState = 3;
    this.onclose?.({} as CloseEvent);
  }

  emitMessage(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }

  emitOpen() {
    this.readyState = 1;
    this.onopen?.({} as Event);
  }

  send(data: string) {
    this.sent.push(data);
  }
}

describe("createBridgeStream", () => {
  let socket: MockWebSocket;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    socket = new MockWebSocket();
  });

  it("parses valid messages through the provided schema", () => {
    const onMessage = vi.fn();

    const stream = createBridgeStream({
      createSocket: () => socket as unknown as WebSocket,
      handlers: {
        onMessage,
      },
      schema: z.object({ value: z.number() }),
      sendErrorMessage: "Stream is not connected",
    });

    socket.emitMessage(JSON.stringify({ value: 42 }));

    expect(stream.socket).toBe(socket);
    expect(onMessage).toHaveBeenCalledWith({ value: 42 });
  });

  it("surfaces invalid json and invalid schema messages", () => {
    const onInvalidMessage = vi.fn();
    const onMessage = vi.fn();

    createBridgeStream({
      createSocket: () => socket as unknown as WebSocket,
      handlers: {
        onInvalidMessage,
        onMessage,
      },
      schema: z.object({ value: z.number() }),
      sendErrorMessage: "Stream is not connected",
    });

    socket.emitMessage("{");
    socket.emitMessage(JSON.stringify({ value: "wrong" }));

    expect(onMessage).not.toHaveBeenCalled();
    expect(onInvalidMessage).toHaveBeenCalledTimes(2);
  });

  it("sends json commands only when the socket is open", () => {
    const stream = createBridgeStream({
      createSocket: () => socket as unknown as WebSocket,
      handlers: {
        onMessage: vi.fn(),
      },
      schema: z.object({ value: z.number() }),
      sendErrorMessage: "Stream is not connected",
    });

    expect(() => stream.sendJson({ command: "scan" })).toThrow(BridgeClientError);

    socket.emitOpen();
    stream.sendJson({ command: "scan" });

    expect(socket.sent).toEqual([JSON.stringify({ command: "scan" })]);
  });

  it("suppresses onClose when closed through the stream handle", () => {
    const onClose = vi.fn();
    const stream = createBridgeStream({
      createSocket: () => socket as unknown as WebSocket,
      handlers: {
        onClose,
        onMessage: vi.fn(),
      },
      schema: z.object({ value: z.number() }),
      sendErrorMessage: "Stream is not connected",
    });

    stream.close();

    expect(onClose).not.toHaveBeenCalled();
  });
});
