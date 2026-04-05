import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { devicesStore, initializeDevicesStoreRuntime } from "@/stores/devices-store";
import { displayStore } from "@/stores/display-store";
import { useMachineStore } from "@/stores/machine-store";
import { presenceStore } from "@/stores/presence-store";

let cleanupRuntime: (() => void) | null = null;

function resetGatewayStreams() {
  void useMachineStore.getState().connectLive();
  devicesStore.getState().reset();
  displayStore.getState().reset();
  presenceStore.getState().reset();
  void devicesStore.getState().connect();
  void displayStore.getState().connect();
}

export function initializeAppRuntime() {
  if (cleanupRuntime) {
    return cleanupRuntime;
  }

  let previousGatewayUrl = useBridgeConfigStore.getState().gatewayUrl;
  const cleanupDevicesRuntime = initializeDevicesStoreRuntime();

  resetGatewayStreams();

  const unsubscribeConfig = useBridgeConfigStore.subscribe((state) => {
    if (state.gatewayUrl === previousGatewayUrl) {
      return;
    }

    previousGatewayUrl = state.gatewayUrl;
    resetGatewayStreams();
  });

  cleanupRuntime = () => {
    unsubscribeConfig();
    cleanupDevicesRuntime();
    useMachineStore.getState().disconnectLive();
    devicesStore.getState().disconnect();
    displayStore.getState().disconnect();
    presenceStore.getState().reset();
    cleanupRuntime = null;
  };

  return cleanupRuntime;
}
