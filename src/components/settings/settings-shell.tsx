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
    <section
      className={cn(
        "rounded-[18px] border border-border bg-panel px-3 py-3 shadow-panel",
        className,
      )}
    >
      <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-highlight">
        {title}
      </p>
      <p className="mt-1 max-w-[40rem] text-[0.78rem] leading-5 text-muted-foreground">
        {description}
      </p>
      <div className="mt-3">{children}</div>
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
    <section className="rounded-[16px] border border-border bg-panel-muted px-3 py-3 transition-colors hover:border-highlight/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.54rem] font-medium uppercase tracking-[0.16em] text-highlight">
            {label}
          </p>
          <p className="mt-1 max-w-[24rem] text-[0.74rem] leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <p className="shrink-0 font-mono text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-foreground">
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
    <div className="rounded-[14px] border border-border bg-panel-muted px-3 py-2.5 transition-colors hover:border-highlight/30">
      <p className="font-mono text-[0.52rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words font-mono text-[0.82rem] font-semibold tracking-[0.03em] text-foreground">
        {value}
      </p>
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
    <div className="rounded-[14px] border border-border bg-panel-muted px-3 py-2">
      <p className="font-mono text-[0.52rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-[0.7rem] font-semibold tracking-[0.03em] text-foreground">
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
        "rounded-[14px] border px-3 py-2 font-mono text-[0.68rem] leading-5 tracking-[0.03em]",
        tone === "error"
          ? "border-status-error-border bg-status-error-surface text-status-error-foreground"
          : "border-border bg-panel-muted text-muted-foreground",
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
      className="min-h-[40px] rounded-[12px] px-4 text-[0.66rem] uppercase tracking-[0.16em]"
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
      className="min-h-[40px] rounded-[12px] px-3 text-[0.62rem] uppercase tracking-[0.16em]"
      disabled={disabled}
      onClick={onClick}
      size="sm"
      variant={isActive ? "default" : "secondary"}
    >
      {label}
    </Button>
  );
}
