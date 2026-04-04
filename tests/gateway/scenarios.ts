import {
  bridgeSettingsSchema,
  deviceSummaryListSchema,
  displayStateSchema,
  machineSnapshotSchema,
  machineWaterLevelsSchema,
  presenceSettingsSchema,
  profileRecordListSchema,
  scaleSnapshotSchema,
  shotDetailSchema,
  shotListResponseSchema,
  visualizerPluginSettingsSchema,
  workflowRecordSchema,
  type BridgeSettings,
  type DeviceSummary,
  type DisplayState,
  type MachineSnapshot,
  type MachineWaterLevels,
  type PresenceSettings,
  type ProfileRecord,
  type ScaleSnapshot,
  type ShotDetailRecord,
  type ShotListResponse,
  type VisualizerPluginSettings,
  type WorkflowRecord,
} from "../../src/rest/types";

export type GatewayStreamChannel = "display" | "machine" | "scale" | "timeToReady" | "water";

export interface GatewayRouteFault {
  body: unknown;
  delayMs?: number;
  method: "DELETE" | "GET" | "POST" | "PUT";
  once?: boolean;
  path: string;
  status: number;
}

export interface GatewayScenarioStep {
  checkpoint?: string;
  close?: GatewayStreamChannel[];
  label: string;
  malformed?: Partial<Record<GatewayStreamChannel, unknown>>;
  state?: Partial<GatewayScenarioState>;
}

export interface GatewayScenarioState {
  bridgeSettings: BridgeSettings;
  devices: DeviceSummary[];
  displayState: DisplayState;
  machineSnapshot: MachineSnapshot;
  presenceSettings: PresenceSettings;
  profiles: ProfileRecord[];
  scaleSnapshot: ScaleSnapshot | null;
  shotDetails: Record<string, ShotDetailRecord>;
  shots: ShotListResponse;
  visualizerSettings: VisualizerPluginSettings;
  waterLevels: MachineWaterLevels;
  workflow: WorkflowRecord;
}

export interface GatewayScenario {
  defaultRoute: string;
  expectedCheckpoints: string[];
  faults: GatewayRouteFault[];
  scenarioId: string;
  state: GatewayScenarioState;
  steps: GatewayScenarioStep[];
}

const baseNow = "2026-03-28T20:00:00.000Z";

function buildMachineSnapshot(
  overrides: Partial<MachineSnapshot> & {
    state?: Partial<MachineSnapshot["state"]>;
  } = {},
): MachineSnapshot {
  return machineSnapshotSchema.parse({
    flow: 0,
    groupTemperature: 93,
    mixTemperature: 93,
    pressure: 0,
    profileFrame: 0,
    state: {
      state: "idle",
      substate: "ready",
      ...overrides.state,
    },
    steamTemperature: 135,
    targetFlow: 0,
    targetGroupTemperature: 93,
    targetMixTemperature: 93,
    targetPressure: 0,
    timestamp: baseNow,
    ...overrides,
  });
}

function buildScaleSnapshot(overrides: Partial<ScaleSnapshot> = {}): ScaleSnapshot {
  return scaleSnapshotSchema.parse({
    batteryLevel: 82,
    timerValue: 0,
    timestamp: baseNow,
    weight: 18.2,
    weightFlow: 0,
    ...overrides,
  });
}

function buildWaterLevels(overrides: Partial<MachineWaterLevels> = {}): MachineWaterLevels {
  return machineWaterLevelsSchema.parse({
    currentLevel: 48,
    refillLevel: 25,
    ...overrides,
  });
}

function buildDisplayState(overrides: Partial<DisplayState> = {}): DisplayState {
  return displayStateSchema.parse({
    brightness: 76,
    lowBatteryBrightnessActive: false,
    platformSupported: {
      brightness: true,
      wakeLock: true,
    },
    requestedBrightness: 76,
    wakeLockEnabled: true,
    wakeLockOverride: false,
    ...overrides,
  });
}

