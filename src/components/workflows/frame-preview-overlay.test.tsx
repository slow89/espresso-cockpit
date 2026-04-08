import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  useWorkflowFrameChartStore,
  workflowFrameChartDefaultLaneVisibility,
  workflowFrameChartDefaultPreferences,
} from "@/stores/workflow-frame-chart-store";
import { useWorkflowPageStore, workflowPageDefaultState } from "@/stores/workflow-page-store";

import { FramePreviewOverlay } from "./frame-preview-overlay";

describe("FramePreviewOverlay", () => {
  function openFramePreview() {
    useWorkflowPageStore.setState({
      ...workflowPageDefaultState,
      framePreviewProfile: {
        author: "Codex",
        steps: [
          { pressure: 2, phase: "preinfusion" },
          { pressure: 8, phase: "pouring" },
        ],
        title: "Test Profile",
      },
    });
  }

  beforeEach(() => {
    localStorage.clear();
    useWorkflowFrameChartStore.setState({
      ...workflowFrameChartDefaultPreferences,
      laneVisibility: {
        ...workflowFrameChartDefaultLaneVisibility,
      },
      selectedSeriesIds: [],
    });
    useWorkflowPageStore.setState({
      ...workflowPageDefaultState,
    });
  });

  it("updates the selected frame details when a different frame is chosen", () => {
    openFramePreview();

    const { container } = render(<FramePreviewOverlay />);

    expect(screen.getAllByText("preinfusion").length).toBeGreaterThan(0);

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
      clientX: 1154,
      clientY: 120,
    });

    expect(screen.getAllByText("pouring").length).toBeGreaterThan(0);
  });

  it("keeps raw frame json collapsed by default on tablet/mobile layout", () => {
    useWorkflowPageStore.setState({
      ...workflowPageDefaultState,
      framePreviewProfile: {
        steps: [{ pressure: 2, phase: "preinfusion" }],
        title: "JSON Profile",
      },
    });

    const { container } = render(<FramePreviewOverlay />);

    expect(screen.getByText("Raw frame")).toBeInTheDocument();
    expect(container.querySelector("details")).toBeNull();
  });

  it("shows the chart empty state while keeping structured frame data for non-numeric frames", () => {
    useWorkflowPageStore.setState({
      ...workflowPageDefaultState,
      framePreviewProfile: {
        steps: [{ phase: "soak", note: "hold" }],
        title: "Structured Only",
      },
    });

    render(<FramePreviewOverlay />);

    expect(
      screen.getAllByText("No numeric frame fields were found in this profile.").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("soak").length).toBeGreaterThan(0);
    expect(screen.getAllByText("hold").length).toBeGreaterThan(0);
  });
});
