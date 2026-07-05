import http from "node:http";
import { URL } from "node:url";

import { WebSocketServer, type WebSocket } from "ws";

import { machineStateChangeSchema, type MachineStateChange } from "../../src/rest/types";
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
  devices: new Set(),
  display: new Set(),
  machine: new Set(),
  scale: new Set(),
  timeToReady: new Set(),
  water: new Set(),
};

const runtime = createScenarioRuntime(defaultGatewayScenarioId);
const gatewayPort = Number(getFlagValue("--port") ?? "18080");
const gatewayHost = getFlagValue("--host") ?? "127.0.0.1";
let shotSimulationInterval: ReturnType<typeof setInterval> | null = null;
let shotSimulationStartedAtMs = 0;

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
    if (channel === "devices") {
      websocket.on("message", (message) => {
        handleDevicesCommand(message.toString(), websocket);
      });
    }
    if (channel === "display") {
      websocket.on("message", (message) => {
        handleDisplayCommand(message.toString(), websocket);
      });
    }
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
    stopShotSimulation();
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

    stopShotSimulation();
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
    const nextState = machineStateChangeSchema.parse(
      decodeURIComponent(path.split("/").at(-1) ?? "idle"),
    );
    applyRequestedMachineState(nextState);
    broadcastState(["machine", "scale", "timeToReady"]);
    sendJson(response, 200, runtime.state.machineSnapshot);
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
      broadcastState(["devices", "scale"]);
      sendJson(response, 200, runtime.state.devices);
      return;
    }

    broadcastState(["devices"]);
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
      broadcastState(["devices", "scale"]);
      response.writeHead(204, corsHeaders());
      response.end();
      return;
    }

    broadcastState(["devices"]);
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
      broadcastState(["scale"]);
    }

    broadcastState(["devices"]);
    response.writeHead(204, corsHeaders());
    response.end();
    return;
  }

  if (method === "GET" && path === "/api/v1/shots") {
    sendJson(response, 200, runtime.state.shots);
    return;
  }

  if (method === "GET" && path === "/api/v1/shots/latest") {
    sendJson(response, 200, runtime.state.shots.items[0] ?? null);
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
    sendJson(response, 200, runtime.state.bridgeSettings);
    return;
  }

  if (method === "GET" && path === "/api/v1/machine/calibration") {
    sendJson(response, 200, runtime.state.machineCalibration);
    return;
  }

  if (method === "POST" && path === "/api/v1/machine/calibration") {
    const body = await readJsonBody(request);
    runtime.state.machineCalibration = mergeRecord(runtime.state.machineCalibration, body);
    sendJson(response, 200, runtime.state.machineCalibration);
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
    sendJson(response, 200, runtime.state.waterLevels);
    return;
  }

  if (method === "GET" && path === "/api/v1/display") {
    sendJson(response, 200, runtime.state.displayState);
    return;
  }

  if (method === "PUT" && path === "/api/v1/display/brightness") {
    const body = await readJsonBody(request);
    const brightness = Number(body?.brightness ?? runtime.state.displayState.requestedBrightness);

    updateDisplayBrightness(brightness);
    broadcastState(["display"]);
    sendJson(response, 200, runtime.state.displayState);
    return;
  }

  if (method === "POST" && path === "/api/v1/display/wakelock") {
    updateWakeLockOverride(true);
    broadcastState(["display"]);
    sendJson(response, 200, runtime.state.displayState);
    return;
  }

  if (method === "DELETE" && path === "/api/v1/display/wakelock") {
    updateWakeLockOverride(false);
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

  if (patch.devices) {
    channels.push("devices");
  }

  return channels;
}

function broadcastState(channels: GatewayStreamChannel[]) {
  for (const channel of channels) {
    broadcastChannel(channel);
  }
}

