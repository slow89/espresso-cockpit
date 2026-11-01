// PROTOTYPE — throwaway. Library fixture for the app-placement prototype.
// The 73 Bundled Profiles the operator's Bridge ships (decaid `assets/defaultProfiles`, numbers
// normalised), plus a few operator Revisions and Forks so list grouping can be judged.
// Wayfinder ticket: .scratch/profile-editor/issues/09-app-placement-and-entry-points.md
import type { WorkflowProfile } from "@/rest/types";

import bundledJson from "./bundled-profiles.json";

export type ProtoRecord = {
  createdAt: string;
  hidden?: boolean;
  id: string;
  isDefault: boolean;
  marker?: "fork" | "revision";
  // Prototype stand-ins for what the Skin infers (ticket 11): deleted visibility, Bridge-retired.
  deleted?: boolean;
  retired?: boolean;
  parentId?: string;
  profile: WorkflowProfile;
};

// PROTOTYPE (ticket 13) — lineage fixtures. Each House save below is a Profile Revision of the one
// before it; the Londonium and Gentle chains start from Bundled Profiles.
type Step = Record<string, unknown>;

const fill = (temperature: number, flow = 4): Step => ({
  exit: { condition: "over", type: "pressure", value: 3 },
  flow,
  name: "Fill",
  pressure: 0,
  pump: "flow",
  seconds: 15,
  sensor: "coffee",
  temperature,
  transition: "fast",
});
const soak = (temperature: number, seconds = 8): Step => ({
  flow: 0,
  name: "Soak",
  pressure: 3,
  pump: "pressure",
  seconds,
  sensor: "coffee",
  temperature,
  transition: "fast",
});
const pour = (temperature: number, pressure = 8.5): Step => ({
  flow: 0,
  limiter: { range: 0.6, value: 3.5 },
  name: "Pour",
  pressure,
  pump: "pressure",
  seconds: 25,
  sensor: "coffee",
  temperature,
  transition: "smooth",
});
const decline = (temperature: number): Step => ({
  flow: 0,
  name: "Decline",
  pressure: 6,
  pump: "pressure",
  seconds: 20,
  sensor: "coffee",
  temperature,
  transition: "smooth",
});

function house(steps: Step[], notes = "Baseline house espresso."): WorkflowProfile {
  return {
    author: "Operator",
    beverage_type: "espresso",
    notes,
    steps: steps as WorkflowProfile["steps"],
    target_volume_count_start: 2,
    title: "House",
    version: "2",
  } as WorkflowProfile;
}

const retiredGentleId = "bundled:Gentle_and_sweet1";

const bundled = (bundledJson as Array<{ id: string; profile: WorkflowProfile }>).map(
  (entry): ProtoRecord => ({
    ...entry,
    createdAt: "2026-09-01T09:00:00Z",
    // Londonium is superseded by the operator's Revision; Gentle & sweet's old version was retired
    // by the Bridge update that shipped `bundled:Gentle_and_sweet2` below.
    hidden: entry.id === retiredGentleId || entry.id === "bundled:Londonium",
    isDefault: true,
    retired: entry.id === retiredGentleId,
  }),
);

function bundledProfile(id: string) {
  const record = bundled.find((entry) => entry.id === id);

  if (!record) {
    throw new Error(`Missing bundled fixture ${id}`);
  }

  return record.profile;
}

function nudgeSteps(profile: WorkflowProfile, temperatureDelta: number): WorkflowProfile {
  return {
    ...profile,
    steps: profile.steps?.map((step) => ({
      ...step,
      temperature: Number(step.temperature ?? 92) + temperatureDelta,
    })),
  };
}

const gentle = bundledProfile(retiredGentleId);

