import { RecipePresetRow, RecipeValueControl } from "@/components/recipe/recipe-controls";
import { DashboardTabletPrepStatus } from "@/components/dashboard/dashboard-tablet-prep-status";
import type {
  DashboardControlRow,
  DashboardRecipeControls,
} from "@/components/dashboard/dashboard-view-model";
import {
  useDashboardControlPanelModel,
  useDashboardPrepStatusModel,
} from "@/components/dashboard/dashboard-view-model";
import { cn } from "@/lib/utils";

export function DashboardTabletPrepBoard() {
  const { controlRows, recipeControls, workflowDisabled } = useDashboardControlPanelModel();
  const prepStatus = useDashboardPrepStatusModel();

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto"
      data-testid="dashboard-tablet-prep-board"
    >
      {/* Status ticker — compact, full-bleed */}
      <div
        className={cn(
          "border-b border-border/70 bg-panel/60",
          prepStatus.tone === "warming" && "border-b-highlight-muted/30 bg-highlight-muted/5",
        )}
      >
        <DashboardTabletPrepStatus status={prepStatus} />
      </div>

      {/* Controls — dense grid with thin separators */}
      <div className="grid md:grid-cols-2">
        <DashboardTabletRecipeCard
          disabled={workflowDisabled}
          {...recipeControls}
        />
        {controlRows.map((row, i) => (
          <DashboardTabletControlCard
            activePresetValue={row.activePresetValue}
            detail={row.detail}
            disabled={workflowDisabled}
            index={i}
            key={row.label}
            label={row.label}
            onDecrease={row.onDecrease}
            onIncrease={row.onIncrease}
            onPresetClick={row.onPresetClick}
            presets={row.presets}
            tint={row.tint}
            value={row.value}
          />
        ))}
      </div>
    </div>
  );
}

function DashboardTabletRecipeCard({
  disabled,
  doseActivePresetValue,
  dosePresets,
  doseValue,
  drinkActivePresetValue,
  drinkDetail,
  drinkPresets,
  drinkValue,
  onDecreaseDose,
  onDecreaseDrink,
  onIncreaseDose,
  onIncreaseDrink,
  onSelectDosePreset,
  onSelectDrinkPreset,
}: DashboardRecipeControls & { disabled: boolean }) {
  return (
    <section className="border-b border-border/70 px-3 py-2.5 md:col-span-2 md:px-5 md:py-2.5">
      <div className="flex items-center gap-2">
        <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted md:text-[0.84rem]">
          Recipe
        </p>
        <span className="font-mono text-[0.5rem] text-muted-foreground/60">|</span>
        <p className="font-mono text-[0.64rem] font-medium tabular-nums text-muted-foreground md:text-[0.88rem]">
          {drinkDetail}
        </p>
      </div>

      <div className="mt-2 grid gap-3 md:mt-2 md:grid-cols-2 md:gap-4">
        <DashboardTabletAdjustSection
          activePresetValue={doseActivePresetValue}
          disabled={disabled}
          label="Dose"
          onDecrease={onDecreaseDose}
          onIncrease={onIncreaseDose}
          onPresetClick={onSelectDosePreset}
          presets={dosePresets}
          value={doseValue}
        />
        <DashboardTabletAdjustSection
          activePresetValue={drinkActivePresetValue}
          disabled={disabled}
          label="Yield"
          onDecrease={onDecreaseDrink}
          onIncrease={onIncreaseDrink}
          onPresetClick={onSelectDrinkPreset}
          presets={drinkPresets}
          value={drinkValue}
        />
      </div>
    </section>
  );
}

function DashboardTabletControlCard({
  activePresetValue,
  detail,
  disabled,
  index,
  label,
  onDecrease,
  onIncrease,
  onPresetClick,
  presets,
  tint,
  value,
}: DashboardControlRow & { disabled: boolean; index: number }) {
  return (
    <section
      className={cn(
        "border-b border-border/70 px-3 py-2.5 md:px-5 md:py-2.5",
        /* vertical divider between left/right columns */
        index % 2 === 1 && "md:border-l md:border-l-border/70",
      )}
    >
      <DashboardTabletAdjustSection
        activePresetValue={activePresetValue}
        detail={detail}
        disabled={disabled}
        label={label}
        labelClassName={tint}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        onPresetClick={onPresetClick}
        presets={presets}
        value={value}
      />
    </section>
  );
}

function DashboardTabletAdjustSection({
  activePresetValue,
  detail,
  disabled,
  label,
  labelClassName,
  onDecrease,
  onIncrease,
  onPresetClick,
  presets,
  value,
}: {
  activePresetValue: number;
  detail?: string;
  disabled: boolean;
  label: string;
  labelClassName?: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onPresetClick: (value: number) => void;
  presets: DashboardControlRow["presets"];
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "font-mono text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:text-[0.82rem]",
            labelClassName,
          )}
        >
          {label}
        </p>
        {detail ? (
          <p className="font-mono text-[0.56rem] tabular-nums text-muted-foreground/70 md:text-[0.82rem]">
            {detail}
          </p>
        ) : null}
      </div>

      <RecipeValueControl
        buttonClassName="h-9 w-9 rounded-[4px] md:h-11 md:w-11 md:border-border/80"
        className="mt-1.5 grid-cols-[36px_minmax(0,1fr)_36px] gap-1.5 rounded-[4px] px-1.5 py-1.5 md:mt-1.5 md:grid-cols-[44px_minmax(0,1fr)_44px] md:gap-2 md:px-2 md:py-1.5"
        disabled={disabled}
        iconClassName="size-3.5 md:size-5"
        label={label}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        value={value}
        valueClassName="text-[1rem] md:text-[1.3rem]"
      />

      <RecipePresetRow
        activePresetValue={activePresetValue}
        className="mt-1.5 gap-1 text-[0.68rem] md:mt-1.5 md:gap-1.5 md:text-[0.88rem]"
        disabled={disabled}
        itemClassName="rounded-[4px] border border-border/60 px-1.5 py-1 md:px-2 md:py-1"
        onPresetClick={onPresetClick}
        presets={presets}
      />
    </div>
  );
}
