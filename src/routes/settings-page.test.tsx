import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { useDevicesStore } from "@/stores/devices-store";
import { useDisplayStore } from "@/stores/display-store";
import { useMachineStore } from "@/stores/machine-store";
import { usePresenceStore } from "@/stores/presence-store";
import { useThemeStore } from "@/stores/theme-store";

import { SettingsPage } from "./settings-page";

const {
  routerInvalidate,
  useBridgeSettingsQueryMock,
  useMachineCalibrationQueryMock,
  usePresenceSettingsQueryMock,
  useUpdateBridgeSettingsMutationMock,
  useUpdateMachineCalibrationMutationMock,
  useUpdateMachineWaterLevelsMutationMock,
  useUpdatePresenceSettingsMutationMock,
  useUpdateVisualizerSettingsMutationMock,
  useVerifyVisualizerCredentialsMutationMock,
  useVisualizerSettingsQueryMock,
} = vi.hoisted(() => ({
  routerInvalidate: vi.fn(async () => undefined),
  useBridgeSettingsQueryMock: vi.fn(),
  useMachineCalibrationQueryMock: vi.fn(),
  usePresenceSettingsQueryMock: vi.fn(),
  useUpdateBridgeSettingsMutationMock: vi.fn(),
  useUpdateMachineCalibrationMutationMock: vi.fn(),
  useUpdateMachineWaterLevelsMutationMock: vi.fn(),
  useUpdatePresenceSettingsMutationMock: vi.fn(),
  useUpdateVisualizerSettingsMutationMock: vi.fn(),
  useVerifyVisualizerCredentialsMutationMock: vi.fn(),
  useVisualizerSettingsQueryMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    invalidate: routerInvalidate,
  }),
}));

vi.mock("@/rest/queries", async () => {
  const actual = await vi.importActual<typeof import("@/rest/queries")>("@/rest/queries");

  return {
    ...actual,
    useBridgeSettingsQuery: useBridgeSettingsQueryMock,
    useMachineCalibrationQuery: useMachineCalibrationQueryMock,
    usePresenceSettingsQuery: usePresenceSettingsQueryMock,
    useUpdateBridgeSettingsMutation: useUpdateBridgeSettingsMutationMock,
    useUpdateMachineCalibrationMutation: useUpdateMachineCalibrationMutationMock,
    useUpdateMachineWaterLevelsMutation: useUpdateMachineWaterLevelsMutationMock,
    useUpdatePresenceSettingsMutation: useUpdatePresenceSettingsMutationMock,
    useUpdateVisualizerSettingsMutation: useUpdateVisualizerSettingsMutationMock,
    useVerifyVisualizerCredentialsMutation: useVerifyVisualizerCredentialsMutationMock,
    useVisualizerSettingsQuery: useVisualizerSettingsQueryMock,
  };
});

