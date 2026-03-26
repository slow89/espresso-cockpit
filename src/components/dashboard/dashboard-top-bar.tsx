import { getDashboardDevEnabled } from "@/lib/dashboard-utils";
import {
  DashboardRecipeButton,
  DevShotToggleButton,
  MachineStatusCard,
  ReservoirStatusCard,
  ScaleStatusCard,
} from "./dashboard-top-bar-cards";

export function DashboardTopBar({
  isSimulatedShotActive,
  onToggleSimulatedShot,
}: {
  isSimulatedShotActive: boolean;
  onToggleSimulatedShot: () => void;
}) {
  const showDevShotToggle = getDashboardDevEnabled();

  return (
    <section className="shrink-0 border-b border-border px-2.5 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] md:px-3 md:pb-2 md:pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] xl:px-3 xl:pb-1.5 xl:pt-[calc(env(safe-area-inset-top,0px)+0.375rem)]">
      <div className="flex flex-wrap items-stretch gap-1 md:max-xl:gap-1.5">
        <DashboardRecipeButton />
        <ReservoirStatusCard />
        <ScaleStatusCard />

        {showDevShotToggle ? (
          <DevShotToggleButton
            isSimulatedShotActive={isSimulatedShotActive}
            onToggleSimulatedShot={onToggleSimulatedShot}
          />
        ) : null}

        <div className="flex min-w-[184px] flex-1 items-stretch justify-end gap-1 md:ml-auto md:flex-none md:max-xl:min-w-[216px] md:max-xl:gap-1.5">
          <MachineStatusCard />
        </div>
      </div>
    </section>
  );
}
