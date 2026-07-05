import { beforeEach, describe, expect, it } from "vitest";

import { applyShotAnalysisProvision } from "./shot-analysis-provisioning";
import { useShotAnalysisSettingsStore } from "@/stores/shot-analysis-store";

describe("applyShotAnalysisProvision", () => {
  beforeEach(() => {
    useShotAnalysisSettingsStore.setState({
      apiKey: "",
      baseUrl: "",
      model: "",
      provider: "anthropic",
      provisionStamp: "",
    });
  });

  it("applies a deploy payload to the store", () => {
    const applied = applyShotAnalysisProvision({
      apiKey: "sk-ant-deployed",
      baseUrl: "",
      model: "",
      provider: "anthropic",
    });

    const state = useShotAnalysisSettingsStore.getState();

    expect(applied).toBe(true);
    expect(state.apiKey).toBe("sk-ant-deployed");
    expect(state.provider).toBe("anthropic");
    expect(state.provisionStamp).not.toBe("");
  });

  it("applies each payload once, preserving later manual edits", () => {
    const payload = {
      apiKey: "sk-ant-deployed",
      baseUrl: "",
      model: "",
      provider: "anthropic",
    };

    expect(applyShotAnalysisProvision(payload)).toBe(true);

    useShotAnalysisSettingsStore.getState().setModel("claude-sonnet-4-6");

    expect(applyShotAnalysisProvision(payload)).toBe(false);
    expect(useShotAnalysisSettingsStore.getState().model).toBe("claude-sonnet-4-6");
  });

  it("re-applies when the deploy payload changes, e.g. a rotated key", () => {
    applyShotAnalysisProvision({ apiKey: "sk-ant-old", provider: "anthropic" });
    applyShotAnalysisProvision({ apiKey: "sk-ant-rotated", provider: "anthropic" });

    expect(useShotAnalysisSettingsStore.getState().apiKey).toBe("sk-ant-rotated");
  });

  it("supports OpenAI-compatible payloads", () => {
    const applied = applyShotAnalysisProvision({
      baseUrl: "http://192.168.68.20:11434/v1",
      model: "llama3.3:70b",
      provider: "openai-compatible",
    });

    const state = useShotAnalysisSettingsStore.getState();

    expect(applied).toBe(true);
    expect(state.provider).toBe("openai-compatible");
    expect(state.baseUrl).toBe("http://192.168.68.20:11434/v1");
    expect(state.apiKey).toBe("");
  });

  it("ignores malformed payloads", () => {
    expect(applyShotAnalysisProvision({ provider: "not-a-provider" })).toBe(false);
    expect(applyShotAnalysisProvision("nonsense")).toBe(false);
    expect(useShotAnalysisSettingsStore.getState().apiKey).toBe("");
  });
});
