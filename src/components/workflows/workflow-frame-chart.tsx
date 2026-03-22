import type { PointerEvent } from "react";
import { useState } from "react";

import { Grid, Group, Scale, Shape } from "@visx/visx";

import {
  CompactMonitorBar,
  DesktopMonitorBar,
  MonitorConfigOverlay,
  MonitorConfigPanel,
  type MonitorLaneOption,
  type MonitorSeriesGroup,
} from "@/components/chart-monitor/chrome";
import {
  chartTheme,
  getChartMetrics,
  type ChartDensity,
  type LaneConfig,
  type LinearScale,
  useElementSize,
} from "@/components/telemetry-chart/shared";
import { cn } from "@/lib/utils";
import {
  buildWorkflowFrameStatusItems,
  formatWorkflowSeriesValue,
  getWorkflowFrameFamilyLabel,
  getWorkflowFrameFamilyOrder,
  type FramePreviewData,
  type WorkflowFrameChartPreset,
  type WorkflowFrameChartSeriesDefinition,
  type WorkflowFrameFamily,
  type WorkflowFrameSample,
} from "@/lib/workflow-frame-preview";
import {
  deriveWorkflowFrameActivePreset,
  sanitizeWorkflowFrameSelection,
  useWorkflowFrameChartStore,
} from "@/stores/workflow-frame-chart-store";

