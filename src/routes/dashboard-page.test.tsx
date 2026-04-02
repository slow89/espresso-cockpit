import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dashboardUiDefaultState, useDashboardUiStore } from "@/stores/dashboard-ui-store";
import { useMachineStore } from "@/stores/machine-store";

import { DashboardPage } from "./dashboard-page";

const queryMocks = vi.hoisted(() => ({
  useDevicesQuery: vi.fn(),
  useMachineStateQuery: vi.fn(),
  useRequestMachineStateMutation: vi.fn(),
  useTareScaleMutation: vi.fn(),
  useUpdateWorkflowMutation: vi.fn(),
  useWorkflowQuery: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/workflows">{children}</a>,
}));

vi.mock("@/rest/queries", async () => {
  const actual = await vi.importActual<typeof import("@/rest/queries")>("@/rest/queries");

  return {
    ...actual,
    useDevicesQuery: queryMocks.useDevicesQuery,
    useMachineStateQuery: queryMocks.useMachineStateQuery,
    useRequestMachineStateMutation: queryMocks.useRequestMachineStateMutation,
    useTareScaleMutation: queryMocks.useTareScaleMutation,
    useUpdateWorkflowMutation: queryMocks.useUpdateWorkflowMutation,
    useWorkflowQuery: queryMocks.useWorkflowQuery,
  };
});

vi.mock("@/components/telemetry-chart", () => ({
  TelemetryChart: ({ data }: { data: Array<unknown> }) => (
    <div data-testid="telemetry-chart">{`samples:${data.length}`}</div>
  ),
}));

