import { beforeEach, describe, expect, it } from "vitest";

import {
  telemetryChartDefaultLaneVisibility,
  telemetryChartDefaultPreferences,
  useTelemetryChartStore,
} from "./telemetry-chart-store";

describe("useTelemetryChartStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useTelemetryChartStore.setState({
      ...telemetryChartDefaultPreferences,
      laneVisibility: {
        ...telemetryChartDefaultLaneVisibility,
      },
    });
  });

  it("persists selected series and lane visibility", () => {
    useTelemetryChartStore.getState().setPreset("all-signals");
    useTelemetryChartStore.getState().toggleLane("progress");

    const raw = localStorage.getItem("espresso-cockpit-telemetry-chart");

    expect(raw).not.toBeNull();
    expect(raw).toContain("\"activePreset\":\"all-signals\"");
    expect(raw).toContain("\"progress\":false");
    expect(raw).toContain("\"steamTemperature\"");
  });

  it("resets back to the live shot defaults", () => {
    useTelemetryChartStore.getState().setPreset("all-signals");
    useTelemetryChartStore.getState().toggleSeries("steamTemperature");
    useTelemetryChartStore.getState().resetToDefaultPreset();

    expect(useTelemetryChartStore.getState()).toMatchObject({
      activePreset: "live-shot",
      laneVisibility: telemetryChartDefaultLaneVisibility,
      selectedSeriesIds: telemetryChartDefaultPreferences.selectedSeriesIds,
    });
  });
});