function buildWorkflow(overrides: Partial<WorkflowRecord> = {}): WorkflowRecord {
  return workflowRecordSchema.parse({
    context: {
      coffeeName: "Red Brick",
      coffeeRoaster: "Square Mile",
      grinderModel: "Niche Zero",
      grinderSetting: "5.2",
      targetDoseWeight: 18,
      targetYield: 36,
    },
    description: "Daily shot",
    hotWaterData: {
      targetTemperature: 75,
      volume: 50,
    },
    id: "workflow-1",
    name: "Morning",
    profile: {
      author: "Decent",
      beverage_type: "espresso",
      notes: "Baseline house espresso.",
      steps: [
        { flow: 0, pressure: 0, seconds: 0, temperature: 92 },
        { flow: 2.5, pressure: 3, seconds: 5, temperature: 93 },
        { flow: 2.3, pressure: 8.5, seconds: 12, temperature: 93 },
        { flow: 1.2, pressure: 5.5, seconds: 24, temperature: 92.5 },
      ],
      title: "House",
      version: "2",
    },
    rinseData: {
      duration: 10,
    },
    steamSettings: {
      duration: 50,
      flow: 1.5,
    },
    ...overrides,
  });
}

function buildProfiles(): ProfileRecord[] {
  return profileRecordListSchema.parse([
    {
      id: "profile:active",
      isDefault: true,
      profile: buildWorkflow().profile,
      visibility: "visible",
    },
    {
      id: "profile:turbo",
      isDefault: false,
      profile: {
        author: "Decent",
        beverage_type: "espresso",
        notes: "Fast and bright.",
        steps: [
          { flow: 0, pressure: 0, seconds: 0, temperature: 92 },
          { flow: 4, pressure: 7, seconds: 6, temperature: 93 },
          { flow: 3.5, pressure: 6, seconds: 18, temperature: 93 },
        ],
        title: "Turbo",
        version: "2",
      },
      visibility: "visible",
    },
    {
      id: "profile:allongé",
      isDefault: false,
      profile: {
        author: "Decent",
        beverage_type: "espresso",
        notes: "Longer brew ratio.",
        steps: [
          { flow: 0, pressure: 0, seconds: 0, temperature: 92 },
          { flow: 2.2, pressure: 3, seconds: 5, temperature: 93 },
          { flow: 2.1, pressure: 8, seconds: 30, temperature: 92.5 },
        ],
        title: "Allonge",
        version: "2",
      },
      visibility: "visible",
    },
  ]);
}

function buildDevices(overrides?: DeviceSummary[]): DeviceSummary[] {
  return deviceSummaryListSchema.parse(
    overrides ?? [
      {
        id: "scale-1",
        name: "Acaia Lunar",
        state: "connected",
        type: "scale",
      },
      {
        id: "machine-1",
        name: "DE1XL",
        state: "connected",
        type: "machine",
      },
      {
        id: "machine-2",
        name: "Bengle",
        state: "disconnected",
        type: "machine",
      },
    ],
  );
}

function buildBridgeSettings(overrides: Partial<BridgeSettings> = {}): BridgeSettings {
  return bridgeSettingsSchema.parse({
    preferredMachineId: "machine-1",
    preferredScaleId: "scale-1",
    scalePowerMode: "alwaysOn",
    ...overrides,
  });
}

function buildPresenceSettings(overrides: Partial<PresenceSettings> = {}): PresenceSettings {
  return presenceSettingsSchema.parse({
    schedules: [],
    sleepTimeoutMinutes: 30,
    userPresenceEnabled: true,
    ...overrides,
  });
}

function buildVisualizerSettings(
  overrides: Partial<VisualizerPluginSettings> = {},
): VisualizerPluginSettings {
  return visualizerPluginSettingsSchema.parse({
    AutoUpload: true,
    LengthThreshold: 5,
    Password: "secret",
    Username: "brew-user",
    ...overrides,
  });
}

