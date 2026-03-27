import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsSection({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description: string;
  title: string;
}) {
  return (
    <section className={cn("px-2.5 py-2.5 md:px-3 md:py-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted">
          {title}
        </p>
        <p className="max-w-[28rem] text-right font-mono text-[0.46rem] uppercase tracking-[0.06em] text-muted-foreground/60">
          {description}
        </p>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function ControlBlock({
  children,
  description,
  label,
  value,
}: {
  children: ReactNode;
  description: string;
  label: string;
  value: string;
}) {
  return (
    <section className="rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[0.5rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          <span className="font-mono text-[0.42rem] text-muted-foreground/40">|</span>
          <p className="font-mono text-[0.46rem] uppercase tracking-[0.06em] text-muted-foreground/60">
            {description}
          </p>
        </div>
        <p className="shrink-0 font-mono text-[0.72rem] font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </div>
      {children}
    </section>
  );
}

export function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p className="font-mono text-[0.72rem] font-semibold tabular-nums tracking-[0.03em] text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

export function EndpointRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-1.5">
      <p className="font-mono text-[0.42rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
        {label}
      </p>
      <p className="mt-0.5 break-all font-mono text-[0.58rem] font-semibold tracking-[0.02em] text-foreground">
        {value}
      </p>
    </div>
  );
}

export function StateCallout({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "error" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-[3px] border px-2.5 py-1.5 font-mono text-[0.58rem] leading-4 tracking-[0.03em]",
        tone === "error"
          ? "border-status-error-border bg-status-error-surface text-status-error-foreground"
          : "border-border/50 bg-panel-strong/60 text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}

export function ThemeOptionButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={isActive}
      className="min-h-[34px] rounded-[3px] px-3 text-[0.52rem] uppercase tracking-[0.14em]"
      onClick={onClick}
      size="sm"
      variant={isActive ? "default" : "secondary"}
    >
      {label}
    </Button>
  );
}

export function SleepTimeoutOptionButton({
  disabled,
  isActive,
  label,
  onClick,
}: {
  disabled?: boolean;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={isActive}
      className="min-h-[34px] rounded-[3px] px-2.5 text-[0.52rem] uppercase tracking-[0.14em]"
      disabled={disabled}
      onClick={onClick}
      size="sm"
      variant={isActive ? "default" : "secondary"}
    >
      {label}
    </Button>
  );
}
