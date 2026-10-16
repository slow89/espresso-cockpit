// PROTOTYPE — throwaway. Bits shared by all numeric-input variants.
import { useRef } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { encodedDrift, fieldSpecs, formatValue, type StepDraft } from "./fields";

export type VariantProps = {
  draft: StepDraft;
  onChange: (next: StepDraft) => void;
};

/** A text field that *does* use the system keyboard, so the layout can be judged with it open. */
export function StepNameRow({
  stepName,
  onStepName,
}: {
  stepName: string;
  onStepName: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 bg-panel-strong/30 px-3 py-1.5">
      <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Step 3 of 5
      </p>
      <Input
        aria-label="Step name"
        className="h-9 max-w-[280px] text-[0.83rem]"
        onChange={(event) => onStepName(event.target.value)}
        value={stepName}
      />
      <p className="font-mono text-[0.7rem] text-muted-foreground">
        Pressure step · smooth · coffee sensor
      </p>
    </div>
  );
}

/** Surfaces the whole draft plus what the machine would actually run. */
export function StateReadout({ draft }: { draft: StepDraft }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-border/40 bg-panel-strong/40 px-3 py-1 font-mono text-[0.66rem] text-muted-foreground">
      <span className="font-semibold uppercase tracking-[0.08em]">Draft</span>
      {fieldSpecs.map((spec) => {
        const drift = encodedDrift(spec, draft[spec.key]);
        return (
          <span key={spec.key} className="tabular-nums">
            {spec.label.replace("Exit: ", "")} {formatValue(spec, draft[spec.key])}
            {drift != null && (
              <span className="text-status-warning-foreground"> → machine {drift}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Press-and-hold button: fires once on press, then repeats, then accelerates.
 * useRef holds the timer handles — imperative browser timers, no render state.
 */
export function HoldButton({
  ariaLabel,
  children,
  className,
  disabled,
  onFire,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onFire: (coarse: boolean) => void;
}) {
  const timers = useRef<{ delay?: number; repeat?: number; ticks: number }>({ ticks: 0 });

  const stop = () => {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.repeat);
    timers.current = { ticks: 0 };
  };

  const start = () => {
    if (disabled) return;
    onFire(false);
    timers.current.delay = window.setTimeout(() => {
      timers.current.repeat = window.setInterval(() => {
        timers.current.ticks += 1;
        onFire(timers.current.ticks > 8);
      }, 110);
    }, 400);
  };

  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "flex h-10 w-10 touch-none select-none items-center justify-center rounded-[4px] border border-border bg-panel-muted text-foreground transition active:bg-highlight/25 active:border-highlight/60 disabled:opacity-40",
        className,
      )}
      disabled={disabled}
      onContextMenu={(event) => event.preventDefault()}
      onPointerCancel={stop}
      onPointerDown={start}
      onPointerLeave={stop}
      onPointerUp={stop}
      type="button"
    >
      {children}
    </button>
  );
}
