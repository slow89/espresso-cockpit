import { RecipePresetRow, RecipeValueControl } from "@/components/recipe/recipe-controls";
import { DashboardTabletPrepStatus } from "@/components/dashboard/dashboard-tablet-prep-status";
import type {
  DashboardControlRow,
  DashboardRecipeControls,
} from "@/components/dashboard/dashboard-view-model";
import type { DashboardPrepStatus } from "@/lib/dashboard-utils";
import { cn } from "@/lib/utils";

export function DashboardTabletPrepBoard({
  controlRows,
  prepStatus,
  recipeControls,
  workflowDisabled,
}: {
  controlRows: ReadonlyArray<DashboardControlRow>;
  prepStatus: DashboardPrepStatus;
  recipeControls: DashboardRecipeControls;
  workflowDisabled: boolean;
}) {
  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto"
      data-testid="dashboard-tablet-prep-board"
    >
      {/* Status ticker — compact, full-bleed */}
      <div className="border-b border-border/40 bg-panel/60">
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
    <section className="border-b border-border/40 px-3 py-2.5 md:col-span-2 md:px-4 md:py-3">
      <div className="flex items-center gap-2">
        <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted md:text-[0.64rem]">
          Recipe
        </p>
        <span className="font-mono text-[0.5rem] text-muted-foreground/60">|</span>
        <p className="font-mono text-[0.64rem] font-medium tabular-nums text-muted-foreground md:text-[0.68rem]">
          {drinkDetail}
        </p>
      </div>

      <div className="mt-2 grid gap-3 md:grid-cols-2 md:gap-5">
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
        "border-b border-border/40 px-3 py-2.5 md:px-4 md:py-3",
        /* vertical divider between left/right columns */
        index % 2 === 1 && "md:border-l",
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
            "font-mono text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:text-[0.6rem]",
            labelClassName,
          )}
        >
          {label}
        </p>
        {detail ? (
          <p className="font-mono text-[0.56rem] tabular-nums text-muted-foreground/70 md:text-[0.6rem]">
            {detail}
          </p>
        ) : null}
      </div>

      <RecipeValueControl
        buttonClassName="h-9 w-9 rounded-[3px] md:h-10 md:w-10"
        className="mt-1.5 grid-cols-[36px_minmax(0,1fr)_36px] gap-1.5 rounded-[4px] px-1.5 py-1.5 md:grid-cols-[40px_minmax(0,1fr)_40px]"
        disabled={disabled}
        iconClassName="size-3.5"
        label={label}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        value={value}
        valueClassName="text-[1rem] md:text-[1.08rem]"
      />

      <RecipePresetRow
        activePresetValue={activePresetValue}
        className="mt-1.5 gap-1 text-[0.68rem] md:text-[0.72rem]"
        disabled={disabled}
        itemClassName="rounded-[3px] px-1.5 py-1"
        onPresetClick={onPresetClick}
        presets={presets}
      />
    </div>
  );
}
