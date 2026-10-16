// PROTOTYPE — Variant C: select a field in a list, then drag a ruler ("scrubber") along the
// bottom. One tick = one UI step, snapping as you go; the rail's ends are ± coarse buttons.
// Dragging the full 1024px width is the precision affordance; no keypad, no modal.
import { useRef, useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  clamp,
  encodedDrift,
  fieldSpecs,
  formatValue,
  nudge,
  stepSize,
  type FieldKey,
  type FieldSpec,
} from "./fields";
import { HoldButton, type VariantProps } from "./shared";

export const variantCName = "Select field → drag ruler";

const TICK_PX = 14;

export function VariantCScrubber({ draft, onChange }: VariantProps) {
  // Temporary interaction state: the field the ruler is bound to.
  const [selected, setSelected] = useState<FieldKey>("pressure");
  const spec = fieldSpecs.find((entry) => entry.key === selected)!;
  const value = draft[selected];
  const setValue = (next: number) => onChange({ ...draft, [selected]: next });

  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_132px]">
      <div className="grid auto-rows-min grid-cols-4 gap-1.5 overflow-y-auto px-3 py-2">
        {fieldSpecs.map((entry) => {
          const drift = encodedDrift(entry, draft[entry.key]);
          const active = entry.key === selected;
          return (
            <button
              key={entry.key}
              className={cn(
                "flex h-[52px] flex-col justify-between rounded-[6px] border px-2.5 py-1.5 text-left transition",
                active
                  ? "border-highlight/70 bg-highlight/10"
                  : "border-border/50 bg-panel/80 active:bg-panel-strong/60",
              )}
              onClick={() => setSelected(entry.key)}
              type="button"
            >
              <span className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {entry.label}
              </span>
              <span className="font-mono text-[1rem] font-semibold tabular-nums leading-none text-foreground">
                {formatValue(entry, draft[entry.key])}
                <span className="ml-1 text-[0.66rem] font-medium text-muted-foreground">
                  {entry.unit}
                </span>
                {drift != null && (
                  <span className="ml-1.5 text-[0.6rem] text-status-warning-foreground">
                    → {drift}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <Ruler onValue={setValue} spec={spec} value={value} />
    </div>
  );
}

function Ruler({
  onValue,
  spec,
  value,
}: {
  onValue: (value: number) => void;
  spec: FieldSpec;
  value: number;
}) {
  // useRef: pointer-drag bookkeeping, not render state.
  const drag = useRef<{ startX: number; startValue: number; step: number } | null>(null);
  const step = stepSize(spec, value, 1);
  const drift = encodedDrift(spec, value);
  const halfWidth = 36; // ticks each side of the cursor
  const ticks = Array.from({ length: halfWidth * 2 + 1 }, (_, index) => {
    const tickValue = Number((value + (index - halfWidth) * step).toFixed(4));
    return {
      index,
      tickValue,
      inRange: tickValue >= spec.min - 1e-9 && tickValue <= spec.max + 1e-9,
    };
  });
  const coarseEvery = Math.max(1, Math.round(spec.coarseStep / step));
  const labelEvery = pickLabelInterval(coarseEvery);

  return (
    <div className="flex flex-col border-t border-border/50 bg-panel-strong/70">
      <div className="flex items-baseline justify-between px-3 pt-1.5">
        <p className="font-mono text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-foreground">
          {spec.label}
          <span className="ml-2 text-[0.66rem] font-medium normal-case tracking-normal text-muted-foreground">
            drag to adjust · tick = {step} {spec.unit} · {spec.encodeNote}
          </span>
        </p>
        <p className="font-mono text-[1.35rem] font-semibold tabular-nums leading-none text-foreground">
          {formatValue(spec, value)}
          <span className="ml-1 text-[0.74rem] font-medium text-muted-foreground">{spec.unit}</span>
          {drift != null && (
            <span className="ml-2 text-[0.66rem] text-status-warning-foreground">
              machine {drift}
            </span>
          )}
        </p>
      </div>

      <div className="mt-1 grid grid-cols-[56px_minmax(0,1fr)_56px] items-stretch gap-1 px-3 pb-2">
        <HoldButton
          ariaLabel={`Decrease ${spec.label} by ${spec.coarseStep}`}
          className="h-full w-full"
          disabled={value <= spec.min}
          onFire={() => onValue(nudge(spec, value, -1, true))}
        >
          <ChevronsLeft className="size-4" />
        </HoldButton>

        <div
          className="relative h-[72px] touch-none select-none overflow-hidden rounded-[4px] border border-border/60 bg-background"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { startX: event.clientX, startValue: value, step };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const deltaTicks = Math.round((drag.current.startX - event.clientX) / TICK_PX);
            const raw = drag.current.startValue + deltaTicks * drag.current.step;
            onValue(clamp(spec, Number(raw.toFixed(spec.digits))));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {ticks.map((tick) => {
            const unitIndex = Math.round(tick.tickValue / step);
            const isLabel = unitIndex % labelEvery === 0;
            const isCoarse = unitIndex % coarseEvery === 0;
            return (
              <div
                key={tick.index}
                className="absolute top-0 flex h-full flex-col items-center"
                style={{ left: `calc(50% + ${(tick.index - halfWidth) * TICK_PX}px)` }}
              >
                <div
                  className={cn(
                    "w-px",
                    isLabel
                      ? "h-8 bg-foreground/80"
                      : isCoarse
                        ? "h-5 bg-foreground/45"
                        : "h-3 bg-foreground/20",
                    !tick.inRange && "bg-status-warning-foreground/30",
                  )}
                />
                {isLabel && tick.inRange && (
                  <span className="mt-0.5 font-mono text-[0.66rem] tabular-nums text-muted-foreground">
                    {formatLabel(tick.tickValue)}
                  </span>
                )}
              </div>
            );
          })}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-highlight shadow-[0_0_6px_rgba(208,169,84,0.6)]" />
        </div>

        <HoldButton
          ariaLabel={`Increase ${spec.label} by ${spec.coarseStep}`}
          className="h-full w-full"
          disabled={value >= spec.max}
          onFire={() => onValue(nudge(spec, value, 1, true))}
        >
          <ChevronsRight className="size-4" />
        </HoldButton>
      </div>
    </div>
  );
}

const MIN_LABEL_GAP_PX = 70;

/** Label every N ticks, N a "nice" multiple of the coarse step, so labels never crowd. */
function pickLabelInterval(coarseEvery: number) {
  const candidates = [1, 2, 5, 10, 20, 50, 100].map((factor) => factor * coarseEvery);
  return (
    candidates.find((every) => every * TICK_PX >= MIN_LABEL_GAP_PX) ??
    candidates[candidates.length - 1]
  );
}

function formatLabel(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}
