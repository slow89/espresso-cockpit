import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDashboardControlPanelModel } from "@/components/dashboard/dashboard-view-model";
import { ShotAnalysisError } from "@/lib/shot-analysis";
import type { TelemetrySample } from "@/lib/telemetry";
import { dashboardUiDefaultState, useDashboardUiStore } from "@/stores/dashboard-ui-store";
import { useShotAnalysisSettingsStore } from "@/stores/shot-analysis-store";
import { useDevicesStore } from "@/stores/devices-store";
import { useMachineStore } from "@/stores/machine-store";
import { useScaleStore } from "@/stores/scale-store";

import { DashboardPage } from "./dashboard-page";

const shotAnalysisMocks = vi.hoisted(() => ({
  requestShotAnalysis: vi.fn(),
}));

vi.mock("@/lib/shot-analysis", async () => {
  const actual = await vi.importActual<typeof import("@/lib/shot-analysis")>("@/lib/shot-analysis");

  return {
    ...actual,
    requestShotAnalysis: shotAnalysisMocks.requestShotAnalysis,
  };
});

const queryMocks = vi.hoisted(() => ({
  useBridgeSettingsQuery: vi.fn(),
  useLatestShotQuery: vi.fn(),
  useMachineStateQuery: vi.fn(),
  useRequestMachineStateMutation: vi.fn(),
  useTareScaleMutation: vi.fn(),
  useUpdateWorkflowMutation: vi.fn(),
  useWorkflowQuery: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    search,
    to,
  }: {
    children: React.ReactNode;
    search?: { shotId?: string };
    to?: string;
  }) => (
    <a href={`${to ?? "/workflows"}${search?.shotId ? `?shotId=${search.shotId}` : ""}`}>
      {children}
    </a>
  ),
}));

