import { getRouteApi } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { type ReactNode, useState } from "react";

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
import { useShotQuery, useShotsQuery } from "@/rest/queries";
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
      : (shotList.items.find((shot) => shot.id != null && shot.id === selectedShotId) ?? null);
  const hasInvalidSelectedShot = selectedShotId != null && requestedSelectedShot == null;
  const fallbackSelectedShot = shotList.items[0] ?? null;
  const effectiveSelectedShot = hasInvalidSelectedShot
    ? null
    : (requestedSelectedShot ?? fallbackSelectedShot);
  const effectiveSelectedShotId = effectiveSelectedShot?.id ?? null;
  const shotQuery = useShotQuery(effectiveSelectedShotId);
  const selectedShot = shotQuery.data;
  const selectedShotTelemetry = selectedShot
    ? adaptShotMeasurementsToTelemetry(selectedShot.measurements)
    : [];
  const isDetailPending = effectiveSelectedShotId != null && shotQuery.isPending && !selectedShot;
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([
      shotsQuery.refetch(),
      effectiveSelectedShotId ? shotQuery.refetch() : Promise.resolve(),
    ]).catch(() => {});
    setIsRefreshing(false);
  }

  return (
    <div className="min-h-[calc(100vh-var(--app-footer-height))] overflow-hidden border-b border-border/30 bg-shell md:flex md:h-[calc(100vh-var(--app-footer-height))] md:flex-col">
      {/* Top bar — matches dashboard top bar style */}
      <HistoryTopBar
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        selectedShot={selectedShot}
        summaryShot={effectiveSelectedShot}
        total={shotList.total}
      />

      {/* Main workspace */}
      <section className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[312px_minmax(0,1fr)]">
        {/* Shot blotter — left rail */}
        <aside className="flex min-h-0 min-w-0 flex-col border-b border-border/40 bg-panel-muted md:border-b-0 md:border-r md:border-border/40">
          {shotsQuery.error ? (
            <div className="border-b border-border/40 px-3 py-1.5">
              <span className="font-mono text-[0.64rem] text-destructive">
                {shotsQuery.error.message}
              </span>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {shotList.items.length === 0 ? (
              <div className="flex h-full items-center justify-center p-4">
                <div className="text-center">
                  <p className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-muted-foreground">
                    Queue empty
                  </p>
                  <p className="mt-1.5 text-[0.78rem] text-muted-foreground">
                    No shots synced yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {shotList.items.map((shot, index) => (
                  <HistoryShotRow
                    index={index}
                    isSelected={
                      effectiveSelectedShotId != null && shot.id === effectiveSelectedShotId
                    }
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

        {/* Detail workspace — right pane */}
        <div className="flex min-h-0 min-w-0 flex-col">
          {selectedShot ? (
            <HistoryDetailContent
              selectedShot={selectedShot}
              selectedShotTelemetry={selectedShotTelemetry}
            />
          ) : isDetailPending ? (
            <HistoryStatePanel
              body="Loading telemetry stream and workflow metadata."
              title="Loading shot detail"
            />
          ) : shotQuery.error ? (
            <HistoryStatePanel
              action={
                <Button
                  className="h-7 rounded-[3px] px-3 font-mono text-[0.6rem]"
                  onClick={() => void handleRefresh()}
                  size="sm"
                  variant="secondary"
                >
                  Retry
                </Button>
              }
              body={shotQuery.error.message}
              title="Unable to load shot"
            />
          ) : hasInvalidSelectedShot ? (
            <HistoryStatePanel
              action={
                onSelectShotId ? (
                  <Button
                    className="h-7 rounded-[3px] px-3 font-mono text-[0.6rem]"
                    onClick={() => onSelectShotId(null)}
                    size="sm"
                    variant="secondary"
                  >
                    Show latest
                  </Button>
                ) : undefined
              }
              body="This shot is no longer in the history list."
              title="Shot not found"
            />
          ) : (
            <HistoryStatePanel
              body="Pick a shot from the blotter to inspect."
              title="Select a shot"
            />
          )}
        </div>
      </section>
    </div>
  );
}

/* ─── Top bar ─── */

function HistoryTopBar({
  isRefreshing,
  onRefresh,
  selectedShot,
  summaryShot,
  total,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
  selectedShot: ShotDetailRecord | undefined;
  summaryShot: ShotRecord | null;
  total: number;
}) {
  const finalWeight = selectedShot ? getShotFinalWeight(selectedShot.measurements) : null;
  const durationSeconds = selectedShot ? getShotDurationSeconds(selectedShot.measurements) : null;
  const actualRatio = selectedShot ? getShotActualRatio(selectedShot) : null;
  const displayShot = selectedShot ?? summaryShot;

  return (
    <section className="shrink-0 border-b border-border/40 bg-panel-strong/30 px-2 py-1 md:px-2.5 md:py-1 xl:px-3">
      <div className="flex flex-wrap items-stretch gap-1 md:max-xl:gap-1">
        {/* Archive label + count */}
        <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-1 md:flex-none md:max-w-[220px] md:max-xl:min-w-[160px]">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground md:max-xl:text-[0.5rem]">
              Shot archive
            </p>
            <p className="mt-0.5 font-mono text-[0.72rem] font-semibold tabular-nums text-foreground md:max-xl:text-[0.76rem]">
              {total} shots
            </p>
          </div>
          <button
            aria-label="Refresh shot history"
            className={cn(
              "flex size-6 items-center justify-center rounded-[3px] border border-border/50 bg-panel-strong text-muted-foreground transition hover:text-foreground md:max-xl:size-7",
              isRefreshing && "animate-spin text-highlight",
            )}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw className="size-3 md:max-xl:size-3.5" />
          </button>
        </div>

        {/* Selected shot name */}
        <div className="flex min-w-[160px] flex-[1.5] items-center rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-1 md:flex-1 md:max-xl:min-w-[200px]">
          <div className="min-w-0">
            <p className="font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-highlight-muted md:max-xl:text-[0.5rem]">
              Selected
            </p>
            <p className="mt-0.5 truncate font-mono text-[0.72rem] font-semibold text-foreground md:max-xl:text-[0.76rem]">
              {displayShot ? getShotDisplayTitle(displayShot) : "None"}
            </p>
          </div>
        </div>

        {/* Metric cells — trading ticker style */}
        <HistoryTopBarMetric
          label="Time"
          value={durationSeconds == null ? "--.-s" : formatShotDuration(durationSeconds)}
        />
        <HistoryTopBarMetric
          label="Yield"
          value={finalWeight == null ? "--.- g" : `${formatNumber(finalWeight)} g`}
        />
        <HistoryTopBarMetric
          label="Ratio"
          value={actualRatio == null ? "--" : `1:${actualRatio.toFixed(1)}`}
        />
        <HistoryTopBarMetric
          label="Dose"
          value={formatMetricValue(displayShot?.workflow?.context?.targetDoseWeight, "g", 1)}
        />
      </div>
    </section>
  );
}

function HistoryTopBarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[72px] flex-1 rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-1 md:flex-none md:min-w-[84px] md:max-xl:px-2.5 md:max-xl:py-1">
      <p className="font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground md:max-xl:text-[0.5rem]">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[0.72rem] font-semibold tabular-nums text-foreground md:max-xl:text-[0.76rem]">
        {value}
      </p>
    </div>
  );
}

/* ─── Shot blotter row ─── */

function HistoryShotRow({
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
  const dose = shot.workflow?.context?.targetDoseWeight;
  const yield_ = shot.workflow?.context?.targetYield;

  return (
    <button
      className={cn(
        "w-full px-3 py-1.5 text-left transition md:px-3",
        isSelected
          ? "bg-primary/12 shadow-[inset_3px_0_0_var(--highlight)]"
          : "hover:bg-panel-strong/60",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-[0.48rem] tabular-nums uppercase tracking-[0.06em] text-muted-foreground/60 md:text-[0.5rem]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <p className="truncate font-mono text-[0.72rem] font-semibold tracking-[0.02em] text-foreground md:text-[0.76rem]">
            {getShotDisplayTitle(shot)}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[0.52rem] tabular-nums text-muted-foreground md:text-[0.56rem]">
          {formatRelativeTimestamp(shot.timestamp)}
        </span>
      </div>

      <div className="mt-0.5 flex items-center gap-3 pl-6 md:pl-7">
        <span className="truncate font-mono text-[0.56rem] text-muted-foreground/70 md:text-[0.6rem]">
          {shot.workflow?.context?.coffeeName ?? "No coffee"}
        </span>
        {dose != null ? (
          <span className="shrink-0 font-mono text-[0.56rem] tabular-nums text-muted-foreground/50 md:text-[0.6rem]">
            {dose.toFixed(1)}g{yield_ != null ? ` / ${yield_.toFixed(1)}g` : ""}
          </span>
        ) : null}
      </div>
    </button>
  );
}

/* ─── Detail content ─── */

function HistoryDetailContent({
  selectedShot,
  selectedShotTelemetry,
}: {
  selectedShot: ShotDetailRecord;
  selectedShotTelemetry: ReturnType<typeof adaptShotMeasurementsToTelemetry>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Telemetry chart — takes full remaining height on tablet */}
      <div className="flex h-[calc(100vh-var(--app-footer-height)-7.5rem)] min-h-[280px] shrink-0 overflow-hidden px-2 py-1.5 md:px-3 md:py-1.5">
        <TelemetryChart
          className="rounded-[4px] border-0 bg-transparent p-0 shadow-none"
          data={selectedShotTelemetry}
          layout="desktop"
        />
      </div>

      {/* Info panels — scroll into view below chart */}
      <div className="border-t border-border/40">
        <div className="grid md:grid-cols-2">
          <HistoryInfoCell title="Profile">
            <HistoryDataRow label="Workflow" value={selectedShot.workflow?.name ?? "-"} />
            <HistoryDataRow label="Profile" value={selectedShot.workflow?.profile?.title ?? "-"} />
            <HistoryDataRow label="Author" value={selectedShot.workflow?.profile?.author ?? "-"} />
            <HistoryDataRow
              label="Beverage"
              value={selectedShot.workflow?.profile?.beverage_type ?? "-"}
            />
            <HistoryDataRow
              label="Frames"
              value={`${selectedShot.workflow?.profile?.steps?.length ?? 0}`}
            />
          </HistoryInfoCell>

          <HistoryInfoCell border="left" title="Context">
            <HistoryDataRow
              label="Coffee"
              value={selectedShot.workflow?.context?.coffeeName ?? "-"}
            />
            <HistoryDataRow
              label="Roaster"
              value={selectedShot.workflow?.context?.coffeeRoaster ?? "-"}
            />
            <HistoryDataRow
              label="Grinder"
              value={joinValues(
                selectedShot.workflow?.context?.grinderModel,
                selectedShot.workflow?.context?.grinderSetting,
              )}
            />
            <HistoryDataRow
              label="Dose"
              value={formatMetricValue(selectedShot.workflow?.context?.targetDoseWeight, "g", 1)}
            />
            <HistoryDataRow
              label="Target yield"
              value={formatMetricValue(selectedShot.workflow?.context?.targetYield, "g", 1)}
            />
            <HistoryDataRow
              label="Target ratio"
              value={formatBrewRatio(
                selectedShot.workflow?.context?.targetDoseWeight,
                selectedShot.workflow?.context?.targetYield,
                "-",
              )}
            />
          </HistoryInfoCell>

          <HistoryInfoCell title="Settings">
            <HistorySettingsRows
              hotWaterData={selectedShot.workflow?.hotWaterData}
              rinseData={selectedShot.workflow?.rinseData}
              steamSettings={selectedShot.workflow?.steamSettings}
            />
          </HistoryInfoCell>

          <HistoryInfoCell border="left" title="Notes">
            <p className="max-h-20 overflow-y-auto whitespace-pre-line pr-1 font-mono text-[0.64rem] leading-5 text-foreground/80 md:text-[0.68rem]">
              {selectedShot.workflow?.profile?.notes?.trim() || "No profile notes saved."}
            </p>
          </HistoryInfoCell>
        </div>
      </div>
    </div>
  );
}

/* ─── Info cell — dashboard-style bordered section ─── */

function HistoryInfoCell({
  border,
  children,
  title,
}: {
  border?: "left";
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section
      className={cn(
        "border-b border-border/40 px-3 py-2 md:px-4 md:py-2.5",
        border === "left" && "md:border-l md:border-border/40",
      )}
    >
      <p className="font-mono text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted md:text-[0.6rem]">
        {title}
      </p>
      <div className="mt-1.5 grid gap-1">{children}</div>
    </section>
  );
}

/* ─── Data row — compact key/value like dashboard ─── */

function HistoryDataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="font-mono text-[0.5rem] uppercase tracking-[0.06em] text-muted-foreground md:text-[0.54rem]">
        {label}
      </p>
      <p className="truncate text-right font-mono text-[0.68rem] font-semibold tabular-nums text-foreground md:text-[0.72rem]">
        {value}
      </p>
    </div>
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
      <HistoryDataRow
        label="Steam"
        value={joinValues(
          formatMetricValue(steamSettings?.duration, "s", 0),
          formatMetricValue(steamSettings?.flow, " ml/s", 1),
        )}
      />
      <HistoryDataRow
        label="Flush"
        value={joinValues(
          formatMetricValue(rinseData?.duration, "s", 0),
          formatMetricValue(rinseData?.flow, " ml/s", 1),
        )}
      />
      <HistoryDataRow
        label="Hot water"
        value={joinValues(
          formatMetricValue(hotWaterData?.volume, "ml", 0),
          formatMetricValue(hotWaterData?.targetTemperature, "°C", 0),
        )}
      />
      <HistoryDataRow
        label="Steam temp"
        value={formatMetricValue(steamSettings?.targetTemperature, "°C", 0)}
      />
    </>
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
      <section className="w-full max-w-[340px] rounded-[3px] border border-dashed border-border/50 bg-panel-strong/60 p-4 text-center">
        <p className="font-mono text-[0.52rem] uppercase tracking-[0.1em] text-highlight-muted">
          History
        </p>
        <h2 className="mt-1.5 font-mono text-[0.86rem] font-semibold text-foreground">{title}</h2>
        <p className="mt-1 font-mono text-[0.64rem] leading-5 text-muted-foreground">{body}</p>
        {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
      </section>
    </div>
  );
}

function formatMetricValue(value: number | null | undefined, suffix: string, digits = 1) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function joinValues(...values: Array<string | null | undefined>) {
  const filteredValues = values.filter((value): value is string => Boolean(value && value !== "-"));

  return filteredValues.length > 0 ? filteredValues.join(" / ") : "-";
}

function formatShotDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0.0s";
  }

  return `${seconds.toFixed(1)}s`;
}
