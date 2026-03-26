import { useState } from "react";

import {
  CompactMonitorBar,
  DesktopMonitorBar,
  MonitorConfigOverlay,
  MonitorConfigPanel,
  type MonitorLaneOption,
  type MonitorSeriesGroup,
} from "@/components/chart-monitor/chrome";
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
} from "@/lib/workflow-frame-preview";
import {
  deriveWorkflowFrameActivePreset,
  sanitizeWorkflowFrameSelection,
  useWorkflowFrameChartStore,
} from "@/stores/workflow-frame-chart-store";
import { WorkflowFrameCanvas } from "./workflow-frame-chart-canvas";

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
        "panel flex h-full min-h-0 flex-col rounded-[20px] border-chart-border bg-chart-surface p-3 md:p-4 xl:p-5",
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
      <div className="rounded-[10px] border border-chart-border bg-panel-muted px-3 py-2.5">
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
          Frame
        </p>
        <p className="mt-1 font-mono text-[0.9rem] text-foreground">
          {selectedFrameIndex + 1} / {preview.frames.length}
        </p>
      </div>

      {series.map((seriesDefinition) => (
        <div
          className="rounded-[10px] border border-chart-border bg-panel-muted px-3 py-2.5"
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
