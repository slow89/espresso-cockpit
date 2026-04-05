import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  getTelemetrySeriesDefinition,
  getTelemetryTimelineSample,
  type TelemetrySample,
  type TelemetrySeriesDefinition,
} from "@/lib/telemetry";
import { useTelemetryChartStore } from "@/stores/telemetry-chart-store";

import { TelemetryConfigOverlay } from "@/components/telemetry-chart/config";
import {
  DesktopTelemetryMonitor,
  TabletTelemetryMonitor,
} from "@/components/telemetry-chart/monitor";
import type {
  TelemetryChartDataModel,
  TelemetryLayoutMode,
} from "@/components/telemetry-chart/shared";

export function TelemetryChart({
  className,
  data,
  layout = "auto",
}: {
  className?: string;
  data: TelemetrySample[];
  layout?: TelemetryLayoutMode;
}) {
  const activePreset = useTelemetryChartStore((state) => state.activePreset);
  const laneVisibility = useTelemetryChartStore((state) => state.laneVisibility);
  const resetToDefaultPreset = useTelemetryChartStore((state) => state.resetToDefaultPreset);
  const selectedSeriesIds = useTelemetryChartStore((state) => state.selectedSeriesIds);
  const setPreset = useTelemetryChartStore((state) => state.setPreset);
  const toggleLane = useTelemetryChartStore((state) => state.toggleLane);
  const toggleSeries = useTelemetryChartStore((state) => state.toggleSeries);
  const [hoveredSampleIndex, setHoveredSampleIndex] = useState<number | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const timelineSamples = getTelemetryTimelineSample(data);
  const latestSample = timelineSamples[timelineSamples.length - 1] ?? data[data.length - 1] ?? null;
  const hoveredSample =
    hoveredSampleIndex == null ? null : (timelineSamples[hoveredSampleIndex] ?? null);
  const activeSample = hoveredSample ?? latestSample;
  const usesShotTimeline =
    timelineSamples.length > 0 &&
    latestSample?.state === "espresso" &&
    timelineSamples.every((sample) => sample.shotElapsedSeconds != null);
  const selectedSeries = selectedSeriesIds
    .map((seriesId) => getTelemetrySeriesDefinition(seriesId))
    .filter((series): series is TelemetrySeriesDefinition => series != null);
  const summarySeries = selectedSeries.filter((series) => laneVisibility[series.family]);
  const isLive = usesShotTimeline && timelineSamples.length > 0;
  const model = {
    activePreset,
    activeSample,
    hoveredSampleIndex,
    isLive,
    laneVisibility,
    latestSample,
    selectedSeries,
    selectedSeriesIds,
    summarySeries,
    timelineSamples,
    usesShotTimeline,
  } satisfies TelemetryChartDataModel;

  return (
    <div
      className={cn(
        "panel flex h-full min-h-0 min-w-0 w-full flex-1 flex-col rounded-[20px] border-chart-border bg-chart-surface p-3 md:max-xl:rounded-[18px] xl:p-5",
        className,
      )}
    >
      {layout === "auto" || layout === "tablet" ? (
        <div
          className={cn(
            "grid h-full min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-1.5",
            layout === "auto" && "xl:hidden",
          )}
        >
          <TabletTelemetryMonitor
            model={model}
            onOpenConfig={() => setIsConfigOpen(true)}
            onPointerLeave={() => setHoveredSampleIndex(null)}
            onPointerMove={setHoveredSampleIndex}
          />
        </div>
      ) : null}

      {layout === "auto" || layout === "desktop" ? (
        <div
          className={cn(
            "flex h-full min-h-0 min-w-0 flex-1 flex-col",
            layout === "auto" && "hidden xl:block",
          )}
        >
          <DesktopTelemetryMonitor
            model={model}
            onPointerLeave={() => setHoveredSampleIndex(null)}
            onPointerMove={setHoveredSampleIndex}
            onReset={resetToDefaultPreset}
            onSetPreset={setPreset}
            onToggleLane={toggleLane}
            onToggleSeries={toggleSeries}
          />
        </div>
      ) : null}

      {layout !== "desktop" && isConfigOpen ? (
        <TelemetryConfigOverlay
          activePreset={activePreset}
          laneVisibility={laneVisibility}
          onClose={() => setIsConfigOpen(false)}
          onReset={resetToDefaultPreset}
          onSetPreset={setPreset}
          onToggleLane={toggleLane}
          onToggleSeries={toggleSeries}
          selectedSeriesIds={selectedSeriesIds}
        />
      ) : null}
    </div>
  );
}
