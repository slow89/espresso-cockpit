// PROTOTYPE — Variant A: everything in place. Each field is a ± stepper with hold-to-repeat
// (accelerating to the coarse step) and a preset chip row underneath. No modal, nothing hides.
import { Minus, Plus } from "lucide-react";

import { isPresetActive } from "@/lib/recipe-utils";
import { cn } from "@/lib/utils";

import { encodedDrift, fieldSpecs, formatValue, nudge, type FieldSpec } from "./fields";
import { HoldButton, type VariantProps } from "./shared";

export const variantAName = "In-place ± steppers + presets";

export function VariantASteppers({ draft, onChange }: VariantProps) {
  return (
    <div className="grid h-full grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto px-3 py-2 md:grid-cols-3">
      {fieldSpecs.map((spec) => (
        <StepperField
          key={spec.key}
          onValue={(value) => onChange({ ...draft, [spec.key]: value })}
          spec={spec}
          value={draft[spec.key]}
        />
      ))}
    </div>
  );
}

function StepperField({
  onValue,
  spec,
  value,
}: {
  onValue: (value: number) => void;
  spec: FieldSpec;
  value: number;
}) {
  const drift = encodedDrift(spec, value);
  const atMin = value <= spec.min;
  const atMax = value >= spec.max;

  return (
    <section className="rounded-[6px] border border-border/50 bg-panel/80 p-2">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {spec.label}
        </p>
        <p className="font-mono text-[0.62rem] text-muted-foreground/70">
          {spec.min}–{spec.max}
        </p>
      </div>

      <div className="mt-1 grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-1.5 rounded-[4px] bg-panel-strong/50 px-1 py-1">
        <HoldButton
          ariaLabel={`Decrease ${spec.label}`}
          disabled={atMin}
          onFire={(coarse) => onValue(nudge(spec, value, -1, coarse))}
        >
          <Minus className="size-4" />
        </HoldButton>
        <div className="min-w-0 text-center">
          <p className="font-mono text-[1.08rem] font-semibold tabular-nums leading-tight text-foreground">
            {formatValue(spec, value)}
            <span className="ml-1 text-[0.7rem] font-medium text-muted-foreground">
              {spec.unit}
            </span>
          </p>
          <p
            className={cn(
              "font-mono text-[0.62rem] leading-tight",
              drift != null ? "text-status-warning-foreground" : "text-muted-foreground/60",
            )}
          >
            {drift != null ? `machine runs ${drift}` : spec.encodeNote}
          </p>
        </div>
        <HoldButton
          ariaLabel={`Increase ${spec.label}`}
          disabled={atMax}
          onFire={(coarse) => onValue(nudge(spec, value, 1, coarse))}
        >
          <Plus className="size-4" />
        </HoldButton>
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-1 text-[0.74rem] font-medium text-muted-foreground">
        {spec.presets.map((preset) => (
          <button
            key={preset}
            className={cn(
              "h-8 rounded-[4px] border font-mono tabular-nums transition",
              isPresetActive(value, preset)
                ? "border-highlight/60 bg-highlight/15 text-foreground"
                : "border-border/50 active:bg-panel-strong/60",
            )}
            onClick={() => onValue(preset)}
            type="button"
          >
            {preset}
          </button>
        ))}
      </div>
    </section>
  );
}
