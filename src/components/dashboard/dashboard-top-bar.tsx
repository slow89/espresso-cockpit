import { getDashboardDevEnabled } from "@/lib/dashboard-utils";
import { useBridgeSettingsQuery } from "@/rest/queries";
import {
  DashboardRecipeButton,
  DevShotToggleButton,
  MachineStatusCard,
  ReservoirStatusCard,
  ScaleStatusCard,
} from "./dashboard-top-bar-cards";

export function DashboardTopBar() {
  const { data: bridgeSettings } = useBridgeSettingsQuery();
  const showDevShotToggle =
    getDashboardDevEnabled() ||
    Boolean(
      bridgeSettings?.simulatedDevices?.some(
        (device) => device === "machine" || device === "bengle",
      ),
    );

  return (
    <section className="shrink-0 border-b border-border/80 bg-panel-strong/30 px-2 pb-1.5 pt-[calc(env(safe-area-inset-top,0px)+0.375rem)] md:px-3 xl:px-3 xl:pb-1.5 xl:pt-[calc(env(safe-area-inset-top,0px)+0.375rem)]">
      <div className="flex flex-wrap items-stretch gap-1">
        <DashboardRecipeButton />
        <ReservoirStatusCard />
        <ScaleStatusCard />

        {showDevShotToggle ? <DevShotToggleButton /> : null}

        <div className="flex min-w-[160px] flex-1 items-stretch justify-end gap-1 md:ml-auto md:flex-none">
          <MachineStatusCard />
        </div>
      </div>
    </section>
  );
}
