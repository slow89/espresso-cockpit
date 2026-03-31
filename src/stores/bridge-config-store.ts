import { create } from "zustand";
import { persist } from "zustand/middleware";

import { env } from "@/lib/env";
import { normalizeGatewayUrl } from "@/rest/client";

function getDefaultGatewayUrl() {
  if (typeof window !== "undefined" && window.location.port === "8080") {
    return window.location.origin;
  }

  return env.VITE_BRIDGE_URL ?? "http://localhost:8080";
}

interface BridgeConfigState {
  gatewayUrl: string;
  setGatewayUrl: (url: string) => void;
}

export const useBridgeConfigStore = create<BridgeConfigState>()(
  persist(
    (set) => ({
      gatewayUrl: normalizeGatewayUrl(getDefaultGatewayUrl()),
      setGatewayUrl: (url) =>
        set({
          gatewayUrl: normalizeGatewayUrl(url),
        }),
    }),
    {
      name: "espresso-cockpit-config",
    },
  ),
);
