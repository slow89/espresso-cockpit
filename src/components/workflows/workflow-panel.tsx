import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function WorkflowPanel({
  children,
  className,
  contentClassName,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: string;
  title: string;
}) {
  return (
    <section
      className={cn(
        "border border-border/40 bg-panel/60",
        className,
      )}
    >
      <div className="border-b border-border/30 px-3 py-1.5">
        <p className="font-mono text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {title}
        </p>
        {description ? (
          <p className="mt-0.5 font-mono text-[0.52rem] tracking-[0.04em] text-muted-foreground/70">{description}</p>
        ) : null}
      </div>
      <div className={cn("px-3 py-2", contentClassName)}>{children}</div>
    </section>
  );
}
