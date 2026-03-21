import { useEffect } from "react";

import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import {
  Cable,
  Coffee,
  Settings2,
  SlidersHorizontal,
  TimerReset,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardPage } from "@/routes/dashboard-page";
import { DevicesPage } from "@/routes/devices-page";
import { HistoryPage } from "@/routes/history-page";
import { SettingsPage } from "@/routes/settings-page";
import { WorkflowsPage } from "@/routes/workflows-page";
import {
  prefetchDevicesQuery,
  prefetchOverviewQueries,
  prefetchShotsQuery,
  prefetchWorkflowQuery,
  useMachineStateQuery,
} from "@/rest/queries";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { machineStore, useMachineStore } from "@/stores/machine-store";

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => (
    <div className="panel rounded-[28px] p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Off recipe
      </p>
      <h1 className="mt-3 font-display text-3xl text-foreground">
        This screen does not exist.
      </h1>
      <Button asChild className="mt-6">
        <Link to="/">Return to brew</Link>
      </Button>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  loader: prefetchOverviewQueries,
  component: DashboardPage,
});

const workflowsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workflows",
  loader: prefetchWorkflowQuery,
  component: WorkflowsPage,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  loader: prefetchShotsQuery,
  component: HistoryPage,
});

const devicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/devices",
  loader: prefetchDevicesQuery,
  component: DevicesPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  workflowsRoute,
  historyRoute,
  devicesRoute,
  settingsRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const navigation = [
  { to: "/", label: "Brew", icon: Coffee },
  { to: "/workflows", label: "Recipe", icon: SlidersHorizontal },
  { to: "/history", label: "Shots", icon: TimerReset },
  { to: "/devices", label: "Gear", icon: Cable },
  { to: "/settings", label: "Setup", icon: Settings2 },
] as const;

function RootLayout() {
  const gatewayUrl = useBridgeConfigStore((state) => state.gatewayUrl);
  const { data: snapshot } = useMachineStateQuery();
  const liveConnection = useMachineStore((state) => state.liveConnection);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isHome = pathname === "/";

  useEffect(() => {
    void machineStore.getState().connectLive();

    return () => {
      machineStore.getState().disconnectLive();
    };
  }, [gatewayUrl]);

  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <div
        className={cn(
          "flex min-h-screen flex-col",
          isHome
            ? "w-full"
            : "mx-auto max-w-[1400px] px-3 pb-5 pt-3 md:px-5 md:pt-5",
        )}
      >
        {!isHome ? (
          <header className="top-strip rounded-[28px] px-4 py-3 md:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  Decent Skin
                </p>
                <h1 className="mt-1 font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-none text-white">
                  Shot-first tablet cockpit
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge>{snapshot?.state.state ?? "idle"}</Badge>
                <Badge variant="secondary">{liveConnection}</Badge>
                <div className="rounded-full border border-border bg-muted/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {gatewayUrl.replace(/^https?:\/\//, "")}
                </div>
              </div>
            </div>
          </header>
        ) : null}

        <main
          className={cn(
            "flex-1 min-h-0 tablet-safe",
            isHome ? "py-0" : "py-4",
          )}
        >
          <Outlet />
        </main>

        <nav
          className={cn(
            "fixed inset-x-0 bottom-0 z-30",
            isHome
              ? "w-full px-0"
              : "mx-auto w-full max-w-[1400px] px-3 pb-3 md:px-5",
          )}
        >
          <div
            className={cn(
              "nav-surface grid grid-cols-5 gap-2 p-2",
              isHome ? "rounded-none border-x-0 border-b-0 px-4 pb-3 pt-2" : "rounded-[28px]",
            )}
          >
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-[20px] border-4 border-transparent px-2 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground transition",
                    "border border-transparent bg-transparent px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:bg-background hover:text-white",
                  )}
                  activeProps={{
                    className:
                      "border-primary/25 bg-primary/18 text-white shadow-soft",
                  }}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
