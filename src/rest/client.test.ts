import { beforeEach, describe, expect, it, vi } from "vitest";

import { BridgeClientError, createBridgeClient } from "./client";

describe("createBridgeClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("surfaces JSON REST error bodies from failed requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: "Bridge offline" }),
    } as Response);

    await expect(
      createBridgeClient("http://bridge.local:8080").getMachineState(),
    ).rejects.toEqual(
      expect.objectContaining<Partial<BridgeClientError>>({
        message: "Bridge offline",
        status: 500,
      }),
    );
  });

  it("falls back to plain-text REST error bodies", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "upstream timeout",
    } as Response);

    await expect(
      createBridgeClient("http://bridge.local:8080").getWorkflow(),
    ).rejects.toEqual(
      expect.objectContaining<Partial<BridgeClientError>>({
        message: "upstream timeout",
        status: 503,
      }),
    );
  });

  it("posts refill thresholds to the machine water levels endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 202,
      text: async () => "",
    } as Response);

    await createBridgeClient("http://bridge.local:8080").updateMachineWaterLevels({
      refillLevel: 15,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://bridge.local:8080/api/v1/machine/waterLevels",
      expect.objectContaining({
        body: JSON.stringify({ refillLevel: 15 }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
  });

  it("surfaces bridge errors when updating machine water levels fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: "Machine rejected refill level" }),
    } as Response);

    await expect(
      createBridgeClient("http://bridge.local:8080").updateMachineWaterLevels({
        refillLevel: 20,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<BridgeClientError>>({
        message: "Machine rejected refill level",
        status: 500,
      }),
    );
  });
});