function broadcastChannel(channel: GatewayStreamChannel) {
  if (channel === "scale") {
    broadcastScaleChannel();
    return;
  }

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

function broadcastScaleChannel() {
  for (const websocket of channelClients.scale) {
    sendScaleChannelState(websocket);
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
  if (channel === "scale") {
    sendScaleChannelState(websocket);
    return;
  }

  const payload = getChannelPayload(channel);

  if (payload == null || websocket.readyState !== websocket.OPEN) {
    return;
  }

  websocket.send(JSON.stringify(payload));
}

function sendScaleChannelState(websocket: WebSocket) {
  if (websocket.readyState !== websocket.OPEN) {
    return;
  }

  websocket.send(
    JSON.stringify({
      status: runtime.state.scaleSnapshot == null ? "disconnected" : "connected",
    }),
  );

  if (runtime.state.scaleSnapshot != null) {
    websocket.send(JSON.stringify(runtime.state.scaleSnapshot));
  }
}

function getChannelPayload(channel: GatewayStreamChannel) {
  const fault = getStreamFault(channel);

  if (fault) {
    return fault.body;
  }

  if (channel === "display") {
    return runtime.state.displayState;
  }

  if (channel === "devices") {
    return buildDevicesPayload();
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

function getStreamFault(channel: GatewayStreamChannel) {
  const path = getStreamRestStatePath(channel);

  if (!path) {
    return null;
  }

  const match = findRouteFault("GET", path);
  const fault = match?.fault ?? null;

  if (!fault || fault.status < 400) {
    return null;
  }

  return fault;
}

function getStreamRestStatePath(channel: GatewayStreamChannel) {
  if (channel === "devices") {
    return "/api/v1/devices";
  }

  if (channel === "display") {
    return "/api/v1/display";
  }

  if (channel === "machine") {
    return "/api/v1/machine/state";
  }

  return null;
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
  broadcastState(["devices", "display", "machine", "scale", "timeToReady", "water"]);
}

function applyRequestedMachineState(nextState: MachineStateChange) {
  if (nextState === "espresso") {
    startShotSimulation();
    return;
  }

  stopShotSimulation();
  runtime.state.machineSnapshot = {
    ...runtime.state.machineSnapshot,
    flow: 0,
    pressure: 0,
    profileFrame: 0,
    state: {
      state: nextState,
      substate: nextState === "sleeping" ? "idle" : "ready",
    },
    targetFlow: 0,
    targetPressure: 0,
    timestamp: getNextSnapshotTimestamp(runtime.state.machineSnapshot.timestamp),
  };

  runtime.state.scaleSnapshot = runtime.state.scaleSnapshot
    ? {
        ...runtime.state.scaleSnapshot,
        timerValue: 0,
        weightFlow: 0,
      }
    : null;
}

function startShotSimulation() {
  stopShotSimulation();
  shotSimulationStartedAtMs = Date.now();
  applyShotSimulationTick(0);

  shotSimulationInterval = setInterval(() => {
    const elapsedSeconds = (Date.now() - shotSimulationStartedAtMs) / 1000;

    if (elapsedSeconds >= 30) {
      finishShotSimulation(30);
      return;
    }

    applyShotSimulationTick(elapsedSeconds);
    broadcastState(["machine", "scale", "timeToReady"]);
  }, 500);
}

function stopShotSimulation() {
  if (shotSimulationInterval == null) {
    return;
  }

  clearInterval(shotSimulationInterval);
  shotSimulationInterval = null;
}

function finishShotSimulation(elapsedSeconds: number) {
  applyShotSimulationTick(elapsedSeconds);
  stopShotSimulation();
  runtime.state.machineSnapshot = {
    ...runtime.state.machineSnapshot,
    flow: 0,
    pressure: 0,
    profileFrame: 0,
    state: {
      state: "idle",
      substate: "ready",
    },
    targetFlow: 0,
    targetPressure: 0,
    timestamp: new Date(shotSimulationStartedAtMs + elapsedSeconds * 1000 + 500).toISOString(),
  };
  runtime.state.scaleSnapshot = runtime.state.scaleSnapshot
    ? {
        ...runtime.state.scaleSnapshot,
        timerValue: Math.round(elapsedSeconds * 1000),
        weightFlow: 0,
      }
    : null;
  broadcastState(["machine", "scale", "timeToReady"]);
}

function applyShotSimulationTick(elapsedSeconds: number) {
  const substate =
    elapsedSeconds < 0.8 ? "preparingForShot" : elapsedSeconds < 3 ? "preinfusion" : "pouring";
  const progress = Math.min(1, elapsedSeconds / 8);
  const pouringSeconds = Math.max(0, elapsedSeconds - 1.2);
  const flow = substate === "preparingForShot" ? 0 : roundTo(2.4 + Math.sin(elapsedSeconds) * 0.2);
  const pressure =
    substate === "preparingForShot" ? 0 : roundTo(Math.min(8.8, 2.2 + progress * 8.2));
  const weight = roundTo(Math.min(42, pouringSeconds * 1.45));

  runtime.state.machineSnapshot = {
    ...runtime.state.machineSnapshot,
    flow,
    pressure,
    profileFrame: elapsedSeconds < 1 ? 0 : elapsedSeconds < 6 ? 1 : 2,
    state: {
      state: "espresso",
      substate,
    },
    targetFlow: 2.5,
    targetPressure: substate === "preinfusion" ? 3 : 8.5,
    timestamp: new Date(shotSimulationStartedAtMs + elapsedSeconds * 1000).toISOString(),
  };

  runtime.state.scaleSnapshot = runtime.state.scaleSnapshot
    ? {
        ...runtime.state.scaleSnapshot,
        timerValue: Math.round(elapsedSeconds * 1000),
        timestamp: runtime.state.machineSnapshot.timestamp,
        weight,
        weightFlow: substate === "pouring" ? 1.4 : 0,
      }
    : null;
}

function summarizeRuntime() {
  return {
    checkpoints: gatewayScenarios[runtime.scenarioId].expectedCheckpoints,
    lastCheckpoint: runtime.lastCheckpoint,
    scenarioId: runtime.scenarioId,
    stepIndex: runtime.stepIndex,
  };
}

function findRouteFault(method: GatewayRouteFault["method"], path: string) {
  const faultIndex = runtime.activeFaults.findIndex(
    (entry) => entry.method === method && entry.path === path,
  );

  if (faultIndex === -1) {
    return null;
  }

  return {
    fault: runtime.activeFaults[faultIndex] ?? null,
    faultIndex,
  };
}

function takeRouteFault(method: GatewayRouteFault["method"], path: string) {
  const match = findRouteFault(method, path);

  if (!match) {
    return null;
  }

  const { fault, faultIndex } = match;

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
  if (path === "/ws/v1/devices") {
    return "devices";
  }

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

function buildDevicesPayload() {
  const connectedDeviceCount = runtime.state.devices.filter(
    (device) => device.state === "connected",
  ).length;

  return {
    connectionStatus: {
      error: null,
      foundMachines: runtime.state.devices.filter((device) => device.type === "machine"),
      foundScales: runtime.state.devices.filter((device) => device.type === "scale"),
      pendingAmbiguity: null,
      phase: connectedDeviceCount > 0 ? "ready" : "idle",
    },
    devices: runtime.state.devices,
    scanning: false,
    timestamp: new Date().toISOString(),
  };
}

function updateDisplayBrightness(brightness: number) {
  runtime.state.displayState = {
    ...runtime.state.displayState,
    brightness,
    lowBatteryBrightnessActive: false,
    requestedBrightness: brightness,
  };
}

function updateWakeLockOverride(enabled: boolean) {
  runtime.state.displayState = {
    ...runtime.state.displayState,
    wakeLockEnabled: enabled,
    wakeLockOverride: enabled,
  };
}

function getNextSnapshotTimestamp(timestamp: string) {
  const previousTimestampMs = Date.parse(timestamp);

  if (!Number.isFinite(previousTimestampMs)) {
    return new Date().toISOString();
  }

  return new Date(previousTimestampMs + 1_000).toISOString();
}

function roundTo(value: number, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function handleDevicesCommand(rawMessage: string, websocket: WebSocket) {
  try {
    const message = JSON.parse(rawMessage) as {
      command?: string;
      connect?: boolean;
      deviceId?: string;
    };

    if (message.command === "scan") {
      const shouldConnect = message.connect !== false;
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
        broadcastState(["devices", "scale"]);
        return;
      }

      broadcastState(["devices"]);
      return;
    }

    if (message.command === "connect" && message.deviceId) {
      const device = runtime.state.devices.find((entry) => entry.id === message.deviceId);

      if (!device) {
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
        broadcastState(["devices", "scale"]);
        return;
      }

      broadcastState(["devices"]);
      return;
    }

    if (message.command === "disconnect" && message.deviceId) {
      const device = runtime.state.devices.find((entry) => entry.id === message.deviceId);

      if (!device) {
        return;
      }

      device.state = "disconnected";

      if (device.type === "scale") {
        runtime.state.scaleSnapshot = null;
        broadcastState(["scale"]);
      }

      broadcastState(["devices"]);
      return;
    }
  } catch (error) {
    websocket.send(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Invalid devices command",
      }),
    );
  }
}

function handleDisplayCommand(rawMessage: string, websocket: WebSocket) {
  try {
    const message = JSON.parse(rawMessage) as {
      brightness?: number;
      command?: string;
    };

    if (message.command === "setBrightness") {
      updateDisplayBrightness(Number(message.brightness ?? runtime.state.displayState.brightness));
      broadcastState(["display"]);
      return;
    }

    if (message.command === "requestWakeLock") {
      updateWakeLockOverride(true);
      broadcastState(["display"]);
      return;
    }

    if (message.command === "releaseWakeLock") {
      updateWakeLockOverride(false);
      broadcastState(["display"]);
      return;
    }
  } catch (error) {
    websocket.send(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Invalid display command",
      }),
    );
  }
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
