import type { DashboardPrepStatus } from "@/lib/dashboard-utils";
import { cn } from "@/lib/utils";

export function DashboardTabletPrepStatus({
  status,
}: {
  status: DashboardPrepStatus;
}) {
  return (
    <section
      className="flex items-stretch"
      data-testid="dashboard-tablet-prep-status"
    >
      {/* Status beacon */}
      <div className="flex items-center gap-2 border-r border-border/40 px-3 py-1.5 md:px-5 md:py-2.5">
        <span
          className={cn(
            "block size-2 rounded-full md:size-2.5",
            status.tone === "ready" && "bg-status-success-foreground shadow-[0_0_6px_rgba(107,231,159,0.5)]",
            status.tone === "warming" && "bg-highlight-muted animate-pulse shadow-[0_0_6px_rgba(217,152,38,0.4)]",
            status.tone === "offline" && "bg-status-warning-foreground",
            status.tone === "sleeping" && "bg-muted-foreground/40",
          )}
        />
        <p
          className={cn(
            "font-mono text-[0.64rem] font-semibold uppercase tracking-[0.08em] md:text-[0.76rem]",
            status.tone === "ready" && "text-status-success-foreground",
            status.tone === "warming" && "text-highlight-muted",
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
            "flex items-center gap-2 px-3 py-1.5 md:px-5 md:py-2.5",
            i > 0 && "border-l border-border/30",
          )}
          key={item.label}
        >
          <p className="font-mono text-[0.5rem] font-medium uppercase tracking-[0.06em] text-muted-foreground md:text-[0.58rem]">
            {item.label}
          </p>
          <p className="whitespace-nowrap font-mono text-[0.76rem] font-semibold tabular-nums text-foreground md:text-[0.9rem]">
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}
