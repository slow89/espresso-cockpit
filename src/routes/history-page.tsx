import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TelemetryChart } from "@/components/telemetry-chart";
import { formatBrewRatio } from "@/lib/recipe-utils";
import {
  adaptShotMeasurementsToTelemetry,
  getShotActualRatio,
  getShotDisplayTitle,
  getShotDurationSeconds,
  getShotFinalWeight,
} from "@/lib/shot-history";
import { cn, formatNumber, formatRelativeTimestamp } from "@/lib/utils";
import {
  useShotQuery,
  useShotsQuery,
} from "@/rest/queries";
import type {
  ShotDetailRecord,
  ShotListResponse,
  ShotRecord,
  WorkflowSettings,
} from "@/rest/types";

const emptyShotList: ShotListResponse = {
  items: [],
  total: 0,
  limit: 0,
  offset: 0,
};

const historyRouteApi = getRouteApi("/history");

export function HistoryRoutePage() {
  const { shotId } = historyRouteApi.useSearch();
  const navigate = historyRouteApi.useNavigate();

  return (
    <HistoryPage
      onSelectShotId={(nextShotId) =>
        void navigate({
          search: (previous) => ({
            ...previous,
            shotId: nextShotId ?? undefined,
          }),
        })
      }
      selectedShotId={shotId ?? null}
    />
  );
}

