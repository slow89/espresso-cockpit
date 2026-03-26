import {
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import { DashboardSleepScreen } from "@/components/dashboard/dashboard-sleep-screen";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { DashboardWorkspaceContainer } from "@/components/dashboard/dashboard-workspace-container";
import {
  useDevicesQuery,
  useMachineStateQuery,
  useRequestMachineStateMutation,
} from "@/rest/queries";
import { useMachineStore } from "@/stores/machine-store";

export function DashboardPage() {
  const connectScale = useMachineStore((state) => state.connectScale);
  const disconnectScale = useMachineStore((state) => state.disconnectScale);
  const { data: snapshot, error: machineQueryError } = useMachineStateQuery();
  const { data: devices } = useDevicesQuery({ refetchInterval: 2_000 });
  const requestMachineStateMutation = useRequestMachineStateMutation();
  const [isSimulatedShotActive, setIsSimulatedShotActive] = useState(false);
  const connectedScale = devices?.find(
    (device) => device.type === "scale" && device.state === "connected",
  );
  const reconnectScaleFeed = useEffectEvent(() => {
    const currentScaleConnection = useMachineStore.getState().scaleConnection;

    if (currentScaleConnection === "connecting" || currentScaleConnection === "live") {
      return;
    }

    void connectScale();
  });

  useEffect(() => {
    if (!connectedScale?.id) {
      disconnectScale();
      return;
    }

    reconnectScaleFeed();
  }, [connectedScale?.id, disconnectScale, reconnectScaleFeed]);

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
