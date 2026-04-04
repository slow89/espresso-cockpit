import { useLayoutEffect, useRef, useState } from "react";

import { scaleLinear } from "@visx/scale";

import {
  formatTelemetryClock,
  formatTelemetryDelta,
  formatTelemetryTimestampLabel,
  formatTelemetryValue,
  getTelemetrySeriesDefinition,
  telemetryFamilyLabels,
  telemetryFamilyOrder,
  type TelemetrySample,
  type TelemetrySeriesDefinition,
  type TelemetrySeriesFamily,
  type TelemetrySeriesId,
} from "@/lib/telemetry";

export const chartTheme = {
  surface: "var(--chart-surface)",
  laneSurface: "var(--chart-lane)",
  laneSurfaceAlt: "var(--chart-lane-alt)",
  border: "var(--chart-border)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  text: "var(--foreground)",
  muted: "var(--muted-foreground)",
  crosshair: "var(--chart-crosshair)",
  crosshairGlow: "var(--chart-crosshair-glow)",
  event: "var(--chart-event)",
  atmosphereTint: "var(--chart-atmosphere-tint)",
  atmosphereEdge: "var(--chart-atmosphere-edge)",
  mono: "var(--font-mono)",
  sans: "var(--font-sans)",
} as const;

export function getGlowFilterId(color: string) {
  return `glow-${color.replace("#", "")}`;
}

export function getAreaGradientId(seriesId: string) {
  return `area-${seriesId}`;
}

export function getUniqueSeriesColors(series: TelemetrySeriesDefinition[]) {
  return [...new Set(series.map((s) => s.color))];
}

export type TelemetryLayoutMode = "auto" | "tablet" | "desktop";
export type ChartDensity = "compact" | "regular";
export type TelemetryChartPreset = "live-shot" | "all-signals" | "custom";
export type SelectableTelemetryChartPreset = Exclude<TelemetryChartPreset, "custom">;
export type TelemetryStatusItem = {
  detail: string;
  label: string;
  value: string;
};

export type LaneConfig<
  TSeries = TelemetrySeriesDefinition,
  TFamily extends string = TelemetrySeriesFamily,
> = {
  family: TFamily;
  label: string;
  series: TSeries[];
  height: number;
  yOffset: number;
};

export type ChartAxisSide = "left" | "right";

export const axisFamilyMapping: Record<TelemetrySeriesFamily, ChartAxisSide> = {
  pressure: "left",
  flow: "left",
  weight: "right",
  temperature: "right",
  progress: "left",
};

export function getUnifiedPlotHeight(density: ChartDensity) {
  return density === "compact" ? 210 : 380;
}

export function getUnifiedChartMetrics(
  density: ChartDensity,
  containerSize: { height: number; width: number },
) {
  const minPlotHeight = getUnifiedPlotHeight(density);
  const margin =
    density === "compact"
      ? { top: 22, right: 42, bottom: 22, left: 42 }
      : { top: 30, right: 64, bottom: 34, left: 64 };
  const availablePlotHeight = Math.max(containerSize.height - margin.top - margin.bottom, 0);
  const plotHeight =
    containerSize.height > 0
      ? density === "compact"
        ? availablePlotHeight
        : Math.max(minPlotHeight, availablePlotHeight)
      : minPlotHeight;
  const height = margin.top + margin.bottom + plotHeight;
  const width =
    containerSize.width > 0 && containerSize.height > 0
      ? Math.max(
          margin.left + margin.right + 240,
          Math.round(height * (containerSize.width / containerSize.height)),
        )
      : 1240;

  return {
    height,
    innerWidth: width - margin.left - margin.right,
    margin,
    plotHeight,
    width,
  };
}

export function getAxisDomain(
  side: ChartAxisSide,
  series: TelemetrySeriesDefinition[],
  samples: TelemetrySample[],
): [number, number] {
  const axisSeries = series.filter((s) => axisFamilyMapping[s.family] === side);
  const values = axisSeries.flatMap((definition) =>
    samples
      .map((sample) => definition.accessor(sample))
      .filter((value): value is number => value != null && Number.isFinite(value)),
  );

  if (values.length === 0) {
    return side === "right" ? [80, 100] : [0, 12];
  }

  const hasTemperature = axisSeries.some((s) => s.family === "temperature");
  if (side === "right" && hasTemperature) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.floor(min - 2), Math.ceil(Math.max(max + 2, min + 6))];
  }

  const max = Math.max(...values);
  return [0, max <= 0 ? 1 : Math.ceil(max * 1.15)];
}

