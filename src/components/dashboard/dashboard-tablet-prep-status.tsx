import type { DashboardPrepStatus } from "@/lib/dashboard-utils";
import { cn } from "@/lib/utils";

export function DashboardTabletPrepStatus({ status }: { status: DashboardPrepStatus }) {
  const isWarming = status.tone === "warming";

  return (
    <section
      className={cn(
        "flex h-9 items-stretch md:h-11",
        isWarming && "animate-pulse bg-highlight-muted/10",
      )}
      data-testid="dashboard-tablet-prep-status"
    >
      {/* Status beacon */}
      <div
        className={cn(
          "flex items-center gap-2 border-r border-border/70 px-3 py-1.5 md:px-5 md:py-2",
        )}
      >
        <span
          className={cn(
            "block size-2 rounded-full md:size-3",
            status.tone === "ready" &&
              "bg-status-success-foreground shadow-[0_0_6px_rgba(107,231,159,0.5)]",
            isWarming && "bg-highlight-muted shadow-[0_0_10px_rgba(217,152,38,0.6)]",
            status.tone === "offline" && "bg-status-warning-foreground",
            status.tone === "sleeping" && "bg-muted-foreground/40",
          )}
        />
        <p
          className={cn(
            "font-mono text-[0.64rem] font-semibold uppercase tracking-[0.08em] md:text-[0.88rem]",
            status.tone === "ready" && "text-status-success-foreground",
            isWarming && "text-highlight-muted",
            status.tone === "offline" && "text-status-warning-foreground",
            status.tone === "sleeping" && "text-muted-foreground",
          )}
        >
          {status.title}
        </p>
      </div>

      {/* Data cells — trading-style horizontal ticker */}
      {status.items.map((item, i) => (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 md:px-5 md:py-2",
            i > 0 && "border-l border-border/60",
          )}
          key={item.label}
        >
          <p className="font-mono text-[0.5rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground md:text-[0.68rem]">
            {item.label}
          </p>
          <p className="whitespace-nowrap font-mono text-[0.76rem] font-semibold tabular-nums text-foreground md:text-[1.05rem]">
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}