const operator: ProtoRecord[] = [
  {
    createdAt: "2026-09-02T08:10:00Z",
    hidden: true,
    id: "op:house-v1",
    isDefault: false,
    profile: house([fill(92), soak(92), pour(92)]),
  },
  {
    createdAt: "2026-10-12T07:40:00Z",
    hidden: true,
    id: "op:house-v2",
    isDefault: false,
    marker: "revision",
    parentId: "op:house-v1",
    profile: house([fill(92), soak(92), pour(92, 9)]),
  },
  {
    createdAt: "2026-10-13T07:55:00Z",
    id: "op:house-decaf",
    isDefault: false,
    marker: "fork",
    parentId: "op:house-v2",
    profile: { ...house([fill(94), soak(94), pour(94, 9)], "Decaf runs hotter."), title: "House decaf" },
  },
  {
    createdAt: "2026-10-20T08:02:00Z",
    hidden: true,
    id: "op:house-v3",
    isDefault: false,
    marker: "revision",
    parentId: "op:house-v2",
    profile: house([fill(93), soak(93), pour(93, 9)]),
  },
  {
    createdAt: "2026-10-29T07:31:00Z",
    hidden: true,
    id: "op:house-v4",
    isDefault: false,
    marker: "revision",
    parentId: "op:house-v3",
    profile: house([fill(93), soak(93, 12), pour(93, 9), decline(92)]),
  },
  {
    createdAt: "2026-10-31T08:12:00Z",
    id: "op:house-v5",
    isDefault: false,
    marker: "revision",
    parentId: "op:house-v4",
    profile: house([fill(93, 3), soak(93, 12), pour(93, 9), decline(92)]),
  },
  {
    createdAt: "2026-10-18T08:05:00Z",
    id: "op:londonium-slow",
    isDefault: false,
    marker: "fork",
    parentId: "bundled:Londonium",
    profile: {
      ...nudgeSteps(bundledProfile("bundled:Londonium"), 0.5),
      author: "Operator",
      title: "Londonium slow ramp",
    },
  },
  {
    createdAt: "2026-10-19T07:20:00Z",
    hidden: true,
    id: "op:londonium-r1",
    isDefault: false,
    marker: "revision",
    parentId: "bundled:Londonium",
    profile: nudgeSteps(bundledProfile("bundled:Londonium"), -1),
  },
  {
    createdAt: "2026-10-25T07:48:00Z",
    id: "op:londonium-r2",
    isDefault: false,
    marker: "revision",
    parentId: "op:londonium-r1",
    profile: nudgeSteps(bundledProfile("bundled:Londonium"), -1.5),
  },
  {
    createdAt: "2026-10-16T08:20:00Z",
    id: "op:gentle-rev",
    isDefault: false,
    marker: "revision",
    parentId: retiredGentleId,
    profile: nudgeSteps(gentle, -1),
  },
  {
    // The Bridge update's new Bundled version: visible, new id, same title as the operator's Revision.
    createdAt: "2026-10-28T06:00:00Z",
    id: "bundled:Gentle_and_sweet2",
    isDefault: true,
    profile: nudgeSteps(gentle, 0.5),
  },
];

export const initialLibrary: ProtoRecord[] = [...operator, ...bundled];

export function getTitle(record: ProtoRecord) {
  return record.profile.title?.trim() || "Untitled profile";
}

export type BeverageFilter = "all" | "yours" | "espresso" | "pourover" | "other";

export function matchesFilter(record: ProtoRecord, filter: BeverageFilter) {
  const beverage = record.profile.beverage_type ?? "espresso";

  switch (filter) {
    case "all":
      return true;
    case "yours":
      return !record.isDefault;
    case "espresso":
    case "pourover":
      return beverage === filter;
    case "other":
      return beverage !== "espresso" && beverage !== "pourover";
  }
}

// Content the machine runs, used only to decide "Differs from saved". Prototype simplification.
export function runsKey(profile: WorkflowProfile | undefined) {
  return JSON.stringify({
    beverage_type: profile?.beverage_type,
    steps: profile?.steps,
    tank_temperature: profile?.tank_temperature ?? 0,
    target_volume: profile?.target_volume ?? 0,
  });
}

export function visibleRecords(records: ProtoRecord[]) {
  return records.filter((record) => !record.hidden && !record.deleted);
}

export function byTitle(left: ProtoRecord, right: ProtoRecord) {
  return getTitle(left).localeCompare(getTitle(right));
}

// "Yours" first, then Bundled, each alphabetical.
export function yoursThenBundled(records: ProtoRecord[]) {
  const visible = visibleRecords(records);

  return {
    bundled: visible.filter((record) => record.isDefault).sort(byTitle),
    yours: visible.filter((record) => !record.isDefault).sort(byTitle),
  };
}

export function describeOrigin(record: ProtoRecord, records: ProtoRecord[]) {
  const parent = records.find((entry) => entry.id === record.parentId);

  if (!parent) {
    return null;
  }

  if (record.marker === "fork") {
    return `Copy of ${getTitle(parent)}`;
  }

  return parent.isDefault ? "Revised from Bundled" : null;
}
