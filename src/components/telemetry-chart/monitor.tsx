import type { PointerEvent } from "react";

import { GridColumns, GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";

import {
  CompactMonitorBar as SharedCompactMonitorBar,
  DesktopMonitorBar as SharedDesktopMonitorBar,
} from "@/components/chart-monitor/chrome";
import {
  formatTelemetryClock,
  type TelemetrySample,
  type TelemetrySeriesDefinition,
  type TelemetrySeriesFamily,
  type TelemetrySeriesId,
} from "@/lib/telemetry";
import { TelemetryConfigPanel } from "./config";
import {
  axisFamilyMapping,
  buildMonitorStatusItems,
  chartTheme,
  compactStateLabel,
  findNearestSampleIndex,
  formatPresetLabel,
  getAreaGradientId,
  getAxisDomain,
  getGlowFilterId,
  getLaneTicks,
  getSampleXValue,
  getStateEvents,
  getTimelineTicks,
  getUnifiedChartMetrics,
  getUniqueSeriesColors,
  type ChartAxisSide,
  type ChartDensity,
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
        isLive={model.isLive}
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
            isLive={model.isLive}
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
  isLive,
  laneVisibility,
  onPointerLeave,
  onPointerMove,
  selectedSeries,
  timelineSamples,
  usesShotTimeline,
}: {
  density: ChartDensity;
  hoveredSample: TelemetrySample | null;
  isLive: boolean;
  laneVisibility: Record<TelemetrySeriesFamily, boolean>;
  onPointerLeave: () => void;
  onPointerMove: (index: number | null) => void;
  selectedSeries: TelemetrySeriesDefinition[];
  timelineSamples: TelemetrySample[];
  usesShotTimeline: boolean;
}) {
  const [containerRef, containerSize] = useElementSize<HTMLDivElement>();
  const chartMetrics = getUnifiedChartMetrics(density, containerSize);

  const visibleSeries = selectedSeries.filter(
    (series) => series.family !== "progress" && laneVisibility[series.family],
  );
  const leftSeries = visibleSeries.filter((s) => axisFamilyMapping[s.family] === "left");
  const rightSeries = visibleSeries.filter((s) => axisFamilyMapping[s.family] === "right");

  const leftDomain = getAxisDomain("left", leftSeries, timelineSamples);
  const rightDomain = getAxisDomain("right", rightSeries, timelineSamples);

  const leftScale: LinearScale = scaleLinear<number>({
    domain: leftDomain,
    range: [chartMetrics.plotHeight, 0],
  });
  const rightScale: LinearScale = scaleLinear<number>({
    domain: rightDomain,
    range: [chartMetrics.plotHeight, 0],
  });
  const compactScaleGroups =
    density === "compact"
      ? buildCompactScaleGroups(visibleSeries, timelineSamples, chartMetrics.plotHeight)
      : null;
  const compactGridScale =
    density === "compact"
      ? scaleLinear<number>({
          domain: [0, 1],
          range: [chartMetrics.plotHeight, 0],
        })
      : null;

  const timelineValues = timelineSamples.map((sample) => getSampleXValue(sample, usesShotTimeline));
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
  const allColors = getUniqueSeriesColors(visibleSeries);
  const solidSeries = visibleSeries.filter((s) => s.strokeStyle === "solid");
  const lastSample = timelineSamples[timelineSamples.length - 1];
  const tickCount = density === "compact" ? 3 : 4;

  function getSeriesScale(series: TelemetrySeriesDefinition) {
    if (compactScaleGroups) {
      return compactScaleGroups.scales.get(getCompactScaleKey(series)) ?? leftScale;
    }

    return axisFamilyMapping[series.family] === "left" ? leftScale : rightScale;
  }

  function getSeriesDomain(series: TelemetrySeriesDefinition): [number, number] {
    if (compactScaleGroups) {
      return compactScaleGroups.domains.get(getCompactScaleKey(series)) ?? [0, 1];
    }

    return axisFamilyMapping[series.family] === "left" ? leftDomain : rightDomain;
  }

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    if (timelineSamples.length === 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * chartMetrics.innerWidth;
    const nextIndex = findNearestSampleIndex(timelineSamples, relativeX, xScale, usesShotTimeline);

    onPointerMove(nextIndex);
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[3px] border border-chart-border bg-chart-surface"
    >
      <svg
        aria-label="espresso telemetry monitor"
        className="block h-full w-full"
        height={containerSize.height > 0 ? containerSize.height : "100%"}
        preserveAspectRatio="none"
        viewBox={`0 0 ${chartMetrics.width} ${chartMetrics.height}`}
        width={containerSize.width > 0 ? containerSize.width : "100%"}
      >
        <defs>
          {allColors.map((color) => (
            <filter
              id={getGlowFilterId(color)}
              key={`filter-${color}`}
              filterUnits="userSpaceOnUse"
              x={-chartMetrics.margin.left}
              y={-chartMetrics.margin.top}
              width={chartMetrics.width + chartMetrics.margin.left}
              height={chartMetrics.height + chartMetrics.margin.top}
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feFlood floodColor={color} floodOpacity="0.25" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}

          {solidSeries.map((series) => (
            <linearGradient
              id={getAreaGradientId(series.id)}
              key={`grad-${series.id}`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor={series.color} stopOpacity="0.08" />
              <stop offset="100%" stopColor={series.color} stopOpacity="0" />
            </linearGradient>
          ))}

          <linearGradient id="atmosphere-edge" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={chartTheme.atmosphereEdge} stopOpacity="0" />
            <stop offset="100%" stopColor={chartTheme.atmosphereEdge} stopOpacity="1" />
          </linearGradient>
        </defs>

        <rect
          fill={chartTheme.surface}
          height={chartMetrics.height}
          rx={3}
          stroke={chartTheme.border}
          width={chartMetrics.width}
          x={0}
          y={0}
        />

        <Group left={chartMetrics.margin.left} top={chartMetrics.margin.top}>
          {/* Plot background */}
          <rect
            fill={chartTheme.laneSurface}
            height={chartMetrics.plotHeight}
            rx={3}
            width={chartMetrics.innerWidth}
            x={0}
            y={0}
          />

          {isLive ? (
            <rect
              fill={chartTheme.atmosphereTint}
              height={chartMetrics.plotHeight}
              rx={3}
              width={chartMetrics.innerWidth}
              x={0}
              y={0}
              style={{ pointerEvents: "none" }}
            />
          ) : null}

          {/* Grid */}
          <GridColumns
            height={chartMetrics.plotHeight}
            numTicks={density === "compact" ? 4 : Math.max(Math.round(maxTimelineValue / 4), 5)}
            scale={xScale}
            stroke={chartTheme.grid}
            width={chartMetrics.innerWidth}
          />

          {density === "compact" && compactGridScale ? (
            <GridRows
              height={chartMetrics.plotHeight}
              numTicks={tickCount}
              scale={compactGridScale}
              stroke={chartTheme.grid}
              width={chartMetrics.innerWidth}
            />
          ) : null}

          {density !== "compact" && leftSeries.length > 0 ? (
            <GridRows
              height={chartMetrics.plotHeight}
              numTicks={tickCount}
              scale={leftScale}
              stroke={chartTheme.grid}
              width={chartMetrics.innerWidth}
            />
          ) : null}

          {/* State events as vertical markers */}
          {stateEvents.map((event, index) => {
            const x = xScale(event.xValue);
            const eventLabelY =
              index % 2 === 0 ? (density === "compact" ? 10 : 14) : density === "compact" ? 22 : 28;

            return (
              <Group key={`${event.label}-${event.xValue}-${index}`}>
                <line
                  stroke={chartTheme.event}
                  strokeDasharray="4 4"
                  x1={x}
                  x2={x}
                  y1={0}
                  y2={chartMetrics.plotHeight}
                />
                <text
                  dominantBaseline="hanging"
                  fill={chartTheme.muted}
                  fontFamily={chartTheme.mono}
                  fontSize={density === "compact" ? "8" : "9"}
                  textAnchor="middle"
                  x={Math.max(40, Math.min(chartMetrics.innerWidth - 40, x))}
                  y={eventLabelY}
                >
                  {density === "compact" ? compactStateLabel(event.label) : event.label}
                </text>
              </Group>
            );
          })}

          {/* Area fills */}
          {solidSeries.map((series) => {
            const yScale = getSeriesScale(series);
            const domain = getSeriesDomain(series);
            return (
              <AreaClosed
                data={timelineSamples}
                key={`area-${series.id}`}
                fill={`url(#${getAreaGradientId(series.id)})`}
                x={(sample: TelemetrySample) => xScale(getSampleXValue(sample, usesShotTimeline))}
                y0={chartMetrics.plotHeight}
                y1={(sample: TelemetrySample) => yScale(series.accessor(sample) ?? domain[0])}
                yScale={yScale}
              />
            );
          })}

          {/* Data lines */}
          {visibleSeries.map((series) => {
            const yScale = getSeriesScale(series);
            const domain = getSeriesDomain(series);
            return (
              <LinePath
                data={timelineSamples}
                key={series.id}
                filter={`url(#${getGlowFilterId(series.color)})`}
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
                      ? 1
                      : 1.5
                    : density === "compact"
                      ? 1.5
                      : 2
                }
                x={(sample: TelemetrySample) => xScale(getSampleXValue(sample, usesShotTimeline))}
                y={(sample: TelemetrySample) => yScale(series.accessor(sample) ?? domain[0])}
              />
            );
          })}

          {/* Pulsing live indicators */}
          {isLive && lastSample
            ? solidSeries.map((series) => {
                const value = series.accessor(lastSample);
                if (value == null) return null;
                const yScale = getSeriesScale(series);
                const cx = xScale(getSampleXValue(lastSample, usesShotTimeline));
                const cy = yScale(value);
                return (
                  <g key={`pulse-${series.id}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={series.color}
                      opacity={0.5}
                      style={{
                        animation: "telemetry-pulse 1.5s ease-out infinite",
                      }}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={density === "compact" ? 2.5 : 3}
                      fill={series.color}
                      filter={`url(#${getGlowFilterId(series.color)})`}
                    />
                  </g>
                );
              })
            : null}

          {visibleSeries.length === 0 ? (
            <text
              fill={chartTheme.muted}
              fontFamily={chartTheme.sans}
              fontSize={density === "compact" ? "12" : "14"}
              textAnchor="middle"
              x={chartMetrics.innerWidth / 2}
              y={chartMetrics.plotHeight / 2}
            >
              Enable at least one signal to view telemetry.
            </text>
          ) : null}

          {timelineSamples.length === 0 ? (
            <text
              fill={chartTheme.muted}
              fontFamily={chartTheme.sans}
              fontSize={density === "compact" ? "12" : "14"}
              textAnchor="middle"
              x={chartMetrics.innerWidth / 2}
              y={chartMetrics.plotHeight / 2 + (density === "compact" ? 16 : 20)}
            >
              Waiting for the bridge to stream machine snapshots.
            </text>
          ) : null}

          {/* Crosshair + hover dots */}
          {hoveredX != null ? (
            <>
              <line
                stroke={chartTheme.crosshairGlow}
                strokeWidth={6}
                x1={hoveredX}
                x2={hoveredX}
                y1={0}
                y2={chartMetrics.plotHeight}
              />
              <line
                stroke={chartTheme.crosshair}
                strokeWidth={1}
                x1={hoveredX}
                x2={hoveredX}
                y1={0}
                y2={chartMetrics.plotHeight}
              />
            </>
          ) : null}

          {hoveredX != null && hoveredSample
            ? solidSeries.map((series) => {
                const value = series.accessor(hoveredSample);
                if (value == null) return null;
                const yScale = getSeriesScale(series);
                return (
                  <circle
                    key={`hover-${series.id}`}
                    cx={hoveredX}
                    cy={yScale(value)}
                    r={density === "compact" ? 3 : 3.5}
                    fill={series.color}
                    filter={`url(#${getGlowFilterId(series.color)})`}
                  />
                );
              })
            : null}

          {/* Legend */}
          {visibleSeries.length > 0 ? (
            <ChartLegend density={density} series={solidSeries} width={chartMetrics.innerWidth} />
          ) : null}

          {/* Atmosphere edge glow */}
          {isLive ? (
            <rect
              fill="url(#atmosphere-edge)"
              height={chartMetrics.plotHeight}
              width={chartMetrics.innerWidth * 0.15}
              x={chartMetrics.innerWidth * 0.85}
              y={0}
              style={{ pointerEvents: "none" }}
            />
          ) : null}

          {/* Pointer interaction area */}
          <rect
            fill="transparent"
            height={Math.max(chartMetrics.plotHeight, 0)}
            onPointerLeave={onPointerLeave}
            onPointerMove={handlePointerMove}
            width={chartMetrics.innerWidth}
            x={0}
            y={0}
          />

          {/* Left Y axis */}
          {leftSeries.length > 0 ? (
            <ChartYAxis
              density={density}
              domain={
                compactScaleGroups
                  ? (compactScaleGroups.domains.get(getCompactScaleKey(leftSeries[0])) ??
                    leftDomain)
                  : leftDomain
              }
              plotHeight={chartMetrics.plotHeight}
              scale={
                compactScaleGroups
                  ? (compactScaleGroups.scales.get(getCompactScaleKey(leftSeries[0])) ?? leftScale)
                  : leftScale
              }
              series={
                compactScaleGroups
                  ? leftSeries.filter(
                      (s) => getCompactScaleKey(s) === getCompactScaleKey(leftSeries[0]),
                    )
                  : leftSeries
              }
              side="left"
              tickCount={tickCount}
            />
          ) : null}

          {/* Right Y axis */}
          {rightSeries.length > 0 ? (
            <ChartYAxis
              density={density}
              domain={
                compactScaleGroups
                  ? (compactScaleGroups.domains.get(getCompactScaleKey(rightSeries[0])) ??
                    rightDomain)
                  : rightDomain
              }
              plotHeight={chartMetrics.plotHeight}
              scale={
                compactScaleGroups
                  ? (compactScaleGroups.scales.get(getCompactScaleKey(rightSeries[0])) ??
                    rightScale)
                  : rightScale
              }
              series={
                compactScaleGroups
                  ? rightSeries.filter(
                      (s) => getCompactScaleKey(s) === getCompactScaleKey(rightSeries[0]),
                    )
                  : rightSeries
              }
              side="right"
              tickCount={tickCount}
              x={chartMetrics.innerWidth}
            />
          ) : null}

          <ChartXAxis
            density={density}
            maxTimelineValue={maxTimelineValue}
            width={chartMetrics.innerWidth}
            xScale={xScale}
            y={chartMetrics.plotHeight}
          />
        </Group>
      </svg>
    </div>
  );
}

function ChartYAxis({
  density,
  domain,
  plotHeight,
  scale,
  series,
  side,
  tickCount,
  x = 0,
}: {
  density: ChartDensity;
  domain: [number, number];
  plotHeight: number;
  scale: LinearScale;
  series: TelemetrySeriesDefinition[];
  side: ChartAxisSide;
  tickCount: number;
  x?: number;
}) {
  const ticks = getLaneTicks(domain, tickCount);
  const isLeft = side === "left";
  const fontSize = density === "compact" ? "8.5" : "10";
  const offset = density === "compact" ? 6 : 8;

  const unitEntries: Array<{ unit: string; color: string }> = [];
  const seenUnits = new Set<string>();
  for (const s of series) {
    if (s.strokeStyle === "solid" && !seenUnits.has(s.unit)) {
      seenUnits.add(s.unit);
      unitEntries.push({ unit: s.unit, color: s.color });
    }
  }
  const unitLabel = unitEntries.map((e) => e.unit).join(" / ");

  return (
    <Group left={x}>
      <line stroke={chartTheme.axis} x1={0} x2={0} y1={0} y2={plotHeight} />

      {/* Axis unit label at top */}
      <text
        fill={chartTheme.muted}
        fontFamily={chartTheme.mono}
        fontSize={density === "compact" ? "7" : "8.5"}
        textAnchor={isLeft ? "end" : "start"}
        x={isLeft ? -offset : offset}
        y={-(density === "compact" ? 12 : 16)}
      >
        {unitLabel}
      </text>

      {ticks.map((tick) => (
        <Group key={tick}>
          <line
            stroke={chartTheme.axis}
            x1={isLeft ? -(density === "compact" ? 4 : 5) : 0}
            x2={isLeft ? 0 : density === "compact" ? 4 : 5}
            y1={scale(tick)}
            y2={scale(tick)}
          />
          <text
            fill={chartTheme.muted}
            fontFamily={chartTheme.mono}
            fontSize={fontSize}
            textAnchor={isLeft ? "end" : "start"}
            x={isLeft ? -offset : offset}
            y={scale(tick) + 3.5}
          >
            {tick.toFixed(tick >= 100 ? 0 : 1)}
          </text>
        </Group>
      ))}
    </Group>
  );
}

function ChartXAxis({
  density,
  maxTimelineValue,
  width,
  xScale,
  y,
}: {
  density: ChartDensity;
  maxTimelineValue: number;
  width: number;
  xScale: LinearScale;
  y: number;
}) {
  const ticks = getTimelineTicks(maxTimelineValue, density === "compact" ? 4 : 6);
  const tickLabelInset = density === "compact" ? 120 : 32;
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
        Time
      </text>
    </Group>
  );
}

function ChartLegend({
  density,
  series,
  width,
}: {
  density: ChartDensity;
  series: TelemetrySeriesDefinition[];
  width: number;
}) {
  const fontSize = density === "compact" ? "7.5" : "9";
  const lineW = density === "compact" ? 10 : 14;
  const lineH = density === "compact" ? 1.5 : 2;
  const gap = density === "compact" ? 10 : 14;
  const itemPad = density === "compact" ? 3 : 4;
  const topY = density === "compact" ? -10 : -14;
  const charW = density === "compact" ? 4.2 : 5.2;

  const items = series.reduce<Array<TelemetrySeriesDefinition & { x: number; itemWidth: number }>>(
    (acc, s) => {
      const prevEnd =
        acc.length > 0 ? acc[acc.length - 1].x + acc[acc.length - 1].itemWidth + gap : 0;
      const itemWidth = lineW + itemPad + s.shortLabel.length * charW;
      acc.push({ ...s, x: prevEnd, itemWidth });
      return acc;
    },
    [],
  );
  const lastItem = items[items.length - 1];
  const totalWidth = lastItem ? lastItem.x + lastItem.itemWidth : 0;
  const offsetX = (width - totalWidth) / 2;

  return (
    <Group left={offsetX} top={topY}>
      {items.map((s) => (
        <Group key={s.id} left={s.x}>
          <line
            stroke={s.color}
            strokeWidth={lineH}
            strokeLinecap="round"
            x1={0}
            x2={lineW}
            y1={0}
            y2={0}
          />
          <text
            fill={s.color}
            fontFamily={chartTheme.mono}
            fontSize={fontSize}
            x={lineW + itemPad}
            y={density === "compact" ? 3 : 3.5}
          >
            {s.shortLabel}
          </text>
        </Group>
      ))}
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

function buildCompactScaleGroups(
  series: TelemetrySeriesDefinition[],
  samples: TelemetrySample[],
  plotHeight: number,
) {
  const groupedSeries = new Map<string, TelemetrySeriesDefinition[]>();

  for (const definition of series) {
    const key = getCompactScaleKey(definition);
    const existing = groupedSeries.get(key);

    if (existing) {
      existing.push(definition);
      continue;
    }

    groupedSeries.set(key, [definition]);
  }

  const domains = new Map<string, [number, number]>();
  const scales = new Map<string, LinearScale>();

  for (const [key, group] of groupedSeries) {
    const domain = getCompactScaleDomain(group, samples);
    domains.set(key, domain);
    scales.set(
      key,
      scaleLinear<number>({
        domain,
        range: [plotHeight, 0],
      }),
    );
  }

  return {
    domains,
    scales,
  };
}

function getCompactScaleKey(series: TelemetrySeriesDefinition) {
  return series.unit || series.id;
}

function getCompactScaleDomain(
  series: TelemetrySeriesDefinition[],
  samples: TelemetrySample[],
): [number, number] {
  const values = series.flatMap((definition) =>
    samples
      .map((sample) => definition.accessor(sample))
      .filter((value): value is number => value != null && Number.isFinite(value)),
  );

  if (values.length === 0) {
    if (series.some((definition) => definition.family === "temperature")) {
      return [80, 100] as [number, number];
    }

    if (series.some((definition) => definition.unit === "bar")) {
      return [0, 12] as [number, number];
    }

    return [0, 6] as [number, number];
  }

  if (series.some((definition) => definition.family === "temperature")) {
    const min = Math.min(...values);
    const max = Math.max(...values);

    return [Math.floor(min - 2), Math.ceil(Math.max(max + 2, min + 6))];
  }

  const max = Math.max(...values);

  return [0, max <= 0 ? 1 : Math.ceil(max * 1.15)];
}
