import type { PointerEvent } from "react";

import { GridColumns, GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";

import {
  CompactMonitorBar as SharedCompactMonitorBar,
  DesktopMonitorBar as SharedDesktopMonitorBar,
} from "@/components/chart-monitor/chrome";
import { cn } from "@/lib/utils";
import {
  formatTelemetryClock,
  type TelemetrySample,
  type TelemetrySeriesDefinition,
  type TelemetrySeriesFamily,
  type TelemetrySeriesId,
} from "@/lib/telemetry";
import { TelemetryConfigPanel } from "./config";
import {
  buildMonitorStatusItems,
  buildVisibleLanes,
  chartTheme,
  compactStateLabel,
  findNearestSampleIndex,
  formatPresetLabel,
  getChartMetrics,
  getLaneDomain,
  getLaneTicks,
  getSampleXValue,
  getStateEvents,
  getTimelineTicks,
  type ChartDensity,
  type LaneConfig,
  type LinearScale,
  type SelectableTelemetryChartPreset,
  type TelemetryChartDataModel,
  type TelemetryChartPreset,
  useElementSize,
} from "./shared";

export function TabletTelemetryMonitor({
  model,
  onOpenConfig,
  onPointerLeave,
  onPointerMove,
}: {
  model: TelemetryChartDataModel;
  onOpenConfig: () => void;
  onPointerLeave: () => void;
  onPointerMove: (index: number | null) => void;
}) {
  return (
    <>
      <CompactMonitorBar
        activePreset={model.activePreset}
        items={buildMonitorStatusItems(model)}
        onOpenConfig={onOpenConfig}
      />

      <TelemetryMonitorCanvas
        density="compact"
        hoveredSample={model.activeSample}
        laneVisibility={model.laneVisibility}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        selectedSeries={model.selectedSeries}
        timelineSamples={model.timelineSamples}
        usesShotTimeline={model.usesShotTimeline}
      />
    </>
  );
}

export function DesktopTelemetryMonitor({
  model,
  onPointerLeave,
  onPointerMove,
  onReset,
  onSetPreset,
  onToggleLane,
  onToggleSeries,
}: {
  model: TelemetryChartDataModel;
  onPointerLeave: () => void;
  onPointerMove: (index: number | null) => void;
  onReset: () => void;
  onSetPreset: (preset: SelectableTelemetryChartPreset) => void;
  onToggleLane: (family: TelemetrySeriesFamily) => void;
  onToggleSeries: (seriesId: TelemetrySeriesId) => void;
}) {
  return (
    <div className="grid h-full min-h-0 min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
      <section className="flex min-h-0 min-w-0 flex-col">
        <DesktopMonitorBar
          activePreset={model.activePreset}
          items={buildMonitorStatusItems(model)}
          onReset={onReset}
          onSetPreset={onSetPreset}
        />
        <div className="mt-1.5 min-h-0 flex-1">
          <TelemetryMonitorCanvas
            density="regular"
            hoveredSample={model.activeSample}
            laneVisibility={model.laneVisibility}
            onPointerLeave={onPointerLeave}
            onPointerMove={onPointerMove}
            selectedSeries={model.selectedSeries}
            timelineSamples={model.timelineSamples}
            usesShotTimeline={model.usesShotTimeline}
          />
        </div>
      </section>

      <aside className="hidden h-full min-h-0 xl:block">
        <TelemetryConfigPanel
          activePreset={model.activePreset}
          laneVisibility={model.laneVisibility}
          onReset={onReset}
          onSetPreset={onSetPreset}
          onToggleLane={onToggleLane}
          onToggleSeries={onToggleSeries}
          selectedSeriesIds={model.selectedSeriesIds}
        />
      </aside>
    </div>
  );
}

function DesktopMonitorBar({
  activePreset,
  items,
  onReset,
  onSetPreset,
}: {
  activePreset: TelemetryChartPreset;
  items: Array<{
    detail: string;
    label: string;
    value: string;
  }>;
  onReset: () => void;
  onSetPreset: (preset: SelectableTelemetryChartPreset) => void;
}) {
  return (
    <SharedDesktopMonitorBar
      activePreset={activePreset}
      items={items}
      onReset={onReset}
      onSetPreset={onSetPreset}
      presetOptions={[
        { id: "live-shot", label: "Live shot" },
        { id: "all-signals", label: "All signals" },
      ]}
    />
  );
}

function TelemetryMonitorCanvas({
  density,
  hoveredSample,
  laneVisibility,
  onPointerLeave,
  onPointerMove,
  selectedSeries,
  timelineSamples,
  usesShotTimeline,
}: {
  density: ChartDensity;
  hoveredSample: TelemetrySample | null;
  laneVisibility: Record<TelemetrySeriesFamily, boolean>;
  onPointerLeave: () => void;
  onPointerMove: (index: number | null) => void;
  selectedSeries: TelemetrySeriesDefinition[];
  timelineSamples: TelemetrySample[];
  usesShotTimeline: boolean;
}) {
  const [containerRef, containerSize] = useElementSize<HTMLDivElement>();
  const visibleLanes = buildVisibleLanes(selectedSeries, laneVisibility, density);
  const chartMetrics = getChartMetrics(density, visibleLanes, containerSize);
  const timelineValues = timelineSamples.map((sample) =>
    getSampleXValue(sample, usesShotTimeline),
  );
  const maxTimelineValue = Math.max(8, timelineValues[timelineValues.length - 1] ?? 0);
  const xScale: LinearScale = scaleLinear<number>({
    domain: [0, maxTimelineValue || 1],
    range: [0, chartMetrics.innerWidth],
  });
  const hoveredX =
    hoveredSample == null || timelineSamples.length === 0
      ? null
      : xScale(getSampleXValue(hoveredSample, usesShotTimeline));
  const stateEvents = getStateEvents(timelineSamples, usesShotTimeline);

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    if (timelineSamples.length === 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * chartMetrics.innerWidth;
    const nextIndex = findNearestSampleIndex(
      timelineSamples,
      relativeX,
      xScale,
      usesShotTimeline,
    );

    onPointerMove(nextIndex);
  }

  const chartHeight = Math.max(chartMetrics.height, density === "compact" ? 228 : 260);

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-0 min-w-0 overflow-hidden rounded-[3px] border border-chart-border bg-chart-surface",
        density === "regular" ? "h-full flex-1" : "flex-1",
      )}
    >
      <svg
        aria-label="espresso telemetry monitor"
        className="h-full w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${chartMetrics.width} ${chartHeight}`}
      >
        <rect
          fill={chartTheme.surface}
          height={chartHeight}
          rx={3}
          stroke={chartTheme.border}
          width={chartMetrics.width}
          x={0}
          y={0}
        />

        <Group left={chartMetrics.margin.left} top={chartMetrics.margin.top}>
          {visibleLanes.length > 0 ? (
            visibleLanes.map((lane, laneIndex) => (
              <TelemetryLane
                density={density}
                index={laneIndex}
                key={lane.family}
                lane={lane}
                maxTimelineValue={maxTimelineValue}
                samples={timelineSamples}
                stateEvents={lane.family === "progress" ? stateEvents : []}
                usesShotTimeline={usesShotTimeline}
                width={chartMetrics.innerWidth}
                xScale={xScale}
              />
            ))
          ) : (
            <text
              fill={chartTheme.muted}
              fontFamily={chartTheme.sans}
              fontSize={density === "compact" ? "12" : "14"}
              textAnchor="middle"
              x={chartMetrics.innerWidth / 2}
              y={density === "compact" ? 96 : 120}
            >
              Enable at least one lane to view live telemetry.
            </text>
          )}

          {timelineSamples.length === 0 ? (
            <text
              fill={chartTheme.muted}
              fontFamily={chartTheme.sans}
              fontSize={density === "compact" ? "12" : "14"}
              textAnchor="middle"
              x={chartMetrics.innerWidth / 2}
              y={density === "compact" ? 118 : 140}
            >
              Waiting for the bridge to stream machine snapshots.
            </text>
          ) : null}

          {hoveredX != null ? (
            <line
              stroke={chartTheme.crosshair}
              strokeDasharray="4 4"
              x1={hoveredX}
              x2={hoveredX}
              y1={0}
              y2={chartMetrics.plotHeight}
            />
          ) : null}

          <rect
            fill="transparent"
            height={Math.max(chartMetrics.plotHeight, 0)}
            onPointerLeave={onPointerLeave}
            onPointerMove={handlePointerMove}
            width={chartMetrics.innerWidth}
            x={0}
            y={0}
          />

          <ChartXAxis
            density={density}
            maxTimelineValue={maxTimelineValue}
            usesShotTimeline={usesShotTimeline}
            width={chartMetrics.innerWidth}
            xScale={xScale}
            y={chartMetrics.plotHeight}
          />
        </Group>
      </svg>
    </div>
  );
}

