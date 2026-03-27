import { DashboardControlRail } from "@/components/dashboard/dashboard-control-rail";
import { DashboardTabletPrepBoard } from "@/components/dashboard/dashboard-tablet-prep-board";
import { DashboardTabletShotSummary } from "@/components/dashboard/dashboard-tablet-shot-summary";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";
import { TelemetryChart } from "@/components/telemetry-chart";
import {
  getDashboardPrepStatus,
  getDashboardPresentationMode,
} from "@/lib/dashboard-utils";
import { useMachineStore } from "@/stores/machine-store";
import {
  useDashboardControlRows,
  useDashboardRecipeControls,
  useDashboardShotSummary,
  useDashboardWorkflowControls,
} from "./dashboard-view-model";

export function DashboardWorkspaceContainer({
  isSimulatedShotActive,
}: {
  isSimulatedShotActive: boolean;
}) {
  const liveConnection = useMachineStore((state) => state.liveConnection);
  const machineError = useMachineStore((state) => state.error);
  const telemetry = useMachineStore((state) => state.telemetry);
  const workflowControls = useDashboardWorkflowControls();
  const recipeControls = useDashboardRecipeControls(workflowControls);
  const controlRows = useDashboardControlRows(workflowControls);
  const shotSummaryItems = useDashboardShotSummary({
    recipeControls,
    snapshot: workflowControls.snapshot,
    workflow: workflowControls.workflow,
  });
  const isOffline =
    liveConnection !== "live" ||
    Boolean(
      machineError ||
        workflowControls.machineQueryError ||
        workflowControls.workflowQueryError,
    );
  const dashboardMode = getDashboardPresentationMode({
    simulatedShotActive: isSimulatedShotActive,
    snapshot: workflowControls.snapshot,
    telemetry,
  });
  const prepStatus = getDashboardPrepStatus({
    isOffline,
    snapshot: workflowControls.snapshot,
  });

  return (
    <DashboardWorkspace
      desktopMain={
        <div className="min-w-0 flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden px-4 py-4">
            <TelemetryChart
              className="h-full rounded-[4px] border-0 bg-transparent p-0 shadow-none"
              data={telemetry}
              layout="desktop"
            />
          </div>
        </div>
      }
      desktopRail={
        <DashboardControlRail
          controlRows={controlRows}
          recipeControls={recipeControls}
          workflowDisabled={workflowControls.isUpdatingWorkflow}
        />
      }
      isShotActive={dashboardMode === "shot"}
      tabletPrepBoard={
        <DashboardTabletPrepBoard
          controlRows={controlRows}
          prepStatus={prepStatus}
          recipeControls={recipeControls}
          workflowDisabled={workflowControls.isUpdatingWorkflow}
        />
      }
      tabletShotContent={
        <>
          <DashboardTabletShotSummary items={shotSummaryItems} />
          <div className="mt-2.5 min-h-0 flex-1 overflow-hidden">
            <TelemetryChart
              className="h-full rounded-[4px] border-0 bg-transparent p-0 shadow-none"
              data={telemetry}
              layout="tablet"
            />
          </div>
        </>
      }
    />
  );
}
