import { DashboardControlRail } from "@/components/dashboard/dashboard-control-rail";
import { DashboardTabletPrepBoard } from "@/components/dashboard/dashboard-tablet-prep-board";
import { DashboardTabletShotSummary } from "@/components/dashboard/dashboard-tablet-shot-summary";
import { TelemetryChart } from "@/components/telemetry-chart";
import { useMachineStore } from "@/stores/machine-store";
import { useDashboardShotActive } from "./dashboard-view-model";

export function DashboardWorkspace() {
  const isShotActive = useDashboardShotActive();

  return (
    <section className="min-h-0 flex flex-1 flex-col">
      <div
        className="hidden h-full min-h-0 flex-1 xl:grid xl:grid-cols-[296px_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden"
        data-testid="dashboard-desktop-workspace"
      >
        <DashboardControlRail />
        <div className="min-w-0 flex h-full min-h-0 flex-col overflow-hidden">
          <div className="h-full min-h-0 flex-1 overflow-hidden px-4 py-4">
            <DashboardWorkspaceTelemetryChart layout="desktop" />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col xl:hidden">
        {isShotActive ? <DashboardTabletShotWorkspace /> : <DashboardTabletPrepBoard />}
      </div>
    </section>
  );
}

function DashboardTabletShotWorkspace() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col px-2 py-2 md:px-3 md:py-3"
      data-testid="dashboard-tablet-shot-workspace"
    >
      <div className="grid h-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2.5">
        <DashboardTabletShotSummary />
        <div className="h-full min-h-0 overflow-hidden">
          <DashboardWorkspaceTelemetryChart layout="tablet" />
        </div>
      </div>
    </div>
  );
}

function DashboardWorkspaceTelemetryChart({ layout }: { layout: "desktop" | "tablet" }) {
  const telemetry = useMachineStore((state) => state.telemetry);

  return (
    <TelemetryChart
      className="h-full rounded-[4px] border-0 bg-transparent p-0 shadow-none"
      data={telemetry}
      layout={layout}
    />
  );
}
