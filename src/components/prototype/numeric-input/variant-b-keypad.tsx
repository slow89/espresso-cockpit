// PROTOTYPE — Variant B: tap-the-value opens an in-app keypad drawer on the right.
// Fields are read-only tiles until tapped; the drawer shows range, step, encoding, presets,
// a fine ± row, and commits only on Set. The Android keyboard is never involved.
import { useState } from "react";
import { Delete, Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  encodedDrift,
  fieldSpecs,
  formatValue,
  isInRange,
  nudge,
  type FieldKey,
  type FieldSpec,
} from "./fields";
import { HoldButton, type VariantProps } from "./shared";

export const variantBName = "Tap value → keypad drawer";

export function VariantBKeypad({ draft, onChange }: VariantProps) {
  // Temporary interaction state: which field is open and the text being typed.
  const [open, setOpen] = useState<FieldKey | null>(null);
  const [typed, setTyped] = useState<string>("");

  const spec = open ? fieldSpecs.find((entry) => entry.key === open)! : null;
  const typedNumber = typed === "" ? Number.NaN : Number(typed);
  const valid = spec ? isInRange(spec, typedNumber) : false;

  const openField = (next: FieldSpec) => {
    setOpen(next.key);
    setTyped("");
  };
  const commit = () => {
    if (!spec || !valid) return;
    onChange({ ...draft, [spec.key]: Number(typedNumber.toFixed(spec.digits)) });
    setOpen(null);
  };
  const nudgeTyped = (direction: 1 | -1) => {
    if (!spec) return;
    const base = Number.isFinite(typedNumber) ? typedNumber : draft[spec.key];
    setTyped(formatValue(spec, nudge(spec, base, direction)));
  };

  return (
    <div className={cn("grid h-full", spec ? "grid-cols-[minmax(0,1fr)_372px]" : "grid-cols-1")}>
      <div className="grid auto-rows-min grid-cols-2 gap-2 overflow-y-auto px-3 py-2 md:grid-cols-3">
        {fieldSpecs.map((entry) => {
          const value = draft[entry.key];
          const drift = encodedDrift(entry, value);
          return (
            <button
              key={entry.key}
              className={cn(
                "flex h-[68px] flex-col items-start justify-between rounded-[6px] border px-3 py-2 text-left transition",
                open === entry.key
                  ? "border-highlight/70 bg-highlight/10"
                  : "border-border/50 bg-panel/80 active:bg-panel-strong/60",
              )}
              onClick={() => openField(entry)}
              type="button"
            >
              <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {entry.label}
              </span>
              <span className="font-mono text-[1.15rem] font-semibold tabular-nums leading-none text-foreground">
                {formatValue(entry, value)}
                <span className="ml-1 text-[0.7rem] font-medium text-muted-foreground">
                  {entry.unit}
                </span>
                {drift != null && (
                  <span className="ml-2 text-[0.62rem] text-status-warning-foreground">
                    → {drift}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {spec && (
        <aside className="flex flex-col border-l border-border/50 bg-panel-strong/70 px-3 py-2">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-foreground">
              {spec.label}
            </p>
            <p className="font-mono text-[0.66rem] text-muted-foreground">
              {spec.min}–{spec.max} {spec.unit} · {spec.encodeNote}
            </p>
          </div>

          <div
            className={cn(
              "mt-1 flex h-12 items-center justify-end rounded-[4px] border bg-background px-3 font-mono text-[1.5rem] font-semibold tabular-nums",
              typed === ""
                ? "border-border/60 text-muted-foreground/50"
                : valid
                  ? "border-highlight/60 text-foreground"
                  : "border-status-warning-foreground text-status-warning-foreground",
            )}
          >
            {typed === "" ? formatValue(spec, draft[spec.key]) : typed}
            <span className="ml-1.5 text-[0.74rem] font-medium text-muted-foreground">
              {spec.unit}
            </span>
          </div>

          <div className="mt-1.5 grid grid-cols-4 gap-1">
            {spec.presets.map((preset) => (
              <button
                key={preset}
                className="h-8 rounded-[4px] border border-border/50 font-mono text-[0.76rem] tabular-nums text-muted-foreground active:bg-panel-muted"
                onClick={() => setTyped(formatValue(spec, preset))}
                type="button"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="mt-1.5 grid flex-1 grid-cols-[1fr_1fr_1fr_56px] gap-1">
            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((digit) => (
              <Key key={digit} onClick={() => setTyped(typed + digit)}>
                {digit}
              </Key>
            ))}
            <Key
              className="col-start-1 row-start-4"
              disabled={spec.digits === 0 || typed.includes(".")}
              onClick={() => setTyped((typed === "" ? "0" : typed) + ".")}
            >
              .
            </Key>
            <Key className="col-start-2 row-start-4" onClick={() => setTyped(typed + "0")}>
              0
            </Key>
            <Key
              ariaLabel="Backspace"
              className="col-start-3 row-start-4"
              onClick={() => setTyped(typed.slice(0, -1))}
            >
              <Delete className="size-4" />
            </Key>
            <HoldButton
              ariaLabel={`Increase ${spec.label}`}
              className="col-start-4 row-start-1 h-full w-full"
              onFire={() => nudgeTyped(1)}
            >
              <Plus className="size-4" />
            </HoldButton>
            <HoldButton
              ariaLabel={`Decrease ${spec.label}`}
              className="col-start-4 row-start-2 h-full w-full"
              onFire={() => nudgeTyped(-1)}
            >
              <Minus className="size-4" />
            </HoldButton>
            <Key
              className="col-start-4 row-start-3 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground"
              onClick={() => setOpen(null)}
            >
              Cancel
            </Key>
            <Key
              className="col-start-4 row-start-4 border-highlight/60 bg-highlight/15 text-[0.74rem] uppercase tracking-[0.08em] disabled:bg-transparent"
              disabled={!valid}
              onClick={commit}
            >
              Set
            </Key>
          </div>
        </aside>
      )}
    </div>
  );
}

function Key({
  ariaLabel,
  children,
  className,
  disabled,
  onClick,
}: {
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "flex min-h-[44px] items-center justify-center rounded-[4px] border border-border/60 bg-panel-muted font-mono text-[1.1rem] font-semibold text-foreground transition active:bg-highlight/25 disabled:opacity-35",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