function buildShotDetail(
  id: string,
  timestamp: string,
  workflow = buildWorkflow(),
): ShotDetailRecord {
  return shotDetailSchema.parse({
    id,
    measurements: [
      {
        machine: buildMachineSnapshot({
          flow: 0,
          pressure: 0,
          profileFrame: 0,
          state: {
            state: "espresso",
            substate: "preinfusion",
          },
          timestamp,
        }),
        scale: buildScaleSnapshot({
          batteryLevel: 81,
          timerValue: 2,
          timestamp,
          weight: 1.2,
          weightFlow: 0.4,
        }),
        volume: 1,
      },
      {
        machine: buildMachineSnapshot({
          flow: 2.5,
          pressure: 8.8,
          profileFrame: 2,
          state: {
            state: "espresso",
            substate: "pouring",
          },
          timestamp: "2026-03-28T19:58:12.000Z",
        }),
        scale: buildScaleSnapshot({
          batteryLevel: 81,
          timerValue: 12,
          timestamp: "2026-03-28T19:58:12.000Z",
          weight: 18.8,
          weightFlow: 1.2,
        }),
        volume: 24,
      },
      {
        machine: buildMachineSnapshot({
          flow: 1.1,
          pressure: 5.2,
          profileFrame: 3,
          state: {
            state: "idle",
            substate: "ready",
          },
          timestamp: "2026-03-28T19:58:26.000Z",
        }),
        scale: buildScaleSnapshot({
          batteryLevel: 80,
          timerValue: 26,
          timestamp: "2026-03-28T19:58:26.000Z",
          weight: 36.4,
          weightFlow: 0,
        }),
        volume: 38,
      },
    ],
    timestamp,
    workflow,
  });
}

function buildShots(): {
  shotDetails: Record<string, ShotDetailRecord>;
  shots: ShotListResponse;
} {
  const firstShot = buildShotDetail("shot-1", "2026-03-28T19:58:00.000Z");
  const secondShot = buildShotDetail(
    "shot-2",
    "2026-03-28T18:31:00.000Z",
    buildWorkflow({
      context: {
        coffeeName: "Sweet Bloom",
        coffeeRoaster: "Passenger",
        grinderModel: "Lagom Mini",
        grinderSetting: "4.2",
        targetDoseWeight: 19,
        targetYield: 42,
      },
      description: "Longer ratio",
      name: "Afternoon",
      profile: {
        author: "Decent",
        beverage_type: "espresso",
        notes: "Lighter roast profile.",
        steps: [
          { flow: 0, pressure: 0, seconds: 0, temperature: 91 },
          { flow: 2.1, pressure: 3, seconds: 7, temperature: 92.5 },
          { flow: 2.0, pressure: 7.5, seconds: 26, temperature: 92 },
        ],
        title: "Sweet Bloom",
        version: "2",
      },
    }),
  );

  const shots = shotListResponseSchema.parse({
    items: [
      {
        id: firstShot.id,
        timestamp: firstShot.timestamp,
        workflow: firstShot.workflow,
      },
      {
        id: secondShot.id,
        timestamp: secondShot.timestamp,
        workflow: secondShot.workflow,
      },
    ],
    limit: 2,
    offset: 0,
    total: 2,
  });

  return {
    shotDetails: {
      "shot-1": firstShot,
      "shot-2": secondShot,
    },
    shots,
  };
}

function buildBaseState(overrides: Partial<GatewayScenarioState> = {}): GatewayScenarioState {
  const { shotDetails, shots } = buildShots();

  return {
    bridgeSettings: buildBridgeSettings(),
    devices: buildDevices(),
    displayState: buildDisplayState(),
    machineSnapshot: buildMachineSnapshot(),
    presenceSettings: buildPresenceSettings(),
    profiles: buildProfiles(),
    scaleSnapshot: buildScaleSnapshot(),
    shotDetails,
    shots,
    visualizerSettings: buildVisualizerSettings(),
    waterLevels: buildWaterLevels(),
    workflow: buildWorkflow(),
    ...overrides,
  };
}

