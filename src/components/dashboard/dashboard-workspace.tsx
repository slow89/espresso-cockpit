import type { ReactNode } from "react";

export function DashboardWorkspace({
  desktopMain,
  desktopRail,
  isShotActive,
  tabletPrepBoard,
  tabletShotContent,
}: {
  desktopMain: ReactNode;
  desktopRail: ReactNode;
  isShotActive: boolean;
  tabletPrepBoard: ReactNode;
  tabletShotContent: ReactNode;
}) {
  return (
    <section className="min-h-0 flex flex-1 flex-col">
      <div
        className="hidden h-full min-h-0 flex-1 xl:grid xl:grid-cols-[296px_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden"
        data-testid="dashboard-desktop-workspace"
      >
        {desktopRail}
        {desktopMain}
      </div>

      <div className="flex min-h-0 flex-1 flex-col xl:hidden">
        {isShotActive ? (
          <DashboardTabletShotWorkspace>{tabletShotContent}</DashboardTabletShotWorkspace>
        ) : (
          tabletPrepBoard
        )}
      </div>
    </section>
  );
}

function DashboardTabletShotWorkspace({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col px-2 py-2 md:px-3 md:py-3"
      data-testid="dashboard-tablet-shot-workspace"
    >
      {children}
    </div>
  );
}
