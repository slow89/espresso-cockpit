import {
  RecipeControlButton,
  RecipePresetRow,
  RecipeValueControl,
} from "@/components/recipe/recipe-controls";
import { Minus, Plus } from "lucide-react";
import type { RecipePreset } from "@/lib/recipe-utils";
import { cn } from "@/lib/utils";

export type DashboardControlRow = {
  activePresetValue: number;
  detail?: string;
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onPresetClick: (value: number) => void;
  presets: ReadonlyArray<RecipePreset>;
  tint: string;
  value: string;
};

export type DashboardRecipeControls = {
  doseActivePresetValue: number;
  dosePresets: ReadonlyArray<RecipePreset>;
  doseValue: string;
  drinkActivePresetValue: number;
  drinkDetail: string;
  drinkPresets: ReadonlyArray<RecipePreset>;
  drinkValue: string;
  onDecreaseDose: () => void;
  onDecreaseDrink: () => void;
  onIncreaseDose: () => void;
  onIncreaseDrink: () => void;
  onSelectDosePreset: (value: number) => void;
  onSelectDrinkPreset: (value: number) => void;
};

export function DashboardControlRail({
  controlRows,
  recipeControls,
  workflowDisabled,
}: {
  controlRows: ReadonlyArray<DashboardControlRow>;
  recipeControls: DashboardRecipeControls;
  workflowDisabled: boolean;
}) {
  return (
    <aside className="border-b border-border md:min-h-0 md:overflow-y-auto md:overscroll-contain md:border-b-0 md:border-r">
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
    <div className="border-b border-border px-3 py-3 md:max-xl:px-4 md:max-xl:py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-highlight-muted md:max-xl:text-[0.82rem]">
          Recipe
        </p>
        <p className="min-w-[56px] text-right font-mono text-[0.8rem] font-medium text-muted-foreground md:max-xl:text-[0.88rem]">
          {drinkDetail}
        </p>
      </div>

      <div className="mt-2 space-y-2.5 md:max-xl:mt-3 md:max-xl:space-y-3">
        <div className="space-y-1">
          <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2 md:max-xl:grid-cols-[58px_minmax(0,1fr)] md:max-xl:gap-3">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:max-xl:text-[0.72rem]">
              Dose
            </p>
            <RecipeValueControl
              buttonClassName="md:max-xl:h-9 md:max-xl:w-9 md:max-xl:rounded-[9px]"
              className="md:max-xl:grid-cols-[36px_minmax(0,1fr)_36px] md:max-xl:gap-2 md:max-xl:rounded-[11px] md:max-xl:px-1.5 md:max-xl:py-1.5"
              disabled={disabled}
              iconClassName="md:max-xl:size-4"
              label="Dose"
              onDecrease={onDecreaseDose}
              onIncrease={onIncreaseDose}
              value={doseValue}
              valueClassName="md:max-xl:text-[1rem]"
            />
          </div>
          <RecipePresetRow
            activePresetValue={doseActivePresetValue}
            className="md:max-xl:gap-2 md:max-xl:text-[0.8rem]"
            disabled={disabled}
            itemClassName="md:max-xl:rounded-[10px] md:max-xl:px-2 md:max-xl:py-1.5"
            onPresetClick={onSelectDosePreset}
            presets={dosePresets}
          />
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2 md:max-xl:grid-cols-[58px_minmax(0,1fr)] md:max-xl:gap-3">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:max-xl:text-[0.72rem]">
              Yield
            </p>
            <RecipeValueControl
              buttonClassName="md:max-xl:h-9 md:max-xl:w-9 md:max-xl:rounded-[9px]"
              className="md:max-xl:grid-cols-[36px_minmax(0,1fr)_36px] md:max-xl:gap-2 md:max-xl:rounded-[11px] md:max-xl:px-1.5 md:max-xl:py-1.5"
              disabled={disabled}
              iconClassName="md:max-xl:size-4"
              label="Yield"
              onDecrease={onDecreaseDrink}
              onIncrease={onIncreaseDrink}
              value={drinkValue}
              valueClassName="md:max-xl:text-[1rem]"
            />
          </div>
          <RecipePresetRow
            activePresetValue={drinkActivePresetValue}
            className="md:max-xl:gap-2 md:max-xl:text-[0.8rem]"
            disabled={disabled}
            itemClassName="md:max-xl:rounded-[10px] md:max-xl:px-2 md:max-xl:py-1.5"
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
    <div className="border-b border-border px-3 py-3 last:border-b-0 md:max-xl:px-4 md:max-xl:py-4">
      <div className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-3 md:max-xl:grid-cols-[64px_minmax(0,1fr)] md:max-xl:gap-3.5">
        <p
          className={cn(
            "pt-2 text-[0.74rem] font-semibold uppercase tracking-[0.16em] md:max-xl:pt-2.5 md:max-xl:text-[0.82rem]",
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
        className="mt-2 gap-1.5 md:max-xl:mt-2.5 md:max-xl:gap-2 md:max-xl:text-[0.8rem]"
        disabled={disabled}
        itemClassName="md:max-xl:rounded-[10px] md:max-xl:px-2 md:max-xl:py-1.5"
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
    <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2 md:max-xl:grid-cols-[48px_minmax(0,1fr)_48px] md:max-xl:gap-2.5">
      <RecipeControlButton
        ariaLabel={`Decrease ${label}`}
        className="md:max-xl:h-11 md:max-xl:w-11 md:max-xl:rounded-[11px]"
        disabled={disabled}
        onClick={onDecrease}
      >
        <Minus className="size-4 md:max-xl:size-5" />
      </RecipeControlButton>

      <div className="min-w-0 text-center">
        <p className="font-mono text-[0.92rem] font-semibold text-foreground md:max-xl:text-[1.06rem]">
          {value}
        </p>
        {detail ? (
          <p className="mt-0.5 font-mono text-[0.72rem] text-muted-foreground md:max-xl:text-[0.8rem]">
            {detail}
          </p>
        ) : null}
      </div>

      <RecipeControlButton
        ariaLabel={`Increase ${label}`}
        className="md:max-xl:h-11 md:max-xl:w-11 md:max-xl:rounded-[11px]"
        disabled={disabled}
        onClick={onIncrease}
      >
        <Plus className="size-4 md:max-xl:size-5" />
      </RecipeControlButton>
    </div>
  );
}
