import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkflowPageStore, workflowPageDefaultState } from "@/stores/workflow-page-store";

import { WorkflowsPage } from "./workflows-page";

const {
  useImportVisualizerProfileMutationMock,
  useProfilesQueryMock,
  useUpdateWorkflowMutationMock,
  useVisualizerSettingsQueryMock,
  useWorkflowQueryMock,
} = vi.hoisted(() => ({
  useImportVisualizerProfileMutationMock: vi.fn(),
  useProfilesQueryMock: vi.fn(),
  useUpdateWorkflowMutationMock: vi.fn(),
  useVisualizerSettingsQueryMock: vi.fn(),
  useWorkflowQueryMock: vi.fn(),
}));

vi.mock("@/rest/queries", async () => {
  const actual = await vi.importActual<typeof import("@/rest/queries")>("@/rest/queries");

  return {
    ...actual,
    useImportVisualizerProfileMutation: useImportVisualizerProfileMutationMock,
    useProfilesQuery: useProfilesQueryMock,
    useUpdateWorkflowMutation: useUpdateWorkflowMutationMock,
    useVisualizerSettingsQuery: useVisualizerSettingsQueryMock,
    useWorkflowQuery: useWorkflowQueryMock,
  };
});

describe("WorkflowsPage", () => {
  const updateWorkflowMutate = vi.fn();
  const importVisualizerProfileMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWorkflowPageStore.setState({
      ...workflowPageDefaultState,
    });

    useWorkflowQueryMock.mockReturnValue({
      data: {
        id: "workflow-1",
        name: "Morning",
        description: "Daily shot",
        profile: {
          title: "Active Profile",
          author: "Decent",
          beverage_type: "espresso",
          steps: [],
        },
        context: {
          targetDoseWeight: 18,
          targetYield: 36,
          grinderModel: "Niche Zero",
          grinderSetting: "5.2",
          coffeeName: "Red Brick",
          coffeeRoaster: "Square Mile",
        },
      },
    });
    useProfilesQueryMock.mockReturnValue({
      data: [
        {
          id: "profile:active",
          profile: {
            title: "Active Profile",
            author: "Decent",
            beverage_type: "espresso",
            steps: [],
          },
          visibility: "visible",
          isDefault: true,
        },
        {
          id: "profile:other",
          profile: {
            title: "Turbo",
            author: "Decent",
            beverage_type: "espresso",
            steps: [{ seconds: 10 }],
          },
          visibility: "visible",
          isDefault: false,
        },
      ],
    });
    useUpdateWorkflowMutationMock.mockReturnValue({
      isPending: false,
      mutate: updateWorkflowMutate,
    });
    useImportVisualizerProfileMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: importVisualizerProfileMutateAsync.mockResolvedValue({
        profileTitle: "Imported Profile",
        success: true,
      }),
    });
    useVisualizerSettingsQueryMock.mockReturnValue({
      data: {
        AutoUpload: true,
        Password: "secret",
        Username: "brew-user",
      },
      isPending: false,
    });
  });

  it("imports from visualizer and removes bundled restore controls", async () => {
    render(<WorkflowsPage />);

    fireEvent.change(screen.getByLabelText("Share code"), {
      target: { value: "AB12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => {
      expect(importVisualizerProfileMutateAsync).toHaveBeenCalledWith("AB12");
    });

    expect(screen.getByText("Imported Imported Profile.")).toBeInTheDocument();
    expect(screen.queryByText("Import JSON")).not.toBeInTheDocument();
    expect(screen.queryByText("Export JSON")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Bundled filename")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restore Default" })).not.toBeInTheDocument();
  });

  it("shows setup guidance when visualizer is not enabled", () => {
    useVisualizerSettingsQueryMock.mockReturnValue({
      data: {
        AutoUpload: false,
        Password: "secret",
        Username: "brew-user",
      },
      isPending: false,
    });

    render(<WorkflowsPage />);

    expect(screen.getByText("Enable Visualizer in Setup.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });
});
