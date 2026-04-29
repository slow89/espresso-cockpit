import { describe, expect, it } from "vitest";

import type { MachineSnapshot } from "@/rest/types";

import {
  appendTelemetryHistory,
  maxTelemetrySamples,
  mergeScaleSnapshotIntoTelemetry,
  telemetrySeriesRegistry,
} from "./telemetry";

function buildSnapshot(
  overrides: Partial<MachineSnapshot> & {
    timestamp: string;
  },
): MachineSnapshot {
  return {
    timestamp: overrides.timestamp,
    state: overrides.state ?? {
      state: "idle",
      substate: "ready",
    },
    flow: overrides.flow ?? 0,
    pressure: overrides.pressure ?? 0,
    targetFlow: overrides.targetFlow ?? 0,
    targetPressure: overrides.targetPressure ?? 0,
    mixTemperature: overrides.mixTemperature ?? 93,
    groupTemperature: overrides.groupTemperature ?? 92,
    targetMixTemperature: overrides.targetMixTemperature ?? 93,
    targetGroupTemperature: overrides.targetGroupTemperature ?? 92,
    profileFrame: overrides.profileFrame ?? 0,
    steamTemperature: overrides.steamTemperature ?? 140,
  };
}

describe("telemetry registry", () => {
  it("covers every chartable realtime machine snapshot field once", () => {
    expect(telemetrySeriesRegistry.map((series) => series.id)).toEqual([
      "pressure",
      "targetPressure",
      "flow",
      "targetFlow",
      "weight",
      "weightFlow",
      "mixTemperature",
      "targetMixTemperature",
      "groupTemperature",
      "targetGroupTemperature",
      "steamTemperature",
      "profileFrame",
    ]);

    telemetrySeriesRegistry.forEach((series) => {
      expect(series.label.length).toBeGreaterThan(0);
      expect(series.unit.length).toBeGreaterThan(0);
    });
  });
});

describe("appendTelemetryHistory", () => {
  it("preserves full snapshots, shot timing, and trims the buffer", () => {
    let telemetry = appendTelemetryHistory(
      [],
      buildSnapshot({
        timestamp: "2026-03-21T12:00:00.000Z",
        pressure: 0.2,
        targetPressure: 0,
        flow: 0,
        targetFlow: 0,
        mixTemperature: 92.4,
        targetMixTemperature: 93,
        groupTemperature: 91.9,
        targetGroupTemperature: 92,
        profileFrame: 0,
      }),
    );

    telemetry = appendTelemetryHistory(
      telemetry,
      buildSnapshot({
        timestamp: "2026-03-21T12:00:01.000Z",
        state: {
          state: "espresso",
          substate: "pouring",
        },
        pressure: 2.4,
        targetPressure: 8.8,
        flow: 1.5,
        targetFlow: 2.1,
        profileFrame: 3,
      }),
    );

    telemetry = appendTelemetryHistory(
      telemetry,
      buildSnapshot({
        timestamp: "2026-03-21T12:00:03.000Z",
        state: {
          state: "espresso",
          substate: "pouring",
        },
        pressure: 8.9,
        targetPressure: 9,
        flow: 2.4,
        targetFlow: 2.5,
        mixTemperature: 93.3,
        targetMixTemperature: 93.5,
        groupTemperature: 92.7,
        targetGroupTemperature: 93,
        steamTemperature: 143,
        profileFrame: 7,
      }),
    );

    const latest = telemetry.at(-1);

    expect(latest).toMatchObject({
      pressure: 8.9,
      targetPressure: 9,
      flow: 2.4,
      targetFlow: 2.5,
      mixTemperature: 93.3,
      targetMixTemperature: 93.5,
      groupTemperature: 92.7,
      targetGroupTemperature: 93,
      steamTemperature: 143,
      profileFrame: 7,
      state: "espresso",
      substate: "pouring",
      elapsedSeconds: 3,
      shotElapsedSeconds: 2,
    });

    const trimmed = Array.from({ length: maxTelemetrySamples + 8 }, (_, index) =>
      buildSnapshot({
        timestamp: new Date(Date.UTC(2026, 2, 21, 12, 0, index)).toISOString(),
        pressure: index,
      }),
    ).reduce(
      (telemetry, snapshot) => appendTelemetryHistory(telemetry, snapshot),
      [] as ReturnType<typeof appendTelemetryHistory>,
    );

    expect(trimmed).toHaveLength(maxTelemetrySamples);
    expect(trimmed[0]?.pressure).toBe(8);
  });

  it("starts shot timing from the bridge espresso shot state", () => {
    let telemetry = appendTelemetryHistory(
      [],
      buildSnapshot({
        timestamp: "2026-03-21T12:00:00.000Z",
        state: {
          state: "idle",
          substate: "ready",
        },
      }),
    );

    telemetry = appendTelemetryHistory(
      telemetry,
      buildSnapshot({
        timestamp: "2026-03-21T12:00:01.000Z",
        state: {
          state: "espresso",
          substate: "preparingForShot",
        },
      }),
    );

    telemetry = appendTelemetryHistory(
      telemetry,
      buildSnapshot({
        timestamp: "2026-03-21T12:00:03.000Z",
        state: {
          state: "espresso",
          substate: "preinfusion",
        },
      }),
    );

    expect(telemetry.at(-2)).toMatchObject({
      shotElapsedSeconds: 0,
      state: "espresso",
      substate: "preparingForShot",
    });
    expect(telemetry.at(-1)).toMatchObject({
      shotElapsedSeconds: 2,
      state: "espresso",
      substate: "preinfusion",
    });
  });
});

describe("mergeScaleSnapshotIntoTelemetry", () => {
  it("fills in scale values for the latest sample when timestamps match", () => {
    const telemetry = appendTelemetryHistory(
      [],
      buildSnapshot({
        timestamp: "2026-03-21T12:00:01.000Z",
        state: {
          state: "espresso",
          substate: "pouring",
        },
      }),
    );

    const merged = mergeScaleSnapshotIntoTelemetry(telemetry, {
      batteryLevel: 82,
      timerValue: 8,
      timestamp: "2026-03-21T12:00:01.000Z",
      weight: 15.4,
      weightFlow: 1.2,
    });

    expect(merged.at(-1)).toMatchObject({
      weight: 15.4,
      weightFlow: 1.2,
    });
  });

  it("leaves telemetry unchanged when the timestamps do not match", () => {
    const telemetry = appendTelemetryHistory(
      [],
      buildSnapshot({
        timestamp: "2026-03-21T12:00:01.000Z",
      }),
    );

    const merged = mergeScaleSnapshotIntoTelemetry(telemetry, {
      batteryLevel: 82,
      timerValue: 8,
      timestamp: "2026-03-21T12:00:02.000Z",
      weight: 15.4,
      weightFlow: 1.2,
    });

    expect(merged).toEqual(telemetry);
  });
});
