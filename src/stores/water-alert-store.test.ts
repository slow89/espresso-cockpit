import { beforeEach, describe, expect, it } from "vitest";

import { useWaterAlertStore } from "./water-alert-store";

describe("useWaterAlertStore", () => {
  beforeEach(() => {
    useWaterAlertStore.setState({
      dismissed: false,
    });
  });

  it("marks the current alert as dismissed", () => {
    useWaterAlertStore.getState().dismiss();

    expect(useWaterAlertStore.getState()).toMatchObject({
      dismissed: true,
    });
  });

  it("clears dismissal when the alert recovers", () => {
    useWaterAlertStore.getState().dismiss();

    useWaterAlertStore.getState().resetDismiss();

    expect(useWaterAlertStore.getState()).toMatchObject({
      dismissed: false,
    });
  });
});
