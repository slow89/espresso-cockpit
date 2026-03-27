import type { FormEventHandler, ReactNode } from "react";

import {
  RecipePresetRow,
  RecipeValueControl,
} from "@/components/recipe/recipe-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RecipePreset } from "@/lib/recipe-utils";
import type { WorkflowRecord } from "@/rest/types";

export function WorkflowShotSetupPanel({
  dosePresets,
  drinkPresets,
  isUpdating,
  onDecreaseDose,
  onDecreaseDrink,
  onIncreaseDose,
  onIncreaseDrink,
  onSelectDosePreset,
  onSelectDrinkPreset,
  onSubmit,
  ratio,
  targetDose,
  targetYield,
  workflow,
}: {
  dosePresets: ReadonlyArray<RecipePreset>;
  drinkPresets: ReadonlyArray<RecipePreset>;
  isUpdating: boolean;
  onDecreaseDose: () => void;
  onDecreaseDrink: () => void;
  onIncreaseDose: () => void;
  onIncreaseDrink: () => void;
  onSelectDosePreset: (value: number) => void;
  onSelectDrinkPreset: (value: number) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  ratio: string;
  targetDose: number | null | undefined;
  targetYield: number | null | undefined;
  workflow: WorkflowRecord | undefined;
}) {
  const doseValue = targetDose == null ? "18g" : `${targetDose.toFixed(0)}g`;
  const drinkValue = targetYield == null ? "36g" : `${targetYield.toFixed(0)}g`;
  const doseActivePresetValue = targetDose ?? 18;
  const drinkActivePresetValue = targetDose && targetYield ? targetYield / targetDose : 2.0;
  const drinkDetail = `(${ratio})`;

  return (
    <div className="md:flex md:h-full md:min-h-0 md:flex-col md:border-l md:border-border/40">
      <form
        className="grid gap-0 md:min-h-0 md:flex-1 md:content-start md:overflow-y-auto"
        key={JSON.stringify(workflow ?? null)}
        onSubmit={onSubmit}
      >
        {/* Recipe section — dashboard-style controls */}
        <section className="border-b border-border/40 px-3 py-2.5 md:px-4 md:py-3">
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
            <WorkflowAdjustSection
              activePresetValue={doseActivePresetValue}
              disabled={isUpdating}
              label="Dose"
              onDecrease={onDecreaseDose}
              onIncrease={onIncreaseDose}
              onPresetClick={onSelectDosePreset}
              presets={dosePresets}
              value={doseValue}
            />
            <WorkflowAdjustSection
              activePresetValue={drinkActivePresetValue}
              disabled={isUpdating}
              label="Yield"
              onDecrease={onDecreaseDrink}
              onIncrease={onIncreaseDrink}
              onPresetClick={onSelectDrinkPreset}
              presets={drinkPresets}
              value={drinkValue}
            />
          </div>
        </section>

        {/* Shot details */}
        <section className="border-b border-border/40 px-3 py-2.5 md:px-4 md:py-3">
          <p className="font-mono text-[0.5rem] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
            Shot details
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <Field label="Name">
              <Input
                className="h-8 rounded-[3px] border-border/60 bg-panel-strong font-mono text-[0.68rem]"
                defaultValue={workflow?.name ?? ""}
                name="name"
              />
            </Field>
            <Field label="Description">
              <Input
                className="h-8 rounded-[3px] border-border/60 bg-panel-strong font-mono text-[0.68rem]"
                defaultValue={workflow?.description ?? ""}
                name="description"
              />
            </Field>
          </div>
        </section>

        {/* Grinder */}
        <section className="border-b border-border/40 px-3 py-2.5 md:px-4 md:py-3">
          <p className="font-mono text-[0.5rem] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
            Grinder
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <Field label="Model">
              <Input
                className="h-8 rounded-[3px] border-border/60 bg-panel-strong font-mono text-[0.68rem]"
                defaultValue={workflow?.context?.grinderModel ?? ""}
                name="grinderModel"
              />
            </Field>
            <Field label="Setting">
              <Input
                className="h-8 rounded-[3px] border-border/60 bg-panel-strong font-mono text-[0.68rem]"
                defaultValue={workflow?.context?.grinderSetting ?? ""}
                name="grinderSetting"
              />
            </Field>
          </div>
        </section>

        {/* Coffee */}
        <section className="border-b border-border/40 px-3 py-2.5 md:px-4 md:py-3">
          <p className="font-mono text-[0.5rem] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
            Coffee
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <Field label="Name">
              <Input
                className="h-8 rounded-[3px] border-border/60 bg-panel-strong font-mono text-[0.68rem]"
                defaultValue={workflow?.context?.coffeeName ?? ""}
                name="coffeeName"
              />
            </Field>
            <Field label="Roaster">
              <Input
                className="h-8 rounded-[3px] border-border/60 bg-panel-strong font-mono text-[0.68rem]"
                defaultValue={workflow?.context?.coffeeRoaster ?? ""}
                name="coffeeRoaster"
              />
            </Field>
          </div>
        </section>

        {/* Submit */}
        <div className="px-3 py-2.5 md:px-4 md:py-3">
          <Button
            className="h-9 w-full rounded-[3px] font-mono text-[0.6rem] uppercase tracking-[0.12em]"
            disabled={isUpdating}
            type="submit"
          >
            {isUpdating ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function WorkflowAdjustSection({
  activePresetValue,
  disabled,
  label,
  onDecrease,
  onIncrease,
  onPresetClick,
  presets,
  value,
}: {
  activePresetValue: number;
  disabled: boolean;
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onPresetClick: (value: number) => void;
  presets: ReadonlyArray<RecipePreset>;
  value: string;
}) {
  return (
    <div>
      <p className="font-mono text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:text-[0.6rem]">
        {label}
      </p>

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

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-0.5">
      <span className="font-mono text-[0.48rem] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
        {label}
      </span>
      {children}
    </label>
  );
}
