import http from "node:http";
import { URL } from "node:url";

import { WebSocketServer, type WebSocket } from "ws";

import {
  defaultGatewayScenarioId,
  gatewayScenarios,
  type GatewayRouteFault,
  type GatewayScenario,
  type GatewayScenarioId,
  type GatewayScenarioState,
  type GatewayStreamChannel,
} from "./scenarios";

interface GatewayRuntimeState {
  activeFaults: GatewayRouteFault[];
  lastCheckpoint: string | null;
  scenarioId: GatewayScenarioId;
  state: GatewayScenarioState;
  stepIndex: number;
}

const channelClients: Record<GatewayStreamChannel, Set<WebSocket>> = {
  display: new Set(),
  machine: new Set(),
  scale: new Set(),
  timeToReady: new Set(),
  water: new Set(),
};

const runtime = createScenarioRuntime(defaultGatewayScenarioId);
const gatewayPort = Number(getFlagValue("--port") ?? "18080");
const gatewayHost = getFlagValue("--host") ?? "127.0.0.1";

const server = http.createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    console.error("[fake-gateway] request failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unexpected fake gateway error",
    });
  });
});

const webSocketServer = new WebSocketServer({
  noServer: true,
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${gatewayHost}:${gatewayPort}`);
  const channel = getWebSocketChannel(url.pathname);

  if (!channel) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  webSocketServer.handleUpgrade(request, socket, head, (websocket: WebSocket) => {
    channelClients[channel].add(websocket);
    websocket.on("close", () => {
      channelClients[channel].delete(websocket);
    });
    sendCurrentChannelState(channel, websocket);
  });
});

server.listen(gatewayPort, gatewayHost, () => {
  console.log(`[fake-gateway] listening on http://${gatewayHost}:${gatewayPort}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    for (const channel of Object.keys(channelClients) as GatewayStreamChannel[]) {
      closeChannelSockets(channel);
    }

    webSocketServer.close(() => {
      server.close(() => {
        process.exit(0);
      });
    });
  });
}

