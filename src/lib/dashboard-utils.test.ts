import { getDashboardPrepStatus, getDashboardPresentationMode } from "@/lib/dashboard-utils";
import type { MachineSnapshot, MachineState } from "@/rest/types";
import { describe, expect, it } from "vitest";

function buildSnapshot(state: MachineState, substate = "idle"): MachineSnapshot {
  return {
    flow: 0,
    groupTemperature: 93,
    mixTemperature: 30,
    pressure: 0,
    profileFrame: 0,
    state: {
      state,
      substate,
    },
    steamTemperature: 150,
    targetFlow: 0,
    targetGroupTemperature: 93,
    targetMixTemperature: 93,
    targetPressure: 0,
    timestamp: "2026-04-05T12:00:00.000Z",
  };
}

describe("getDashboardPrepStatus", () => {
  it("hides water temperature while idle", () => {
    const status = getDashboardPrepStatus({
      isOffline: false,
      snapshot: buildSnapshot("idle"),
      timeToReady: {
        currentTemp: 93,
        remainingTimeMs: 0,
        status: "reached",
        targetTemp: 93,
        timestamp: 1_743_194_400_000,
      },
    });

    expect(status.items.map((item) => item.label)).toEqual(["Brew head", "Steam"]);
  });

  it("shows water temperature during espresso", () => {
    const status = getDashboardPrepStatus({
      isOffline: false,
      snapshot: buildSnapshot("espresso"),
      timeToReady: {
        currentTemp: 93,
        remainingTimeMs: 0,
        status: "reached",
        targetTemp: 93,
        timestamp: 1_743_194_400_000,
      },
    });

    expect(status.items.map((item) => item.label)).toEqual(["Water", "Brew head", "Steam"]);
  });

  it("shows the idle machine phase as ready even if the time-to-ready plugin is still collecting data", () => {
    const status = getDashboardPrepStatus({
      isOffline: false,
      snapshot: buildSnapshot("idle"),
      timeToReady: {
        currentTemp: 90,
        remainingTimeMs: null,
        status: "insufficient_data",
        targetTemp: 93,
        timestamp: 1_743_194_400_000,
      },
    });

    expect(status.title).toBe("Idle / Idle");
    expect(status.tone).toBe("ready");
  });

  it("shows the preparing-for-shot machine phase as warming even if time-to-ready has reached target", () => {
    const status = getDashboardPrepStatus({
      isOffline: false,
      snapshot: buildSnapshot("idle", "preparingForShot"),
      timeToReady: {
        currentTemp: 93,
        remainingTimeMs: 0,
        status: "reached",
        targetTemp: 93,
        timestamp: 1_743_194_400_000,
      },
    });

    expect(status.title).toBe("Idle / Preparing For Shot");
    expect(status.tone).toBe("warming");
  });
});

describe("getDashboardPresentationMode", () => {
  it("switches to the shot workspace for bridge espresso shot phases", () => {
    expect(
      getDashboardPresentationMode({
        snapshot: buildSnapshot("espresso", "preparingForShot"),
        telemetry: [],
      }),
    ).toBe("shot");
  });

  it("switches to the shot workspace when telemetry carries an espresso shot phase", () => {
    expect(
      getDashboardPresentationMode({
        snapshot: buildSnapshot("idle"),
        telemetry: [
          {
            ...buildSnapshot("espresso", "preinfusion"),
            elapsedSeconds: 1,
            shotElapsedSeconds: 0,
            state: "espresso",
            substate: "preinfusion",
            weight: null,
            weightFlow: null,
          },
        ],
      }),
    ).toBe("shot");
  });

  it("does not infer shot mode from shot-like substates under non-espresso states", () => {
    expect(
      getDashboardPresentationMode({
        snapshot: buildSnapshot("busy", "preinfusion"),
        telemetry: [],
      }),
    ).toBe("controls");
  });
});