describe("SettingsPage", () => {
  const connectDevice = vi.fn(async () => undefined);
  const disconnectDevice = vi.fn(async () => undefined);
  const scan = vi.fn(async () => undefined);
  const updateBridgeSettingsMutateAsync = vi.fn(async (settings: unknown) => settings);
  const updateMachineCalibrationMutateAsync = vi.fn(async (settings: unknown) => settings);
  const updateMachineWaterLevelsMutateAsync = vi.fn(async (levels: unknown) => levels);
  const updatePresenceSettingsMutateAsync = vi.fn(async (patch: unknown) => patch);
  const updateVisualizerSettingsMutateAsync = vi.fn(async (settings: unknown) => settings);
  const verifyVisualizerCredentialsMutateAsync = vi.fn(async () => ({ valid: true }));
  const requestFullscreenMock = vi.fn(async () => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: document.documentElement,
    });
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  const exitFullscreenMock = vi.fn(async () => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event("fullscreenchange"));
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: requestFullscreenMock,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exitFullscreenMock,
    });

    useBridgeConfigStore.setState({
      gatewayUrl: "http://bridge.local:8080",
    });
    useDevicesStore.setState({
      connection: "live",
      connectionStatus: {
        error: null,
        foundMachines: [],
        foundScales: [],
        pendingAmbiguity: null,
        phase: "ready",
      },
      connect: vi.fn(async () => undefined),
      connectDevice,
      devices: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "connected",
          type: "scale",
        },
        {
          id: "machine-2",
          name: "DE1XL",
          state: "disconnected",
          type: "machine",
        },
      ],
      disconnect: vi.fn(() => undefined),
      disconnectDevice,
      error: null,
      reset: vi.fn(() => undefined),
      scan,
      scanning: false,
      socket: null,
    });
    useDisplayStore.setState({
      connection: "live",
      displayState: {
        wakeLockEnabled: true,
        wakeLockOverride: false,
        brightness: 75,
        requestedBrightness: 75,
        lowBatteryBrightnessActive: false,
        platformSupported: {
          brightness: true,
          wakeLock: true,
        },
      },
      error: null,
      socket: null,
    });
    useMachineStore.setState({
      error: null,
      liveConnection: "live",
      machineSocket: null,
      scaleConnection: "idle",
      scaleSnapshot: null,
      scaleSocket: null,
      telemetry: [],
      timeToReady: null,
      timeToReadySocket: null,
      waterConnection: "live",
      waterLevels: {
        currentLevel: 48,
        refillLevel: 25,
      },
      waterSocket: null,
    });
    usePresenceStore.setState({
      error: null,
      isSending: false,
      timeoutSeconds: 1800,
    });
    useThemeStore.setState({
      theme: "dark",
    });
    document.documentElement.dataset.theme = "dark";

    routerInvalidate.mockResolvedValue(undefined);
    usePresenceSettingsQueryMock.mockReturnValue({
      data: {
        schedules: [],
        sleepTimeoutMinutes: 30,
        userPresenceEnabled: true,
      },
      error: null,
      isPending: false,
    });
    useBridgeSettingsQueryMock.mockReturnValue({
      data: {
        preferredMachineId: "machine-1",
        preferredScaleId: "scale-1",
        scalePowerMode: "disconnect",
        volumeFlowMultiplier: 0.3,
        weightFlowMultiplier: 1,
      },
      error: null,
      isError: false,
      isPending: false,
    });
    useMachineCalibrationQueryMock.mockReturnValue({
      data: {
        flowMultiplier: 1,
      },
      error: null,
      isError: false,
      isPending: false,
    });
    useUpdateBridgeSettingsMutationMock.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: updateBridgeSettingsMutateAsync,
    });
    useUpdateMachineCalibrationMutationMock.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: updateMachineCalibrationMutateAsync,
    });
    useUpdateMachineWaterLevelsMutationMock.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: updateMachineWaterLevelsMutateAsync,
    });
    useUpdateVisualizerSettingsMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: updateVisualizerSettingsMutateAsync,
    });
    useUpdatePresenceSettingsMutationMock.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: updatePresenceSettingsMutateAsync,
    });
    useVerifyVisualizerCredentialsMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: verifyVisualizerCredentialsMutateAsync,
    });
    useVisualizerSettingsQueryMock.mockReturnValue({
      data: {
        AutoUpload: false,
        LengthThreshold: 5,
        Password: "secret",
        Username: "brew-user",
      },
      error: null,
      isPending: false,
    });
  });

  it("shows the current bridge URL and endpoint preview", () => {
    render(<SettingsPage />);

    expect(screen.getByDisplayValue("http://bridge.local:8080")).toBeInTheDocument();
    expect(screen.getByText("http://bridge.local:8080/api/v1/workflow")).toBeInTheDocument();
    expect(screen.getByText("ws://bridge.local:8080/ws/v1/machine/snapshot")).toBeInTheDocument();
    expect(screen.getByText("ws://bridge.local:8080/ws/v1/display")).toBeInTheDocument();
    expect(screen.getAllByText("30 min").length).toBeGreaterThan(0);
    expect(screen.getByText("Auto-managed on")).toBeInTheDocument();
    expect(screen.getByText("Acaia Lunar")).toBeInTheDocument();
    expect(screen.getByText("DE1XL")).toBeInTheDocument();
    expect(screen.getByText("connected")).toBeInTheDocument();
    expect(screen.getByText("disconnected")).toBeInTheDocument();
    expect(screen.getByText("Scale Pairing")).toBeInTheDocument();
    expect(screen.getByText("Shot Calibration")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight flow")).toHaveValue("1");
    expect(screen.getByLabelText("Volume flow")).toHaveValue("0.3");
    expect(screen.getByLabelText("Machine flow")).toHaveValue("1");
    expect(screen.getByText("Current tank level 48 mm")).toBeInTheDocument();
    expect(screen.getByText("25 mm")).toBeInTheDocument();
    expect(screen.getByText("Visualizer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("brew-user")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect scale" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect machine" })).toBeInTheDocument();
  });

  it("saves the updated bridge URL and refreshes route loaders", async () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText("REST origin"), {
      target: { value: "http://new-bridge.local:8080/" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save & reconnect" }));

    await waitFor(() => {
      expect(useBridgeConfigStore.getState().gatewayUrl).toBe("http://new-bridge.local:8080");
    });

    expect(screen.getByDisplayValue("http://new-bridge.local:8080")).toBeInTheDocument();
    expect(routerInvalidate).toHaveBeenCalled();
  });

  it("fills the draft URL with the current browser origin", () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText("REST origin"), {
      target: { value: "http://scratch.local:8080" },
    });
    fireEvent.click(screen.getByText("Use current origin"));

    expect(screen.getByDisplayValue(window.location.origin)).toBeInTheDocument();
  });

  it("connects a disconnected device from device discovery", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Connect machine" }));

    await waitFor(() => {
      expect(connectDevice).toHaveBeenCalledWith("machine-2");
    });
  });

  it("disconnects a connected device from device discovery", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Disconnect scale" }));

    await waitFor(() => {
      expect(disconnectDevice).toHaveBeenCalledWith("scale-1");
    });
    expect(updateBridgeSettingsMutateAsync).not.toHaveBeenCalledWith({
      preferredScaleId: null,
    });
  });

  it("forgets a scale by clearing the preferred scale and disconnecting it when connected", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Forget scale" }));

    await waitFor(() => {
      expect(updateBridgeSettingsMutateAsync).toHaveBeenCalledWith({
        preferredScaleId: null,
      });
      expect(disconnectDevice).toHaveBeenCalledWith("scale-1");
    });
  });

  it("shows an explicit pair action for discovered scales", () => {
    useDevicesStore.setState({
      devices: [
        {
          id: "scale-1",
          name: "Acaia Lunar",
          state: "disconnected",
          type: "scale",
        },
      ],
    });

    render(<SettingsPage />);

    expect(screen.getByRole("button", { name: "Pair scale" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Forget scale" })).toBeInTheDocument();
    expect(
      screen.getByText("Discovered scales can be paired directly from this page."),
    ).toBeInTheDocument();
  });

  it("can scan without automatically connecting devices", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Find only" }));

    await waitFor(() => {
      expect(scan).toHaveBeenCalledWith({ connect: false });
    });
  });

  it("updates the configured sleep timer", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "45m" }));

    await waitFor(() => {
      expect(updatePresenceSettingsMutateAsync).toHaveBeenCalledWith({
        sleepTimeoutMinutes: 45,
        userPresenceEnabled: true,
      });
    });
  });

  it("updates bridge-backed shot calibration controls", async () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText("Weight flow"), {
      target: { value: "0.8" },
    });
    fireEvent.pointerUp(screen.getByLabelText("Weight flow"));

    await waitFor(() => {
      expect(updateBridgeSettingsMutateAsync).toHaveBeenCalledWith({
        weightFlowMultiplier: 0.8,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Display off" }));

    await waitFor(() => {
      expect(updateBridgeSettingsMutateAsync).toHaveBeenCalledWith({
        scalePowerMode: "displayOff",
      });
    });
  });

  it("updates DE1 machine flow calibration", async () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText("Machine flow"), {
      target: { value: "0.96" },
    });
    fireEvent.pointerUp(screen.getByLabelText("Machine flow"));

    await waitFor(() => {
      expect(updateMachineCalibrationMutateAsync).toHaveBeenCalledWith({
        flowMultiplier: 0.96,
      });
    });
  });

  it("updates the machine refill threshold from live water levels", async () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText("Water alert threshold"), {
      target: { value: "30" },
    });
    fireEvent.pointerUp(screen.getByLabelText("Water alert threshold"));

    await waitFor(() => {
      expect(updateMachineWaterLevelsMutateAsync).toHaveBeenCalledWith({
        refillLevel: 30,
      });
    });
    expect(screen.getByLabelText("Water alert threshold")).toHaveValue("30");
  });

  it("shows a waiting state when live water levels are unavailable", () => {
    useMachineStore.setState({
      waterConnection: "connecting",
      waterLevels: null,
    });

    render(<SettingsPage />);

    expect(
      screen.getByText("Waiting for the bridge to stream machine water levels."),
    ).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByLabelText("Water alert threshold")).toBeDisabled();
  });

  it("shows the device loading state while the devices socket is connecting", () => {
    useDevicesStore.setState({
      connection: "connecting",
      devices: [],
    });

    render(<SettingsPage />);

    expect(screen.getByText("Checking the bridge for tracked devices.")).toBeInTheDocument();
  });

  it("shows the empty device state when no tracked devices are returned", () => {
    useDevicesStore.setState({
      devices: [],
    });

    render(<SettingsPage />);

    expect(
      screen.getByText("No tracked devices are currently reported by the bridge."),
    ).toBeInTheDocument();
    expect(screen.getByText("Use Find only, then pair your scale here.")).toBeInTheDocument();
  });

  it("shows the device error state when discovery cannot be read", () => {
    useDevicesStore.setState({
      devices: [],
      error: "Bridge offline",
    });

    render(<SettingsPage />);

    expect(
      screen.getByText((content) => content.includes("Device state is unavailable right now.")),
    ).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Bridge offline"))).toBeInTheDocument();
  });

  it("switches the app theme from settings", () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Light" }));

    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getAllByText("light").length).toBeGreaterThan(0);
  });

  it("toggles full screen from settings", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Enter fullscreen" }));

    await waitFor(() => {
      expect(requestFullscreenMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Exit fullscreen" }));

    await waitFor(() => {
      expect(exitFullscreenMock).toHaveBeenCalled();
    });
  });

  it("verifies credentials before enabling visualizer uploads", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(verifyVisualizerCredentialsMutateAsync).toHaveBeenCalledWith({
        password: "secret",
        username: "brew-user",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Enable uploads" }));

    await waitFor(() => {
      expect(updateVisualizerSettingsMutateAsync).toHaveBeenCalledWith({
        AutoUpload: true,
        LengthThreshold: 5,
        Password: "secret",
        Username: "brew-user",
      });
    });
  });

  it("blocks visualizer enablement when verification fails", async () => {
    verifyVisualizerCredentialsMutateAsync.mockResolvedValueOnce({ valid: false });

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(screen.getByText("Check credentials")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Enable uploads" })).toBeDisabled();
    expect(updateVisualizerSettingsMutateAsync).not.toHaveBeenCalled();
  });

  it("disables visualizer uploads without clearing saved gateway credentials", async () => {
    useVisualizerSettingsQueryMock.mockReturnValue({
      data: {
        AutoUpload: true,
        LengthThreshold: 5,
        Password: "secret",
        Username: "brew-user",
      },
      error: null,
      isPending: false,
    });

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));

    await waitFor(() => {
      expect(updateVisualizerSettingsMutateAsync).toHaveBeenCalledWith({
        AutoUpload: false,
        LengthThreshold: 5,
        Password: "secret",
        Username: "brew-user",
      });
    });
  });
});
