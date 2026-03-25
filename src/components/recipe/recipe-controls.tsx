import type { ReactNode } from "react";

import { Minus, Plus } from "lucide-react";

import { isPresetActive, type RecipePreset } from "@/lib/recipe-utils";
import { cn } from "@/lib/utils";

export function RecipeControlButton({
  ariaLabel,
  children,
  className,
  disabled,
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-[6px] border border-border bg-panel-strong text-foreground transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50",
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

export function RecipeValueControl({
  className,
  disabled,
  iconClassName,
  label,
  onDecrease,
  onIncrease,
  value,
  valueClassName,
  buttonClassName,
}: {
  className?: string;
  disabled: boolean;
  iconClassName?: string;
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  value: string;
  valueClassName?: string;
  buttonClassName?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[26px_minmax(0,1fr)_26px] items-center gap-1 rounded-[8px] border border-border/80 bg-panel px-1 py-1",
        className,
      )}
    >
      <RecipeControlButton
        ariaLabel={`Decrease ${label}`}
        className={buttonClassName}
        disabled={disabled}
        onClick={onDecrease}
      >
        <Minus className={cn("size-3.5", iconClassName)} />
      </RecipeControlButton>

      <div className="min-w-0 text-center">
        <p className={cn("font-mono text-[0.88rem] font-semibold text-foreground", valueClassName)}>
          {value}
        </p>
      </div>

      <RecipeControlButton
        ariaLabel={`Increase ${label}`}
        className={buttonClassName}
        disabled={disabled}
        onClick={onIncrease}
      >
        <Plus className={cn("size-3.5", iconClassName)} />
      </RecipeControlButton>
    </div>
  );
}

export function RecipePresetRow({
  activePresetValue,
  align = "center",
  className,
  disabled,
  itemClassName,
  onPresetClick,
  presets,
}: {
  activePresetValue: number;
  align?: "center" | "left";
  className?: string;
  disabled: boolean;
  itemClassName?: string;
  onPresetClick: (value: number) => void;
  presets: ReadonlyArray<RecipePreset>;
}) {
  return (
    <div className={cn("grid grid-cols-4 gap-1 text-[0.72rem] font-medium text-muted-foreground", className)}>
      {presets.map((preset) => (
        <button
          key={preset.label}
          className={cn(
            "rounded-[7px] border border-transparent font-mono transition",
            align === "left" ? "px-1.5 py-1 text-left" : "px-1 py-1 text-center",
            isPresetActive(activePresetValue, preset.value)
              ? "border-highlight/40 bg-primary/14 text-foreground"
              : "hover:border-highlight/30 hover:bg-secondary/80 hover:text-foreground",
            itemClassName,
          )}
          disabled={disabled}
          onClick={() => onPresetClick(preset.value)}
          type="button"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
