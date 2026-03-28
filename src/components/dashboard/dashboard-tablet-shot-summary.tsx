import { cn } from "@/lib/utils";
import { useDashboardShotSummaryItems } from "./dashboard-view-model";

export function DashboardTabletShotSummary() {
  const items = useDashboardShotSummaryItems();

  return (
    <div
      className="flex items-stretch border-b border-border/40"
      data-testid="dashboard-shot-summary"
    >
      {items.map((item, i) => (
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col justify-center px-2.5 py-1.5 md:px-3",
            i > 0 && "border-l border-border/30",
          )}
          key={item.label}
        >
          <p className="truncate font-mono text-[0.44rem] font-medium uppercase tracking-[0.08em] text-muted-foreground md:text-[0.48rem]">
            {item.label}
          </p>
          <p className="mt-0.5 truncate font-mono text-[0.74rem] font-semibold tabular-nums text-foreground md:text-[0.78rem]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
