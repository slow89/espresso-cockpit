import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkflowShotSetupPanel } from "./workflow-shot-setup-panel";

const queryMocks = vi.hoisted(() => ({
  useUpdateWorkflowMutation: vi.fn(),
  useWorkflowQuery: vi.fn(),
}));

vi.mock("@/rest/queries", async () => {
  const actual = await vi.importActual<typeof import("@/rest/queries")>("@/rest/queries");

  return {
    ...actual,
    useUpdateWorkflowMutation: queryMocks.useUpdateWorkflowMutation,
    useWorkflowQuery: queryMocks.useWorkflowQuery,
  };
});

describe("WorkflowShotSetupPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    queryMocks.useWorkflowQuery.mockReturnValue({
      data: {
        context: {
          coffeeName: "Sweet Bloom",
          coffeeRoaster: "Passenger",
          grinderModel: "Lagom Mini",
          grinderSetting: "4.2",
          targetDoseWeight: 18,
          targetYield: 36,
        },
        description: "Dial-in",
        name: "Morning spro",
      },
    });
    queryMocks.useUpdateWorkflowMutation.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
  });

  it("renders dose and yield controls in a compact inline row", () => {
    render(<WorkflowShotSetupPanel />);

    expect(screen.getByText("Dose")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decrease Dose" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase Dose" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "16g" })).toBeInTheDocument();
    expect(screen.getAllByText("18g")).toHaveLength(2);

    expect(screen.getByText("Yield")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decrease Yield" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase Yield" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1:2.0" })).toBeInTheDocument();
    expect(screen.getByText("36g")).toBeInTheDocument();

    expect(screen.getByDisplayValue("Morning spro")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dial-in")).toBeInTheDocument();
  });
});
