import {
  useEffect,
  useEffectEvent,
} from "react";

import { useDevicesQuery } from "@/rest/queries";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { displayStore } from "@/stores/display-store";
import { useMachineStore } from "@/stores/machine-store";
import { presenceStore } from "@/stores/presence-store";

const activityEvents = [
  "keydown",
  "pointerdown",
  "touchstart",
] as const;

export function BridgeShellEffects() {
  const gatewayUrl = useBridgeConfigStore((state) => state.gatewayUrl);
  const connectScale = useMachineStore((state) => state.connectScale);
  const disconnectScale = useMachineStore((state) => state.disconnectScale);
  const { data: devices } = useDevicesQuery({
    refetchInterval: 2_000,
  });
  const signalPresence = useEffectEvent(() => {
    void presenceStore.getState().signalPresence();
  });
  const reconnectScaleFeed = useEffectEvent(() => {
    const currentScaleConnection = useMachineStore.getState().scaleConnection;

    if (currentScaleConnection === "connecting" || currentScaleConnection === "live") {
      return;
    }

    void connectScale();
  });
  const connectedScaleId =
    devices?.find((device) => device.type === "scale" && device.state === "connected")?.id ?? null;

  useEffect(() => {
    void useMachineStore.getState().connectLive();
    displayStore.getState().reset();
    presenceStore.getState().reset();
    void displayStore.getState().connect();

    return () => {
      useMachineStore.getState().disconnectLive();
      displayStore.getState().disconnect();
      presenceStore.getState().reset();
    };
  }, [gatewayUrl]);

  useEffect(() => {
    if (!connectedScaleId) {
      disconnectScale();
      return;
    }

    reconnectScaleFeed();
  }, [connectedScaleId, disconnectScale, reconnectScaleFeed]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void presenceStore.getState().signalPresence(true);
      }
    }

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, signalPresence, { passive: true });
    }

    window.addEventListener("focus", signalPresence);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void presenceStore.getState().signalPresence(true);

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, signalPresence);
      }

      window.removeEventListener("focus", signalPresence);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [signalPresence]);

  return null;
}
