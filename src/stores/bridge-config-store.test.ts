import { beforeEach, describe, expect, it } from "vitest";

import { useBridgeConfigStore } from "./bridge-config-store";

describe("useBridgeConfigStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useBridgeConfigStore.setState({
      gatewayUrl: "http://localhost:8080",
    });
  });

  it("persists normalized gateway origins", () => {
    useBridgeConfigStore.getState().setGatewayUrl("http://bridge.local:8080/");

    expect(useBridgeConfigStore.getState().gatewayUrl).toBe("http://bridge.local:8080");
    expect(localStorage.getItem("espresso-cockpit-config")).toContain(
      "\"gatewayUrl\":\"http://bridge.local:8080\"",
    );
  });
});
