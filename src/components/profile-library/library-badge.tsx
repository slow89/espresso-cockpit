import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface LibraryBadgeProps {
  children: ReactNode;
  tone: "muted" | "success" | "warning";
}

export function LibraryBadge({ children, tone }: LibraryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[3px] border px-1.5 py-[1px] font-mono text-[0.67rem] font-semibold uppercase tracking-[0.08em]",
        tone === "muted" && "border-border/50 text-muted-foreground",
        tone === "success" && "border-status-success-foreground/40 text-status-success-foreground",
        tone === "warning" && "border-highlight/50 bg-highlight/10 text-highlight",
      )}
    >
      {children}
    </span>
  );
}
