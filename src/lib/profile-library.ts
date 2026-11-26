import { getProfileTitle } from "@/lib/workflow-utils";
import type {
  BundledManifestEntry,
  DeviceSummary,
  MachineState,
  ProfileRecord,
  WorkflowProfile,
} from "@/rest/types";

/**
 * The namespaced `metadata` key a Profile Revision carries. It's written in the same `POST` that
 * creates the Revision and never edited, so it tells a replaced version from a hidden one.
 */
export const REVISION_MARKER_KEY = "cockpit.revision";

export type RecordClass = "visible" | "removed" | "retired" | "superseded";

export type ProfileLibrary = {
  childrenOf: (id: string) => ProfileRecord[];
  classOf: (id: string) => RecordClass | undefined;
  recordById: (id: string | null | undefined) => ProfileRecord | undefined;
  visible: ProfileRecord[];
};

export type LibraryChip = "all" | "yours" | "espresso" | "pourover" | "other";

export type LibraryRow = {
  depth: number;
  record: ProfileRecord;
};

/** `unknown` means the library or the Workflow couldn't be read, so nothing can be said yet. */
export type ActiveProfileLink = {
  record: ProfileRecord | null;
  status: "unknown" | "none" | "not-saved" | "saved" | "differs";
};

/** What the busy gate reads: the Bridge's reported state, or why there isn't one. */
export type MachineReading = MachineState | "no-machine" | "unreadable";

type UseAction =
  | { kind: "load" }
  | { kind: "loaded" }
  | { kind: "blocked"; reason: string }
  | { kind: "confirm"; message: string };

type RecordDescription = {
  meta: string;
  notes: string | null;
  origin: "Bundled" | "Yours";
  title: string;
};

export const libraryChips: ReadonlyArray<{ key: LibraryChip; label: string }> = [
  { key: "all", label: "All" },
  { key: "yours", label: "Yours" },
  { key: "espresso", label: "Espresso" },
  { key: "pourover", label: "Pour-over" },
  { key: "other", label: "Other" },
];

const chipMatchers: Record<LibraryChip, (record: ProfileRecord) => boolean> = {
  all: () => true,
  yours: (record) => !record.isDefault,
  espresso: (record) => record.profile.beverage_type === "espresso",
  pourover: (record) => record.profile.beverage_type === "pourover",
  other: (record) =>
    record.profile.beverage_type !== "espresso" && record.profile.beverage_type !== "pourover",
};

function hasRevisionMarker(record: ProfileRecord) {
  return Boolean(record.metadata?.[REVISION_MARKER_KEY]);
}

/** The `manifest` is null or undefined when `/profiles/defaults` couldn't be read. */
export function buildProfileLibrary(
  records: ProfileRecord[],
  manifest: BundledManifestEntry[] | null | undefined,
): ProfileLibrary {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const children = new Map<string, ProfileRecord[]>();

  for (const record of records) {
    if (record.parentId) {
      children.set(record.parentId, [...(children.get(record.parentId) ?? []), record]);
    }
  }

  const childrenOf = (id: string) => children.get(id) ?? [];
  const isRetired = createRetiredCheck(records, manifest);
  const classes = new Map(
    records.map((record) => [record.id, classifyRecord(record, childrenOf, isRetired)]),
  );

  return {
    childrenOf,
    classOf: (id) => classes.get(id),
    recordById: (id) => (id ? recordsById.get(id) : undefined),
    visible: records.filter((record) => classes.get(record.id) === "visible"),
  };
}

function classifyRecord(
  record: ProfileRecord,
  childrenOf: (id: string) => ProfileRecord[],
  isRetired: (record: ProfileRecord) => boolean,
): RecordClass {
  if (record.visibility == null || record.visibility === "visible") {
    return "visible";
  }

  if (record.visibility === "deleted") {
    return "removed";
  }

  if (isRetired(record)) {
    return "retired";
  }

  if (hasRevisionMarker(record) || childrenOf(record.id).some(hasRevisionMarker)) {
    return "superseded";
  }

  return "removed";
}

function createRetiredCheck(
  records: ProfileRecord[],
  manifest: BundledManifestEntry[] | null | undefined,
) {
  const shippedFilenames = manifest ? new Set(manifest.map((entry) => entry.filename)) : null;
  const newestByFilename = new Map<string, number>();

  for (const record of records) {
    const filename = getBundledFilename(record);

    if (filename) {
      newestByFilename.set(
        filename,
        Math.max(newestByFilename.get(filename) ?? -Infinity, getCreatedAtMs(record)),
      );
    }
  }

  return (record: ProfileRecord) => {
    const filename = getBundledFilename(record);

    if (!filename) {
      return false;
    }

    if (shippedFilenames && !shippedFilenames.has(filename)) {
      return true;
    }

    return (newestByFilename.get(filename) ?? -Infinity) > getCreatedAtMs(record);
  };
}

function getBundledFilename(record: ProfileRecord) {
  const filename = record.isDefault ? record.metadata?.filename : null;

  return typeof filename === "string" && filename ? filename : null;
}