async function handleRequest(request: http.IncomingMessage, response: http.ServerResponse) {
  const method = normalizeMethod(request.method);
  const url = new URL(request.url ?? "/", `http://${gatewayHost}:${gatewayPort}`);
  const path = url.pathname;

  if (method === "GET" && path === "/") {
    sendJson(response, 200, {
      ok: true,
      scenarioId: runtime.scenarioId,
    });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders());
    response.end();
    return;
  }

  const fault = takeRouteFault(method, path);

  if (fault) {
    if (fault.delayMs) {
      await delay(fault.delayMs);
    }

    sendJson(response, fault.status, fault.body);
    return;
  }

  if (method === "GET" && path === "/__control/state") {
    sendJson(response, 200, {
      activeFaults: runtime.activeFaults,
      checkpoints: gatewayScenarios[runtime.scenarioId].expectedCheckpoints,
      lastCheckpoint: runtime.lastCheckpoint,
      scenarioId: runtime.scenarioId,
      stepIndex: runtime.stepIndex,
    });
    return;
  }

  if (method === "POST" && path === "/__control/reset") {
    loadScenario(defaultGatewayScenarioId);
    sendJson(response, 200, summarizeRuntime());
    return;
  }

  if (method === "POST" && path === "/__control/load-scenario") {
    const body = await readJsonBody(request);
    const nextScenarioId = body?.scenarioId;

    if (!isScenarioId(nextScenarioId)) {
      sendJson(response, 400, {
        error: `Unknown scenario ${String(nextScenarioId)}`,
      });
      return;
    }

    loadScenario(nextScenarioId);
    sendJson(response, 200, summarizeRuntime());
    return;
  }

  if (method === "POST" && path === "/__control/advance-step") {
    const scenario = gatewayScenarios[runtime.scenarioId];
    const nextStep = scenario.steps[runtime.stepIndex];

    if (!nextStep) {
      sendJson(response, 409, {
        error: "No remaining steps",
      });
      return;
    }

    applyStep(nextStep);
    runtime.stepIndex += 1;
    runtime.lastCheckpoint = nextStep.checkpoint ?? runtime.lastCheckpoint;
    sendJson(response, 200, {
      checkpoint: runtime.lastCheckpoint,
      label: nextStep.label,
      remainingSteps: scenario.steps.length - runtime.stepIndex,
      scenarioId: runtime.scenarioId,
    });
    return;
  }

  if (method === "GET" && path === "/api/v1/machine/state") {
    sendJson(response, 200, runtime.state.machineSnapshot);
    return;
  }

  if (method === "PUT" && path.startsWith("/api/v1/machine/state/")) {
    const nextState = decodeURIComponent(path.split("/").at(-1) ?? "idle");
    runtime.state.machineSnapshot = {
      ...runtime.state.machineSnapshot,
      flow: nextState === "espresso" ? 2.4 : 0,
      pressure: nextState === "espresso" ? 8.8 : 0,
      state: {
        state: nextState,
        substate:
          nextState === "sleeping" ? "idle" : nextState === "espresso" ? "pouring" : "ready",
      },
      timestamp: new Date().toISOString(),
    };

    if (nextState !== "espresso") {
      runtime.state.scaleSnapshot = runtime.state.scaleSnapshot
        ? {
            ...runtime.state.scaleSnapshot,
            timerValue: 0,
            weightFlow: 0,
          }
        : null;
    }

    broadcastState(["machine", "scale"]);
    response.writeHead(204, corsHeaders());
    response.end();
    return;
  }

  if (method === "GET" && path === "/api/v1/workflow") {
    sendJson(response, 200, runtime.state.workflow);
    return;
  }

  if (method === "PUT" && path === "/api/v1/workflow") {
    const patch = await readJsonBody(request);
    runtime.state.workflow = mergeRecord(runtime.state.workflow, patch);
    sendJson(response, 200, runtime.state.workflow);
    return;
  }

  if (method === "GET" && path === "/api/v1/profiles") {
    sendJson(response, 200, runtime.state.profiles);
    return;
  }

  if (method === "GET" && path.startsWith("/api/v1/profiles/")) {
    const profileId = decodeURIComponent(path.split("/").at(-1) ?? "");
    const profile = runtime.state.profiles.find((entry) => entry.id === profileId);

    if (!profile) {
      sendJson(response, 404, {
        error: `Unknown profile ${profileId}`,
      });
      return;
    }

    sendJson(response, 200, profile);
    return;
  }

  if (method === "GET" && path === "/api/v1/devices") {
    sendJson(response, 200, runtime.state.devices);
    return;
  }

  if (method === "GET" && path === "/api/v1/devices/scan") {
    const shouldConnect = url.searchParams.get("connect") !== "false";
    const candidateScale = runtime.state.devices.find(
      (device) => device.type === "scale" && device.state !== "connected",
    );

    if (shouldConnect && candidateScale) {
      candidateScale.state = "connected";
      runtime.state.bridgeSettings = {
        ...runtime.state.bridgeSettings,
        preferredScaleId: candidateScale.id,
      };
      runtime.state.scaleSnapshot ??= {
        batteryLevel: 79,
        timerValue: 0,
        timestamp: new Date().toISOString(),
        weight: 0,
        weightFlow: 0,
      };
      broadcastState(["scale"]);
    }

    sendJson(response, 200, runtime.state.devices);
    return;
  }

  if (method === "PUT" && path === "/api/v1/devices/connect") {
    const body = await readJsonBody(request);
    const deviceId = body?.deviceId as string | undefined;
    const device = runtime.state.devices.find((entry) => entry.id === deviceId);

    if (!device) {
      sendJson(response, 404, {
        error: `Unknown device ${String(deviceId)}`,
      });
      return;
    }

    device.state = "connected";

    if (device.type === "scale") {
      runtime.state.bridgeSettings = {
        ...runtime.state.bridgeSettings,
        preferredScaleId: device.id,
      };
      runtime.state.scaleSnapshot ??= {
        batteryLevel: 80,
        timerValue: 0,
        timestamp: new Date().toISOString(),
        weight: 0,
        weightFlow: 0,
      };
      broadcastState(["scale"]);
    }

    response.writeHead(204, corsHeaders());
    response.end();
    return;
  }

  if (method === "PUT" && path === "/api/v1/devices/disconnect") {
    const body = await readJsonBody(request);
    const deviceId = body?.deviceId as string | undefined;
    const device = runtime.state.devices.find((entry) => entry.id === deviceId);

    if (!device) {
      sendJson(response, 404, {
        error: `Unknown device ${String(deviceId)}`,
      });
      return;
    }

    device.state = "disconnected";

    if (device.type === "scale") {
      runtime.state.scaleSnapshot = null;
      closeChannelSockets("scale");
    }

    response.writeHead(204, corsHeaders());
    response.end();
    return;
  }

  if (method === "GET" && path === "/api/v1/shots") {
    sendJson(response, 200, runtime.state.shots);
    return;
  }

  if (method === "GET" && path.startsWith("/api/v1/shots/")) {
    const shotId = decodeURIComponent(path.split("/").at(-1) ?? "");
    const shotDetail = runtime.state.shotDetails[shotId];

    if (!shotDetail) {
      sendJson(response, 404, {
        error: `Unknown shot ${shotId}`,
      });
      return;
    }

    sendJson(response, 200, shotDetail);
    return;
  }

  if (method === "POST" && path === "/api/v1/machine/heartbeat") {
    sendJson(response, 200, {
      timeout: 1800,
    });
    return;
  }

  if (method === "GET" && path === "/api/v1/settings") {
    sendJson(response, 200, runtime.state.bridgeSettings);
    return;
  }

  if (method === "POST" && path === "/api/v1/settings") {
    const body = await readJsonBody(request);
    runtime.state.bridgeSettings = mergeRecord(runtime.state.bridgeSettings, body);
    response.writeHead(204, corsHeaders());
    response.end();
    return;
  }

  if (method === "GET" && path === "/api/v1/presence/settings") {
    sendJson(response, 200, runtime.state.presenceSettings);
    return;
  }

  if (method === "POST" && path === "/api/v1/presence/settings") {
    const body = await readJsonBody(request);
    runtime.state.presenceSettings = mergeRecord(runtime.state.presenceSettings, body);
    sendJson(response, 200, runtime.state.presenceSettings);
    return;
  }

  if (method === "POST" && path === "/api/v1/machine/waterLevels") {
    const body = await readJsonBody(request);

    runtime.state.waterLevels = {
      ...runtime.state.waterLevels,
      ...(typeof body === "object" && body ? body : {}),
    };
    broadcastChannel("water");
    response.writeHead(202, corsHeaders());
    response.end();
    return;
  }

  if (method === "GET" && path === "/api/v1/display") {
    sendJson(response, 200, runtime.state.displayState);
    return;
  }

  if (method === "PUT" && path === "/api/v1/display/brightness") {
    const body = await readJsonBody(request);
    const brightness = Number(body?.brightness ?? runtime.state.displayState.requestedBrightness);

    runtime.state.displayState = {
      ...runtime.state.displayState,
      brightness,
      lowBatteryBrightnessActive: false,
      requestedBrightness: brightness,
    };
    broadcastState(["display"]);
    sendJson(response, 200, runtime.state.displayState);
    return;
  }

  if (method === "POST" && path === "/api/v1/display/wakelock") {
    runtime.state.displayState = {
      ...runtime.state.displayState,
      wakeLockEnabled: true,
      wakeLockOverride: true,
    };
    broadcastState(["display"]);
    sendJson(response, 200, runtime.state.displayState);
    return;
  }

  if (method === "DELETE" && path === "/api/v1/display/wakelock") {
    runtime.state.displayState = {
      ...runtime.state.displayState,
      wakeLockEnabled: false,
      wakeLockOverride: false,
    };
    broadcastState(["display"]);
    sendJson(response, 200, runtime.state.displayState);
    return;
  }

  if (method === "GET" && path === "/api/v1/plugins/visualizer.reaplugin/settings") {
    sendJson(response, 200, runtime.state.visualizerSettings);
    return;
  }

  if (method === "POST" && path === "/api/v1/plugins/visualizer.reaplugin/settings") {
    const body = await readJsonBody(request);
    runtime.state.visualizerSettings = mergeRecord(runtime.state.visualizerSettings, body);
    sendJson(response, 200, runtime.state.visualizerSettings);
    return;
  }

  if (method === "POST" && path === "/api/v1/plugins/visualizer.reaplugin/verifyCredentials") {
    const body = await readJsonBody(request);
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "").trim();
    sendJson(response, 200, {
      valid: Boolean(username && password && password !== "bad"),
    });
    return;
  }

  if (method === "POST" && path === "/api/v1/plugins/visualizer.reaplugin/import") {
    const body = await readJsonBody(request);
    const shareCode = String(body?.shareCode ?? "")
      .trim()
      .toUpperCase();
    const profileId = `profile:imported:${shareCode || "AB12"}`;
    const profileTitle = `Imported ${shareCode || "AB12"}`;

    runtime.state.profiles = [
      {
        id: profileId,
        isDefault: false,
        profile: {
          author: "Visualizer",
          beverage_type: "espresso",
          notes: "Imported from Visualizer.",
          steps: [
            { flow: 0, pressure: 0, seconds: 0, temperature: 92 },
            { flow: 3.2, pressure: 7.8, seconds: 10, temperature: 93 },
          ],
          title: profileTitle,
          version: "2",
        },
        visibility: "visible",
      },
      ...runtime.state.profiles.filter((entry) => entry.id !== profileId),
    ];

    sendJson(response, 200, {
      profileId,
      profileTitle,
      success: true,
    });
    return;
  }

  sendJson(response, 404, {
    error: `Unhandled fake gateway route: ${method} ${path}`,
  });
}

