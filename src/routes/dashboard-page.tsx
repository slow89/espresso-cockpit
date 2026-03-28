import { DashboardSleepScreen } from "@/components/dashboard/dashboard-sleep-screen";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { DashboardWorkspaceContainer } from "@/components/dashboard/dashboard-workspace-container";
import {
  useMachineStateQuery,
  useRequestMachineStateMutation,
} from "@/rest/queries";

export function DashboardPage() {
  const { data: snapshot, error: machineQueryError } = useMachineStateQuery();
  const requestMachineStateMutation = useRequestMachineStateMutation();

  function handleToggleMachinePower() {
    if (snapshot == null) {
      return;
    }

    requestMachineStateMutation.mutate(
      snapshot.state.state === "sleeping" ? "idle" : "sleeping",
    );
  }

  if (snapshot?.state.state === "sleeping") {
    return (
      <DashboardSleepScreen
        disabled={
          snapshot == null ||
          Boolean(machineQueryError) ||
          requestMachineStateMutation.isPending
        }
        isPending={requestMachineStateMutation.isPending}
        onWake={handleToggleMachinePower}
      />
    );
  }

  return (
    <div>
      <div className="min-h-[calc(100svh-var(--app-footer-height))] overflow-hidden border-b border-border/30 bg-shell md:flex md:h-[calc(100svh-var(--app-footer-height))] md:flex-col">
        <DashboardTopBar />
        <DashboardWorkspaceContainer />
      </div>
    </div>
  );
}
