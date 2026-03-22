import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useWorkflowFrameChartStore,
  workflowFrameChartDefaultLaneVisibility,
  workflowFrameChartDefaultPreferences,
} from "@/stores/workflow-frame-chart-store";

import { FramePreviewOverlay } from "./frame-preview-overlay";

describe("FramePreviewOverlay", () => {
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

  it("updates the selected frame details when a different frame is chosen", () => {
    const { container } = render(
      <FramePreviewOverlay
        onClose={vi.fn()}
        profile={{
          author: "Codex",
          steps: [
            { pressure: 2, phase: "preinfusion" },
            { pressure: 8, phase: "pouring" },
          ],
          title: "Test Profile",
        }}
      />,
    );

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
    const { container } = render(
      <FramePreviewOverlay
        onClose={vi.fn()}
        profile={{
          steps: [{ pressure: 2, phase: "preinfusion" }],
          title: "JSON Profile",
        }}
      />,
    );

    const details = container.querySelector("details");

    expect(screen.getByText("Raw frame JSON")).toBeInTheDocument();
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("shows the chart empty state while keeping structured frame data for non-numeric frames", () => {
    render(
      <FramePreviewOverlay
        onClose={vi.fn()}
        profile={{
          steps: [{ phase: "soak", note: "hold" }],
          title: "Structured Only",
        }}
      />,
    );

    expect(
      screen.getAllByText("No numeric frame fields were found in this profile.").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("soak").length).toBeGreaterThan(0);
    expect(screen.getAllByText("hold").length).toBeGreaterThan(0);
  });
});
