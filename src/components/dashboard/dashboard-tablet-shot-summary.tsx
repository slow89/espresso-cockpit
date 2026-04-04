import { cn } from "@/lib/utils";
import { useDashboardShotSummaryItems } from "./dashboard-view-model";

export function DashboardTabletShotSummary() {
  const items = useDashboardShotSummaryItems();

  return (
    <div
      className="shrink-0 flex items-stretch border-b border-border/70"
      data-testid="dashboard-shot-summary"
    >
      {items.map((item, i) => (
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col justify-center px-2.5 py-1.5",
            i > 0 && "border-l border-border/60",
          )}
          key={item.label}
        >
          <p className="truncate font-mono text-[0.44rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-0.5 truncate font-mono text-[0.74rem] font-semibold tabular-nums text-foreground">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
