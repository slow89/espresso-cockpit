import { DashboardSleepScreen } from "@/components/dashboard/dashboard-sleep-screen";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { DashboardWaterAlertOverlay } from "@/components/dashboard/dashboard-water-alert-overlay";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";
import { useMachineStateQuery, useRequestMachineStateMutation } from "@/rest/queries";

export function DashboardPage() {
  const { data: snapshot, error: machineQueryError } = useMachineStateQuery();
  const requestMachineStateMutation = useRequestMachineStateMutation();
  const canWakeMachine = snapshot != null && !requestMachineStateMutation.isPending;

  function handleToggleMachinePower() {
    if (snapshot == null) {
      return;
    }

    requestMachineStateMutation.mutate(snapshot.state.state === "sleeping" ? "idle" : "sleeping");
  }

  if (snapshot?.state.state === "sleeping") {
    return (
      <DashboardSleepScreen
        disabled={!canWakeMachine}
        hasError={Boolean(machineQueryError)}
        isPending={requestMachineStateMutation.isPending}
        onWake={handleToggleMachinePower}
      />
    );
  }

  return (
    <div>
      <DashboardWaterAlertOverlay />
      <div className="app-shell flex flex-col overflow-hidden border-b border-border/30 bg-shell">
        <DashboardTopBar />
        <DashboardWorkspace />
      </div>
    </div>
  );
}
