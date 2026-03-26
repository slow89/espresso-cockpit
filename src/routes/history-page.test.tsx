import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HistoryPage } from "./history-page";

const queryMocks = vi.hoisted(() => ({
  useShotQuery: vi.fn(),
  useShotsQuery: vi.fn(),
}));

vi.mock("@/rest/queries", () => ({
  useShotQuery: queryMocks.useShotQuery,
  useShotsQuery: queryMocks.useShotsQuery,
}));

vi.mock("@/components/telemetry-chart", () => ({
  TelemetryChart: ({ data }: { data: Array<unknown> }) => (
    <div data-testid="telemetry-chart">{`samples:${data.length}`}</div>
  ),
}));

const summaryShots = [
  {
    id: "shot-1",
    timestamp: "2026-03-21T22:01:57.867775",
    workflow: {
      name: "Workflow A",
      profile: {
        title: "Adaptive v2",
      },
      context: {
        coffeeName: "House espresso",
        targetDoseWeight: 20,
        targetYield: 38,
      },
    },
  },
  {
    id: "shot-2",
    timestamp: "2026-03-21T21:52:54.865651",
    workflow: {
      name: "Workflow B",
      profile: {
        title: "Soup 58",
      },
      context: {
        coffeeName: "Guest roast",
        targetDoseWeight: 19,
        targetYield: 42,
      },
    },
  },
] as const;

const shotDetails = {
  "shot-1": {
    id: "shot-1",
    timestamp: "2026-03-21T22:01:57.867775",
    measurements: [
      buildMeasurement("2026-03-21T22:01:57.867775", "espresso", "preparingForShot", 0, null),
      buildMeasurement("2026-03-21T22:01:58.867775", "espresso", "pouring", 2, 1200),
    ],
    workflow: {
      name: "Workflow A",
      profile: {
        title: "Adaptive v2",
        author: "Decent",
        beverage_type: "espresso",
        notes: "Profile notes",
        steps: [{ name: "Pour", flow: 3 }],
      },
      context: {
        coffeeName: "House espresso",
        targetDoseWeight: 20,
        targetYield: 38,
      },
      steamSettings: {
        targetTemperature: 150,
        duration: 50,
        flow: 0.8,
      },
      rinseData: {
        duration: 5,
        flow: 6,
      },
      hotWaterData: {
        targetTemperature: 75,
        volume: 50,
      },
    },
  },
  "shot-2": {
    id: "shot-2",
    timestamp: "2026-03-21T21:52:54.865651",
    measurements: [
      buildMeasurement("2026-03-21T21:52:54.865651", "espresso", "preparingForShot", 0, null),
    ],
    workflow: {
      name: "Workflow B",
      profile: {
        title: "Soup 58",
        author: "Joe D.",
        beverage_type: "espresso",
        notes: "Different notes",
        steps: [{ name: "Bloom", flow: 2 }],
      },
      context: {
        coffeeName: "Guest roast",
        targetDoseWeight: 19,
        targetYield: 42,
      },
      steamSettings: {
        targetTemperature: 150,
        duration: 50,
        flow: 0.8,
      },
      rinseData: {
        duration: 10,
        flow: 6,
      },
      hotWaterData: {
        targetTemperature: 75,
        volume: 50,
      },
    },
  },
} as const;

describe("HistoryPage", () => {
  const onSelectShotId = vi.fn();

  beforeEach(() => {
    onSelectShotId.mockReset();

    queryMocks.useShotsQuery.mockReturnValue({
      data: {
        items: summaryShots,
        total: 2,
        limit: 20,
        offset: 0,
      },
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });

    queryMocks.useShotQuery.mockImplementation((id: string | null | undefined) => ({
      data: id ? shotDetails[id as keyof typeof shotDetails] : undefined,
      isFetching: false,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    }));
  });

  it("auto-selects the latest shot and renders the telemetry workspace", () => {
    render(<HistoryPage />);

    expect(screen.getAllByText("Adaptive v2").length).toBeGreaterThan(0);
    expect(screen.getByTestId("telemetry-chart")).toHaveTextContent("samples:2");
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("1.2s")).toBeInTheDocument();
    expect(screen.getByText("Yield")).toBeInTheDocument();
    expect(screen.getByText("2.0 g")).toBeInTheDocument();
    expect(screen.queryByText(/^\d+\s+samples$/i)).not.toBeInTheDocument();
  });

  it("updates the detail workspace when another shot is selected", () => {
    render(<HistoryPage onSelectShotId={onSelectShotId} selectedShotId="shot-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Soup 58/i }));

    expect(onSelectShotId).toHaveBeenCalledWith("shot-2");
  });

  it("keeps the shell usable when the list is empty", () => {
    queryMocks.useShotsQuery.mockReturnValueOnce({
      data: {
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      },
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<HistoryPage />);

    expect(screen.getByText("No shots have been synced yet.")).toBeInTheDocument();
    expect(screen.getByText("Select a shot")).toBeInTheDocument();
  });

  it("keeps the shell usable when shot detail fails to load", () => {
    queryMocks.useShotQuery.mockImplementation(() => ({
      data: undefined,
      isFetching: false,
      isPending: false,
      error: new Error("Detail failed"),
      refetch: vi.fn(),
    }));

    render(<HistoryPage />);

    expect(screen.getByText("Unable to load shot detail")).toBeInTheDocument();
    expect(screen.getByText("Detail failed")).toBeInTheDocument();
  });
});

function buildMeasurement(
  timestamp: string,
  state: string,
  substate: string,
  weight: number,
  timerValue: number | null,
) {
  return {
    machine: {
      timestamp,
      state: {
        state,
        substate,
      },
      flow: 2.5,
      pressure: 8.2,
      targetFlow: 2.5,
      targetPressure: 8.5,
      mixTemperature: 93,
      groupTemperature: 92.2,
      targetMixTemperature: 93,
      targetGroupTemperature: 93,
      profileFrame: 1,
      steamTemperature: 140,
    },
    scale: {
      timestamp,
      weight,
      weightFlow: 1.8,
      timerValue,
    },
    volume: 0,
  };
}
