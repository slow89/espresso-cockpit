import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildFramePreviewData } from "@/lib/workflow-frame-preview";
import {
  useWorkflowFrameChartStore,
  workflowFrameChartDefaultLaneVisibility,
  workflowFrameChartDefaultPreferences,
} from "@/stores/workflow-frame-chart-store";

import { WorkflowFrameChart } from "./workflow-frame-chart";

const preview = buildFramePreviewData({
  steps: [
    {
      pressure: 2,
      flow: 1.1,
      temperature: 92.4,
      seconds: 4,
      phase: "preinfusion",
    },
    {
      pressure: 8,
      flow: 2.4,
      temperature: 93.1,
      seconds: 8,
      phase: "pouring",
    },
  ],
});

describe("WorkflowFrameChart", () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkflowFrameChartStore.setState({
      ...workflowFrameChartDefaultPreferences,
      laneVisibility: {
        ...workflowFrameChartDefaultLaneVisibility,
      },
      selectedSeriesIds: [],
    });
  });

  it("renders the compact tablet layout and opens the config overlay", () => {
    render(
      <WorkflowFrameChart
        layout="tablet"
        onSelectFrame={vi.fn()}
        preview={preview}
        selectedFrameIndex={0}
      />,
    );

    expect(screen.getByText("Frame")).toBeInTheDocument();
    expect(screen.getByLabelText("Open chart controls")).toBeInTheDocument();
    expect(screen.queryByText("Configuration")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Open chart controls"));

    expect(screen.getByTestId("workflow-frame-config-overlay")).toBeInTheDocument();

    fireEvent.click(screen.getByText("All series"));

    expect(useWorkflowFrameChartStore.getState().activePreset).toBe("all-series");
  });

  it("renders the desktop config panel and updates selection from pointer movement", () => {
    const onSelectFrame = vi.fn();
    const { container } = render(
      <WorkflowFrameChart
        layout="desktop"
        onSelectFrame={onSelectFrame}
        preview={preview}
        selectedFrameIndex={1}
      />,
    );

    expect(screen.getByText("Configuration")).toBeInTheDocument();

    const overlay = container.querySelector('rect[fill="transparent"]');

    expect(overlay).not.toBeNull();

    Object.defineProperty(overlay, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 358,
        height: 358,
        left: 0,
        right: 1154,
        top: 0,
        width: 1154,
        x: 0,
        y: 0,
        toJSON: () => undefined,
      }),
    });

    fireEvent.pointerMove(overlay!, {
      clientX: 0,
      clientY: 120,
    });

    expect(onSelectFrame).toHaveBeenCalledWith(0);
  });
});
