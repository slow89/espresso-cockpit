// PROTOTYPE — throwaway. Builds a profile's history from the whole library (one
// `GET /api/v1/profiles?includeHidden=true`), not from `/lineage`, because `/lineage` leaves out
// Forks of earlier versions and can hang on a self-parent cycle.
// Wayfinder ticket: .scratch/profile-editor/issues/13-lineage-view.md
import type { WorkflowProfile } from "@/rest/types";

import { getTitle, type ProtoRecord } from "../app-placement/fixtures";
import { exitOf, limiterOf, limiterOn, num, pumpOf, stepName, type ProtoStep } from "./fields";

export type VersionState = "current" | "earlier" | "retired" | "removed";

export type Change = { label: string; stepIndex?: number };

export type Version = {
  changes: Change[];
  forks: ProtoRecord[];
  goBackBlocked: string | null;
  isBundled: boolean;
  record: ProtoRecord;
  state: VersionState;
};

export type Lineage = {
  current: ProtoRecord | null;
  origin: { label: string; record: ProtoRecord | null };
  // Newest first, by when each version was saved.
  versions: Version[];
};

const byId = (records: ProtoRecord[], id?: string) => records.find((record) => record.id === id);

export function stateOf(record: ProtoRecord): VersionState {
  if (record.deleted) return "removed";
  if (record.retired) return "retired";
  return record.hidden ? "earlier" : "current";
}

// The versions of one profile: records joined by Revision edges (the child carries the marker).
export function buildLineage(records: ProtoRecord[], start: ProtoRecord): Lineage {
  let root = start;
  while (root.marker === "revision" && byId(records, root.parentId)) {
    root = byId(records, root.parentId)!;
  }

  const chain: ProtoRecord[] = [];
  const queue = [root];
  while (queue.length) {
    const record = queue.shift()!;
    chain.push(record);
    queue.push(
      ...records.filter((child) => child.parentId === record.id && child.marker === "revision"),
    );
  }

  const parentOf = (record: ProtoRecord) =>
    record.marker === "revision" ? byId(records, record.parentId) : undefined;
  const versions = chain
    .map((record): Version => {
      const parent = parentOf(record);
      const state = stateOf(record);
      return {
        changes: parent ? diffProfiles(parent.profile, record.profile) : [],
        forks: records.filter((child) => child.parentId === record.id && child.marker === "fork"),
        goBackBlocked:
          state === "retired"
            ? "A Bridge update replaced this version; the Bridge hides it again at every launch"
            : null,
        isBundled: record.isDefault,
        record,
        state,
      };
    })
    .sort((left, right) => right.record.createdAt.localeCompare(left.record.createdAt));

  const forkParent = root.marker === "fork" ? byId(records, root.parentId) : undefined;
  const origin = forkParent
    ? {
        label: `Copied from ${getTitle(forkParent)}, version of ${formatWhen(forkParent.createdAt)}`,
        record: forkParent,
      }
    : root.isDefault
      ? { label: `Bundled with the Bridge as ${getTitle(root)}`, record: null }
      : { label: `Created ${formatWhen(root.createdAt)}`, record: null };

  return { current: chain.find((record) => stateOf(record) === "current") ?? null, origin, versions };
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

const fmt = (value: number) => String(Math.round(value * 100) / 100);

function stepFieldText(step: ProtoStep) {
  const pump = pumpOf(step);
  const exit = exitOf(step);
  const limiter = limiterOf(step);
  return {
    exit: exit ? `${exit.type} ${exit.condition} ${fmt(num(exit.value))}` : "off",
    limiter: limiterOn(step) ? `${fmt(num(limiter?.value))}` : "off",
    mode: pump,
    seconds: `${fmt(num(step.seconds))} s`,
    target: `${fmt(num(step[pump]))} ${pump === "pressure" ? "bar" : "mL/s"}`,
    temperature: `${fmt(num(step.temperature))} °C`,
    transition: String(step.transition ?? "fast"),
  };
}

// Steps are matched by name, then by position: a Step added in the middle doesn't make every later
// Step read as changed.
export function diffProfiles(before: WorkflowProfile, after: WorkflowProfile): Change[] {
  const beforeSteps = (before.steps ?? []) as ProtoStep[];
  const afterSteps = (after.steps ?? []) as ProtoStep[];
  const changes: Change[] = [];
  const used = new Set<number>();

  afterSteps.forEach((step, index) => {
    const name = stepName(step, index);
    let match = beforeSteps.findIndex(
      (candidate, candidateIndex) =>
        !used.has(candidateIndex) && stepName(candidate, candidateIndex) === name,
    );
    if (match < 0 && !used.has(index) && beforeSteps[index]) match = index;
    if (match < 0) {
      changes.push({ label: `Added Step ${index + 1} ${name}`, stepIndex: index });
      return;
    }
    used.add(match);
    const was = stepFieldText(beforeSteps[match]);
    const now = stepFieldText(step);
    (Object.keys(now) as Array<keyof typeof now>).forEach((key) => {
      if (was[key] !== now[key]) {
        changes.push({
          label: `${name} · ${key} ${was[key]} → ${now[key]}`,
          stepIndex: index,
        });
      }
    });
  });
  beforeSteps.forEach((step, index) => {
    if (!used.has(index)) changes.push({ label: `Removed Step ${index + 1} ${stepName(step, index)}` });
  });

  const profileFields: Array<[string, unknown, unknown]> = [
    ["Tank preheat", before.tank_temperature ?? 0, after.tank_temperature ?? 0],
    ["Stop at volume", before.target_volume ?? 0, after.target_volume ?? 0],
    ["Preinfusion Steps", before.target_volume_count_start ?? 0, after.target_volume_count_start ?? 0],
  ];
  profileFields.forEach(([label, was, now]) => {
    if (num(was) !== num(now)) changes.push({ label: `${label} ${fmt(num(was))} → ${fmt(num(now))}` });
  });

  // Collapse "every Step's temperature moved by the same amount" into one line.
  const temps = changes.filter((change) => change.label.includes("· temperature"));
  if (temps.length > 1 && temps.length === afterSteps.length) {
    const delta = num(afterSteps[0].temperature) - num(beforeSteps[0]?.temperature);
    return [
      { label: `Every Step ${delta > 0 ? "+" : ""}${fmt(delta)} °C` },
      ...changes.filter((change) => !temps.includes(change)),
    ];
  }
  return changes;
}

export function changedStepIndexes(changes: Change[]) {
  return new Set(changes.flatMap((change) => (change.stepIndex == null ? [] : [change.stepIndex])));
}