export type LinearScale = ReturnType<typeof scaleLinear<number>>;

export type TelemetryChartDataModel = {
  activePreset: TelemetryChartPreset;
  activeSample: TelemetrySample | null;
  hoveredSampleIndex: number | null;
  isLive: boolean;
  laneVisibility: Record<TelemetrySeriesFamily, boolean>;
  latestSample: TelemetrySample | null;
  selectedSeries: TelemetrySeriesDefinition[];
  selectedSeriesIds: TelemetrySeriesId[];
  summarySeries: TelemetrySeriesDefinition[];
  timelineSamples: TelemetrySample[];
  usesShotTimeline: boolean;
};

const compactCoreSeriesIds = [
  "pressure",
  "flow",
  "mixTemperature",
] as const satisfies readonly TelemetrySeriesId[];

export function buildMonitorStatusItems({
  activeSample,
  usesShotTimeline,
}: Pick<TelemetryChartDataModel, "activeSample" | "usesShotTimeline">): TelemetryStatusItem[] {
  const compactReadouts = compactCoreSeriesIds
    .map((seriesId) => getTelemetrySeriesDefinition(seriesId))
    .filter((series): series is TelemetrySeriesDefinition => series != null);

  return [
    {
      detail: activeSample ? formatTelemetryTimestampLabel(activeSample.timestamp) : "No live data",
      label: usesShotTimeline ? "Shot time" : "Timeline",
      value: activeSample
        ? formatTelemetryClock(getSampleXValue(activeSample, usesShotTimeline))
        : "0:00.0",
    },
    ...compactReadouts.map((series) => ({
      detail: getCompactSeriesDetail(series, activeSample),
      label: series.shortLabel,
      value: formatTelemetryValue(series, activeSample ? series.accessor(activeSample) : null),
    })),
  ];
}

export function buildVisibleLanes(
  selectedSeries: TelemetrySeriesDefinition[],
  laneVisibility: Record<TelemetrySeriesFamily, boolean>,
  density: ChartDensity,
) {
  let yOffset = 0;
  const laneGap = density === "compact" ? 6 : 12;

  return telemetryFamilyOrder.flatMap((family) => {
    if (!laneVisibility[family]) {
      return [];
    }

    const laneSeries = selectedSeries.filter((series) => series.family === family);

    if (family !== "progress" && laneSeries.length === 0) {
      return [];
    }

    const lane = {
      family,
      label: family === "progress" ? "Progress & events" : telemetryFamilyLabels[family],
      series: laneSeries,
      height:
        density === "compact"
          ? family === "progress"
            ? 42
            : 74
          : family === "progress"
            ? 78
            : 134,
      yOffset,
    } satisfies LaneConfig;

    yOffset += lane.height + laneGap;

    return [lane];
  });
}

export function getChartMetrics<
  TSeries = TelemetrySeriesDefinition,
  TFamily extends string = TelemetrySeriesFamily,
>(
  density: ChartDensity,
  visibleLanes: Array<LaneConfig<TSeries, TFamily>>,
  containerSize: { height: number; width: number },
) {
  const margin =
    density === "compact"
      ? { top: 10, right: 12, bottom: 22, left: 42 }
      : { top: 18, right: 22, bottom: 34, left: 64 };
  const laneGap = density === "compact" ? 6 : 12;
  const plotHeight = visibleLanes.reduce(
    (total, lane, laneIndex) =>
      total + lane.height + (laneIndex === visibleLanes.length - 1 ? 0 : laneGap),
    0,
  );

  const height = margin.top + margin.bottom + plotHeight;
  const width =
    containerSize.width > 0 && containerSize.height > 0
      ? Math.max(
          margin.left + margin.right + 240,
          Math.round(height * (containerSize.width / containerSize.height)),
        )
      : 1240;

  return {
    height,
    innerWidth: width - margin.left - margin.right,
    margin,
    plotHeight,
    width,
  };
}

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ height: 0, width: 0 });

  useLayoutEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    const updateSize = (nextWidth: number, nextHeight: number) => {
      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { height: nextHeight, width: nextWidth },
      );
    };

    const updateFromBounds = () => {
      const bounds = node.getBoundingClientRect();
      updateSize(bounds.width, bounds.height);
    };

    updateFromBounds();

    let frameA = requestAnimationFrame(() => {
      updateFromBounds();
    });
    let frameB = requestAnimationFrame(() => {
      updateFromBounds();
    });

    const handleWindowResize = () => {
      updateFromBounds();
    };
    window.addEventListener("resize", handleWindowResize);
    window.addEventListener("orientationchange", handleWindowResize);
    window.addEventListener("pageshow", handleWindowResize);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateFromBounds();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (typeof ResizeObserver === "undefined") {
      intervalId = setInterval(updateFromBounds, 250);

      return () => {
        cancelAnimationFrame(frameA);
        cancelAnimationFrame(frameB);
        window.removeEventListener("resize", handleWindowResize);
        window.removeEventListener("orientationchange", handleWindowResize);
        window.removeEventListener("pageshow", handleWindowResize);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (intervalId != null) {
          clearInterval(intervalId);
        }
      };
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      updateSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(node);

    return () => {
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("orientationchange", handleWindowResize);
      window.removeEventListener("pageshow", handleWindowResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
    };
  }, []);

  return [ref, size] as const;
}

