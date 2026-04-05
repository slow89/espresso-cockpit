import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initializeAppRuntime } from "@/app/runtime";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { useDevicesStore } from "@/stores/devices-store";
import { useDisplayStore } from "@/stores/display-store";
import { useMachineStore } from "@/stores/machine-store";
import { usePresenceStore } from "@/stores/presence-store";

describe("app runtime", () => {
  let cleanupRuntime: (() => void) | undefined;

  afterEach(() => {
    cleanupRuntime?.();
    cleanupRuntime = undefined;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useBridgeConfigStore.setState({
      gatewayUrl: "http://bridge.local:8080",
    });
  });

  it("connects the live machine, devices, and display streams on init", () => {
    const connectLiveSpy = vi
      .spyOn(useMachineStore.getState(), "connectLive")
      .mockResolvedValue(undefined);
    const resetDevicesSpy = vi
      .spyOn(useDevicesStore.getState(), "reset")
      .mockImplementation(() => undefined);
    const connectDevicesSpy = vi
      .spyOn(useDevicesStore.getState(), "connect")
      .mockResolvedValue(undefined);
    const resetDisplaySpy = vi
      .spyOn(useDisplayStore.getState(), "reset")
      .mockImplementation(() => undefined);
    const connectDisplaySpy = vi
      .spyOn(useDisplayStore.getState(), "connect")
      .mockResolvedValue(undefined);
    const resetPresenceSpy = vi
      .spyOn(usePresenceStore.getState(), "reset")
      .mockImplementation(() => undefined);

    cleanupRuntime = initializeAppRuntime();

    expect(connectLiveSpy).toHaveBeenCalledTimes(1);
    expect(resetDevicesSpy).toHaveBeenCalledTimes(1);
    expect(connectDevicesSpy).toHaveBeenCalledTimes(1);
    expect(resetDisplaySpy).toHaveBeenCalledTimes(1);
    expect(connectDisplaySpy).toHaveBeenCalledTimes(1);
    expect(resetPresenceSpy).toHaveBeenCalledTimes(1);
  });

  it("restarts the streams when the gateway target changes", () => {
    const connectLiveSpy = vi
      .spyOn(useMachineStore.getState(), "connectLive")
      .mockResolvedValue(undefined);
    const connectDevicesSpy = vi
      .spyOn(useDevicesStore.getState(), "connect")
      .mockResolvedValue(undefined);
    const connectDisplaySpy = vi
      .spyOn(useDisplayStore.getState(), "connect")
      .mockResolvedValue(undefined);

    cleanupRuntime = initializeAppRuntime();

    useBridgeConfigStore.getState().setGatewayUrl("http://bridge-backup.local:8080");

    expect(connectLiveSpy).toHaveBeenCalledTimes(2);
    expect(connectDevicesSpy).toHaveBeenCalledTimes(2);
    expect(connectDisplaySpy).toHaveBeenCalledTimes(2);
  });
});