function TelemetryLane({
  density,
  index,
  lane,
  maxTimelineValue,
  samples,
  stateEvents,
  usesShotTimeline,
  width,
  xScale,
}: {
  density: ChartDensity;
  index: number;
  lane: LaneConfig;
  maxTimelineValue: number;
  samples: TelemetrySample[];
  stateEvents: Array<{ label: string; xValue: number }>;
  usesShotTimeline: boolean;
  width: number;
  xScale: LinearScale;
}) {
  const backgroundFill = index % 2 === 0 ? chartTheme.laneSurface : chartTheme.laneSurfaceAlt;
  const isProgressLane = lane.family === "progress";
  const domain = getLaneDomain(lane.family, lane.series, samples);
  const laneScale: LinearScale = scaleLinear<number>({
    domain,
    range: [lane.height, 0],
  });
  const laneTickCount = density === "compact" ? 3 : 4;

  return (
    <Group top={lane.yOffset}>
      <rect
        fill={backgroundFill}
        height={lane.height}
        rx={3}
        stroke={chartTheme.border}
        width={width}
        x={0}
        y={0}
      />

      <GridColumns
        height={lane.height}
        numTicks={density === "compact" ? 4 : Math.max(Math.round(maxTimelineValue / 4), 5)}
        scale={xScale}
        stroke={chartTheme.grid}
        width={width}
      />

      {isProgressLane ? null : (
        <GridRows
          height={lane.height}
          numTicks={laneTickCount}
          scale={laneScale}
          stroke={chartTheme.grid}
          width={width}
        />
      )}

      <text
        fill={chartTheme.text}
        fontFamily={chartTheme.mono}
        fontSize={density === "compact" ? "10" : "11"}
        x={density === "compact" ? 10 : 12}
        y={density === "compact" ? 14 : 16}
      >
        {lane.label}
      </text>

      {!isProgressLane
        ? getLaneTicks(domain, laneTickCount).map((tick) => (
            <text
              key={tick}
              fill={chartTheme.muted}
              fontFamily={chartTheme.mono}
              fontSize={density === "compact" ? "9" : "10"}
              textAnchor="end"
              x={density === "compact" ? -6 : -8}
              y={laneScale(tick) + 4}
            >
              {tick.toFixed(tick >= 100 ? 0 : 1)}
            </text>
          ))
        : null}

      {isProgressLane ? (
        <ProgressLane
          density={density}
          lane={lane}
          samples={samples}
          stateEvents={stateEvents}
          usesShotTimeline={usesShotTimeline}
          width={width}
          xScale={xScale}
        />
      ) : (
        lane.series.map((series) => (
          <LinePath
            data={samples}
            key={series.id}
            stroke={series.color}
            strokeDasharray={
              series.strokeStyle === "dashed"
                ? density === "compact"
                  ? "5 4"
                  : "8 6"
                : undefined
            }
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={
              series.strokeStyle === "dashed"
                ? density === "compact"
                  ? 2
                  : 2.5
                : density === "compact"
                  ? 2.5
                  : 3
            }
            x={(sample: TelemetrySample) => xScale(getSampleXValue(sample, usesShotTimeline))}
            y={(sample: TelemetrySample) => laneScale(series.accessor(sample) ?? domain[0])}
          />
        ))
      )}
    </Group>
  );
}

