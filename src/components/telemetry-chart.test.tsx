import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import type { TelemetrySample } from "@/lib/telemetry";
import {
  telemetryChartDefaultLaneVisibility,
  telemetryChartDefaultPreferences,
  useTelemetryChartStore,
} from "@/stores/telemetry-chart-store";

import { TelemetryChart } from "./telemetry-chart";

const samples: TelemetrySample[] = [
  {
    timestamp: "2026-03-21T12:00:00.000Z",
    pressure: 1,
    targetPressure: 8,
    flow: 0.5,
    targetFlow: 2,
    mixTemperature: 92,
    targetMixTemperature: 93,
    groupTemperature: 91,
    targetGroupTemperature: 92,
    steamTemperature: 140,
    profileFrame: 1,
    state: "espresso",
    substate: "preinfusion",
    elapsedSeconds: 10,
    shotElapsedSeconds: 0,
    weight: 0,
    weightFlow: 0,
  },
  {
    timestamp: "2026-03-21T12:00:01.000Z",
    pressure: 9,
    targetPressure: 9,
    flow: 2.5,
    targetFlow: 2.6,
    mixTemperature: 93.4,
    targetMixTemperature: 93.5,
    groupTemperature: 92.8,
    targetGroupTemperature: 93,
    steamTemperature: 141,
    profileFrame: 4,
    state: "espresso",
    substate: "pouring",
    elapsedSeconds: 11,
    shotElapsedSeconds: 1,
    weight: 18.5,
    weightFlow: 2.1,
  },
];

describe("TelemetryChart", () => {
  beforeEach(() => {
    localStorage.clear();
    useTelemetryChartStore.setState({
      ...telemetryChartDefaultPreferences,
      laneVisibility: {
        ...telemetryChartDefaultLaneVisibility,
      },
    });
  });

  it("renders the live shot default readouts with units", () => {
    render(<TelemetryChart data={samples} layout="desktop" />);

    expect(screen.getAllByText("Shot time").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pressure").length).toBeGreaterThan(0);
    expect(screen.getAllByText("9.0 bar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2.5 ml/s").length).toBeGreaterThan(0);
    expect(screen.getAllByText("93.4 °C").length).toBeGreaterThan(0);
  });

  it("updates readouts when the cursor moves across the chart", () => {
    const { container } = render(<TelemetryChart data={samples} layout="desktop" />);
    const overlay = container.querySelector('rect[fill="transparent"]');

    expect(screen.getAllByText("0:01.0").length).toBeGreaterThan(0);
    expect(screen.queryByText("1.0 bar")).not.toBeInTheDocument();
    expect(overlay).not.toBeNull();

    Object.defineProperty(overlay, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 1154,
        height: 358,
        top: 0,
        left: 0,
        right: 1154,
        bottom: 358,
        x: 0,
        y: 0,
        toJSON: () => undefined,
      }),
    });

    fireEvent.pointerMove(overlay!, {
      clientX: 0,
      clientY: 120,
    });

    expect(screen.getAllByText("0:00.0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1.0 bar").length).toBeGreaterThan(0);
  });

  it("renders the compact tablet layout without the inline config panel", () => {
    render(<TelemetryChart data={samples} layout="tablet" />);

    expect(screen.getAllByText("Shot time").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Open chart controls")).toBeInTheDocument();
    expect(screen.queryByText("Configuration")).not.toBeInTheDocument();
    expect(screen.getAllByText("Mix").length).toBeGreaterThan(0);
    expect(screen.queryByText("Phase")).not.toBeInTheDocument();
    expect(screen.queryByText("Frame")).not.toBeInTheDocument();
  });

  it("opens the tablet config overlay and updates the preset", () => {
    render(<TelemetryChart data={samples} layout="tablet" />);

    fireEvent.click(screen.getByLabelText("Open chart controls"));

    expect(screen.getByTestId("telemetry-config-overlay")).toBeInTheDocument();

    fireEvent.click(screen.getByText("All signals"));

    expect(useTelemetryChartStore.getState().activePreset).toBe("all-signals");
  });
});
