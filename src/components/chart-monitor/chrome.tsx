import { SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type MonitorStatusItem = {
  detail: string;
  label: string;
  value: string;
};

export type MonitorPresetOption<TPreset extends string = string> = {
  id: TPreset;
  label: string;
};

export type MonitorLaneOption<TFamily extends string = string> = {
  enabled: boolean;
  id: TFamily;
  label: string;
};

export type MonitorSeriesGroup<TSeriesId extends string = string> = {
  label: string;
  series: Array<{
    active: boolean;
    color: string;
    id: TSeriesId;
    label: string;
  }>;
};

export function CompactMonitorBar({
  activePresetLabel,
  items,
  onOpenConfig,
}: {
  activePresetLabel: string;
  items: MonitorStatusItem[];
  onOpenConfig: () => void;
}) {
  return (
    <div className="shrink-0 flex min-w-0 items-stretch gap-1">
      {items.map((item, index) => (
        <div
          className="min-w-0 flex-1 rounded-[3px] border border-border/50 bg-panel-strong/60 px-2 py-1 md:max-xl:px-2.5 md:max-xl:py-1"
          key={`${item.label}-${index}`}
          title={item.detail}
        >
          <p className="truncate font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground md:max-xl:text-[0.5rem]">
            {item.label}
          </p>
          <p className="mt-0.5 truncate font-mono text-[0.68rem] font-semibold uppercase tabular-nums tracking-[0.02em] text-foreground md:max-xl:text-[0.72rem]">
            {item.value}
          </p>
        </div>
      ))}

      <button
        aria-label="Open chart controls"
        className="inline-flex min-w-[36px] shrink-0 items-center justify-center rounded-[3px] border border-border/50 bg-panel-strong/60 px-2 text-muted-foreground transition hover:border-highlight/50 hover:text-foreground md:max-xl:min-w-[40px]"
        onClick={onOpenConfig}
        title={`Preset: ${activePresetLabel}`}
        type="button"
      >
        <SlidersHorizontal className="size-3 md:max-xl:size-3.5" />
      </button>
    </div>
  );
}

export function DesktopMonitorBar<TPreset extends string, TActivePreset extends string = TPreset>({
  activePreset,
  items,
  onReset,
  onSetPreset,
  presetOptions,
}: {
  activePreset: TActivePreset;
  items: MonitorStatusItem[];
  onReset: () => void;
  onSetPreset: (preset: TPreset) => void;
  presetOptions: Array<MonitorPresetOption<TPreset>>;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-stretch gap-1">
      {items.map((item, index) => (
        <div
          className="min-w-0 flex-1 basis-[90px] rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-1"
          key={`${item.label}-${index}`}
          title={item.detail}
        >
          <p className="truncate font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-0.5 truncate font-mono text-[0.72rem] font-semibold uppercase tabular-nums tracking-[0.02em] text-foreground">
            {item.value}
          </p>
        </div>
      ))}

      <div className="ml-auto flex shrink-0 flex-wrap items-stretch justify-end gap-1">
        {presetOptions.map((preset) => (
          <PresetButton
            active={String(activePreset) === preset.id}
            key={preset.id}
            label={preset.label}
            onClick={() => onSetPreset(preset.id)}
          />
        ))}
        <button
          className="rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 font-mono text-[0.54rem] uppercase tracking-[0.08em] text-muted-foreground transition hover:border-highlight/50 hover:text-foreground"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export function MonitorConfigOverlay<
  TPreset extends string,
  TFamily extends string,
  TSeriesId extends string,
  TActivePreset extends string = TPreset,
>({
  activePreset,
  dataTestId = "monitor-config-overlay",
  laneOptions,
  onClose,
  onReset,
  onSetPreset,
  onToggleLane,
  onToggleSeries,
  presetOptions,
  seriesGroups,
  title = "Chart controls",
}: {
  activePreset: TActivePreset;
  dataTestId?: string;
  laneOptions: Array<MonitorLaneOption<TFamily>>;
  onClose: () => void;
  onReset: () => void;
  onSetPreset: (preset: TPreset) => void;
  onToggleLane: (family: TFamily) => void;
  onToggleSeries: (seriesId: TSeriesId) => void;
  presetOptions: Array<MonitorPresetOption<TPreset>>;
  seriesGroups: Array<MonitorSeriesGroup<TSeriesId>>;
  title?: string;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm xl:hidden"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="absolute inset-3 flex min-h-0 flex-col overflow-hidden rounded-[3px] border border-border/50 bg-chart-surface p-3 shadow-2xl sm:inset-4 sm:p-4"
        data-testid={dataTestId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-highlight">
              {title}
            </p>
            <p className="mt-1 text-[0.72rem] leading-5 text-muted-foreground">
              Presets, lanes, and visible signals.
            </p>
          </div>
          <button
            aria-label="Close chart controls"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[3px] border border-border/50 bg-panel-strong/60 text-muted-foreground transition hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
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
        </div>
      </div>
    </div>
  );
}

export function MonitorConfigPanel<
  TPreset extends string,
  TFamily extends string,
  TSeriesId extends string,
  TActivePreset extends string = TPreset,
>({
  activePreset,
  laneOptions,
  onReset,
  onSetPreset,
  onToggleLane,
  onToggleSeries,
  presetOptions,
  seriesGroups,
}: {
  activePreset: TActivePreset;
  laneOptions: Array<MonitorLaneOption<TFamily>>;
  onReset: () => void;
  onSetPreset: (preset: TPreset) => void;
  onToggleLane: (family: TFamily) => void;
  onToggleSeries: (seriesId: TSeriesId) => void;
  presetOptions: Array<MonitorPresetOption<TPreset>>;
  seriesGroups: Array<MonitorSeriesGroup<TSeriesId>>;
}) {
  return (
    <div className="rounded-[3px] border border-border/50 bg-panel-strong/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Configuration
        </p>
        <button
          className="rounded-[3px] border border-border/50 bg-panel-strong px-2.5 py-1 font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground transition hover:border-highlight/50 hover:text-foreground"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        <div>
          <p className="font-mono text-[0.52rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted">
            Presets
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {presetOptions.map((preset) => (
              <PresetButton
                active={String(activePreset) === preset.id}
                key={preset.id}
                label={preset.label}
                onClick={() => onSetPreset(preset.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[0.52rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted">
            Lanes
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {laneOptions.map((lane) => (
              <button
                className={cn(
                  "flex items-center justify-between rounded-[3px] border px-2.5 py-1.5 text-left transition",
                  lane.enabled
                    ? "border-highlight/35 bg-primary/12 text-foreground"
                    : "border-border/50 bg-panel-strong text-muted-foreground hover:bg-panel-subtle hover:text-foreground",
                )}
                key={lane.id}
                onClick={() => onToggleLane(lane.id)}
                type="button"
              >
                <span className="font-mono text-[0.56rem] uppercase tracking-[0.08em]">
                  {lane.label}
                </span>
                <span className="font-mono text-[0.48rem] uppercase tracking-[0.06em]">
                  {lane.enabled ? "On" : "Off"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          {seriesGroups.map((group) => (
            <div key={group.label}>
              <p className="font-mono text-[0.52rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted">
                {group.label}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {group.series.map((series) => (
                  <button
                    className={cn(
                      "rounded-[3px] border px-2 py-1 font-mono text-[0.52rem] uppercase tracking-[0.06em] transition",
                      series.active
                        ? "text-primary-foreground"
                        : "border-border/50 bg-panel-strong text-muted-foreground hover:bg-panel-subtle hover:text-foreground",
                    )}
                    key={series.id}
                    onClick={() => onToggleSeries(series.id)}
                    style={series.active ? { backgroundColor: series.color } : undefined}
                    type="button"
                  >
                    {series.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PresetButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-[3px] border px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.08em] whitespace-nowrap transition",
        active
          ? "border-primary/40 bg-primary text-primary-foreground"
          : "border-border/50 bg-panel-strong text-muted-foreground hover:border-highlight/35 hover:bg-panel-subtle hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
