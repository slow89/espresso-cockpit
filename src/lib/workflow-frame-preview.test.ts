import { describe, expect, it } from "vitest";

import { buildFramePreviewData } from "./workflow-frame-preview";

describe("buildFramePreviewData", () => {
  it("classifies preferred numeric fields into workflow families and defaults", () => {
    const preview = buildFramePreviewData({
      steps: [
        {
          pressure: 2,
          flow: 1.2,
          temperature: 92.5,
          seconds: 4,
          notes: "preinfusion",
        },
        {
          pressure: 8,
          flow: 2.5,
          temperature: 93.2,
          seconds: 8,
          notes: "pour",
        },
      ],
    });

    expect(preview.numericKeys).toEqual(["pressure", "flow", "temperature", "seconds"]);
    expect(preview.series.find((series) => series.id === "pressure")?.family).toBe("pressure");
    expect(preview.series.find((series) => series.id === "flow")?.family).toBe("flow");
    expect(preview.series.find((series) => series.id === "temperature")?.family).toBe(
      "temperature",
    );
    expect(preview.series.find((series) => series.id === "seconds")?.family).toBe("progress");
    expect(preview.defaultSeriesIds).toEqual(
      expect.arrayContaining(["pressure", "flow", "temperature", "seconds"]),
    );
  });

  it("routes unknown numeric fields into the other family while keeping raw frame data", () => {
    const preview = buildFramePreviewData({
      steps: [
        {
          mysteryScalar: 11,
          soak_seconds: 5,
          enabled: true,
          phase: "hold",
        },
      ],
    });

    expect(preview.series.find((series) => series.id === "mysteryScalar")?.family).toBe("other");
    expect(preview.series.find((series) => series.id === "soak_seconds")?.family).toBe(
      "progress",
    );
    expect(preview.frames[0]).toMatchObject({
      enabled: true,
      phase: "hold",
    });
  });

  it("adds a synthetic frame series when no progress field exists", () => {
    const preview = buildFramePreviewData({
      steps: [
        { pressure: 4, weight: 10 },
        { pressure: 8, weight: 18 },
      ],
    });

    expect(preview.series.find((series) => series.id === "frameIndex")?.family).toBe("progress");
    expect(preview.defaultSeriesIds).toContain("frameIndex");
  });
});