function applyStep(step: GatewayScenario["steps"][number]) {
  if (step.state) {
    runtime.state = mergeRuntimeState(runtime.state, step.state);
  }

  if (step.malformed?.machine) {
    broadcastRaw("machine", step.malformed.machine);
  }

  if (step.malformed?.scale) {
    broadcastRaw("scale", step.malformed.scale);
  }

  if (step.malformed?.water) {
    broadcastRaw("water", step.malformed.water);
  }

  if (step.malformed?.display) {
    broadcastRaw("display", step.malformed.display);
  }

  const changedChannels = getChangedChannels(step.state);

  if (changedChannels.length) {
    broadcastState(changedChannels);
  }

  for (const channel of step.close ?? []) {
    closeChannelSockets(channel);
  }
}

function getChangedChannels(
  patch: GatewayScenario["steps"][number]["state"],
): GatewayStreamChannel[] {
  if (!patch) {
    return [];
  }

  const channels: GatewayStreamChannel[] = [];

  if (patch.machineSnapshot) {
    channels.push("machine");
    channels.push("timeToReady");
  }

  if (patch.scaleSnapshot !== undefined) {
    channels.push("scale");
  }

  if (patch.waterLevels) {
    channels.push("water");
  }

  if (patch.displayState) {
    channels.push("display");
  }

  return channels;
}

