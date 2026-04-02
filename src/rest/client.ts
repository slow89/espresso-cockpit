import { type z } from "zod";

import {
  bridgeSettingsSchema,
  displayStateSchema,
  deviceSummaryListSchema,
  heartbeatResponseSchema,
  machineSnapshotSchema,
  machineStateChangeSchema,
  presenceSettingsSchema,
  profileRecordListSchema,
  profileRecordSchema,
  shotDetailSchema,
  shotListResponseSchema,
  visualizerCredentialCheckSchema,
  visualizerImportResultSchema,
  visualizerPluginSettingsSchema,
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
    let message = `Request failed with status ${response.status}`;

    if (typeof response.text === "function") {
      const errorBody = await response.text();

      if (errorBody) {
        try {
          const parsedError = JSON.parse(errorBody) as {
            error?: unknown;
            message?: unknown;
          };
          const errorMessage =
            typeof parsedError.error === "string"
              ? parsedError.error
              : typeof parsedError.message === "string"
                ? parsedError.message
                : null;

          message = errorMessage ?? errorBody;
        } catch {
          message = errorBody;
        }
      }
    }

    throw new BridgeClientError(
      message,
      response.status,
    );
  }

  const parsed = schema.safeParse(await response.json());

  if (!parsed.success) {
    throw new BridgeClientError(parsed.error.message, response.status);
  }

  return parsed.data;
}

async function ensureResponseOk(
  response: Response,
  fallbackMessage: string,
) {
  if (response.ok) {
    return;
  }

  let message = fallbackMessage;

  if (typeof response.text === "function") {
    const errorBody = await response.text();

    if (errorBody) {
      try {
        const parsedError = JSON.parse(errorBody) as {
          error?: unknown;
          message?: unknown;
        };
        const errorMessage =
          typeof parsedError.error === "string"
            ? parsedError.error
            : typeof parsedError.message === "string"
              ? parsedError.message
              : null;

        message = errorMessage ?? errorBody;
      } catch {
        message = errorBody;
      }
    }
  }

  throw new BridgeClientError(message, response.status);
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
    async listProfiles() {
      return request("/api/v1/profiles", profileRecordListSchema);
    },
    async getProfile(id: string) {
      return request(`/api/v1/profiles/${encodeURIComponent(id)}`, profileRecordSchema);
    },
    async listDevices() {
      return request("/api/v1/devices", deviceSummaryListSchema);
    },
    async scanDevices(options?: { connect?: boolean; quick?: boolean }) {
      const searchParams = new URLSearchParams({
        connect: options?.connect === false ? "false" : "true",
        quick: options?.quick === true ? "true" : "false",
      });

      return request(`/api/v1/devices/scan?${searchParams.toString()}`, deviceSummaryListSchema);
    },
    async connectDevice(deviceId: string) {
      const response = await fetch(`${origin}/api/v1/devices/connect`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deviceId }),
      });

      await ensureResponseOk(response, "Unable to connect device");
    },
    async disconnectDevice(deviceId: string) {
      const response = await fetch(`${origin}/api/v1/devices/disconnect`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deviceId }),
      });

      await ensureResponseOk(response, "Unable to disconnect device");
    },
    async listShots() {
      return request("/api/v1/shots", shotListResponseSchema);
    },
    async getShot(id: string) {
      return request(`/api/v1/shots/${encodeURIComponent(id)}`, shotDetailSchema);
    },
    async requestMachineState(nextState: string) {
      const parsedState = machineStateChangeSchema.parse(nextState);
      const response = await fetch(`${origin}/api/v1/machine/state/${nextState}`, {
        method: "PUT",
      });

      await ensureResponseOk(response, `Unable to request machine state ${parsedState}`);
    },
    async tareScale() {
      const response = await fetch(`${origin}/api/v1/scale/tare`, {
        method: "PUT",
      });

      await ensureResponseOk(response, "Unable to tare scale");
    },
    async signalHeartbeat() {
      return request("/api/v1/machine/heartbeat", heartbeatResponseSchema, {
        method: "POST",
      });
    },
    async getSettings() {
      return request("/api/v1/settings", bridgeSettingsSchema);
    },
    async updateSettings(settings: {
      preferredMachineId?: string | null;
      preferredScaleId?: string | null;
      scalePowerMode?: string | null;
    }) {
      const response = await fetch(`${origin}/api/v1/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      await ensureResponseOk(response, "Unable to update bridge settings");
    },
    async updateMachineWaterLevels(levels: {
      refillLevel: number;
    }) {
      const response = await fetch(`${origin}/api/v1/machine/waterLevels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(levels),
      });

      await ensureResponseOk(response, "Unable to update machine water levels");
    },
    async getPresenceSettings() {
      return request("/api/v1/presence/settings", presenceSettingsSchema);
    },
    async updatePresenceSettings(patch: {
      sleepTimeoutMinutes?: number;
      userPresenceEnabled?: boolean;
    }) {
      return request("/api/v1/presence/settings", presenceSettingsSchema, {
        method: "POST",
        body: JSON.stringify(patch),
      });
    },
    async getDisplayState() {
      return request("/api/v1/display", displayStateSchema);
    },
    async setDisplayBrightness(brightness: number) {
      return request("/api/v1/display/brightness", displayStateSchema, {
        method: "PUT",
        body: JSON.stringify({ brightness }),
      });
    },
    async requestDisplayWakeLock() {
      return request("/api/v1/display/wakelock", displayStateSchema, {
        method: "POST",
      });
    },
    async releaseDisplayWakeLock() {
      return request("/api/v1/display/wakelock", displayStateSchema, {
        method: "DELETE",
      });
    },
    async getVisualizerSettings() {
      return request(
        "/api/v1/plugins/visualizer.reaplugin/settings",
        visualizerPluginSettingsSchema,
      );
    },
    async updateVisualizerSettings(settings: {
      Username?: string | null;
      Password?: string | null;
      AutoUpload?: boolean;
      LengthThreshold?: number | null;
    }) {
      return request(
        "/api/v1/plugins/visualizer.reaplugin/settings",
        visualizerPluginSettingsSchema,
        {
          method: "POST",
          body: JSON.stringify(settings),
        },
      );
    },
    async verifyVisualizerCredentials(credentials: {
      username: string;
      password: string;
    }) {
      return request(
        "/api/v1/plugins/visualizer.reaplugin/verifyCredentials",
        visualizerCredentialCheckSchema,
        {
          method: "POST",
          body: JSON.stringify(credentials),
        },
      );
    },
    async importVisualizerProfile(shareCode: string) {
      return request(
        "/api/v1/plugins/visualizer.reaplugin/import",
        visualizerImportResultSchema,
        {
          method: "POST",
          body: JSON.stringify({ shareCode }),
        },
      );
    },
    createMachineSnapshotSocket() {
      return new WebSocket(`${toWebSocketUrl(origin)}/ws/v1/machine/snapshot`);
    },
    createScaleSnapshotSocket() {
      return new WebSocket(`${toWebSocketUrl(origin)}/ws/v1/scale/snapshot`);
    },
    createMachineWaterLevelsSocket() {
      return new WebSocket(`${toWebSocketUrl(origin)}/ws/v1/machine/waterLevels`);
    },
    createDisplaySocket() {
      return new WebSocket(`${toWebSocketUrl(origin)}/ws/v1/display`);
    },
  };
}
