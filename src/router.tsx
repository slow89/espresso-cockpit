import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  useRouterState,
} from "@tanstack/react-router";
import {
  Coffee,
  Settings2,
  SlidersHorizontal,
  TimerReset,
} from "lucide-react";
import { z } from "zod";

import { BridgeShellEffects } from "@/app/bridge-shell-effects";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  prefetchOverviewQueries,
  prefetchShotsQuery,
  prefetchWorkflowQuery,
} from "@/rest/queries";

const DashboardPage = lazyRouteComponent(
  () => import("@/routes/dashboard-page"),
  "DashboardPage",
);
const HistoryRoutePage = lazyRouteComponent(
  () => import("@/routes/history-page"),
  "HistoryRoutePage",
);
const SettingsPage = lazyRouteComponent(
  () => import("@/routes/settings-page"),
  "SettingsPage",
);
const WorkflowsPage = lazyRouteComponent(
  () => import("@/routes/workflows-page"),
  "WorkflowsPage",
);
const historySearchSchema = z.object({
  shotId: z.string().optional(),
});

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
  validateSearch: historySearchSchema,
  component: HistoryRoutePage,
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
  { to: "/workflows", label: "Profiles", icon: SlidersHorizontal },
  { to: "/history", label: "Shots", icon: TimerReset },
  { to: "/settings", label: "Setup", icon: Settings2 },
] as const;

function RootLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isImmersiveRoute =
    pathname === "/" ||
    pathname === "/workflows" ||
    pathname === "/history" ||
    pathname === "/settings";

  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <BridgeShellEffects />
      <div
        className={cn(
          "flex min-h-screen flex-col",
          isImmersiveRoute
            ? "w-full"
            : "mx-auto max-w-[1400px] px-3 pb-5 pt-3 md:px-5 md:pt-5",
        )}
      >
        <main
          className={cn(
            "flex-1 min-h-0 tablet-safe",
            isImmersiveRoute ? "py-0" : "py-4",
          )}
        >
          <Outlet />
        </main>

        <nav
          className={cn(
            "fixed inset-x-0 bottom-0 z-30",
            isImmersiveRoute
              ? "w-full px-0"
              : "mx-auto w-full max-w-[1400px] px-3 pb-2 md:px-5",
          )}
        >
          <div
            className={cn(
              "nav-surface grid grid-cols-4 gap-1.5 p-1.5",
              isImmersiveRoute
                ? "rounded-none border-x-0 border-b-0 px-3 pb-2 pt-1.5"
                : "rounded-[28px]",
            )}
          >
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[18px] border border-transparent bg-transparent px-2 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-background hover:text-foreground",
                  )}
                  activeProps={{
                    className:
                      "border-primary/25 bg-primary/18 text-foreground shadow-soft",
                  }}
                >
                  <Icon className="size-[18px]" />
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