export function WorkflowFrameChart({
  className,
  layout = "auto",
  onSelectFrame,
  preview,
  selectedFrameIndex,
}: {
  className?: string;
  layout?: "auto" | "tablet" | "desktop";
  onSelectFrame: (index: number) => void;
  preview: FramePreviewData;
  selectedFrameIndex: number;
}) {
  const rawActivePreset = useWorkflowFrameChartStore((state) => state.activePreset);
  const laneVisibility = useWorkflowFrameChartStore((state) => state.laneVisibility);
  const rawSelectedSeriesIds = useWorkflowFrameChartStore((state) => state.selectedSeriesIds);
  const resetToDefaultPreset = useWorkflowFrameChartStore((state) => state.resetToDefaultPreset);
  const setPreset = useWorkflowFrameChartStore((state) => state.setPreset);
  const toggleLane = useWorkflowFrameChartStore((state) => state.toggleLane);
  const toggleSeries = useWorkflowFrameChartStore((state) => state.toggleSeries);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const selectedSeriesIds = sanitizeWorkflowFrameSelection({
    activePreset: rawActivePreset,
    allSeriesIds: preview.seriesIds,
    defaultSeriesIds: preview.defaultSeriesIds,
    selectedSeriesIds: rawSelectedSeriesIds,
  });
  const activePreset = deriveWorkflowFrameActivePreset({
    allSeriesIds: preview.seriesIds,
    defaultSeriesIds: preview.defaultSeriesIds,
    selectedSeriesIds,
  });
  const selectedSeries = selectedSeriesIds
    .map((seriesId) => preview.series.find((series) => series.id === seriesId))
    .filter((series): series is WorkflowFrameChartSeriesDefinition => series != null);
  const activeSample = preview.samples[selectedFrameIndex] ?? null;
  const statusItems = buildWorkflowFrameStatusItems({
    preview,
    selectedFrameIndex,
    selectedSeriesIds,
  });
  const laneOptions: MonitorLaneOption<WorkflowFrameFamily>[] = getWorkflowFrameFamilyOrder().map(
    (family) => ({
      enabled: laneVisibility[family],
      id: family,
      label: getWorkflowFrameFamilyLabel(family),
    }),
  );
  const seriesGroups: MonitorSeriesGroup<string>[] = getWorkflowFrameFamilyOrder()
    .map((family) => ({
      label: getWorkflowFrameFamilyLabel(family),
      series: preview.series
        .filter((series) => series.family === family)
        .map((series) => ({
          active: selectedSeriesIds.includes(series.id),
          color: series.color,
          id: series.id,
          label: series.label,
        })),
    }))
    .filter((group) => group.series.length > 0);

  function handleReset() {
    resetToDefaultPreset(preview.defaultSeriesIds);
  }

  function handleSetPreset(preset: Exclude<WorkflowFrameChartPreset, "custom">) {
    setPreset(preset, preset === "all-series" ? preview.seriesIds : preview.defaultSeriesIds);
  }

  function handleToggleSeries(seriesId: string) {
    toggleSeries(seriesId, preview.seriesIds, preview.defaultSeriesIds);
  }

  return (
    <div
      className={cn(
        "panel flex h-full min-h-0 flex-col rounded-[20px] border-border/70 bg-[#06080b]/92 p-3 md:p-4 xl:p-5",
        className,
      )}
    >
      {layout === "auto" || layout === "tablet" ? (
        <div
          className={cn(
            layout === "auto"
              ? "flex min-h-0 flex-1 flex-col space-y-3 xl:hidden"
              : "flex min-h-0 flex-1 flex-col space-y-3",
          )}
        >
          <CompactMonitorBar
            activePresetLabel={formatWorkflowPresetLabel(activePreset)}
            items={statusItems}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
        <WorkflowFrameCanvas
          activeSample={activeSample}
          density="compact"
          hasNumericSeries={preview.series.length > 0}
          laneVisibility={laneVisibility}
          onSelectFrame={onSelectFrame}
          selectedSeries={selectedSeries}
          samples={preview.samples}
        />
        </div>
      ) : null}

      {layout === "auto" || layout === "desktop" ? (
        <div
          className={cn(
            layout === "auto" ? "hidden h-full min-h-0 flex-1 xl:block" : "h-full min-h-0 flex-1",
          )}
        >
          <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
          <section className="flex min-h-0 min-w-0 flex-col">
            <DesktopMonitorBar
              activePreset={activePreset}
              items={statusItems}
              onReset={handleReset}
              onSetPreset={handleSetPreset}
              presetOptions={[
                { id: "core-frames", label: "Core frames" },
                { id: "all-series", label: "All series" },
              ]}
            />
            <div className="mt-3 min-h-0 flex-1">
              <WorkflowFrameCanvas
                activeSample={activeSample}
                density="regular"
                hasNumericSeries={preview.series.length > 0}
                laneVisibility={laneVisibility}
                onSelectFrame={onSelectFrame}
                selectedSeries={selectedSeries}
                samples={preview.samples}
              />
            </div>
          </section>

          <aside
            className={cn(
              layout === "auto" ? "hidden h-full min-h-0 xl:block" : "h-full min-h-0",
            )}
          >
            <MonitorConfigPanel
              activePreset={activePreset}
              laneOptions={laneOptions}
              onReset={handleReset}
              onSetPreset={handleSetPreset}
              onToggleLane={toggleLane}
              onToggleSeries={handleToggleSeries}
              presetOptions={[
                { id: "core-frames", label: "Core frames" },
                { id: "all-series", label: "All series" },
              ]}
              seriesGroups={seriesGroups}
            />
          </aside>
        </div>
        </div>
      ) : null}

      {layout !== "desktop" && isConfigOpen ? (
        <MonitorConfigOverlay
          activePreset={activePreset}
          dataTestId="workflow-frame-config-overlay"
          laneOptions={laneOptions}
          onClose={() => setIsConfigOpen(false)}
          onReset={handleReset}
          onSetPreset={handleSetPreset}
          onToggleLane={toggleLane}
          onToggleSeries={handleToggleSeries}
          presetOptions={[
            { id: "core-frames", label: "Core frames" },
            { id: "all-series", label: "All series" },
          ]}
          seriesGroups={seriesGroups}
          title="Frame chart controls"
        />
      ) : null}
    </div>
  );
}

