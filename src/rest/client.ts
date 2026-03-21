import { type z } from "zod";

import {
  deviceSummaryListSchema,
  machineSnapshotSchema,
  machineStateChangeSchema,
  shotRecordListSchema,
  workflowRecordSchema,
} from "@/rest/types";

export class BridgeClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "BridgeClientError";
  }
}

export function normalizeGatewayUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

export function toWebSocketUrl(url: string) {
  return normalizeGatewayUrl(url).replace(/^http/i, "ws");
}

async function parseResponse<TSchema extends z.ZodTypeAny>(
  response: Response,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  if (!response.ok) {
    throw new BridgeClientError(
      `Request failed with status ${response.status}`,
      response.status,
    );
  }

  const parsed = schema.safeParse(await response.json());

  if (!parsed.success) {
    throw new BridgeClientError(parsed.error.message, response.status);
  }

  return parsed.data;
}

export function createBridgeClient(baseUrl: string) {
  const origin = normalizeGatewayUrl(baseUrl);

  async function request<TSchema extends z.ZodTypeAny>(
    path: string,
    schema: TSchema,
    init?: RequestInit,
  ) {
    const response = await fetch(`${origin}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      ...init,
    });

    return parseResponse(response, schema);
  }

  return {
    origin,
    async getMachineState() {
      return request("/api/v1/machine/state", machineSnapshotSchema);
    },
    async getWorkflow() {
      return request("/api/v1/workflow", workflowRecordSchema);
    },
    async updateWorkflow(patch: Record<string, unknown>) {
      return request("/api/v1/workflow", workflowRecordSchema, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
    },
    async listDevices() {
      return request("/api/v1/devices", deviceSummaryListSchema);
    },
    async scanDevices() {
      return request("/api/v1/devices/scan?connect=true", deviceSummaryListSchema);
    },
    async listShots() {
      return request("/api/v1/shots", shotRecordListSchema);
    },
    async requestMachineState(nextState: string) {
      const parsedState = machineStateChangeSchema.parse(nextState);
      const response = await fetch(`${origin}/api/v1/machine/state/${nextState}`, {
        method: "PUT",
      });

      if (!response.ok) {
        throw new BridgeClientError(
          `Unable to request machine state ${parsedState}`,
          response.status,
        );
      }
    },
    createMachineSnapshotSocket() {
      return new WebSocket(`${toWebSocketUrl(origin)}/ws/v1/machine/snapshot`);
    },
  };
}