/** A missing or unreadable `createdAt` sorts as the oldest. */
function getCreatedAtMs(record: ProfileRecord) {
  const createdAtMs = Date.parse(record.createdAt ?? "");

  return Number.isNaN(createdAtMs) ? -Infinity : createdAtMs;
}

/**
 * The rows the list shows for a chip: the operator's profiles, then Bundled Profiles, each
 * alphabetical, with every Profile Fork directly under the visible version it was copied from.
 */
export function listLibraryRows(library: ProfileLibrary, chip: LibraryChip): LibraryRow[] {
  const matching = library.visible.filter(chipMatchers[chip]);
  const matchingIds = new Set(matching.map((record) => record.id));
  const homes = new Map<string, string>();

  for (const record of matching) {
    const home = findForkHome(library, record);

    if (home && matchingIds.has(home.id)) {
      homes.set(record.id, home.id);
    }
  }

  const isNested = (id: string) => homes.has(id) && !isInHomeCycle(id, homes);
  const nestedUnder = new Map<string, ProfileRecord[]>();

  for (const record of matching) {
    const home = homes.get(record.id);

    if (home && isNested(record.id)) {
      nestedUnder.set(home, [...(nestedUnder.get(home) ?? []), record]);
    }
  }

  const rows: LibraryRow[] = [];
  const appendRow = (record: ProfileRecord, depth: number) => {
    rows.push({ depth, record });

    for (const child of [...(nestedUnder.get(record.id) ?? [])].sort(compareForList)) {
      appendRow(child, depth + 1);
    }
  };

  for (const record of matching.filter((entry) => !isNested(entry.id)).sort(compareForList)) {
    appendRow(record, 0);
  }

  return rows;
}

function compareYoursFirst(left: ProfileRecord, right: ProfileRecord) {
  return Number(Boolean(left.isDefault)) - Number(Boolean(right.isDefault));
}

function compareForList(left: ProfileRecord, right: ProfileRecord) {
  return (
    compareYoursFirst(left, right) ||
    getProfileTitle(left.profile).localeCompare(getProfileTitle(right.profile), undefined, {
      numeric: true,
      sensitivity: "base",
    }) ||
    left.id.localeCompare(right.id)
  );
}

/** Corrupt lineage can make Forks each other's parents. Those rows stay at the top level. */
function isInHomeCycle(id: string, homes: Map<string, string>) {
  const seen = new Set<string>();
  let current = homes.get(id);

  while (current && !seen.has(current)) {
    if (current === id) {
      return true;
    }

    seen.add(current);
    current = homes.get(current);
  }

  return false;
}

/** The record a Fork nests under. Null when the record isn't a Fork or has nowhere to go. */
function findForkHome(library: ProfileLibrary, record: ProfileRecord) {
  const forkSource = findForkSource(library, record);

  return forkSource ? findVisibleVersion(library, forkSource, record) : null;
}

/** A Fork stays one through its own Revisions, so this reads from the start of its lineage. */
function findForkSource(library: ProfileLibrary, record: ProfileRecord) {
  const root = findRevisionRoot(library, record);

  if (root.isDefault || hasRevisionMarker(root)) {
    return null;
  }

  return library.recordById(root.parentId) ?? null;
}

function findRevisionRoot(library: ProfileLibrary, record: ProfileRecord) {
  const seen = new Set([record.id]);
  let root = record;

  while (hasRevisionMarker(root)) {
    const parent = library.recordById(root.parentId);

    if (!parent || seen.has(parent.id)) {
      break;
    }

    seen.add(parent.id);
    root = parent;
  }

  return root;
}

/** The visible version of a profile, following Revision edges up from a record and back down. */
function findVisibleVersion(
  library: ProfileLibrary,
  version: ProfileRecord,
  excluded: ProfileRecord,
) {
  const isCandidate = (record: ProfileRecord) =>
    record.id !== excluded.id && library.classOf(record.id) === "visible";

  if (isCandidate(version)) {
    return version;
  }

  return (
    collectRevisions(library, findRevisionRoot(library, version))
      .filter(isCandidate)
      .sort((left, right) => getCreatedAtMs(right) - getCreatedAtMs(left))[0] ?? null
  );
}

function collectRevisions(library: ProfileLibrary, root: ProfileRecord) {
  const versions = new Map([[root.id, root]]);

  for (const version of versions.values()) {
    for (const child of library.childrenOf(version.id)) {
      if (hasRevisionMarker(child)) {
        versions.set(child.id, child);
      }
    }
  }

  return [...versions.values()];
}

/**
 * Finds the visible profile the Active Profile belongs to. The link is derived, never stored.
 * Ticket 15 puts the fewest-changes tiebreak ahead of Yours and the latest `createdAt`.
 */
export function linkActiveProfile(
  library: ProfileLibrary,
  loaded: WorkflowProfile | undefined,
): ActiveProfileLink {
  if (!loaded) {
    return { record: null, status: "none" };
  }

  const title = normalizeTitle(loaded.title);
  const [record] = library.visible
    .filter((entry) => title && normalizeTitle(entry.profile.title) === title)
    .sort(
      (left, right) =>
        compareYoursFirst(left, right) || getCreatedAtMs(right) - getCreatedAtMs(left),
    );

  if (!record) {
    return { record: null, status: "not-saved" };
  }

  return { record, status: runsTheSame(record.profile, loaded) ? "saved" : "differs" };
}

