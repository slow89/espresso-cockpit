import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePresenceStore } from "@/stores/presence-store";

import { BridgeShellEffects } from "./bridge-shell-effects";

describe("BridgeShellEffects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signals presence on mount", async () => {
    vi.spyOn(usePresenceStore.getState(), "signalPresence").mockResolvedValue(undefined);
    render(<BridgeShellEffects />);

    await waitFor(() => {
      expect(usePresenceStore.getState().signalPresence).toHaveBeenCalled();
    });
  });
});
