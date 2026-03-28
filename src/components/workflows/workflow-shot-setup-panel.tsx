import type { FormEvent, ReactNode } from "react";

import {
  RecipePresetRow,
  RecipeValueControl,
} from "@/components/recipe/recipe-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBrewRatio, roundValue, type RecipePreset } from "@/lib/recipe-utils";
import { readString } from "@/lib/workflow-utils";
import { useUpdateWorkflowMutation, useWorkflowQuery } from "@/rest/queries";
import type { WorkflowContext } from "@/rest/types";

const dosePresets = [
  { label: "16g", value: 16 },
  { label: "18g", value: 18 },
  { label: "20g", value: 20 },
  { label: "22g", value: 22 },
] as const satisfies ReadonlyArray<RecipePreset>;

const drinkPresets = [
  { label: "1:1.5", value: 1.5 },
  { label: "1:2.0", value: 2.0 },
  { label: "1:2.5", value: 2.5 },
  { label: "1:3.0", value: 3.0 },
] as const satisfies ReadonlyArray<RecipePreset>;

export function WorkflowShotSetupPanel() {
  const { data: workflow } = useWorkflowQuery();
  const updateWorkflowMutation = useUpdateWorkflowMutation();
  const targetDose = workflow?.context?.targetDoseWeight;
  const targetYield = workflow?.context?.targetYield;
  const ratio = formatBrewRatio(targetDose, targetYield);
  const doseValue = targetDose == null ? "18g" : `${targetDose.toFixed(0)}g`;
  const drinkValue = targetYield == null ? "36g" : `${targetYield.toFixed(0)}g`;
  const doseActivePresetValue = targetDose ?? 18;
  const drinkActivePresetValue = targetDose && targetYield ? targetYield / targetDose : 2.0;

  function updateWorkflow(patch: Record<string, unknown>) {
    updateWorkflowMutation.mutate(patch);
  }

  function updateDose(nextDose: number) {
    updateWorkflow({
      context: {
        targetDoseWeight: roundValue(nextDose, 0),
      },
    });
  }

  function updateYield(nextYield: number) {
    updateWorkflow({
      context: {
        targetYield: roundValue(nextYield, 0),
      },
    });
  }

  function handleShotSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    updateWorkflow({
      name: readString(formData, "name", workflow?.name ?? "Workflow"),
      description: readString(formData, "description", workflow?.description ?? ""),
      context: {
        grinderModel: readString(formData, "grinderModel", workflow?.context?.grinderModel ?? ""),
        grinderSetting: readString(
          formData,
          "grinderSetting",
          workflow?.context?.grinderSetting ?? "",
        ),
        coffeeName: readString(formData, "coffeeName", workflow?.context?.coffeeName ?? ""),
        coffeeRoaster: readString(
          formData,
          "coffeeRoaster",
          workflow?.context?.coffeeRoaster ?? "",
        ),
      } satisfies Partial<WorkflowContext>,
    });
  }

  return (
    <div className="md:flex md:h-full md:min-h-0 md:flex-col md:border-l md:border-border/40">
      <form
        className="grid gap-0 md:min-h-0 md:flex-1 md:content-start md:overflow-y-auto"
        key={JSON.stringify(workflow ?? null)}
        onSubmit={handleShotSetupSubmit}
      >
        <section className="border-b border-border/40 px-3 py-2.5 md:px-4 md:py-3">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted md:text-[0.64rem]">
              Recipe
            </p>
            <span className="font-mono text-[0.5rem] text-muted-foreground/60">|</span>
            <p className="font-mono text-[0.64rem] font-medium tabular-nums text-muted-foreground md:text-[0.68rem]">
              ({ratio})
            </p>
          </div>

          <div className="mt-2 grid gap-3 md:grid-cols-2 md:gap-5">
            <WorkflowAdjustSection
              activePresetValue={doseActivePresetValue}
              disabled={updateWorkflowMutation.isPending}
              label="Dose"
              onDecrease={() => updateDose(Math.max(8, Math.round((targetDose ?? 18) - 1)))}
              onIncrease={() => updateDose(Math.round((targetDose ?? 18) + 1))}
              onPresetClick={updateDose}
              presets={dosePresets}
              value={doseValue}
            />
            <WorkflowAdjustSection
              activePresetValue={drinkActivePresetValue}
              disabled={updateWorkflowMutation.isPending}
              label="Yield"
              onDecrease={() => updateYield(Math.max(1, Math.round((targetYield ?? 36) - 1)))}
              onIncrease={() => updateYield(Math.round((targetYield ?? 36) + 1))}
              onPresetClick={(value) => updateYield((targetDose ?? 18) * value)}
              presets={drinkPresets}
              value={drinkValue}
            />
          </div>
        </section>

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

        <div className="px-3 py-2.5 md:px-4 md:py-3">
          <Button
            className="h-9 w-full rounded-[3px] font-mono text-[0.6rem] uppercase tracking-[0.12em]"
            disabled={updateWorkflowMutation.isPending}
            type="submit"
          >
            {updateWorkflowMutation.isPending ? "Saving..." : "Save"}
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
