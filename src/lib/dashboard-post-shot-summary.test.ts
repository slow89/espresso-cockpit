import { describe, expect, it } from "vitest";

import type { TelemetrySample } from "@/lib/telemetry";
import {
  buildDashboardPostShotSummary,
  getPostShotHistoryShotId,
} from "./dashboard-post-shot-summary";

describe("dashboard post-shot summary", () => {
  it("builds a frozen summary for a meaningful extraction", () => {
    const summary = buildDashboardPostShotSummary({
      telemetry: [
        buildTelemetrySample("espresso", "preparingForShot", {
          shotElapsedSeconds: 0,
          timestamp: "2026-03-25T10:00:00.000Z",
        }),
        buildTelemetrySample("espresso", "pouring", {
          shotElapsedSeconds: 5,
          timestamp: "2026-03-25T10:00:05.000Z",
          weight: 28.4,
        }),
        buildTelemetrySample("idle", "idle", {
          timestamp: "2026-03-25T10:00:06.000Z",
        }),
      ],
      workflow: {
        id: "workflow-1",
        name: "Morning",
        profile: {
          steps: [],
          title: "House",
        },
        context: {
          coffeeName: "Colombia",
          targetDoseWeight: 18,
          targetYield: 36,
        },
      },
    });

    expect(summary).toMatchObject({
      endedAt: "2026-03-25T10:00:05.000Z",
      startedAt: "2026-03-25T10:00:00.000Z",
      telemetry: [
        expect.objectContaining({ state: "espresso", substate: "preparingForShot" }),
        expect.objectContaining({ state: "espresso", substate: "pouring" }),
      ],
      workflow: {
        coffeeName: "Colombia",
        profileTitle: "House",
        targetDoseWeight: 18,
        targetYield: 36,
      },
    });
  });

  it("ignores espresso telemetry shorter than the v1 cutoff", () => {
    expect(
      buildDashboardPostShotSummary({
        telemetry: [
          buildTelemetrySample("espresso", "preparingForShot", {
            shotElapsedSeconds: 0,
            timestamp: "2026-03-25T10:00:00.000Z",
          }),
          buildTelemetrySample("espresso", "pouring", {
            shotElapsedSeconds: 4.9,
            timestamp: "2026-03-25T10:00:04.900Z",
          }),
        ],
      }),
    ).toBeNull();
  });

  it("matches the summary to the latest persisted bridge shot", () => {
    const summary = buildDashboardPostShotSummary({
      telemetry: [
        buildTelemetrySample("espresso", "preparingForShot", {
          shotElapsedSeconds: 0,
          timestamp: "2026-03-25T10:00:00.000Z",
        }),
        buildTelemetrySample("espresso", "pouring", {
          shotElapsedSeconds: 5,
          timestamp: "2026-03-25T10:00:05.000Z",
        }),
      ],
    });

    expect(summary).not.toBeNull();
    expect(
      getPostShotHistoryShotId(summary!, {
        id: "shot-1",
        timestamp: "2026-03-25T10:00:01.000Z",
      }),
    ).toBe("shot-1");
    expect(
      getPostShotHistoryShotId(summary!, {
        id: "shot-0",
        timestamp: "2026-03-25T09:59:00.000Z",
      }),
    ).toBeNull();
  });
});

function buildTelemetrySample(
  state: TelemetrySample["state"],
  substate: TelemetrySample["substate"] = state,
  overrides: Partial<TelemetrySample> = {},
): TelemetrySample {
  return {
    elapsedSeconds: 0,
    flow: 0,
    groupTemperature: 92,
    mixTemperature: 93,
    pressure: 0,
    profileFrame: 0,
    shotElapsedSeconds: null,
    state,
    steamTemperature: 135,
    substate,
    targetFlow: 0,
    targetGroupTemperature: 93,
    targetMixTemperature: 93,
    targetPressure: 0,
    timestamp: "2026-03-25T10:00:00.000Z",
    weight: null,
    weightFlow: null,
    ...overrides,
  };
}