function broadcastState(channels: GatewayStreamChannel[]) {
  for (const channel of channels) {
    broadcastChannel(channel);
  }
}

function broadcastChannel(channel: GatewayStreamChannel) {
  const payload = getChannelPayload(channel);

  if (payload == null) {
    return;
  }

  for (const websocket of channelClients[channel]) {
    if (websocket.readyState === websocket.OPEN) {
      websocket.send(JSON.stringify(payload));
    }
  }
}

function broadcastRaw(channel: GatewayStreamChannel, payload: unknown) {
  for (const websocket of channelClients[channel]) {
    if (websocket.readyState === websocket.OPEN) {
      websocket.send(JSON.stringify(payload));
    }
  }
}

function closeChannelSockets(channel: GatewayStreamChannel) {
  for (const websocket of channelClients[channel]) {
    websocket.close();
  }
  channelClients[channel].clear();
}

function sendCurrentChannelState(channel: GatewayStreamChannel, websocket: WebSocket) {
  const payload = getChannelPayload(channel);

  if (payload == null || websocket.readyState !== websocket.OPEN) {
    return;
  }

  websocket.send(JSON.stringify(payload));
}

function getChannelPayload(channel: GatewayStreamChannel) {
  if (channel === "display") {
    return runtime.state.displayState;
  }

  if (channel === "machine") {
    return runtime.state.machineSnapshot;
  }

  if (channel === "scale") {
    return runtime.state.scaleSnapshot;
  }

  if (channel === "timeToReady") {
    return buildTimeToReadyPayload(runtime.state.machineSnapshot);
  }

  return runtime.state.waterLevels;
}

function createScenarioRuntime(scenarioId: GatewayScenarioId): GatewayRuntimeState {
  const scenario = gatewayScenarios[scenarioId];

  return {
    activeFaults: structuredClone(scenario.faults),
    lastCheckpoint: scenario.expectedCheckpoints[0] ?? null,
    scenarioId,
    state: structuredClone(scenario.state),
    stepIndex: 0,
  };
}

function loadScenario(scenarioId: GatewayScenarioId) {
  const nextRuntime = createScenarioRuntime(scenarioId);

  runtime.activeFaults = nextRuntime.activeFaults;
  runtime.lastCheckpoint = nextRuntime.lastCheckpoint;
  runtime.scenarioId = nextRuntime.scenarioId;
  runtime.state = nextRuntime.state;
  runtime.stepIndex = nextRuntime.stepIndex;
  broadcastState(["display", "machine", "scale", "timeToReady", "water"]);
}