function buildScenario(input: GatewayScenario): GatewayScenario {
  return {
    ...input,
    state: {
      ...input.state,
      bridgeSettings: buildBridgeSettings(input.state.bridgeSettings),
      devices: buildDevices(input.state.devices),
      displayState: buildDisplayState(input.state.displayState),
      machineSnapshot: buildMachineSnapshot(input.state.machineSnapshot),
      presenceSettings: buildPresenceSettings(input.state.presenceSettings),
      profiles: profileRecordListSchema.parse(input.state.profiles),
      scaleSnapshot:
        input.state.scaleSnapshot == null ? null : buildScaleSnapshot(input.state.scaleSnapshot),
      shotDetails: Object.fromEntries(
        Object.entries(input.state.shotDetails).map(([shotId, detail]) => [
          shotId,
          buildShotDetail(shotId, detail.timestamp ?? baseNow, detail.workflow),
        ]),
      ),
      shots: shotListResponseSchema.parse(input.state.shots),
      visualizerSettings: buildVisualizerSettings(input.state.visualizerSettings),
      waterLevels: buildWaterLevels(input.state.waterLevels),
      workflow: buildWorkflow(input.state.workflow),
    },
  };
}

export const gatewayScenarios = {
  "dashboard-active-shot": buildScenario({
    defaultRoute: "/",
    expectedCheckpoints: ["prep-board", "shot-workspace"],
    faults: [],
    scenarioId: "dashboard-active-shot",
    state: buildBaseState(),
    steps: [
      {
        checkpoint: "shot-workspace",
        label: "start-shot",
        state: {
          machineSnapshot: buildMachineSnapshot({
            flow: 2.3,
            pressure: 8.8,
            profileFrame: 2,
            state: {
              state: "espresso",
              substate: "pouring",
            },
            timestamp: "2026-03-28T20:00:08.000Z",
          }),
          scaleSnapshot: buildScaleSnapshot({
            timerValue: 8,
            timestamp: "2026-03-28T20:00:08.000Z",
            weight: 15.4,
            weightFlow: 1.3,
          }),
        },
      },
    ],
  }),
  "dashboard-idle": buildScenario({
    defaultRoute: "/",
    expectedCheckpoints: ["prep-board"],
    faults: [],
    scenarioId: "dashboard-idle",
    state: buildBaseState(),
    steps: [],
  }),
  "dashboard-low-water": buildScenario({
    defaultRoute: "/",
    expectedCheckpoints: ["water-alert"],
    faults: [],
    scenarioId: "dashboard-low-water",
    state: buildBaseState({
      waterLevels: buildWaterLevels({
        currentLevel: 8,
        refillLevel: 25,
      }),
    }),
    steps: [],
  }),
  "dashboard-malformed-machine-stream": buildScenario({
    defaultRoute: "/",
    expectedCheckpoints: ["machine-stream-error"],
    faults: [],
    scenarioId: "dashboard-malformed-machine-stream",
    state: buildBaseState(),
    steps: [
      {
        checkpoint: "machine-stream-error",
        label: "invalid-machine-payload",
        malformed: {
          machine: {
            state: "invalid",
            timestamp: baseNow,
          },
        },
      },
    ],
  }),
  "dashboard-no-scale": buildScenario({
    defaultRoute: "/",
    expectedCheckpoints: ["no-scale"],
    faults: [],
    scenarioId: "dashboard-no-scale",
    state: buildBaseState({
      bridgeSettings: buildBridgeSettings({
        preferredScaleId: null,
      }),
      devices: buildDevices([
        {
          id: "machine-1",
          name: "DE1XL",
          state: "connected",
          type: "machine",
        },
      ]),
      scaleSnapshot: null,
    }),
    steps: [],
  }),
  "dashboard-sleeping": buildScenario({
    defaultRoute: "/",
    expectedCheckpoints: ["sleep-screen"],
    faults: [],
    scenarioId: "dashboard-sleeping",
    state: buildBaseState({
      machineSnapshot: buildMachineSnapshot({
        state: {
          state: "sleeping",
          substate: "idle",
        },
      }),
    }),
    steps: [],
  }),
  "history-default": buildScenario({
    defaultRoute: "/history",
    expectedCheckpoints: ["history-detail"],
    faults: [],
    scenarioId: "history-default",
    state: buildBaseState(),
    steps: [],
  }),
  "history-empty": buildScenario({
    defaultRoute: "/history",
    expectedCheckpoints: ["history-empty"],
    faults: [],
    scenarioId: "history-empty",
    state: buildBaseState({
      shotDetails: {},
      shots: shotListResponseSchema.parse({
        items: [],
        limit: 0,
        offset: 0,
        total: 0,
      }),
    }),
    steps: [],
  }),
  "history-missing-shot-detail": buildScenario({
    defaultRoute: "/history?shotId=shot-2",
    expectedCheckpoints: ["history-shot-error"],
    faults: [
      {
        body: {
          error: "Shot detail unavailable",
        },
        method: "GET",
        path: "/api/v1/shots/shot-2",
        status: 500,
      },
    ],
    scenarioId: "history-missing-shot-detail",
    state: buildBaseState(),
    steps: [],
  }),
  "history-selected-missing": buildScenario({
    defaultRoute: "/history?shotId=missing-shot",
    expectedCheckpoints: ["history-missing-shot"],
    faults: [],
    scenarioId: "history-selected-missing",
    state: buildBaseState(),
    steps: [],
  }),
  "settings-default": buildScenario({
    defaultRoute: "/settings",
    expectedCheckpoints: ["settings-ready"],
    faults: [],
    scenarioId: "settings-default",
    state: buildBaseState({
      visualizerSettings: buildVisualizerSettings({
        AutoUpload: false,
      }),
    }),
    steps: [],
  }),
  "settings-device-error": buildScenario({
    defaultRoute: "/settings",
    expectedCheckpoints: ["device-error"],
    faults: [
      {
        body: {
          error: "Bridge offline",
        },
        method: "GET",
        path: "/api/v1/devices",
        status: 500,
      },
    ],
    scenarioId: "settings-device-error",
    state: buildBaseState(),
    steps: [],
  }),
  "settings-no-devices": buildScenario({
    defaultRoute: "/settings",
    expectedCheckpoints: ["device-empty"],
    faults: [],
    scenarioId: "settings-no-devices",
    state: buildBaseState({
      devices: [],
    }),
    steps: [],
  }),
  "slow-machine-state": buildScenario({
    defaultRoute: "/",
    expectedCheckpoints: ["slow-machine-state"],
    faults: [
      {
        body: buildMachineSnapshot(),
        delayMs: 900,
        method: "GET",
        path: "/api/v1/machine/state",
        status: 200,
      },
    ],
    scenarioId: "slow-machine-state",
    state: buildBaseState(),
    steps: [],
  }),
  "workflows-default": buildScenario({
    defaultRoute: "/workflows",
    expectedCheckpoints: ["workflows-ready"],
    faults: [],
    scenarioId: "workflows-default",
    state: buildBaseState(),
    steps: [],
  }),
  "workflows-visualizer-disabled": buildScenario({
    defaultRoute: "/workflows",
    expectedCheckpoints: ["visualizer-disabled"],
    faults: [],
    scenarioId: "workflows-visualizer-disabled",
    state: buildBaseState({
      visualizerSettings: buildVisualizerSettings({
        AutoUpload: false,
      }),
    }),
    steps: [],
  }),
} satisfies Record<string, GatewayScenario>;

export type GatewayScenarioId = keyof typeof gatewayScenarios;

export const defaultGatewayScenarioId: GatewayScenarioId = "dashboard-idle";
