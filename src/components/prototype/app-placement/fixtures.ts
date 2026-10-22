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
  parentId?: string;
  profile: WorkflowProfile;
};

// Same shape as the fake gateway's Workflow "House", so the title links the Active Profile to it.
function house(temperatureOffset: number, notes: string): WorkflowProfile {
  return {
    author: "Operator",
    beverage_type: "espresso",
    notes,
    steps: [
      { flow: 0, pressure: 0, seconds: 0, temperature: 92 + temperatureOffset },
      { flow: 2.5, pressure: 3, seconds: 5, temperature: 93 + temperatureOffset },
      { flow: 2.3, pressure: 8.5, seconds: 12, temperature: 93 + temperatureOffset },
      { flow: 1.2, pressure: 5.5, seconds: 24, temperature: 92.5 + temperatureOffset },
    ],
    title: "House",
    version: "2",
  };
}

const bundled = (bundledJson as Array<{ id: string; profile: WorkflowProfile }>).map(
  (entry): ProtoRecord => ({
    ...entry,
    createdAt: "2026-10-15T09:00:00Z",
    hidden: entry.id === "bundled:Gentle_and_sweet1",
    isDefault: true,
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

const operator: ProtoRecord[] = [
  {
    createdAt: "2026-09-02T08:10:00Z",
    hidden: true,
    id: "op:house-v1",
    isDefault: false,
    profile: house(0.5, "Baseline house espresso."),
  },
  {
    createdAt: "2026-10-12T07:40:00Z",
    id: "op:house-v2",
    isDefault: false,
    marker: "revision",
    parentId: "op:house-v1",
    // One degree hotter than the Workflow copy: the Brew temperature control has drifted it.
    profile: house(1, "Baseline house espresso."),
  },
  {
    createdAt: "2026-10-13T07:55:00Z",
    id: "op:house-decaf",
    isDefault: false,
    marker: "fork",
    parentId: "op:house-v2",
    profile: { ...house(2, "Decaf runs hotter."), title: "House decaf" },
  },
  {
    createdAt: "2026-10-16T08:20:00Z",
    id: "op:gentle-rev",
    isDefault: false,
    marker: "revision",
    parentId: "bundled:Gentle_and_sweet1",
    profile: nudgeSteps(bundledProfile("bundled:Gentle_and_sweet1"), -1),
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
  return records.filter((record) => !record.hidden);
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
