import { DashboardControlRail } from "@/components/dashboard/dashboard-control-rail";
import { DashboardTabletPrepBoard } from "@/components/dashboard/dashboard-tablet-prep-board";
import { DashboardTabletShotSummary } from "@/components/dashboard/dashboard-tablet-shot-summary";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";
import { TelemetryChart } from "@/components/telemetry-chart";
import { useMachineStore } from "@/stores/machine-store";
import { useDashboardShotActive } from "./dashboard-view-model";

export function DashboardWorkspaceContainer() {
  const telemetry = useMachineStore((state) => state.telemetry);
  const isShotActive = useDashboardShotActive();

  return (
    <DashboardWorkspace
      desktopMain={
        <div className="min-w-0 flex h-full min-h-0 flex-col overflow-hidden">
          <div className="h-full min-h-0 flex-1 overflow-hidden px-4 py-4">
            <TelemetryChart
              className="h-full rounded-[4px] border-0 bg-transparent p-0 shadow-none"
              data={telemetry}
              layout="desktop"
            />
          </div>
        </div>
      }
      desktopRail={<DashboardControlRail />}
      isShotActive={isShotActive}
      tabletPrepBoard={<DashboardTabletPrepBoard />}
      tabletShotContent={
        <div className="grid h-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2.5">
          <DashboardTabletShotSummary />
          <div className="h-full min-h-0 overflow-hidden">
            <TelemetryChart
              className="h-full rounded-[4px] border-0 bg-transparent p-0 shadow-none"
              data={telemetry}
              layout="tablet"
            />
          </div>
        </div>
      }
    />
  );
}
