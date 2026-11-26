import { useState } from "react";

import {
  CompactMonitorBar,
  MonitorConfigOverlay,
  type MonitorLaneOption,
  type MonitorSeriesGroup,
} from "@/components/chart-monitor/chrome";
import { cn } from "@/lib/utils";
import {
  buildWorkflowFrameStatusItems,
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

interface WorkflowFrameChartProps {
  className?: string;
  onSelectFrame: (index: number) => void;
  preview: FramePreviewData;
  selectedFrameIndex: number;
}

export function WorkflowFrameChart({
  className,
  onSelectFrame,
  preview,
  selectedFrameIndex,
}: WorkflowFrameChartProps) {
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
    <>
      <div
        className={cn(
          "panel flex h-full min-h-0 flex-col rounded-[3px] border-chart-border bg-chart-surface p-2 md:p-3 xl:p-5",
          className,
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col space-y-3">
          <CompactMonitorBar
            activePresetLabel={formatWorkflowPresetLabel(activePreset)}
            items={statusItems}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
          <WorkflowFrameCanvas
            activeSample={activeSample}
            hasNumericSeries={preview.series.length > 0}
            laneVisibility={laneVisibility}
            onSelectFrame={onSelectFrame}
            selectedSeries={selectedSeries}
            samples={preview.samples}
          />
        </div>
      </div>

      {/* Outside the panel, whose backdrop-filter would trap this fixed overlay inside it. */}
      {isConfigOpen ? (
        <MonitorConfigOverlay
          activePreset={activePreset}
          className="xl:block"
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
    </>
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