export function isLinkedRecord(link: ActiveProfileLink, record: ProfileRecord) {
  return link.record?.id === record.id;
}

function normalizeTitle(title: string | null | undefined) {
  return title?.trim().toLowerCase() ?? "";
}

/** Compares what the machine runs: every field the Bridge hashes, less target_weight and version. */
function runsTheSame(left: WorkflowProfile, right: WorkflowProfile) {
  return JSON.stringify(whatTheMachineRuns(left)) === JSON.stringify(whatTheMachineRuns(right));
}

function whatTheMachineRuns(profile: WorkflowProfile) {
  return canonicalize({
    beverage_type: profile.beverage_type,
    steps: profile.steps ?? [],
    tank_temperature: profile.tank_temperature ?? 0,
    target_volume: profile.target_volume ?? 0,
    target_volume_count_start: profile.target_volume_count_start ?? 0,
  });
}

/** Sorts keys and drops nulls, so neither key order nor `exit: null` reads as a difference. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry != null)
      .sort(([left], [right]) => (left < right ? -1 : 1))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

const WORKFLOW_BUSY_REASON = "Available when the shot ends";
const WORKFLOW_UNREAD_REASON = "Waiting for the Bridge to report what's loaded";

/** Every other reading is running or unknown, and both sit on the disabled side of the gate. */
const readingsFreeForWorkflowWrites: ReadonlySet<MachineReading> = new Set([
  "idle",
  "schedIdle",
  "heating",
  "preheating",
  "sleeping",
  "no-machine",
]);

/**
 * A failed state read alone can't mean "no machine", because the Bridge answers the same way when
 * it's unreachable or a state fails to parse. Only the device list can say none is connected, and
 * `devices` is null when that list can't be trusted.
 */
export function readMachine({
  devices,
  state,
}: {
  devices: DeviceSummary[] | null;
  state: MachineState | undefined;
}): MachineReading {
  if (state) {
    return state;
  }

  const isMachineConnected = devices?.some(
    (device) => device.type === "machine" && device.state === "connected",
  );

  return isMachineConnected === false ? "no-machine" : "unreadable";
}

export function getUseAction({
  link,
  loaded,
  machine,
  record,
}: {
  link: ActiveProfileLink;
  loaded: WorkflowProfile | undefined;
  machine: MachineReading;
  record: ProfileRecord;
}): UseAction {
  if (isLinkedRecord(link, record)) {
    return { kind: "loaded" };
  }

  if (!readingsFreeForWorkflowWrites.has(machine)) {
    return { kind: "blocked", reason: WORKFLOW_BUSY_REASON };
  }

  if (link.status === "unknown") {
    return { kind: "blocked", reason: WORKFLOW_UNREAD_REASON };
  }

  if (link.status === "differs" || link.status === "not-saved") {
    return {
      kind: "confirm",
      message: `${getProfileTitle(loaded)} has unsaved changes. Loading another profile discards them.`,
    };
  }

  return { kind: "load" };
}

export function describeRecord(library: ProfileLibrary, record: ProfileRecord): RecordDescription {
  const { profile } = record;
  const stepCount = profile.steps?.length ?? 0;

  return {
    meta: [
      profile.author?.trim(),
      formatBeverageType(profile.beverage_type),
      `${stepCount} ${stepCount === 1 ? "Step" : "Steps"}`,
      describeOrigin(library, record),
    ]
      .filter(Boolean)
      .join(" · "),
    notes: profile.notes?.trim() || null,
    origin: record.isDefault ? "Bundled" : "Yours",
    title: getProfileTitle(profile),
  };
}

function formatBeverageType(beverageType: string | null | undefined) {
  if (beverageType === "pourover") {
    return "Pour-over";
  }

  return beverageType ? `${beverageType[0]?.toUpperCase()}${beverageType.slice(1)}` : null;
}

function describeOrigin(library: ProfileLibrary, record: ProfileRecord) {
  if (record.isDefault) {
    return null;
  }

  const forkSource = findForkSource(library, record);

  if (forkSource) {
    const version = findVisibleVersion(library, forkSource, record) ?? forkSource;

    return `Copy of ${getProfileTitle(version.profile)}`;
  }

  return findRevisionRoot(library, record).isDefault ? "Revised from Bundled" : null;
}

/**
 * The record the detail pane shows: the operator's selection while it's still visible, otherwise
 * the loaded profile, otherwise the first row. A chip hiding the selection doesn't change it.
 */
export function resolveSelectedRecord(
  library: ProfileLibrary,
  selectedId: string | null,
  link: ActiveProfileLink,
) {
  const selected = library.recordById(selectedId);

  if (selected && library.classOf(selected.id) === "visible") {
    return selected;
  }

  return link.record ?? listLibraryRows(library, "all")[0]?.record ?? null;
}