describe("DashboardPage", () => {
  const requestMachineStateMutate = vi.fn();
  const tareScaleMutate = vi.fn();
  const updateWorkflowMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useDashboardUiStore.setState({
      ...dashboardUiDefaultState,
    });

    useMachineStore.setState({
      error: null,
      liveConnection: "live",
      scaleConnection: "idle",
      scaleSnapshot: null,
      telemetry: [],
      waterLevels: null,
    });

    queryMocks.useDevicesQuery.mockReturnValue({
      data: [],
      error: null,
    });
    queryMocks.useTareScaleMutation.mockReturnValue({
      isPending: false,
      mutate: tareScaleMutate,
    });
    queryMocks.useUpdateWorkflowMutation.mockReturnValue({
      isPending: false,
      mutate: updateWorkflowMutate,
    });
    queryMocks.useWorkflowQuery.mockReturnValue({
      data: {
        id: "workflow-1",
        name: "Morning",
        profile: {
          title: "House",
          steps: [],
        },
        context: {
          targetDoseWeight: 18,
          targetYield: 36,
        },
        steamSettings: {
          duration: 50,
          flow: 1.5,
        },
        rinseData: {
          duration: 10,
        },
        hotWaterData: {
          targetTemperature: 75,
          volume: 50,
        },
      },
      error: null,
    });
    queryMocks.useRequestMachineStateMutation.mockReturnValue({
      isPending: false,
      mutate: requestMachineStateMutate,
    });
  });

  it("puts the machine to sleep from the power control when it is awake", async () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByText("Machine")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sleep machine" }));

    await waitFor(() => {
      expect(requestMachineStateMutate).toHaveBeenCalledWith("sleeping");
    });
    expect(screen.getByRole("button", { name: "Sleep machine" })).toBeInTheDocument();
  });

  it("shows a sleep screen and wakes the machine when the screen is tapped", async () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("sleeping", "idle"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-sleep-screen")).toBeInTheDocument();
    expect(screen.getByText("Your corgi barista is napping.")).toBeInTheDocument();
    expect(screen.getByText("Tap anywhere to turn on machine")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Turn on machine" }));

    await waitFor(() => {
      expect(requestMachineStateMutate).toHaveBeenCalledWith("idle");
    });
  });

  it("still allows waking from the sleep screen while the machine query is in error", async () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("sleeping", "idle"),
      error: new Error("Bridge offline"),
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-sleep-screen")).toBeInTheDocument();
    expect(
      screen.getByText("Reconnecting to bridge. Wake retry stays available."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Turn on machine" }));

    await waitFor(() => {
      expect(requestMachineStateMutate).toHaveBeenCalledWith("idle");
    });
  });

  it("clears stale scale UI when the bridge no longer reports a connected scale", () => {
    useMachineStore.setState({
      scaleConnection: "live",
      scaleSnapshot: {
        timestamp: "2026-03-25T10:00:00.000Z",
        weight: 18.2,
        weightFlow: 0,
        timerValue: null,
        batteryLevel: 82,
      },
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    queryMocks.useDevicesQuery.mockReturnValue({
      data: [],
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByText("No scale paired")).toBeInTheDocument();
    expect(screen.getByText("--.- g")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pair in Setup" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tare" })).not.toBeInTheDocument();
  });

  it("keeps the control workspace active on tablet when the machine is idle", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-tablet-prep-board")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-tablet-shot-workspace")).not.toBeInTheDocument();
  });

  it("switches tablet focus to telemetry when telemetry reports an espresso shot", async () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-tablet-prep-board")).toBeInTheDocument();

    act(() => {
      useMachineStore.setState({
        telemetry: [
          {
            elapsedSeconds: 12,
            flow: 0,
            groupTemperature: 92,
            mixTemperature: 93,
            pressure: 0,
            profileFrame: 0,
            shotElapsedSeconds: 4,
            state: "espresso",
            steamTemperature: 135,
            substate: "pouring",
            targetFlow: 0,
            targetGroupTemperature: 93,
            targetMixTemperature: 93,
            targetPressure: 0,
            timestamp: "2026-03-25T10:00:04.000Z",
            weight: 15.2,
            weightFlow: 1.8,
          },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-tablet-shot-workspace")).toBeInTheDocument();
    });
  });

  it("shows brew heating status above tablet controls while temperatures are below target", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle", "ready", {
        groupTemperature: 89,
        mixTemperature: 90,
        targetGroupTemperature: 93,
        targetMixTemperature: 93,
      }),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-tablet-prep-status")).toHaveTextContent(
      "Heating up",
    );
    expect(screen.getByText("90°C / 93°C")).toBeInTheDocument();
    expect(screen.getByText("89°C / 93°C")).toBeInTheDocument();
  });

  it("sets the workflow dose from the live scale weight", async () => {
    useMachineStore.setState({
      scaleConnection: "live",
      scaleSnapshot: {
        timestamp: "2026-03-25T10:00:00.000Z",
        weight: 18.2,
        weightFlow: 0,
        timerValue: null,
        batteryLevel: 82,
      },
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    queryMocks.useDevicesQuery.mockReturnValue({
      data: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
      error: null,
    });

    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Use dose" }));

    await waitFor(() => {
      expect(updateWorkflowMutate).toHaveBeenCalledWith({
        context: {
          targetDoseWeight: 18.2,
        },
      });
    });
  });

  it("switches tablet focus to telemetry when a shot is active", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("espresso", "pouring"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.queryByTestId("dashboard-tablet-prep-board")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-tablet-shot-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-shot-summary")).toBeInTheDocument();
  });

  it("keeps the desktop workspace mounted separately", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-desktop-workspace")).toBeInTheDocument();
  });

  it("shows the native water warning when the live level falls below the machine threshold", () => {
    useMachineStore.setState({
      waterLevels: {
        currentLevel: 8,
        refillLevel: 10,
      },
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByLabelText("Water tank low")).toBeInTheDocument();
    expect(screen.getByText("Water level: 8 mm / refill at 10 mm")).toBeInTheDocument();
  });

  it("keeps the warning active when the machine reports needsWater", () => {
    useMachineStore.setState({
      waterLevels: {
        currentLevel: 18,
        refillLevel: 10,
      },
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("needsWater", "idle"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByLabelText("Water tank low")).toBeInTheDocument();
  });

  it("resets the dismissal after the water alert clears", () => {
    useMachineStore.setState({
      waterLevels: {
        currentLevel: 8,
        refillLevel: 10,
      },
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });

    const { rerender } = render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "I'll refill, I promise" }));
    expect(screen.queryByLabelText("Water tank low")).not.toBeInTheDocument();

    act(() => {
      useMachineStore.setState({
        waterLevels: {
          currentLevel: 16,
          refillLevel: 10,
        },
      });
    });
    rerender(<DashboardPage />);
    expect(screen.queryByLabelText("Water tank low")).not.toBeInTheDocument();

    act(() => {
      useMachineStore.setState({
        waterLevels: {
          currentLevel: 9,
          refillLevel: 10,
        },
      });
    });
    rerender(<DashboardPage />);

    expect(screen.getByLabelText("Water tank low")).toBeInTheDocument();
  });

  it("shows a simulator toggle when dev mode is enabled in the URL", () => {
    window.history.pushState({}, "", "/?dev=true");

    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByRole("button", { name: "Play shot simulator" })).toBeInTheDocument();

    window.history.pushState({}, "", "/");
  });

  it("toggles tablet focus to telemetry from the simulator button", () => {
    window.history.pushState({}, "", "/?dev=true");

    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });

    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Play shot simulator" }));

    expect(screen.getByRole("button", { name: "Pause shot simulator" })).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-tablet-prep-board")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-tablet-shot-workspace")).toBeInTheDocument();

    window.history.pushState({}, "", "/");
  });
});

function buildSnapshot(
  state: string,
  substate = state,
  overrides: Record<string, unknown> = {},
) {
  return {
    timestamp: "2026-03-25T10:00:00.000Z",
    state: {
      state,
      substate,
    },
    flow: 0,
    pressure: 0,
    targetFlow: 0,
    targetPressure: 0,
    mixTemperature: 93,
    groupTemperature: 92,
    targetMixTemperature: 93,
    targetGroupTemperature: 93,
    profileFrame: 0,
    steamTemperature: 135,
    ...overrides,
  };
}