function WorkflowFrameCanvas({
  activeSample,
  density,
  hasNumericSeries,
  laneVisibility,
  onSelectFrame,
  samples,
  selectedSeries,
}: {
  activeSample: WorkflowFrameSample | null;
  density: ChartDensity;
  hasNumericSeries: boolean;
  laneVisibility: Record<WorkflowFrameFamily, boolean>;
  onSelectFrame: (index: number) => void;
  samples: WorkflowFrameSample[];
  selectedSeries: WorkflowFrameChartSeriesDefinition[];
}) {
  const [containerRef, containerSize] = useElementSize<HTMLDivElement>();
  const visibleLanes = buildVisibleLanes(selectedSeries, laneVisibility, density);
  const chartMetrics = getChartMetrics(density, visibleLanes, containerSize);
  const maxFrameValue = Math.max(samples.length, 1);
  const xScale = Scale.scaleLinear<number>({
    domain: [1, Math.max(maxFrameValue, 2)],
    range: [0, chartMetrics.innerWidth],
  });
  const selectedX = activeSample == null ? null : xScale(activeSample.frameIndex);
  const chartHeight = Math.max(chartMetrics.height, density === "compact" ? 228 : 260);

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    if (samples.length === 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * chartMetrics.innerWidth;

    onSelectFrame(findNearestFrameIndex(samples, relativeX, xScale));
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-0 overflow-hidden rounded-[18px] border border-border/70 bg-[#080b10]",
        density === "regular" ? "h-full flex-1" : "flex-1",
      )}
    >
      <svg
        aria-label="workflow frame monitor"
        className="h-full w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${chartMetrics.width} ${chartHeight}`}
      >
        <rect
          fill={chartTheme.surface}
          height={chartHeight}
          rx={density === "compact" ? 18 : 22}
          stroke={chartTheme.border}
          width={chartMetrics.width}
          x={0}
          y={0}
        />

        <Group.Group left={chartMetrics.margin.left} top={chartMetrics.margin.top}>
          {visibleLanes.length > 0 ? (
            visibleLanes.map((lane, laneIndex) => (
              <WorkflowFrameLane
                density={density}
                index={laneIndex}
                key={lane.family}
                lane={lane}
                samples={samples}
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
              {hasNumericSeries
                ? "Enable at least one series to view frame telemetry."
                : "No numeric frame fields were found in this profile."}
            </text>
          )}

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
            density={density}
            maxFrameValue={maxFrameValue}
            width={chartMetrics.innerWidth}
            xScale={xScale}
            y={chartMetrics.plotHeight}
          />
        </Group.Group>
      </svg>
    </div>
  );
}

function WorkflowFrameLane({
  density,
  index,
  lane,
  samples,
  width,
  xScale,
}: {
  density: ChartDensity;
  index: number;
  lane: LaneConfig<WorkflowFrameChartSeriesDefinition, WorkflowFrameFamily>;
  samples: WorkflowFrameSample[];
  width: number;
  xScale: LinearScale;
}) {
  const backgroundFill = index % 2 === 0 ? chartTheme.laneSurface : chartTheme.laneSurfaceAlt;
  const domain = getLaneDomain(lane.family, lane.series, samples);
  const laneScale = Scale.scaleLinear<number>({
    domain,
    range: [lane.height, 0],
  });
  const laneTickCount = density === "compact" ? 3 : 4;

  return (
    <Group.Group top={lane.yOffset}>
      <rect
        fill={backgroundFill}
        height={lane.height}
        rx={density === "compact" ? 12 : 16}
        stroke={chartTheme.border}
        width={width}
        x={0}
        y={0}
      />

      <Grid.GridColumns
        height={lane.height}
        numTicks={density === "compact" ? Math.min(Math.max(samples.length - 1, 1), 4) : Math.min(Math.max(samples.length - 1, 1), 6)}
        scale={xScale}
        stroke={chartTheme.grid}
        width={width}
      />

      <Grid.GridRows
        height={lane.height}
        numTicks={laneTickCount}
        scale={laneScale}
        stroke={chartTheme.grid}
        width={width}
      />

      <text
        fill={chartTheme.text}
        fontFamily={chartTheme.mono}
        fontSize={density === "compact" ? "10" : "11"}
        x={density === "compact" ? 10 : 12}
        y={density === "compact" ? 14 : 16}
      >
        {lane.label}
      </text>

      {getLaneTicks(domain, laneTickCount).map((tick) => (
        <text
          key={`${lane.family}-${tick}`}
          fill={chartTheme.muted}
          fontFamily={chartTheme.mono}
          fontSize={density === "compact" ? "9" : "10"}
          textAnchor="end"
          x={density === "compact" ? -6 : -8}
          y={laneScale(tick) + 4}
        >
          {formatTick(tick)}
        </text>
      ))}

      {lane.series.map((series) => (
        <Shape.LinePath
          data={samples}
          key={series.id}
          stroke={series.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={density === "compact" ? 2.5 : 3}
          x={(sample: WorkflowFrameSample) => xScale(sample.frameIndex)}
          y={(sample: WorkflowFrameSample) => laneScale(series.accessor(sample) ?? domain[0])}
        />
      ))}
    </Group.Group>
  );
}

function WorkflowFrameXAxis({
  density,
  maxFrameValue,
  width,
  xScale,
  y,
}: {
  density: ChartDensity;
  maxFrameValue: number;
  width: number;
  xScale: LinearScale;
  y: number;
}) {
  const ticks = buildFrameTicks(maxFrameValue, density === "compact" ? 4 : 6);

  return (
    <Group.Group top={y}>
      <line stroke={chartTheme.axis} x1={0} x2={width} y1={0} y2={0} />

      {ticks.map((tick) => (
        <Group.Group key={tick} left={xScale(tick)}>
          <line
            stroke={chartTheme.axis}
            x1={0}
            x2={0}
            y1={0}
            y2={density === "compact" ? 5 : 6}
          />
          <text
            fill={chartTheme.muted}
            fontFamily={chartTheme.mono}
            fontSize={density === "compact" ? "8.5" : "10"}
            textAnchor="middle"
            x={0}
            y={density === "compact" ? 14 : 18}
          >
            {tick}
          </text>
        </Group.Group>
      ))}

      <text
        fill={chartTheme.muted}
        fontFamily={chartTheme.mono}
        fontSize={density === "compact" ? "8.5" : "10"}
        textAnchor="end"
        x={width}
        y={density === "compact" ? 14 : 18}
      >
        Frame index
      </text>
    </Group.Group>
  );
}

function buildVisibleLanes(
  selectedSeries: WorkflowFrameChartSeriesDefinition[],
  laneVisibility: Record<WorkflowFrameFamily, boolean>,
  density: ChartDensity,
) {
  let yOffset = 0;
  const laneGap = density === "compact" ? 8 : 12;

  return getWorkflowFrameFamilyOrder().flatMap((family) => {
    if (!laneVisibility[family]) {
      return [];
    }

    const laneSeries = selectedSeries.filter((series) => series.family === family);

    if (laneSeries.length === 0) {
      return [];
    }

    const lane = {
      family,
      height: density === "compact" ? 76 : 118,
      label: getWorkflowFrameFamilyLabel(family),
      series: laneSeries,
      yOffset,
    } satisfies LaneConfig<WorkflowFrameChartSeriesDefinition, WorkflowFrameFamily>;

    yOffset += lane.height + laneGap;

    return [lane];
  });
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
    const raw = 1 + ((Math.max(maxFrameValue - 1, 0) / Math.max(tickCount, 1)) * index);
    ticks.add(Math.round(raw));
  }

  ticks.add(1);
  ticks.add(maxFrameValue);

  return [...ticks].filter((tick) => tick >= 1 && tick <= maxFrameValue).sort((left, right) => left - right);
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

function formatWorkflowPresetLabel(preset: WorkflowFrameChartPreset) {
  if (preset === "core-frames") {
    return "Core frames";
  }

  if (preset === "all-series") {
    return "All series";
  }

  return "Custom";
}

export function WorkflowFrameMetricGrid({
  preview,
  selectedFrameIndex,
  selectedSeriesIds,
}: {
  preview: FramePreviewData;
  selectedFrameIndex: number;
  selectedSeriesIds: string[];
}) {
  const selectedSample = preview.samples[selectedFrameIndex] ?? null;
  const series = selectedSeriesIds
    .map((seriesId) => preview.series.find((entry) => entry.id === seriesId))
    .filter((entry): entry is WorkflowFrameChartSeriesDefinition => entry != null)
    .slice(0, 4);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-[10px] border border-border bg-[#090c10] px-3 py-2.5">
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
          Frame
        </p>
        <p className="mt-1 font-mono text-[0.9rem] text-foreground">
          {selectedFrameIndex + 1} / {preview.frames.length}
        </p>
      </div>

      {series.map((seriesDefinition) => (
        <div
          className="rounded-[10px] border border-border bg-[#090c10] px-3 py-2.5"
          key={seriesDefinition.id}
        >
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
            {seriesDefinition.shortLabel}
          </p>
          <p className="mt-1 font-mono text-[0.9rem] text-foreground">
            {formatWorkflowSeriesValue(
              seriesDefinition,
              selectedSample ? seriesDefinition.accessor(selectedSample) : null,
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
