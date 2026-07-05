import { describe, expect, it } from "vitest";

import type { DashboardPostShotSummary } from "@/lib/dashboard-post-shot-summary";
import type { TelemetrySample } from "@/lib/telemetry";
import {
  buildShotAnalysisPrompt,
  buildTelemetryTable,
  downsampleTelemetry,
  maxShotAnalysisTelemetryRows,
  parseShotAnalysisText,
  ShotAnalysisError,
} from "./shot-analysis";

describe("buildShotAnalysisPrompt", () => {
  it("includes shot facts and the telemetry table", () => {
    const prompt = buildShotAnalysisPrompt(buildSummary(), {});

    expect(prompt).toContain("Profile: House");
    expect(prompt).toContain("Coffee: Colombia");
    expect(prompt).toContain("Target dose: 18.0 g");
    expect(prompt).toContain("Final yield: 36.2 g");
    expect(prompt).toContain("Actual ratio: 1:2.0");
    expect(prompt).toContain("Telemetry (columns: t_s, pressure_bar");
  });

  it("reads telemetry alone when no taste was tapped", () => {
    const prompt = buildShotAnalysisPrompt(buildSummary(), {});

    expect(prompt).toContain("Operator taste input: none");
    expect(prompt).not.toContain("Extraction:");
  });

  it("includes only the tapped taste scales", () => {
    const prompt = buildShotAnalysisPrompt(buildSummary(), { extraction: 0, body: 2 });

    expect(prompt).toContain("Extraction: Too sour");
    expect(prompt).toContain("Body: Heavy");
    expect(prompt).not.toContain("Strength:");
  });
});

describe("buildTelemetryTable", () => {
  it("caps the table at the downsample limit", () => {
    const telemetry = Array.from({ length: 900 }, (_, index) =>
      buildTelemetrySample({ shotElapsedSeconds: index / 10 }),
    );

    const rows = buildTelemetryTable(telemetry).split("\n");

    expect(rows).toHaveLength(maxShotAnalysisTelemetryRows);
    expect(rows[0]).toMatch(/^0\.0,/);
    expect(rows[rows.length - 1]).toMatch(/^89\.9,/);
  });

  it("leaves missing values as empty cells", () => {
    const rows = buildTelemetryTable([
      buildTelemetrySample({ shotElapsedSeconds: 1, weight: null, weightFlow: null }),
    ]);

    expect(rows).toBe("1.0,8.5,9.0,2.0,2.2,,,93.0,92.0");
  });
});

describe("downsampleTelemetry", () => {
  it("keeps first and last samples", () => {
    const telemetry = Array.from({ length: 50 }, (_, index) =>
      buildTelemetrySample({ elapsedSeconds: index }),
    );

    const samples = downsampleTelemetry(telemetry, 10);

    expect(samples).toHaveLength(10);
    expect(samples[0]).toBe(telemetry[0]);
    expect(samples[9]).toBe(telemetry[49]);
  });

  it("returns short telemetry untouched", () => {
    const telemetry = [buildTelemetrySample(), buildTelemetrySample()];

    expect(downsampleTelemetry(telemetry, 10)).toEqual(telemetry);
  });
});

describe("parseShotAnalysisText", () => {
  it("parses a well-formed analysis", () => {
    const result = parseShotAnalysisText(
      JSON.stringify({
        diagnosis: "Fast pour, pressure never held the plateau.",
        primary: { action: "Grind finer", detail: "2 steps", rationale: "Slows early flow." },
        secondary: null,
      }),
    );

    expect(result.primary.action).toBe("Grind finer");
    expect(result.secondary).toBeNull();
  });

  it("parses an optional secondary adjustment", () => {
    const result = parseShotAnalysisText(
      JSON.stringify({
        diagnosis: "Choked tail.",
        primary: { action: "Grind coarser", detail: "1 step", rationale: "Opens the tail." },
        secondary: { action: "Drop temperature 1 °C", rationale: "If bitterness lingers." },
      }),
    );

    expect(result.secondary?.action).toBe("Drop temperature 1 °C");
  });

  it("rejects non-JSON and schema mismatches", () => {
    expect(() => parseShotAnalysisText("not json")).toThrow(ShotAnalysisError);
    expect(() => parseShotAnalysisText(JSON.stringify({ diagnosis: "only" }))).toThrow(
      ShotAnalysisError,
    );
  });
});

function buildSummary(): DashboardPostShotSummary {
  return {
    endedAt: "2026-03-25T10:00:27.000Z",
    localId: "2026-03-25T10:00:00.000Z-2026-03-25T10:00:27.000Z",
    startedAt: "2026-03-25T10:00:00.000Z",
    telemetry: [
      buildTelemetrySample({ shotElapsedSeconds: 0, weight: 0 }),
      buildTelemetrySample({ shotElapsedSeconds: 27, weight: 36.2 }),
    ],
    workflow: {
      coffeeName: "Colombia",
      name: "Morning",
      profileTitle: "House",
      targetDoseWeight: 18,
      targetYield: 36,
    },
  };
}

function buildTelemetrySample(overrides: Partial<TelemetrySample> = {}): TelemetrySample {
  return {
    elapsedSeconds: 0,
    flow: 2,
    groupTemperature: 92,
    mixTemperature: 93,
    pressure: 8.5,
    profileFrame: 0,
    shotElapsedSeconds: null,
    state: "espresso",
    steamTemperature: 135,
    substate: "pouring",
    targetFlow: 2.2,
    targetGroupTemperature: 93,
    targetMixTemperature: 93,
    targetPressure: 9,
    timestamp: "2026-03-25T10:00:00.000Z",
    weight: 30,
    weightFlow: 1.8,
    ...overrides,
  };
}
