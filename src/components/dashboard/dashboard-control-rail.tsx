import {
  RecipeControlButton,
  RecipePresetRow,
  RecipeValueControl,
} from "@/components/recipe/recipe-controls";
import type {
  DashboardControlRow,
  DashboardRecipeControls,
} from "@/components/dashboard/dashboard-view-model";
import { useDashboardControlPanelModel } from "@/components/dashboard/dashboard-view-model";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardControlRail() {
  const { controlRows, recipeControls, workflowDisabled } = useDashboardControlPanelModel();

  return (
    <aside className="border-b border-border/40 md:h-full md:min-h-0 md:overflow-y-auto md:overscroll-contain md:border-b-0 md:border-r md:border-border/40">
      <DoseDrinkControlRow disabled={workflowDisabled} {...recipeControls} />
      {controlRows.map((row) => (
        <ControlRailRow
          activePresetValue={row.activePresetValue}
          detail={row.detail}
          disabled={workflowDisabled}
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
    </aside>
  );
}

function DoseDrinkControlRow({
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
    <div className="border-b border-border/40 px-3 py-2.5 md:max-xl:px-3 md:max-xl:py-2">
      <div className="flex items-center gap-2">
        <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted md:max-xl:text-[0.62rem]">
          Recipe
        </p>
        <span className="font-mono text-[0.5rem] text-muted-foreground/50">|</span>
        <p className="min-w-[48px] font-mono text-[0.64rem] font-medium tabular-nums text-muted-foreground md:max-xl:text-[0.66rem]">
          {drinkDetail}
        </p>
      </div>

      <div className="mt-2 space-y-2 md:max-xl:mt-2 md:max-xl:space-y-2">
        <div className="space-y-1">
          <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2 md:max-xl:grid-cols-[48px_minmax(0,1fr)] md:max-xl:gap-2">
            <p className="font-mono text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:max-xl:text-[0.56rem]">
              Dose
            </p>
            <RecipeValueControl
              buttonClassName="md:max-xl:h-7 md:max-xl:w-7 md:max-xl:rounded-[3px]"
              className="md:max-xl:grid-cols-[28px_minmax(0,1fr)_28px] md:max-xl:gap-1 md:max-xl:rounded-[4px] md:max-xl:px-1 md:max-xl:py-1"
              disabled={disabled}
              iconClassName="md:max-xl:size-[13px]"
              label="Dose"
              onDecrease={onDecreaseDose}
              onIncrease={onIncreaseDose}
              value={doseValue}
              valueClassName="md:max-xl:text-[0.88rem]"
            />
          </div>
          <RecipePresetRow
            activePresetValue={doseActivePresetValue}
            className="md:max-xl:gap-1 md:max-xl:text-[0.66rem]"
            disabled={disabled}
            itemClassName="md:max-xl:rounded-[3px] md:max-xl:px-1 md:max-xl:py-0.5"
            onPresetClick={onSelectDosePreset}
            presets={dosePresets}
          />
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2 md:max-xl:grid-cols-[48px_minmax(0,1fr)] md:max-xl:gap-2">
            <p className="font-mono text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:max-xl:text-[0.56rem]">
              Yield
            </p>
            <RecipeValueControl
              buttonClassName="md:max-xl:h-7 md:max-xl:w-7 md:max-xl:rounded-[3px]"
              className="md:max-xl:grid-cols-[28px_minmax(0,1fr)_28px] md:max-xl:gap-1 md:max-xl:rounded-[4px] md:max-xl:px-1 md:max-xl:py-1"
              disabled={disabled}
              iconClassName="md:max-xl:size-[13px]"
              label="Yield"
              onDecrease={onDecreaseDrink}
              onIncrease={onIncreaseDrink}
              value={drinkValue}
              valueClassName="md:max-xl:text-[0.88rem]"
            />
          </div>
          <RecipePresetRow
            activePresetValue={drinkActivePresetValue}
            className="md:max-xl:gap-1 md:max-xl:text-[0.66rem]"
            disabled={disabled}
            itemClassName="md:max-xl:rounded-[3px] md:max-xl:px-1 md:max-xl:py-0.5"
            onPresetClick={onSelectDrinkPreset}
            presets={drinkPresets}
          />
        </div>
      </div>
    </div>
  );
}

function ControlRailRow({
  activePresetValue,
  detail,
  disabled,
  label,
  onDecrease,
  onIncrease,
  onPresetClick,
  presets,
  tint,
  value,
}: DashboardControlRow & { disabled: boolean }) {
  return (
    <div className="border-b border-border/40 px-3 py-2.5 last:border-b-0 md:max-xl:px-3 md:max-xl:py-2">
      <div className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-2 md:max-xl:grid-cols-[52px_minmax(0,1fr)] md:max-xl:gap-2">
        <p
          className={cn(
            "pt-1.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.1em] md:max-xl:pt-1 md:max-xl:text-[0.64rem]",
            tint,
          )}
        >
          {label}
        </p>

        <RailValueControl
          detail={detail}
          disabled={disabled}
          label={label}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          value={value}
        />
      </div>

      <RecipePresetRow
        activePresetValue={activePresetValue}
        align="left"
        className="mt-1.5 gap-1 md:max-xl:mt-1 md:max-xl:gap-1 md:max-xl:text-[0.66rem]"
        disabled={disabled}
        itemClassName="md:max-xl:rounded-[3px] md:max-xl:px-1 md:max-xl:py-0.5"
        onPresetClick={onPresetClick}
        presets={presets}
      />
    </div>
  );
}

function RailValueControl({
  detail,
  disabled,
  label,
  onDecrease,
  onIncrease,
  value,
}: {
  detail?: string;
  disabled: boolean;
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-1.5 md:max-xl:grid-cols-[36px_minmax(0,1fr)_36px] md:max-xl:gap-1.5">
      <RecipeControlButton
        ariaLabel={`Decrease ${label}`}
        className="md:max-xl:h-8 md:max-xl:w-8 md:max-xl:rounded-[3px]"
        disabled={disabled}
        onClick={onDecrease}
      >
        <Minus className="size-3.5 md:max-xl:size-[15px]" />
      </RecipeControlButton>

      <div className="min-w-0 text-center">
        <p className="font-mono text-[0.88rem] font-semibold tabular-nums text-foreground md:max-xl:text-[0.92rem]">
          {value}
        </p>
        {detail ? (
          <p className="mt-0.5 font-mono text-[0.64rem] tabular-nums text-muted-foreground md:max-xl:text-[0.66rem]">
            {detail}
          </p>
        ) : null}
      </div>

      <RecipeControlButton
        ariaLabel={`Increase ${label}`}
        className="md:max-xl:h-8 md:max-xl:w-8 md:max-xl:rounded-[3px]"
        disabled={disabled}
        onClick={onIncrease}
      >
        <Plus className="size-3.5 md:max-xl:size-[15px]" />
      </RecipeControlButton>
    </div>
  );
}
