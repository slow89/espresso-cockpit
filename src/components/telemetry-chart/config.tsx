import {
  MonitorConfigOverlay,
  MonitorConfigPanel,
  type MonitorLaneOption,
  type MonitorPresetOption,
  type MonitorSeriesGroup,
} from "@/components/chart-monitor/chrome";
import {
  telemetryFamilyLabels,
  telemetryFamilyOrder,
  telemetrySeriesRegistry,
  type TelemetrySeriesFamily,
  type TelemetrySeriesId,
} from "@/lib/telemetry";

import type {
  SelectableTelemetryChartPreset,
  TelemetryChartPreset,
} from "./shared";

export function TelemetryConfigOverlay({
  activePreset,
  laneVisibility,
  onClose,
  onReset,
  onSetPreset,
  onToggleLane,
  onToggleSeries,
  selectedSeriesIds,
}: {
  activePreset: TelemetryChartPreset;
  laneVisibility: Record<TelemetrySeriesFamily, boolean>;
  onClose: () => void;
  onReset: () => void;
  onSetPreset: (preset: SelectableTelemetryChartPreset) => void;
  onToggleLane: (family: TelemetrySeriesFamily) => void;
  onToggleSeries: (seriesId: TelemetrySeriesId) => void;
  selectedSeriesIds: TelemetrySeriesId[];
}) {
  const laneOptions: MonitorLaneOption<TelemetrySeriesFamily>[] = telemetryFamilyOrder.map(
    (family) => ({
      enabled: laneVisibility[family],
      id: family,
      label: telemetryFamilyLabels[family],
    }),
  );
  const presetOptions: MonitorPresetOption<SelectableTelemetryChartPreset>[] = [
    { id: "live-shot", label: "Live shot" },
    { id: "all-signals", label: "All signals" },
  ];
  const seriesGroups: MonitorSeriesGroup<TelemetrySeriesId>[] = telemetryFamilyOrder.map(
    (family) => ({
      label: telemetryFamilyLabels[family],
      series: telemetrySeriesRegistry
        .filter((series) => series.family === family)
        .map((series) => ({
          active: selectedSeriesIds.includes(series.id),
          color: series.color,
          id: series.id,
          label: series.label,
        })),
    }),
  );

  return (
    <MonitorConfigOverlay
      activePreset={activePreset}
      dataTestId="telemetry-config-overlay"
      laneOptions={laneOptions}
      onClose={onClose}
      onReset={onReset}
      onSetPreset={onSetPreset}
      onToggleLane={onToggleLane}
      onToggleSeries={onToggleSeries}
      presetOptions={presetOptions}
      seriesGroups={seriesGroups}
    />
  );
}

export function TelemetryConfigPanel({
  activePreset,
  laneVisibility,
  onReset,
  onSetPreset,
  onToggleLane,
  onToggleSeries,
  selectedSeriesIds,
}: {
  activePreset: TelemetryChartPreset;
  laneVisibility: Record<TelemetrySeriesFamily, boolean>;
  onReset: () => void;
  onSetPreset: (preset: SelectableTelemetryChartPreset) => void;
  onToggleLane: (family: TelemetrySeriesFamily) => void;
  onToggleSeries: (seriesId: TelemetrySeriesId) => void;
  selectedSeriesIds: TelemetrySeriesId[];
}) {
  const laneOptions: MonitorLaneOption<TelemetrySeriesFamily>[] = telemetryFamilyOrder.map(
    (family) => ({
      enabled: laneVisibility[family],
      id: family,
      label: telemetryFamilyLabels[family],
    }),
  );
  const presetOptions: MonitorPresetOption<SelectableTelemetryChartPreset>[] = [
    { id: "live-shot", label: "Live shot" },
    { id: "all-signals", label: "All signals" },
  ];
  const seriesGroups: MonitorSeriesGroup<TelemetrySeriesId>[] = telemetryFamilyOrder.map(
    (family) => ({
      label: telemetryFamilyLabels[family],
      series: telemetrySeriesRegistry
        .filter((series) => series.family === family)
        .map((series) => ({
          active: selectedSeriesIds.includes(series.id),
          color: series.color,
          id: series.id,
          label: series.label,
        })),
    }),
  );

  return (
    <MonitorConfigPanel
      activePreset={activePreset}
      laneOptions={laneOptions}
      onReset={onReset}
      onSetPreset={onSetPreset}
      onToggleLane={onToggleLane}
      onToggleSeries={onToggleSeries}
      presetOptions={presetOptions}
      seriesGroups={seriesGroups}
    />
  );
}