export function getLaneDomain(
  family: TelemetrySeriesFamily,
  series: TelemetrySeriesDefinition[],
  samples: TelemetrySample[],
): [number, number] {
  const values = series.flatMap((definition) =>
    samples
      .map((sample) => definition.accessor(sample))
      .filter((value): value is number => value != null && Number.isFinite(value)),
  );

  if (values.length === 0) {
    if (family === "temperature") {
      return [80, 100];
    }

    return [0, family === "pressure" ? 12 : 6];
  }

  if (family === "temperature") {
    const min = Math.min(...values);
    const max = Math.max(...values);

    return [Math.floor(min - 2), Math.ceil(Math.max(max + 2, min + 6))];
  }

  const max = Math.max(...values);

  return [0, max <= 0 ? 1 : Math.ceil(max * 1.12)];
}

export function getStateEvents(samples: TelemetrySample[], usesShotTimeline: boolean) {
  return samples.flatMap((sample, index) => {
    const previousSample = samples[index - 1];
    const hasTransition =
      index === 0 ||
      previousSample?.state !== sample.state ||
      previousSample?.substate !== sample.substate;

    if (!hasTransition) {
      return [];
    }

    return [
      {
        label: formatMachinePhase(sample.state, sample.substate),
        xValue: getSampleXValue(sample, usesShotTimeline),
      },
    ];
  });
}

export function getSampleXValue(sample: TelemetrySample, usesShotTimeline: boolean) {
  if (usesShotTimeline) {
    return sample.shotElapsedSeconds ?? sample.elapsedSeconds;
  }

  return sample.elapsedSeconds;
}

export function findNearestSampleIndex(
  samples: TelemetrySample[],
  relativeX: number,
  xScale: LinearScale,
  usesShotTimeline: boolean,
) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  samples.forEach((sample, index) => {
    const distance = Math.abs(xScale(getSampleXValue(sample, usesShotTimeline)) - relativeX);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

export function getTimelineTicks(maxValue: number, tickCount: number) {
  return Array.from({ length: tickCount + 1 }, (_, index) => (maxValue / tickCount) * index);
}

export function getLaneTicks(domain: [number, number], tickCount: number) {
  const [min, max] = domain;

  return Array.from(
    { length: tickCount + 1 },
    (_, index) => min + ((max - min) / tickCount) * index,
  );
}

export function formatPresetLabel(preset: TelemetryChartPreset) {
  if (preset === "live-shot") {
    return "Live shot";
  }

  if (preset === "all-signals") {
    return "All signals";
  }

  return "Custom";
}

export function compactStateLabel(label: string) {
  return label.replace("Espresso / ", "").replace(" / ", " ").split(" ").slice(0, 2).join(" ");
}

function getCompactSeriesDetail(
  series: TelemetrySeriesDefinition,
  activeSample: TelemetrySample | null,
) {
  const value = activeSample ? series.accessor(activeSample) : null;
  const comparisonSeries = series.comparisonSeriesId
    ? getTelemetrySeriesDefinition(series.comparisonSeriesId as TelemetrySeriesId)
    : null;
  const comparisonValue =
    comparisonSeries && activeSample ? comparisonSeries.accessor(activeSample) : null;
  const delta = comparisonSeries ? formatTelemetryDelta(series, value, comparisonValue) : null;

  return delta == null ? "Live" : delta;
}

function formatMachinePhase(state: string, substate: string) {
  if (substate && substate !== state) {
    return `${startCase(state)} / ${startCase(substate)}`;
  }

  return startCase(substate || state || "idle");
}

function startCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