function ProgressLane({
  density,
  lane,
  samples,
  stateEvents,
  usesShotTimeline,
  width,
  xScale,
}: {
  density: ChartDensity;
  lane: LaneConfig;
  samples: TelemetrySample[];
  stateEvents: Array<{ label: string; xValue: number }>;
  usesShotTimeline: boolean;
  width: number;
  xScale: LinearScale;
}) {
  const frameSeries = lane.series.find((series) => series.id === "profileFrame");
  const frameValues = samples.map((sample) => sample.profileFrame);
  const frameMax = Math.max(1, ...frameValues);
  const frameScale: LinearScale = scaleLinear<number>({
    domain: [0, frameMax],
    range: [lane.height - (density === "compact" ? 12 : 16), density === "compact" ? 16 : 20],
  });
  const visibleEvents =
    density === "compact"
      ? stateEvents.filter(
          (_, index) => index === 0 || index === stateEvents.length - 1 || index % 2 === 0,
        )
      : stateEvents;

  return (
    <>
      {visibleEvents.map((event, index) => {
        const x = xScale(event.xValue);
        const eventLabelY =
          density === "compact"
            ? 6 + (index % 2) * 12
            : index % 2 === 0
              ? 10
              : 24;

        return (
          <Group key={`${event.label}-${event.xValue}`}>
            <line
              stroke={chartTheme.event}
              strokeDasharray="4 4"
              x1={x}
              x2={x}
              y1={0}
              y2={lane.height}
            />
            <text
              dominantBaseline="hanging"
              fill={chartTheme.muted}
              fontFamily={chartTheme.mono}
              fontSize={density === "compact" ? "8.5" : "10"}
              textAnchor="middle"
              x={Math.max(40, Math.min(width - 40, x))}
              y={eventLabelY}
            >
              {density === "compact" ? compactStateLabel(event.label) : event.label}
            </text>
          </Group>
        );
      })}

      {frameSeries ? (
        <>
          <LinePath
            data={samples}
            key={frameSeries.id}
            stroke={frameSeries.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={density === "compact" ? 2 : 2.5}
            x={(sample: TelemetrySample) => xScale(getSampleXValue(sample, usesShotTimeline))}
            y={(sample: TelemetrySample) => frameScale(sample.profileFrame)}
          />
          {samples
            .filter(
              (sample, index) =>
                index === 0 || sample.profileFrame !== samples[index - 1]?.profileFrame,
            )
            .map((sample) => (
              <Group
                key={`${sample.timestamp}-${sample.profileFrame}`}
                left={xScale(getSampleXValue(sample, usesShotTimeline))}
                top={frameScale(sample.profileFrame)}
              >
                <circle fill={frameSeries.color} r={density === "compact" ? 2.75 : 3.5} />
                <text
                  fill={chartTheme.text}
                  fontFamily={chartTheme.mono}
                  fontSize={density === "compact" ? "8.5" : "10"}
                  textAnchor="middle"
                  x={0}
                  y={density === "compact" ? -6 : -8}
                >
                  {sample.profileFrame}
                </text>
              </Group>
            ))}
        </>
      ) : (
        <text
          fill={chartTheme.muted}
          fontFamily={chartTheme.sans}
          fontSize={density === "compact" ? "11" : "13"}
          x={12}
          y={lane.height - 12}
        >
          Frame line hidden. State changes remain visible.
        </text>
      )}
    </>
  );
}

function ChartXAxis({
  density,
  maxTimelineValue,
  usesShotTimeline,
  width,
  xScale,
  y,
}: {
  density: ChartDensity;
  maxTimelineValue: number;
  usesShotTimeline: boolean;
  width: number;
  xScale: LinearScale;
  y: number;
}) {
  const ticks = getTimelineTicks(maxTimelineValue, density === "compact" ? 4 : 6);
  const tickLabelInset = density === "compact" ? 24 : 32;
  const axisLabelInset = density === "compact" ? 8 : 12;

  return (
    <Group top={y}>
      <line stroke={chartTheme.axis} x1={0} x2={width} y1={0} y2={0} />

      {ticks.map((tick) => (
        <Group key={tick}>
          <line
            stroke={chartTheme.axis}
            x1={xScale(tick)}
            x2={xScale(tick)}
            y1={0}
            y2={density === "compact" ? 5 : 6}
          />
          <text
            fill={chartTheme.muted}
            fontFamily={chartTheme.mono}
            fontSize={density === "compact" ? "8.5" : "10"}
            textAnchor="middle"
            x={Math.max(tickLabelInset, Math.min(width - tickLabelInset, xScale(tick)))}
            y={density === "compact" ? 14 : 18}
          >
            {formatTelemetryClock(tick)}
          </text>
        </Group>
      ))}

      <text
        fill={chartTheme.muted}
        fontFamily={chartTheme.mono}
        fontSize={density === "compact" ? "8.5" : "10"}
        textAnchor="end"
        x={width - axisLabelInset}
        y={density === "compact" ? 14 : 18}
      >
        {usesShotTimeline ? "Shot time" : "Stream time"}
      </text>
    </Group>
  );
}

function CompactMonitorBar({
  activePreset,
  items,
  onOpenConfig,
}: {
  activePreset: TelemetryChartPreset;
  items: Array<{
    detail: string;
    label: string;
    value: string;
  }>;
  onOpenConfig: () => void;
}) {
  return (
    <SharedCompactMonitorBar
      activePresetLabel={formatPresetLabel(activePreset)}
      items={items}
      onOpenConfig={onOpenConfig}
    />
  );
}