export function HistoryPage({
  onSelectShotId,
  selectedShotId = null,
}: {
  onSelectShotId?: (shotId: string | null) => void;
  selectedShotId?: string | null;
}) {
  const shotsQuery = useShotsQuery();
  const shotList = shotsQuery.data ?? emptyShotList;
  const requestedSelectedShot =
    selectedShotId == null
      ? null
      : shotList.items.find((shot) => shot.id != null && shot.id === selectedShotId) ?? null;
  const hasInvalidSelectedShot =
    selectedShotId != null && requestedSelectedShot == null;
  const fallbackSelectedShot = shotList.items[0] ?? null;
  const effectiveSelectedShot = hasInvalidSelectedShot
    ? null
    : requestedSelectedShot ?? fallbackSelectedShot;
  const effectiveSelectedShotId = effectiveSelectedShot?.id ?? null;
  const shotQuery = useShotQuery(effectiveSelectedShotId);
  const selectedShot = shotQuery.data;
  const selectedShotTelemetry = selectedShot
    ? adaptShotMeasurementsToTelemetry(selectedShot.measurements)
    : [];
  const isDetailPending = effectiveSelectedShotId != null && shotQuery.isPending && !selectedShot;

  async function handleRefresh() {
    await Promise.all([
      shotsQuery.refetch(),
      effectiveSelectedShotId ? shotQuery.refetch() : Promise.resolve(),
    ]);
  }

  return (
    <div className="panel min-h-[calc(100vh-var(--app-footer-height))] overflow-hidden rounded-none border-x-0 border-t-0 bg-shell md:flex md:h-[calc(100vh-var(--app-footer-height))] md:flex-col">
      <section className="grid min-h-0 flex-1 md:grid-cols-[312px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex min-h-0 min-w-0 flex-col border-b border-border bg-panel-muted md:border-b-0 md:border-r">
          <div className="shrink-0 border-b border-border px-3 py-3 md:px-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-highlight">
                  Session archive
                </p>
                <h1 className="mt-1 font-display text-[1.85rem] leading-none text-foreground">
                  Shot history
                </h1>
                <p className="mt-2 max-w-[22rem] text-[0.8rem] leading-5 text-muted-foreground">
                  Select a past shot to inspect its telemetry, workflow, and brew context.
                </p>
              </div>

              <Badge variant="secondary">{shotList.total} shots</Badge>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {shotsQuery.error ? (
                <span className="font-mono text-[0.72rem] text-destructive">
                  {shotsQuery.error.message}
                </span>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 md:p-3">
            {shotList.items.length === 0 ? (
              <section className="rounded-[14px] border border-dashed border-border/70 bg-panel p-4">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Queue
                </p>
                <p className="mt-2 text-[0.85rem] text-foreground">No shots have been synced yet.</p>
                <p className="mt-1 text-[0.78rem] leading-5 text-muted-foreground">
                  Once the bridge returns historical records, they will appear here.
                </p>
              </section>
            ) : (
              <div className="grid gap-2">
                {shotList.items.map((shot, index) => (
                  <HistoryShotButton
                    index={index}
                    isSelected={effectiveSelectedShotId != null && shot.id === effectiveSelectedShotId}
                    key={shot.id ?? `${shot.timestamp ?? "shot"}-${index}`}
                    onSelect={() => {
                      if (shot.id) {
                        onSelectShotId?.(shot.id);
                      }
                    }}
                    shot={shot}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="min-h-0 min-w-0 flex flex-col">
          <HistoryDetailHeader
            shot={selectedShot}
            summaryShot={effectiveSelectedShot}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            {selectedShot ? (
              <div className="grid gap-3 p-2 md:p-3 xl:p-4">
                <section className="min-h-[340px] md:min-h-[420px] xl:min-h-[480px]">
                  <TelemetryChart
                    className="h-full rounded-[18px] border-0 bg-transparent p-0 shadow-none"
                    data={selectedShotTelemetry}
                  />
                </section>

                <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                  <HistoryInfoPanel
                    description="Applied recipe, author, and profile metadata captured with the shot."
                    title="Profile"
                  >
                    <HistoryStatRow
                      label="Workflow"
                      value={selectedShot.workflow?.name ?? "-"}
                    />
                    <HistoryStatRow
                      label="Profile"
                      value={selectedShot.workflow?.profile?.title ?? "-"}
                    />
                    <HistoryStatRow
                      label="Author"
                      value={selectedShot.workflow?.profile?.author ?? "-"}
                    />
                    <HistoryStatRow
                      label="Beverage"
                      value={selectedShot.workflow?.profile?.beverage_type ?? "-"}
                    />
                    <HistoryStatRow
                      label="Frames"
                      value={`${selectedShot.workflow?.profile?.steps?.length ?? 0}`}
                    />
                  </HistoryInfoPanel>

                  <HistoryInfoPanel
                    description="Coffee, grinder, and target recipe fields attached to the shot."
                    title="Context"
                  >
                    <HistoryStatRow
                      label="Coffee"
                      value={selectedShot.workflow?.context?.coffeeName ?? "-"}
                    />
                    <HistoryStatRow
                      label="Roaster"
                      value={selectedShot.workflow?.context?.coffeeRoaster ?? "-"}
                    />
                    <HistoryStatRow
                      label="Grinder"
                      value={joinValues(
                        selectedShot.workflow?.context?.grinderModel,
                        selectedShot.workflow?.context?.grinderSetting,
                      )}
                    />
                    <HistoryStatRow
                      label="Dose"
                      value={formatMetricValue(
                        selectedShot.workflow?.context?.targetDoseWeight,
                        "g",
                        1,
                      )}
                    />
                    <HistoryStatRow
                      label="Target yield"
                      value={formatMetricValue(
                        selectedShot.workflow?.context?.targetYield,
                        "g",
                        1,
                      )}
                    />
                    <HistoryStatRow
                      label="Target ratio"
                      value={formatBrewRatio(
                        selectedShot.workflow?.context?.targetDoseWeight,
                        selectedShot.workflow?.context?.targetYield,
                        "-",
                      )}
                    />
                  </HistoryInfoPanel>

                  <HistoryInfoPanel
                    description="Machine settings that were bundled into this saved shot."
                    title="Settings"
                  >
                    <HistorySettingsRows
                      hotWaterData={selectedShot.workflow?.hotWaterData}
                      rinseData={selectedShot.workflow?.rinseData}
                      steamSettings={selectedShot.workflow?.steamSettings}
                    />
                  </HistoryInfoPanel>

                  <HistoryInfoPanel
                    className="lg:col-span-2 2xl:col-span-3"
                    description="Original profile notes captured from the bridge."
                    title="Notes"
                  >
                    <p className="max-h-40 overflow-y-auto whitespace-pre-line pr-1 text-[0.8rem] leading-6 text-foreground/88">
                      {selectedShot.workflow?.profile?.notes?.trim() || "No profile notes were saved with this shot."}
                    </p>
                  </HistoryInfoPanel>
                </div>
              </div>
            ) : isDetailPending ? (
              <HistoryStatePanel
                body="Loading the saved telemetry stream and workflow metadata for this shot."
                title="Loading shot detail"
              />
            ) : shotQuery.error ? (
              <HistoryStatePanel
                action={
                  <Button onClick={() => void handleRefresh()} size="sm" variant="secondary">
                    Retry shot
                  </Button>
                }
                body={shotQuery.error.message}
                title="Unable to load shot detail"
              />
            ) : hasInvalidSelectedShot ? (
              <HistoryStatePanel
                action={
                  onSelectShotId ? (
                    <Button onClick={() => onSelectShotId(null)} size="sm" variant="secondary">
                      Show latest shot
                    </Button>
                  ) : undefined
                }
                body="This shot is no longer in the current history list. Pick another shot from the rail or clear the selection."
                title="Shot not found"
              />
            ) : (
              <HistoryStatePanel
                body="Pick a shot from the rail to load its telemetry and saved context."
                title="Select a shot"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function HistoryShotButton({
  index,
  isSelected,
  onSelect,
  shot,
}: {
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  shot: ShotRecord;
}) {
  return (
    <button
      className={cn(
        "w-full rounded-[14px] border px-3 py-3 text-left transition",
        isSelected
          ? "border-highlight/50 bg-primary/12 shadow-[0_0_0_1px_var(--ring)]"
          : "border-border/70 bg-panel hover:border-highlight/35 hover:bg-panel-muted",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-highlight">
            Shot {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-1 truncate font-mono text-[0.86rem] font-semibold tracking-[0.03em] text-foreground">
            {getShotDisplayTitle(shot)}
          </p>
        </div>
        {isSelected ? <Badge>Selected</Badge> : null}
      </div>

      <div className="mt-2 grid gap-1 text-[0.75rem] text-muted-foreground">
        <p>{formatRelativeTimestamp(shot.timestamp)}</p>
        <p className="truncate">
          {shot.workflow?.context?.coffeeName ?? "No coffee metadata"}
        </p>
        <p className="truncate">
          {joinValues(
            formatMetricValue(shot.workflow?.context?.targetDoseWeight, "g", 1),
            formatMetricValue(shot.workflow?.context?.targetYield, "g", 1),
          )}
        </p>
      </div>
    </button>
  );
}

function HistoryDetailHeader({
  shot,
  summaryShot,
}: {
  shot: ShotDetailRecord | undefined;
  summaryShot: ShotRecord | null;
}) {
  const finalWeight = shot ? getShotFinalWeight(shot.measurements) : null;
  const durationSeconds = shot ? getShotDurationSeconds(shot.measurements) : null;
  const actualRatio = shot ? getShotActualRatio(shot) : null;
  const displayShot = shot ?? summaryShot;

  return (
    <section className="shrink-0 border-b border-border px-3 py-2.5 md:px-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Selected shot
          </p>
          <p className="mt-1 truncate font-display text-[1.55rem] leading-none text-foreground">
            {displayShot ? getShotDisplayTitle(displayShot) : "No shot selected"}
          </p>
          <p className="mt-2 text-[0.8rem] text-muted-foreground">
            {displayShot
              ? formatRelativeTimestamp(displayShot.timestamp)
              : "Choose a shot from the history rail."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <HistoryMetricBadge
            label="Time"
            value={durationSeconds == null ? "No timer" : formatShotDuration(durationSeconds)}
            variant="secondary"
          />
          <HistoryMetricBadge
            label="Yield"
            value={finalWeight == null ? "No weight" : `${formatNumber(finalWeight)} g`}
          />
          <HistoryMetricBadge
            label="Ratio"
            value={actualRatio == null ? "No ratio" : `1:${actualRatio.toFixed(1)}`}
            variant="secondary"
          />
        </div>
      </div>
    </section>
  );
}

function HistoryMetricBadge({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: "default" | "secondary";
}) {
  return (
    <Badge className="gap-2 px-3 py-1.5" variant={variant}>
      <span className="text-[0.52rem] tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="text-[0.9rem] tracking-[0.08em] text-current">{value}</span>
    </Badge>
  );
}

function HistoryInfoPanel({
  children,
  className,
  description,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  description: string;
  title: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[16px] border border-border/70 bg-panel px-3 py-3",
        className,
      )}
    >
      <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-highlight">
        {title}
      </p>
      <p className="mt-1 text-[0.76rem] leading-5 text-muted-foreground">{description}</p>
      <div className="mt-3 grid gap-2.5">{children}</div>
    </section>
  );
}

function HistorySettingsRows({
  hotWaterData,
  rinseData,
  steamSettings,
}: {
  hotWaterData: WorkflowSettings | undefined;
  rinseData: WorkflowSettings | undefined;
  steamSettings: WorkflowSettings | undefined;
}) {
  return (
    <>
      <HistoryStatRow
        label="Steam"
        value={joinValues(
          formatMetricValue(steamSettings?.duration, "s", 0),
          formatMetricValue(steamSettings?.flow, " ml/s", 1),
        )}
      />
      <HistoryStatRow
        label="Flush"
        value={joinValues(
          formatMetricValue(rinseData?.duration, "s", 0),
          formatMetricValue(rinseData?.flow, " ml/s", 1),
        )}
      />
      <HistoryStatRow
        label="Hot water"
        value={joinValues(
          formatMetricValue(hotWaterData?.volume, "ml", 0),
          formatMetricValue(hotWaterData?.targetTemperature, "°C", 0),
        )}
      />
      <HistoryStatRow
        label="Steam temp"
        value={formatMetricValue(steamSettings?.targetTemperature, "°C", 0)}
      />
    </>
  );
}

function HistoryStatRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[12px] border border-border/60 bg-panel-muted px-3 py-2.5">
      <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="text-right font-mono text-[0.78rem] font-semibold tracking-[0.03em] text-foreground">
        {value}
      </p>
    </div>
  );
}

function HistoryStatePanel({
  action,
  body,
  title,
}: {
  action?: ReactNode;
  body: string;
  title: string;
}) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <section className="w-full max-w-[420px] rounded-[18px] border border-dashed border-border/70 bg-panel p-5 text-center">
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-highlight">
          History workspace
        </p>
        <h2 className="mt-2 font-display text-2xl text-foreground">{title}</h2>
        <p className="mt-2 text-[0.82rem] leading-6 text-muted-foreground">{body}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </section>
    </div>
  );
}

function formatMetricValue(
  value: number | null | undefined,
  suffix: string,
  digits = 1,
) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function joinValues(...values: Array<string | null | undefined>) {
  const filteredValues = values.filter(
    (value): value is string => Boolean(value && value !== "-"),
  );

  return filteredValues.length > 0 ? filteredValues.join(" / ") : "-";
}

function formatShotDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0.0s";
  }

  return `${seconds.toFixed(1)}s`;
}