vi.mock("@/rest/queries", async () => {
  const actual = await vi.importActual<typeof import("@/rest/queries")>("@/rest/queries");

  return {
    ...actual,
    useBridgeSettingsQuery: queryMocks.useBridgeSettingsQuery,
    useLatestShotQuery: queryMocks.useLatestShotQuery,
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
    useShotAnalysisSettingsStore.setState({ apiKey: "" });

    useMachineStore.setState({
      error: null,
      liveConnection: "live",
      telemetry: [],
      timeToReady: null,
      waterLevels: null,
    });
    useScaleStore.setState({
      error: null,
      scaleConnection: "idle",
      scaleMessage: null,
      scaleSocket: null,
    });
    useDevicesStore.setState({
      connection: "live",
      connectionStatus: {
        error: null,
        foundMachines: [],
        foundScales: [],
        pendingAmbiguity: null,
        phase: "idle",
      },
      connect: vi.fn(async () => undefined),
      connectDevice: vi.fn(async () => undefined),
      devices: [],
      disconnect: vi.fn(() => undefined),
      disconnectDevice: vi.fn(async () => undefined),
      error: null,
      requestScaleReconnect: vi.fn(async () => undefined),
      reset: vi.fn(() => undefined),
      scan: vi.fn(async () => undefined),
      scanning: false,
      socket: null,
    });
    queryMocks.useTareScaleMutation.mockReturnValue({
      isPending: false,
      mutate: tareScaleMutate,
    });
    queryMocks.useUpdateWorkflowMutation.mockReturnValue({
      isPending: false,
      mutate: updateWorkflowMutate,
    });
    queryMocks.useBridgeSettingsQuery.mockReturnValue({
      data: {
        simulatedDevices: [],
      },
      error: null,
    });
    queryMocks.useLatestShotQuery.mockReturnValue({
      data: null,
      error: null,
      isPending: false,
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

  it("starts and stops a simulated shot from the simulator control", async () => {
    queryMocks.useBridgeSettingsQuery.mockReturnValue({
      data: {
        simulatedDevices: ["machine", "scale"],
      },
      error: null,
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });

    const firstRender = render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Start shot simulator" }));

    await waitFor(() => {
      expect(requestMachineStateMutate).toHaveBeenCalledWith("espresso");
    });

    firstRender.unmount();
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("espresso", "pouring"),
      error: null,
    });
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Stop shot simulator" }));

    await waitFor(() => {
      expect(requestMachineStateMutate).toHaveBeenCalledWith("idle");
    });
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

  it("uses the scale stream as the connected scale source of truth", () => {
    useScaleStore.setState({
      scaleConnection: "live",
      scaleMessage: {
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
    useDevicesStore.setState({
      devices: [],
    });

    render(<DashboardPage />);

    expect(screen.getByText("Paired")).toBeInTheDocument();
    expect(screen.getByText("18.2 g")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tare" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
  });

  it("shows no-scale guidance when the devices stream has no scale device", () => {
    useScaleStore.setState({
      scaleConnection: "live",
      scaleMessage: {
        status: "disconnected",
      },
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    useDevicesStore.setState({
      devices: [
        {
          id: "machine-1",
          name: "DE1",
          state: "connected",
          type: "machine",
        },
      ],
    });

    render(<DashboardPage />);

    expect(screen.getByText("No scale paired")).toBeInTheDocument();
    expect(screen.getByText("Pair in setup")).toBeInTheDocument();
    expect(screen.getByText("--.- g")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tare" })).not.toBeInTheDocument();
  });

  it("shows the paired scale as offline when the scale stream reports disconnected", () => {
    useScaleStore.setState({
      scaleConnection: "live",
      scaleMessage: {
        status: "disconnected",
      },
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    useDevicesStore.setState({
      devices: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
    });

    render(<DashboardPage />);

    expect(screen.getByText("Scale off")).toBeInTheDocument();
    expect(screen.getByText("Connection lost")).toBeInTheDocument();
    expect(screen.getByText("--.- g")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tare" })).not.toBeInTheDocument();
  });

  it("does not show a stale connected scale row as paired without scale stream proof", () => {
    useScaleStore.setState({
      scaleConnection: "live",
      scaleMessage: null,
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    useDevicesStore.setState({
      devices: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
    });

    render(<DashboardPage />);

    expect(screen.getByText("No signal")).toBeInTheDocument();
    expect(screen.getByText("Connection lost")).toBeInTheDocument();
    expect(screen.getByText("--.- g")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.queryByText("Paired")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tare" })).not.toBeInTheDocument();
  });

  it("requests scale-only reconnect from the dashboard status card", async () => {
    const requestScaleReconnectSpy = vi.fn(async () => undefined);
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    useDevicesStore.setState({
      requestScaleReconnect: requestScaleReconnectSpy,
    });

    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(requestScaleReconnectSpy).toHaveBeenCalledWith({ force: true });
    });
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

  it("uses the workflow profile temperature for the brew control instead of the live mix temperature", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle", "idle", {
        mixTemperature: 93,
        targetMixTemperature: 93,
      }),
      error: null,
    });
    queryMocks.useWorkflowQuery.mockReturnValue({
      data: {
        id: "workflow-1",
        name: "Morning",
        profile: {
          title: "House",
          steps: [
            { flow: 0, seconds: 0, temperature: 80 },
            { flow: 2.5, seconds: 5, temperature: 81.5 },
            { flow: 2.3, seconds: 12, temperature: "82" },
          ],
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

    const { result } = renderHook(() => useDashboardControlPanelModel());
    const brewRow = result.current.controlRows.find((row) => row.label === "Brew");

    expect(brewRow?.value).toBe("80°C");
    expect(brewRow?.activePresetValue).toBe(80);

    brewRow?.onIncrease();

    expect(updateWorkflowMutate).toHaveBeenCalledWith({
      profile: {
        steps: [
          { flow: 0, seconds: 0, temperature: 81 },
          { flow: 2.5, seconds: 5, temperature: 82.5 },
          { flow: 2.3, seconds: 12, temperature: 83 },
        ],
      },
    });
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

  it("shows ready status above tablet controls when the machine is idle even if time-to-ready is still collecting data", () => {
    useMachineStore.setState({
      timeToReady: {
        currentTemp: 90,
        remainingTimeMs: null,
        status: "insufficient_data",
        targetTemp: 93,
        timestamp: 1_743_194_400_000,
      },
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle", "idle", {
        groupTemperature: 89,
        mixTemperature: 90,
        targetGroupTemperature: 93,
        targetMixTemperature: 93,
      }),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-tablet-prep-status")).toHaveTextContent("Idle / Idle");
    expect(screen.queryByText("90°C / 93°C")).not.toBeInTheDocument();
    expect(screen.getByText("89°C / 93°C")).toBeInTheDocument();
  });

  it("keeps the prep status warming until the bridge reports readiness", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("heating", "preparingForShot", {
        groupTemperature: 89,
        mixTemperature: 90,
        targetGroupTemperature: 93,
        targetMixTemperature: 93,
      }),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-tablet-prep-status")).toHaveTextContent(
      "Heating / Preparing For Shot",
    );
  });

  it("keeps the prep status ready after a flush-style temperature dip once the machine is idle again", () => {
    useMachineStore.setState({
      timeToReady: {
        currentTemp: 93,
        remainingTimeMs: 0,
        status: "reached",
        targetTemp: 93,
        timestamp: 1_743_194_400_000,
      },
    });
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

    expect(screen.getByTestId("dashboard-tablet-prep-status")).toHaveTextContent("Idle / Ready");
    expect(screen.queryByText("90°C / 93°C")).not.toBeInTheDocument();
    expect(screen.getByText("89°C / 93°C")).toBeInTheDocument();
  });

  it("sets the workflow dose from the live scale weight", async () => {
    useScaleStore.setState({
      scaleConnection: "live",
      scaleMessage: {
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
    useDevicesStore.setState({
      devices: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
      ],
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

  it("switches tablet focus to telemetry for the espresso preparing-for-shot bridge phase", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("espresso", "preparingForShot"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.queryByTestId("dashboard-tablet-prep-board")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-tablet-shot-workspace")).toBeInTheDocument();
  });

  it("shows a frozen post-shot summary until it is dismissed", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    useDashboardUiStore.getState().capturePostShotSummary(
      [
        buildTelemetrySample("espresso", "preparingForShot", {
          shotElapsedSeconds: 0,
          timestamp: "2026-03-25T10:00:00.000Z",
          weight: 0,
        }),
        buildTelemetrySample("espresso", "pouring", {
          shotElapsedSeconds: 6,
          timestamp: "2026-03-25T10:00:06.000Z",
          weight: 37.2,
        }),
      ],
      queryMocks.useWorkflowQuery().data,
    );

    render(<DashboardPage />);

    const summary = screen.getByTestId("dashboard-tablet-post-shot-summary");

    expect(summary).toBeInTheDocument();
    expect(within(summary).getByText("Shot complete")).toBeInTheDocument();
    expect(within(summary).getByText(/House/)).toBeInTheDocument();
    expect(within(summary).getByText("6.0s")).toBeInTheDocument();
    expect(within(summary).getByText("37.2 g")).toBeInTheDocument();
    expect(within(summary).getByText("1:2.1")).toBeInTheDocument();
    expect(within(summary).getByText("+1.2 g")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-tablet-prep-board")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss shot summary" }));

    expect(screen.queryByTestId("dashboard-tablet-post-shot-summary")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-tablet-prep-board")).toBeInTheDocument();
  });

  it("does not show a post-shot summary for a short espresso blip", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    useDashboardUiStore.getState().capturePostShotSummary(
      [
        buildTelemetrySample("espresso", "preparingForShot", {
          shotElapsedSeconds: 0,
          timestamp: "2026-03-25T10:00:00.000Z",
        }),
        buildTelemetrySample("espresso", "pouring", {
          shotElapsedSeconds: 4,
          timestamp: "2026-03-25T10:00:04.000Z",
        }),
      ],
      queryMocks.useWorkflowQuery().data,
    );

    render(<DashboardPage />);

    expect(screen.queryByTestId("dashboard-tablet-post-shot-summary")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-tablet-prep-board")).toBeInTheDocument();
  });

  it("enables the shot history link once the bridge exposes the persisted shot", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    queryMocks.useLatestShotQuery.mockReturnValue({
      data: {
        id: "shot-42",
        timestamp: "2026-03-25T10:00:01.000Z",
        workflow: queryMocks.useWorkflowQuery().data,
      },
      error: null,
      isPending: false,
    });
    useDashboardUiStore.getState().capturePostShotSummary(
      [
        buildTelemetrySample("espresso", "preparingForShot", {
          shotElapsedSeconds: 0,
          timestamp: "2026-03-25T10:00:00.000Z",
        }),
        buildTelemetrySample("espresso", "pouring", {
          shotElapsedSeconds: 6,
          timestamp: "2026-03-25T10:00:06.000Z",
        }),
      ],
      queryMocks.useWorkflowQuery().data,
    );

    render(<DashboardPage />);

    expect(screen.getByRole("link", { name: "Shots" })).toHaveAttribute(
      "href",
      "/history?shotId=shot-42",
    );
  });

  it("leads to setup when Analyze is tapped without an API key", () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    capturePostShotSummaryFixture();

    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    expect(screen.getByText(/needs an Anthropic API key/)).toBeInTheDocument();
    expect(shotAnalysisMocks.requestShotAnalysis).not.toHaveBeenCalled();
  });

  it("runs a shot analysis with the tapped taste compass", async () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    useShotAnalysisSettingsStore.setState({ apiKey: "sk-ant-test" });
    shotAnalysisMocks.requestShotAnalysis.mockResolvedValue({
      diagnosis: "Fast pour, pressure never held the plateau.",
      primary: { action: "Grind finer", detail: "2 steps", rationale: "Slows early flow." },
      secondary: { action: "Drop temperature 1 °C", rationale: "If sharpness lingers." },
    });
    capturePostShotSummaryFixture();

    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Too sour" }));
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText(/Grind finer/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Drop temperature 1 °C/)).toBeInTheDocument();
    expect(shotAnalysisMocks.requestShotAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "sk-ant-test",
        compass: { extraction: 0 },
      }),
    );
  });

  it("surfaces analysis errors with a retry", async () => {
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });
    useShotAnalysisSettingsStore.setState({ apiKey: "sk-ant-test" });
    shotAnalysisMocks.requestShotAnalysis
      .mockRejectedValueOnce(new ShotAnalysisError("busy", "The analysis service is busy."))
      .mockResolvedValueOnce({
        diagnosis: "Choked tail.",
        primary: { action: "Grind coarser", detail: "1 step", rationale: "Opens the tail." },
        secondary: null,
      });
    capturePostShotSummaryFixture();

    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("The analysis service is busy.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText(/Grind coarser/)).toBeInTheDocument();
    });
  });

  function capturePostShotSummaryFixture() {
    useDashboardUiStore.getState().capturePostShotSummary(
      [
        buildTelemetrySample("espresso", "preparingForShot", {
          shotElapsedSeconds: 0,
          timestamp: "2026-03-25T10:00:00.000Z",
          weight: 0,
        }),
        buildTelemetrySample("espresso", "pouring", {
          shotElapsedSeconds: 27,
          timestamp: "2026-03-25T10:00:27.000Z",
          weight: 36.2,
        }),
      ],
      queryMocks.useWorkflowQuery().data,
    );
  }

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

  it("does not show the water warning while a shot is active", () => {
    useMachineStore.setState({
      waterLevels: {
        currentLevel: 8,
        refillLevel: 10,
      },
    });
    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("espresso", "pouring"),
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.queryByLabelText("Water tank low")).not.toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: "Start shot simulator" })).toBeInTheDocument();

    window.history.pushState({}, "", "/");
  });

  it("requests espresso from the simulator button when dev mode is enabled", () => {
    window.history.pushState({}, "", "/?dev=true");

    queryMocks.useMachineStateQuery.mockReturnValue({
      data: buildSnapshot("idle"),
      error: null,
    });

    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Start shot simulator" }));

    expect(requestMachineStateMutate).toHaveBeenCalledWith("espresso");

    window.history.pushState({}, "", "/");
  });
});

function buildSnapshot(state: string, substate = state, overrides: Record<string, unknown> = {}) {
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

function buildTelemetrySample(
  state: TelemetrySample["state"],
  substate: TelemetrySample["substate"] = state,
  overrides: Partial<TelemetrySample> = {},
): TelemetrySample {
  return {
    ...buildSnapshot(state, substate),
    elapsedSeconds: 0,
    shotElapsedSeconds: null,
    state,
    substate,
    weight: null,
    weightFlow: null,
    ...overrides,
  };
}
