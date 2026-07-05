import { beforeEach, describe, expect, it } from "vitest";

import { useShotAnalysisSettingsStore } from "./shot-analysis-store";

describe("shot analysis settings store", () => {
  beforeEach(() => {
    localStorage.clear();
    useShotAnalysisSettingsStore.setState({ apiKey: "" });
  });

  it("persists the trimmed API key to skin-local storage", () => {
    useShotAnalysisSettingsStore.getState().setApiKey("  sk-ant-test-key  ");

    expect(useShotAnalysisSettingsStore.getState().apiKey).toBe("sk-ant-test-key");
    expect(localStorage.getItem("espresso-cockpit-shot-analysis")).toContain("sk-ant-test-key");
  });

  it("clears the API key", () => {
    useShotAnalysisSettingsStore.getState().setApiKey("sk-ant-test-key");
    useShotAnalysisSettingsStore.getState().clearApiKey();

    expect(useShotAnalysisSettingsStore.getState().apiKey).toBe("");
    expect(localStorage.getItem("espresso-cockpit-shot-analysis")).not.toContain("sk-ant-test-key");
  });
});
