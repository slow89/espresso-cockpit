import type { PointerEvent } from "react";

import { GridColumns, GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";

import {
  chartTheme,
  getChartMetrics,
  type LaneConfig,
  type LinearScale,
  useElementSize,
} from "@/components/telemetry-chart/shared";
import {
  getWorkflowFrameFamilyLabel,
  getWorkflowFrameFamilyOrder,
  type WorkflowFrameChartSeriesDefinition,
  type WorkflowFrameFamily,
  type WorkflowFrameSample,
} from "@/lib/workflow-frame-preview";

// Matches the compact lane gap in getChartMetrics, so the lanes end exactly on the x axis.
const laneGap = 6;
const minLaneHeight = 30;
const tickLabelCapHeight = 9;

export function WorkflowFrameCanvas({
  activeSample,
  hasNumericSeries,
  laneVisibility,
  onSelectFrame,
  samples,
  selectedSeries,
}: {
  activeSample: WorkflowFrameSample | null;
  hasNumericSeries: boolean;
  laneVisibility: Record<WorkflowFrameFamily, boolean>;
  onSelectFrame: (index: number) => void;
  samples: WorkflowFrameSample[];
  selectedSeries: WorkflowFrameChartSeriesDefinition[];
}) {
  const [containerRef, containerSize] = useElementSize<HTMLDivElement>();
  const visibleLanes = buildVisibleLanes(selectedSeries, laneVisibility, containerSize.height);
  const chartMetrics = getChartMetrics("compact", visibleLanes, containerSize);
  const maxFrameValue = Math.max(samples.length, 1);
  const xScale: LinearScale = scaleLinear<number>({
    domain: [1, Math.max(maxFrameValue, 2)],
    range: [0, chartMetrics.innerWidth],
  });
  const selectedX = activeSample == null ? null : xScale(activeSample.frameIndex);

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    if (samples.length === 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * chartMetrics.innerWidth;

    onSelectFrame(findNearestFrameIndex(samples, relativeX, xScale));
  }

  if (visibleLanes.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[3px] border border-chart-border bg-chart-surface px-3 text-center font-mono text-[0.72rem] leading-4 text-muted-foreground"
      >
        {hasNumericSeries
          ? "Enable at least one series to view frame telemetry."
          : "No numeric frame fields were found in this profile."}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 overflow-hidden rounded-[3px] border border-chart-border bg-chart-surface"
    >
      <svg
        aria-label="workflow frame monitor"
        className="h-full w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${chartMetrics.width} ${chartMetrics.height}`}
      >
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
          {visibleLanes.map((lane, laneIndex) => (
            <WorkflowFrameLane
              index={laneIndex}
              key={lane.family}
              lane={lane}
              samples={samples}
              width={chartMetrics.innerWidth}
              xScale={xScale}
            />
          ))}

          {selectedX != null ? (
            <line
              stroke={chartTheme.crosshair}
              strokeDasharray="4 4"
              x1={selectedX}
              x2={selectedX}
              y1={0}
              y2={chartMetrics.plotHeight}
            />
          ) : null}

          <rect
            fill="transparent"
            height={Math.max(chartMetrics.plotHeight, 0)}
            onClick={handlePointerMove}
            onPointerMove={handlePointerMove}
            width={chartMetrics.innerWidth}
            x={0}
            y={0}
          />

          <WorkflowFrameXAxis
            maxFrameValue={maxFrameValue}
            width={chartMetrics.innerWidth}
            xScale={xScale}
            y={chartMetrics.plotHeight}
          />
        </Group>
      </svg>
    </div>
  );
}

function WorkflowFrameLane({
  index,
  lane,
  samples,
  width,
  xScale,
}: {
  index: number;
  lane: LaneConfig<WorkflowFrameChartSeriesDefinition, WorkflowFrameFamily>;
  samples: WorkflowFrameSample[];
  width: number;
  xScale: LinearScale;
}) {
  const backgroundFill = index % 2 === 0 ? chartTheme.laneSurface : chartTheme.laneSurfaceAlt;
  const domain = getLaneDomain(lane.family, lane.series, samples);
  const laneScale: LinearScale = scaleLinear<number>({
    domain,
    range: [lane.height, 0],
  });
  // A short lane shows only its ends, so tick labels never run into each other.
  const laneTickCount = lane.height >= 60 ? 3 : 1;

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
        numTicks={Math.min(Math.max(samples.length - 1, 1), 4)}
        scale={xScale}
        stroke={chartTheme.grid}
        width={width}
      />

      <GridRows
        height={lane.height}
        numTicks={laneTickCount}
        scale={laneScale}
        stroke={chartTheme.grid}
        width={width}
      />

      <text fill={chartTheme.text} fontFamily={chartTheme.mono} fontSize="12" x={10} y={14}>
        {lane.label}
      </text>

      {getLaneTicks(domain, laneTickCount).map((tick) => (
        <text
          key={`${lane.family}-${tick}`}
          fill={chartTheme.muted}
          fontFamily={chartTheme.mono}
          fontSize="11.5"
          textAnchor="end"
          x={-6}
          y={Math.min(Math.max(laneScale(tick) + 4, tickLabelCapHeight), lane.height - 1)}
        >
          {formatTick(tick)}
        </text>
      ))}

      {lane.series.map((series) => (
        <LinePath
          data={samples}
          key={series.id}
          stroke={series.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          x={(sample: WorkflowFrameSample) => xScale(sample.frameIndex)}
          y={(sample: WorkflowFrameSample) => laneScale(series.accessor(sample) ?? domain[0])}
        />
      ))}
    </Group>
  );
}

function WorkflowFrameXAxis({
  maxFrameValue,
  width,
  xScale,
  y,
}: {
  maxFrameValue: number;
  width: number;
  xScale: LinearScale;
  y: number;
}) {
  const ticks = buildFrameTicks(maxFrameValue, 4);
  const tickLabelInset = 20;

  return (
    <Group top={y}>
      <line stroke={chartTheme.axis} x1={0} x2={width} y1={0} y2={0} />

      {ticks.map((tick) => (
        <Group key={tick}>
          <line stroke={chartTheme.axis} x1={xScale(tick)} x2={xScale(tick)} y1={0} y2={5} />
          <text
            fill={chartTheme.muted}
            fontFamily={chartTheme.mono}
            fontSize="11.5"
            textAnchor="middle"
            x={Math.max(tickLabelInset, Math.min(width - tickLabelInset, xScale(tick)))}
            y={14}
          >
            {tick}
          </text>
        </Group>
      ))}
    </Group>
  );
}

function buildVisibleLanes(
  selectedSeries: WorkflowFrameChartSeriesDefinition[],
  laneVisibility: Record<WorkflowFrameFamily, boolean>,
  containerHeight: number,
) {
  const families = getWorkflowFrameFamilyOrder().filter(
    (family) => laneVisibility[family] && selectedSeries.some((series) => series.family === family),
  );
  const laneHeight = getFittedLaneHeight(containerHeight, families.length);

  return families.map(
    (family, index) =>
      ({
        family,
        height: laneHeight,
        label: getWorkflowFrameFamilyLabel(family),
        series: selectedSeries.filter((series) => series.family === family),
        yOffset: index * (laneHeight + laneGap),
      }) satisfies LaneConfig<WorkflowFrameChartSeriesDefinition, WorkflowFrameFamily>,
  );
}

/** Fits the lanes to the container, so the chart renders 1:1 and its text keeps its real size. */
function getFittedLaneHeight(containerHeight: number, laneCount: number) {
  const { margin } = getChartMetrics("compact", [], { height: 0, width: 0 });
  const available = containerHeight - margin.top - margin.bottom - laneGap * (laneCount - 1);

  return Math.max(minLaneHeight, available / laneCount);
}

function getLaneDomain(
  family: WorkflowFrameFamily,
  series: WorkflowFrameChartSeriesDefinition[],
  samples: WorkflowFrameSample[],
): [number, number] {
  const values = series.flatMap((definition) =>
    samples
      .map((sample) => definition.accessor(sample))
      .filter((value): value is number => value != null && Number.isFinite(value)),
  );

  if (values.length === 0) {
    return family === "temperature" ? [80, 100] : [0, 10];
  }

  if (family === "temperature") {
    const min = Math.min(...values);
    const max = Math.max(...values);

    return [Math.floor(min - 2), Math.ceil(Math.max(max + 2, min + 6))];
  }

  const min = family === "other" ? Math.min(...values) : 0;
  const max = Math.max(...values);

  if (min < 0) {
    return [Math.floor(min * 1.12), Math.ceil(max * 1.12)];
  }

  return [min, max <= 0 ? 1 : Math.ceil(max * 1.12)];
}

function getLaneTicks(domain: [number, number], tickCount: number) {
  const [min, max] = domain;

  return Array.from(
    { length: tickCount + 1 },
    (_, index) => min + ((max - min) / tickCount) * index,
  );
}

function buildFrameTicks(maxFrameValue: number, tickCount: number) {
  const ticks = new Set<number>();

  for (let index = 0; index <= tickCount; index += 1) {
    const raw = 1 + (Math.max(maxFrameValue - 1, 0) / Math.max(tickCount, 1)) * index;
    ticks.add(Math.round(raw));
  }

  ticks.add(1);
  ticks.add(maxFrameValue);

  return [...ticks]
    .filter((tick) => tick >= 1 && tick <= maxFrameValue)
    .sort((left, right) => left - right);
}

function findNearestFrameIndex(
  samples: WorkflowFrameSample[],
  relativeX: number,
  xScale: LinearScale,
) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  samples.forEach((sample, index) => {
    const distance = Math.abs(xScale(sample.frameIndex) - relativeX);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function formatTick(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(Math.abs(value) >= 10 ? 0 : 1);
}
