import {
  useState,
} from "react";

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
  const [isSimulatedShotActive, setIsSimulatedShotActive] = useState(false);

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
      <div className="panel min-h-[calc(100svh-var(--app-footer-height))] overflow-hidden rounded-none border-x-0 border-t-0 bg-shell md:flex md:h-[calc(100svh-var(--app-footer-height))] md:flex-col">
        <DashboardTopBar
          isSimulatedShotActive={isSimulatedShotActive}
          onToggleSimulatedShot={() => setIsSimulatedShotActive((current) => !current)}
        />
        <DashboardWorkspaceContainer isSimulatedShotActive={isSimulatedShotActive} />
      </div>
    </div>
  );
}