function summarizeRuntime() {
  return {
    checkpoints: gatewayScenarios[runtime.scenarioId].expectedCheckpoints,
    lastCheckpoint: runtime.lastCheckpoint,
    scenarioId: runtime.scenarioId,
    stepIndex: runtime.stepIndex,
  };
}

function takeRouteFault(method: GatewayRouteFault["method"], path: string) {
  const faultIndex = runtime.activeFaults.findIndex(
    (entry) => entry.method === method && entry.path === path,
  );

  if (faultIndex === -1) {
    return null;
  }

  const fault = runtime.activeFaults[faultIndex];

  if (fault?.once) {
    runtime.activeFaults.splice(faultIndex, 1);
  }

  return fault ?? null;
}

function mergeRuntimeState(
  current: GatewayScenarioState,
  patch: Partial<GatewayScenarioState>,
): GatewayScenarioState {
  const nextState = structuredClone(current);

  for (const [key, value] of Object.entries(patch) as Array<
    [keyof GatewayScenarioState, GatewayScenarioState[keyof GatewayScenarioState]]
  >) {
    if (value == null || Array.isArray(value) || typeof value !== "object") {
      nextState[key] = structuredClone(value) as never;
      continue;
    }

    const currentValue = nextState[key];

    if (currentValue != null && !Array.isArray(currentValue) && typeof currentValue === "object") {
      nextState[key] = mergeRecord(currentValue, value) as never;
      continue;
    }

    nextState[key] = structuredClone(value) as never;
  }

  return nextState;
}

function mergeRecord<T extends object>(current: T, patch: unknown): T {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return current;
  }

  const next = { ...current } as Record<string, unknown>;

  for (const [key, value] of Object.entries(patch)) {
    const currentValue = next[key];

    if (
      value &&
      currentValue &&
      !Array.isArray(value) &&
      !Array.isArray(currentValue) &&
      typeof value === "object" &&
      typeof currentValue === "object"
    ) {
      next[key] = mergeRecord(currentValue as Record<string, unknown>, value);
      continue;
    }

    next[key] = value;
  }

  return next as T;
}

async function readJsonBody(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  if (!chunks.length) {
    return null;
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody.trim()) {
    return null;
  }

  return JSON.parse(rawBody) as Record<string, unknown>;
}

function sendJson(response: http.ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...corsHeaders(),
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json",
  });
  response.end(body);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "DELETE,GET,OPTIONS,POST,PUT",
    "Access-Control-Allow-Origin": "*",
  };
}

function getWebSocketChannel(path: string): GatewayStreamChannel | null {
  if (path === "/ws/v1/display") {
    return "display";
  }

  if (path === "/ws/v1/machine/snapshot") {
    return "machine";
  }

  if (path === "/ws/v1/plugins/time-to-ready.reaplugin/timeToReady") {
    return "timeToReady";
  }

  if (path === "/ws/v1/scale/snapshot") {
    return "scale";
  }

  if (path === "/ws/v1/machine/waterLevels") {
    return "water";
  }

  return null;
}

function buildTimeToReadyPayload(snapshot: GatewayScenarioState["machineSnapshot"]) {
  const currentTemp = snapshot.groupTemperature;
  const targetTemp = snapshot.targetGroupTemperature;
  const gap = targetTemp - currentTemp;

  if (snapshot.state.state === "sleeping") {
    return {
      currentTemp,
      message: null,
      remainingTimeMs: null,
      status: "not_heating",
      targetTemp,
      timestamp: Date.now(),
    };
  }

  if (gap <= 0) {
    return {
      currentTemp,
      message: "Target temperature reached",
      remainingTimeMs: 0,
      status: "reached",
      targetTemp,
      timestamp: Date.now(),
    };
  }

  return {
    currentTemp,
    message: "Collecting temperature data...",
    remainingTimeMs: null,
    status: "insufficient_data",
    targetTemp,
    timestamp: Date.now(),
  };
}

function normalizeMethod(method: string | undefined): GatewayRouteFault["method"] {
  if (method === "DELETE" || method === "POST" || method === "PUT") {
    return method;
  }

  return "GET";
}

function isScenarioId(value: unknown): value is GatewayScenarioId {
  return typeof value === "string" && value in gatewayScenarios;
}

function getFlagValue(flag: string) {
  const flagIndex = process.argv.indexOf(flag);

  if (flagIndex === -1) {
    return null;
  }

  return process.argv[flagIndex + 1] ?? null;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
