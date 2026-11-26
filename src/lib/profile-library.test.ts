import { describe, expect, it } from "vitest";

import { machineStateSchema, type DeviceSummary, type ProfileRecord } from "@/rest/types";

import {
  buildProfileLibrary,
  describeRecord,
  getUseAction,
  libraryChips,
  linkActiveProfile,
  listLibraryRows,
  readMachine,
  resolveSelectedRecord,
  REVISION_MARKER_KEY,
  type LibraryChip,
  type RecordClass,
} from "./profile-library";

const older = "2026-09-01T08:00:00.000Z";
const newer = "2026-10-01T08:00:00.000Z";

function record(id: string, overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return {
    createdAt: older,
    id,
    isDefault: false,
    profile: { beverage_type: "espresso", steps: [], title: id },
    visibility: "visible",
    ...overrides,
  };
}

function bundled(
  id: string,
  filename: string,
  overrides: Partial<ProfileRecord> = {},
): ProfileRecord {
  return record(id, {
    isDefault: true,
    metadata: { filename, source: "bundled" },
    ...overrides,
  });
}

function revisionOf(parentId: string, id: string, overrides: Partial<ProfileRecord> = {}) {
  return record(id, {
    createdAt: newer,
    metadata: { [REVISION_MARKER_KEY]: true },
    parentId,
    ...overrides,
  });
}

describe("classifying records", () => {
  const cases: Array<{
    expected: RecordClass;
    manifest?: string[] | null;
    name: string;
    records: ProfileRecord[];
    subject: string;
  }> = [
    {
      expected: "visible",
      name: "a visible record",
      records: [record("a")],
      subject: "a",
    },
    {
      expected: "visible",
      name: "a record with no stored visibility",
      records: [record("a", { visibility: null })],
      subject: "a",
    },
    {
      expected: "visible",
      name: "a visible Bundled record with a parentId",
      manifest: ["v2.json"],
      records: [bundled("v2", "v2.json", { parentId: "v1" }), bundled("v1", "v1.json")],
      subject: "v2",
    },
    {
      expected: "removed",
      name: "a deleted record",
      records: [record("a", { visibility: "deleted" })],
      subject: "a",
    },
    {
      expected: "removed",
      name: "a deleted record with a Revision, since deleted always reads as Removed",
      records: [record("a", { visibility: "deleted" }), revisionOf("a", "b")],
      subject: "a",
    },
    {
      expected: "removed",
      name: "a deleted Revision, which carries the marker",
      records: [
        record("a", { visibility: "hidden" }),
        revisionOf("a", "b", { visibility: "deleted" }),
      ],
      subject: "b",
    },
    {
      expected: "superseded",
      name: "a hidden record with a marked child",
      records: [record("a", { visibility: "hidden" }), revisionOf("a", "b")],
      subject: "a",
    },
    {
      expected: "superseded",
      name: "a version gone back from, hidden and carrying the marker",
      records: [record("a"), revisionOf("a", "b", { visibility: "hidden" })],
      subject: "b",
    },
    {
      expected: "removed",
      name: "a hidden record whose only child is a Fork",
      records: [record("a", { visibility: "hidden" }), record("fork", { parentId: "a" })],
      subject: "a",
    },
    {
      expected: "removed",
      name: "a record another app hid",
      records: [record("a", { visibility: "hidden" })],
      subject: "a",
    },
    {
      expected: "removed",
      name: "a Bundled Profile the operator hid",
      manifest: ["a.json"],
      records: [bundled("a", "a.json", { visibility: "hidden" })],
      subject: "a",
    },
    {
      expected: "retired",
      name: "a hidden Bundled record whose filename left the manifest",
      manifest: ["other.json"],
      records: [bundled("a", "gone.json", { visibility: "hidden" })],
      subject: "a",
    },
    {
      expected: "retired",
      name: "a hidden Bundled record with a newer Bundled record of the same filename",
      manifest: ["a.json"],
      records: [
        bundled("old", "a.json", { visibility: "hidden" }),
        bundled("new", "a.json", { createdAt: newer }),
      ],
      subject: "old",
    },
    {
      expected: "removed",
      name: "the newest Bundled record of a filename, even with an older one beside it",
      manifest: ["a.json"],
      records: [
        bundled("old", "a.json", { visibility: "hidden" }),
        bundled("new", "a.json", { createdAt: newer, visibility: "hidden" }),
      ],
      subject: "new",
    },
    {
      expected: "removed",
      name: "a Bundled record with the same filename created at the same moment",
      manifest: ["a.json"],
      records: [bundled("first", "a.json", { visibility: "hidden" }), bundled("second", "a.json")],
      subject: "first",
    },
    {
      expected: "retired",
      name: "Retired over Superseded when the filename left the manifest",
      manifest: [],
      records: [bundled("a", "gone.json", { visibility: "hidden" }), revisionOf("a", "b")],
      subject: "a",
    },
    {
      expected: "retired",
      name: "Retired over Superseded when a newer Bundled version exists",
      manifest: ["a.json"],
      records: [
        bundled("old", "a.json", { visibility: "hidden" }),
        bundled("new", "a.json", { createdAt: newer }),
        revisionOf("old", "mine"),
      ],
      subject: "old",
    },
    {
      expected: "superseded",
      name: "a hidden Bundled record with a marked child and a current filename",
      manifest: ["a.json"],
      records: [bundled("a", "a.json", { visibility: "hidden" }), revisionOf("a", "b")],
      subject: "a",
    },
    {
      expected: "removed",
      name: "a hidden Bundled record when the manifest could not be read",
      manifest: null,
      records: [bundled("a", "a.json", { visibility: "hidden" })],
      subject: "a",
    },
    {
      expected: "removed",
      name: "a hidden Bundled record with no filename to check",
      manifest: ["a.json"],
      records: [record("a", { isDefault: true, visibility: "hidden" })],
      subject: "a",
    },
    {
      expected: "removed",
      name: "a hidden operator record whose metadata names a filename outside the manifest",
      manifest: [],
      records: [record("a", { metadata: { filename: "gone.json" }, visibility: "hidden" })],
      subject: "a",
    },
  ];

  it.each(cases)("reads $name as $expected", ({ expected, manifest, records, subject }) => {
    const library = buildProfileLibrary(
      records,
      manifest === undefined ? [] : manifest?.map((filename) => ({ filename })),
    );

    expect(library.classOf(subject)).toBe(expected);
  });

  it("offers only visible records for listing", () => {
    const library = buildProfileLibrary(
      [
        record("shown"),
        record("hidden", { visibility: "hidden" }),
        record("deleted", { visibility: "deleted" }),
      ],
      [],
    );

    expect(library.visible.map((entry) => entry.id)).toEqual(["shown"]);
  });
});

describe("listing rows", () => {
  function titled(id: string, beverageType: string | null, overrides: Partial<ProfileRecord> = {}) {
    return record(id, {
      profile: { beverage_type: beverageType, steps: [], title: id },
      ...overrides,
    });
  }

  function listed(records: ProfileRecord[], chip: LibraryChip = "all") {
    return listLibraryRows(buildProfileLibrary(records, []), chip).map(
      (row) => `${"  ".repeat(row.depth)}${row.record.id}`,
    );
  }

  it("lists the operator's profiles first, then Bundled Profiles, each alphabetical", () => {
    expect(
      listed([
        bundled("Londonium", "l.json"),
        record("turbo"),
        bundled("Adaptive", "a.json"),
        record("House"),
      ]),
    ).toEqual(["House", "turbo", "Adaptive", "Londonium"]);
  });

  it("leaves out Superseded, Removed, and Retired records", () => {
    expect(
      listed([
        record("old", { visibility: "hidden" }),
        revisionOf("old", "current"),
        record("gone", { visibility: "deleted" }),
        bundled("retired", "gone.json", { visibility: "hidden" }),
      ]),
    ).toEqual(["current"]);
  });

  it("sorts by the title the operator reads, not the id", () => {
    const records = [
      record("id-1", { profile: { title: "Zeta" } }),
      record("id-2", { profile: { title: "alpha" } }),
    ];

    expect(listed(records)).toEqual(["id-2", "id-1"]);
  });

  describe("chips", () => {
    const records = [
      titled("espresso", "espresso"),
      titled("pourover", "pourover"),
      titled("tea", "tea"),
      titled("manual", "manual"),
      titled("no-type", null),
      titled("bundled-espresso", "espresso", { isDefault: true }),
      titled("bundled-pourover", "pourover", { isDefault: true }),
    ];

    it.each<{ chip: LibraryChip; expected: string[] }>([
      {
        chip: "all",
        expected: [
          "espresso",
          "manual",
          "no-type",
          "pourover",
          "tea",
          "bundled-espresso",
          "bundled-pourover",
        ],
      },
      { chip: "yours", expected: ["espresso", "manual", "no-type", "pourover", "tea"] },
      { chip: "espresso", expected: ["espresso", "bundled-espresso"] },
      { chip: "pourover", expected: ["pourover", "bundled-pourover"] },
      { chip: "other", expected: ["manual", "no-type", "tea"] },
    ])("$chip keeps the matching profiles", ({ chip, expected }) => {
      expect(listed(records, chip)).toEqual(expected);
    });

    it("offers every chip in the spec's order with its label", () => {
      expect(libraryChips).toEqual([
        { key: "all", label: "All" },
        { key: "yours", label: "Yours" },
        { key: "espresso", label: "Espresso" },
        { key: "pourover", label: "Pour-over" },
        { key: "other", label: "Other" },
      ]);
    });
  });

  describe("nesting Profile Forks", () => {
    it("nests a Fork under its visible parent, alphabetically", () => {
      expect(
        listed([
          record("House"),
          record("Z fork", { parentId: "House" }),
          record("A fork", { parentId: "House" }),
          record("Next"),
        ]),
      ).toEqual(["House", "  A fork", "  Z fork", "Next"]);
    });

    it("nests a Fork under a Bundled Profile, in the Bundled part of the list", () => {
      expect(
        listed([
          bundled("Londonium", "l.json"),
          record("slow ramp", { parentId: "Londonium" }),
          record("House"),
        ]),
      ).toEqual(["House", "Londonium", "  slow ramp"]);
    });

    it("follows Revision edges down from a Superseded parent to the visible version", () => {
      expect(
        listed([
          record("v1", { visibility: "hidden" }),
          revisionOf("v1", "v2", { visibility: "hidden" }),
          revisionOf("v2", "v3"),
          record("decaf", { parentId: "v1" }),
        ]),
      ).toEqual(["v3", "  decaf"]);
    });

    it("follows Revision edges up and back down after going back to an earlier version", () => {
      expect(
        listed([
          record("v1"),
          revisionOf("v1", "v2", { visibility: "hidden" }),
          record("decaf", { parentId: "v2" }),
        ]),
      ).toEqual(["v1", "  decaf"]);
    });

    it("finds the visible version across a branch in the lineage", () => {
      expect(
        listed([
          record("v1", { visibility: "hidden" }),
          revisionOf("v1", "v2", { visibility: "hidden" }),
          revisionOf("v1", "branch"),
          record("decaf", { parentId: "v2" }),
        ]),
      ).toEqual(["branch", "  decaf"]);
    });

    it("prefers the parent itself when a failed hide left two versions visible", () => {
      expect(
        listed([record("v1"), revisionOf("v1", "v2"), record("decaf", { parentId: "v1" })]),
      ).toEqual(["v1", "  decaf", "v2"]);
    });

    it("picks the newest version when two visible versions are both descendants", () => {
      expect(
        listed([
          record("v1", { visibility: "hidden" }),
          revisionOf("v1", "older", { createdAt: older }),
          revisionOf("v1", "newest", { createdAt: newer }),
          record("decaf", { parentId: "v1" }),
        ]),
      ).toEqual(["newest", "  decaf", "older"]);
    });

    it("keeps a revised Fork nested, because its lineage started as a Fork", () => {
      expect(
        listed([
          record("House"),
          record("decaf v1", { parentId: "House", visibility: "hidden" }),
          revisionOf("decaf v1", "decaf v2"),
        ]),
      ).toEqual(["House", "  decaf v2"]);
    });

    it("nests a Fork of a Fork one level deeper", () => {
      expect(
        listed([
          record("House"),
          record("decaf", { parentId: "House" }),
          record("decaf long", { parentId: "decaf" }),
        ]),
      ).toEqual(["House", "  decaf", "    decaf long"]);
    });

    it("drops a Fork to the top level when its profile has no visible version", () => {
      expect(
        listed([
          record("gone", { visibility: "deleted" }),
          record("decaf", { parentId: "gone" }),
          record("Aaa"),
        ]),
      ).toEqual(["Aaa", "decaf"]);
    });

    it("drops a Fork to the top level when its parent isn't in the library", () => {
      expect(listed([record("decaf", { parentId: "missing" })])).toEqual(["decaf"]);
    });

    it("drops a Fork to the top level when a chip hides its parent", () => {
      expect(
        listed(
          [bundled("Londonium", "l.json"), record("slow ramp", { parentId: "Londonium" })],
          "yours",
        ),
      ).toEqual(["slow ramp"]);
    });

    it("hides a Fork the chip excludes, and keeps its parent", () => {
      expect(
        listed(
          [titled("House", "espresso"), titled("tea fork", "tea", { parentId: "House" })],
          "espresso",
        ),
      ).toEqual(["House"]);
    });

    it("promotes the descendants of a Fork the chip hides", () => {
      expect(
        listed(
          [
            titled("House", "espresso"),
            titled("tea fork", "tea", { parentId: "House" }),
            titled("back to espresso", "espresso", { parentId: "tea fork" }),
          ],
          "espresso",
        ),
      ).toEqual(["back to espresso", "House"]);
    });

    it("doesn't treat a Bundled record with a parentId as a Fork", () => {
      expect(
        listed([bundled("v3", "v3.json", { parentId: "v2" }), bundled("v2", "v2.json")]),
      ).toEqual(["v2", "v3"]);
    });

    it("doesn't treat a Revision of a Bundled Profile as a Fork", () => {
      expect(
        listed([
          bundled("original", "o.json", { visibility: "hidden" }),
          revisionOf("original", "mine"),
        ]),
      ).toEqual(["mine"]);
    });

    it.each<{ name: string; records: ProfileRecord[] }>([
      {
        name: "a Fork that is its own parent",
        records: [record("self", { parentId: "self" })],
      },
      {
        name: "two Forks that are each other's parent",
        records: [record("a", { parentId: "b" }), record("b", { parentId: "a" })],
      },
      {
        name: "a Revision cycle under a Fork",
        records: [
          revisionOf("b", "a", { visibility: "hidden" }),
          revisionOf("a", "b", { visibility: "hidden" }),
          record("decaf", { parentId: "a" }),
        ],
      },
    ])("never loses a row to $name", ({ records }) => {
      const visibleIds = records.filter((entry) => entry.visibility === "visible");

      expect(
        listed(records)
          .map((row) => row.trim())
          .sort(),
      ).toEqual(visibleIds.map((entry) => entry.id).sort());
    });
  });
});

describe("linking the Active Profile", () => {
  const steps = [{ pressure: 9, seconds: 30, temperature: 93 }];

  function house(overrides: Partial<ProfileRecord["profile"]> = {}): ProfileRecord["profile"] {
    return { beverage_type: "espresso", steps, title: "House", ...overrides };
  }

  function link(records: ProfileRecord[], loaded: ProfileRecord["profile"] | undefined) {
    return linkActiveProfile(buildProfileLibrary(records, []), loaded);
  }

  it("reads as nothing loaded when the Workflow has no profile", () => {
    expect(link([record("a", { profile: house() })], undefined)).toEqual({
      record: null,
      status: "none",
    });
  });

  it("reads as not saved when no visible profile has the title", () => {
    expect(link([record("a", { profile: house({ title: "Other" }) })], house())).toEqual({
      record: null,
      status: "not-saved",
    });
  });

  it("links to the visible profile with the same title", () => {
    const result = link([record("a", { profile: house() })], house());

    expect(result.record?.id).toBe("a");
    expect(result.status).toBe("saved");
  });

  it.each([
    ["letter case", "HOUSE"],
    ["surrounding whitespace", "  House  "],
  ])("ignores %s when comparing titles", (_name, title) => {
    expect(link([record("a", { profile: house() })], house({ title })).record?.id).toBe("a");
  });

  it("never links an empty title to another empty title", () => {
    expect(
      link([record("a", { profile: house({ title: "  " }) })], house({ title: "" })).status,
    ).toBe("not-saved");
  });

  it.each<{ name: string; records: ProfileRecord[] }>([
    { name: "deleted", records: [record("a", { profile: house(), visibility: "deleted" })] },
    { name: "hidden", records: [record("a", { profile: house(), visibility: "hidden" })] },
    {
      name: "Superseded",
      records: [
        record("a", { profile: house(), visibility: "hidden" }),
        revisionOf("a", "b", { profile: house({ title: "Renamed" }) }),
      ],
    },
  ])("doesn't link to a $name record", ({ records }) => {
    expect(link(records, house())).toEqual({ record: null, status: "not-saved" });
  });

  describe("with two visible profiles sharing the title", () => {
    it("prefers the operator's over a Bundled Profile", () => {
      const result = link(
        [
          bundled("bundled", "b.json", { createdAt: newer, profile: house() }),
          record("mine", { createdAt: older, profile: house() }),
        ],
        house(),
      );

      expect(result.record?.id).toBe("mine");
    });

    it("then prefers the latest createdAt", () => {
      const result = link(
        [
          record("older", { createdAt: older, profile: house() }),
          record("newer", { createdAt: newer, profile: house() }),
        ],
        house(),
      );

      expect(result.record?.id).toBe("newer");
    });
  });

  describe("differs from saved", () => {
    it.each<{ loaded: Partial<ProfileRecord["profile"]>; name: string }>([
      {
        loaded: { steps: [{ pressure: 8.5, seconds: 30, temperature: 93 }] },
        name: "a Step value",
      },
      { loaded: { steps: [] }, name: "the Step count" },
      {
        loaded: { steps: [{ name: "Pour", pressure: 9, seconds: 30, temperature: 93 }] },
        name: "a Step name",
      },
      { loaded: { beverage_type: "pourover" }, name: "the beverage type" },
      { loaded: { tank_temperature: 40 }, name: "tank preheat" },
      { loaded: { target_volume: 36 }, name: "stop at volume" },
      { loaded: { target_volume_count_start: 2 }, name: "the preinfusion boundary" },
    ])("is raised by $name", ({ loaded }) => {
      expect(link([record("a", { profile: house() })], house(loaded)).status).toBe("differs");
    });

    it.each<{ loaded: Partial<ProfileRecord["profile"]>; name: string }>([
      { loaded: { notes: "changed" }, name: "the notes" },
      { loaded: { author: "changed" }, name: "the author" },
      { loaded: { title: "house" }, name: "the title's letter case" },
      { loaded: { target_weight: 40 }, name: "target_weight, which the machine ignores" },
      { loaded: { version: "3" }, name: "the format version" },
      { loaded: { lang: "en" }, name: "a key the machine doesn't run" },
      {
        loaded: { steps: [{ temperature: 93, seconds: 30, pressure: 9 }] },
        name: "the order of a Step's keys",
      },
      {
        loaded: { steps: [{ exit: null, pressure: 9, seconds: 30, temperature: 93 }] },
        name: "an explicit null against a missing key",
      },
      { loaded: { tank_temperature: 0 }, name: "tank preheat Off against a missing value" },
      { loaded: { target_volume: 0 }, name: "stop at volume Off against a missing value" },
      { loaded: { target_volume_count_start: 0 }, name: "a boundary of 0 against a missing value" },
    ])("isn't raised by $name", ({ loaded }) => {
      expect(link([record("a", { profile: house() })], house(loaded)).status).toBe("saved");
    });
  });
});

describe("the Use action", () => {
  const loadedHouse = { beverage_type: "espresso", steps: [], title: "House" };
  const house = record("house", { profile: loadedHouse });
  const turbo = record("turbo", { profile: { ...loadedHouse, title: "Turbo" } });
  const library = buildProfileLibrary([house, turbo], []);
  const saved = linkActiveProfile(library, loadedHouse);
  const differs = linkActiveProfile(library, { ...loadedHouse, steps: [{ pressure: 9 }] });
  const notSaved = linkActiveProfile(library, { ...loadedHouse, title: "Scratch" });
  const noProfile = linkActiveProfile(library, undefined);
  const free = { loaded: loadedHouse, machine: "idle" } as const;

  it("loads straight away with nothing unsaved", () => {
    expect(getUseAction({ ...free, link: saved, record: turbo })).toEqual({ kind: "load" });
  });

  it("loads straight away with nothing in the Workflow", () => {
    expect(getUseAction({ ...free, link: noProfile, record: turbo })).toEqual({ kind: "load" });
  });

  it("reads as loaded on the linked record", () => {
    expect(getUseAction({ ...free, link: saved, record: house })).toEqual({ kind: "loaded" });
  });

  it("reads as loaded on the linked record even when it differs from saved", () => {
    expect(getUseAction({ ...free, link: differs, record: house })).toEqual({ kind: "loaded" });
  });

  it("reads as loaded rather than busy while the machine runs", () => {
    expect(getUseAction({ ...free, link: saved, machine: "espresso", record: house })).toEqual({
      kind: "loaded",
    });
  });

  it.each([
    { link: differs, name: "differs from its saved version" },
    { link: notSaved, name: "has no saved version" },
  ])("asks first when the loaded profile $name", ({ link }) => {
    expect(
      getUseAction({
        link,
        loaded: { title: "House" },
        machine: "idle",
        record: turbo,
      }),
    ).toEqual({
      kind: "confirm",
      message: "House has unsaved changes. Loading another profile discards them.",
    });
  });

  it("treats a record sharing the loaded title as a different profile", () => {
    const sameTitle = bundled("bundled-house", "h.json", { profile: loadedHouse });
    const clash = buildProfileLibrary([house, sameTitle], []);
    const link = linkActiveProfile(clash, { ...loadedHouse, steps: [{ pressure: 9 }] });

    expect(link.record?.id).toBe("house");
    expect(getUseAction({ ...free, link, record: sameTitle }).kind).toBe("confirm");
  });

  describe("the busy gate", () => {
    // The spec's Workflow writes and the busy gate lists, written out rather than derived.
    const running = [
      "espresso",
      "skipStep",
      "steam",
      "steamRinse",
      "hotWater",
      "flush",
      "cleaning",
      "descaling",
      "airPurge",
      "calibration",
      "selfTest",
      "fwUpgrade",
    ] as const;
    const unknown = ["booting", "busy", "needsWater", "error"] as const;
    const freeStates = ["idle", "schedIdle", "heating", "preheating", "sleeping"] as const;

    it("covers every state the Bridge can report", () => {
      expect([...running, ...unknown, ...freeStates].sort()).toEqual(
        [...machineStateSchema.options].sort(),
      );
    });

    it.each([...running, ...unknown])("disables Use during %s", (machine) => {
      expect(getUseAction({ ...free, link: saved, machine, record: turbo })).toEqual({
        kind: "blocked",
        reason: "Available when the shot ends",
      });
    });

    it.each(freeStates)("allows Use during %s", (machine) => {
      expect(getUseAction({ ...free, link: saved, machine, record: turbo })).toEqual({
        kind: "load",
      });
    });

    it("allows Use with no machine connected", () => {
      expect(getUseAction({ ...free, link: saved, machine: "no-machine", record: turbo })).toEqual({
        kind: "load",
      });
    });

    it("stays on the safe side when the machine can't be read", () => {
      expect(getUseAction({ ...free, link: saved, machine: "unreadable", record: turbo })).toEqual({
        kind: "blocked",
        reason: "Available when the shot ends",
      });
    });

    it("reports the gate ahead of the replace confirm", () => {
      expect(
        getUseAction({ ...free, link: differs, machine: "espresso", record: turbo }).kind,
      ).toBe("blocked");
    });
  });

  it("won't load until it knows what the Workflow holds, so a trial can't be lost unasked", () => {
    expect(
      getUseAction({
        ...free,
        link: { record: null, status: "unknown" },
        loaded: undefined,
        record: turbo,
      }),
    ).toEqual({
      kind: "blocked",
      reason: "Waiting for the Bridge to report what's loaded",
    });
  });
});

describe("reading the machine for the busy gate", () => {
  const machine = { id: "m", name: "DE1", state: "connected", type: "machine" };
  const scale = { id: "s", name: "Lunar", state: "connected", type: "scale" };

  it.each<{
    devices: DeviceSummary[] | null;
    expected: string;
    name: string;
    state: "espresso" | "idle" | undefined;
  }>([
    { devices: [machine], expected: "idle", name: "the reported state", state: "idle" },
    {
      devices: [],
      expected: "espresso",
      name: "a reported state, even if the device list has no machine",
      state: "espresso",
    },
    {
      devices: [scale],
      expected: "no-machine",
      name: "no machine when only other devices are connected",
      state: undefined,
    },
    {
      devices: [{ ...machine, state: "disconnected" }],
      expected: "no-machine",
      name: "no machine when the machine is disconnected",
      state: undefined,
    },
    { devices: [], expected: "no-machine", name: "no machine with no devices", state: undefined },
    {
      devices: [machine],
      expected: "unreadable",
      name: "unreadable when a connected machine reports nothing",
      state: undefined,
    },
    {
      devices: null,
      expected: "unreadable",
      name: "unreadable when neither source can be read",
      state: undefined,
    },
  ])("reads $name", ({ devices, expected, state }) => {
    expect(readMachine({ devices, state })).toBe(expected);
  });
});

describe("describing a record", () => {
  function metaOf(records: ProfileRecord[], id: string) {
    const library = buildProfileLibrary(records, []);

    return describeRecord(library, library.recordById(id)!).meta;
  }

  const profile = {
    author: "Decent",
    beverage_type: "espresso",
    steps: [{}, {}, {}, {}],
    title: "House",
  };

  it("joins author, beverage type, and Step count", () => {
    expect(metaOf([record("a", { profile })], "a")).toBe("Decent · Espresso · 4 Steps");
  });

  it("uses the singular for one Step and skips what's missing", () => {
    expect(metaOf([record("a", { profile: { steps: [{}] } })], "a")).toBe("1 Step");
  });

  it.each([
    ["espresso", "Espresso"],
    ["pourover", "Pour-over"],
    ["manual", "Manual"],
    ["cleaning", "Cleaning"],
    ["calibrate", "Calibrate"],
  ])("labels the %s beverage type", (beverageType, label) => {
    expect(
      metaOf([record("a", { profile: { beverage_type: beverageType, steps: [] } })], "a"),
    ).toBe(`${label} · 0 Steps`);
  });

  it("names the profile a Fork was copied from", () => {
    expect(
      metaOf(
        [
          record("house", { profile: { steps: [], title: "House" } }),
          record("fork", { parentId: "house", profile: { steps: [] } }),
        ],
        "fork",
      ),
    ).toBe("0 Steps · Copy of House");
  });

  it("names the visible version when a Fork's parent was superseded and renamed", () => {
    expect(
      metaOf(
        [
          record("v1", { profile: { steps: [], title: "House" }, visibility: "hidden" }),
          revisionOf("v1", "v2", { profile: { steps: [], title: "House renamed" } }),
          record("fork", { parentId: "v1", profile: { steps: [] } }),
        ],
        "fork",
      ),
    ).toBe("0 Steps · Copy of House renamed");
  });

  it("keeps the copied-from name when the profile has no visible version", () => {
    expect(
      metaOf(
        [
          record("gone", { profile: { steps: [], title: "Gone" }, visibility: "deleted" }),
          record("fork", { parentId: "gone", profile: { steps: [] } }),
        ],
        "fork",
      ),
    ).toBe("0 Steps · Copy of Gone");
  });

  it("still reads as a copy after a Fork is revised", () => {
    expect(
      metaOf(
        [
          record("house", { profile: { steps: [], title: "House" } }),
          record("fork", { parentId: "house", visibility: "hidden" }),
          revisionOf("fork", "fork2", { profile: { steps: [] } }),
        ],
        "fork2",
      ),
    ).toBe("0 Steps · Copy of House");
  });

  it("reads Revised from Bundled on a Revision of a Bundled Profile", () => {
    expect(
      metaOf(
        [
          bundled("original", "o.json", { visibility: "hidden" }),
          revisionOf("original", "v2", { profile: { steps: [] } }),
          revisionOf("v2", "v3", { profile: { steps: [] } }),
        ],
        "v3",
      ),
    ).toBe("0 Steps · Revised from Bundled");
  });

  it.each<{ name: string; records: ProfileRecord[]; subject: string }>([
    {
      name: "a Revision of the operator's own profile",
      records: [record("v1", { visibility: "hidden" }), revisionOf("v1", "v2")],
      subject: "v2",
    },
    {
      name: "a Bundled record with a parentId",
      records: [bundled("v3", "v3.json", { parentId: "v2" }), bundled("v2", "v2.json")],
      subject: "v3",
    },
    {
      name: "a Fork whose parent isn't in the library",
      records: [record("fork", { parentId: "missing" })],
      subject: "fork",
    },
  ])("gives no origin for $name", ({ records, subject }) => {
    const library = buildProfileLibrary(records, []);

    expect(describeRecord(library, library.recordById(subject)!).meta).not.toMatch(
      /Copy of|Revised from/,
    );
  });

  it("gives the title, origin badge, and trimmed notes", () => {
    const library = buildProfileLibrary(
      [
        record("mine", { profile: { notes: "  Bright.  ", title: "House" } }),
        bundled("theirs", "t.json", { profile: { notes: "   ", title: "Londonium" } }),
      ],
      [],
    );

    expect(describeRecord(library, library.recordById("mine")!)).toMatchObject({
      notes: "Bright.",
      origin: "Yours",
      title: "House",
    });
    expect(describeRecord(library, library.recordById("theirs")!)).toMatchObject({
      notes: null,
      origin: "Bundled",
      title: "Londonium",
    });
  });
});

describe("resolving the selection", () => {
  const library = buildProfileLibrary(
    [record("first"), record("loaded"), record("gone", { visibility: "deleted" })],
    [],
  );
  const loaded = library.recordById("loaded")!;

  function selected(selectedId: string | null, linked: ProfileRecord | null) {
    return resolveSelectedRecord(library, selectedId, { record: linked, status: "saved" })?.id;
  }

  it("selects the loaded profile until the operator picks one", () => {
    expect(selected(null, loaded)).toBe("loaded");
  });

  it("keeps the operator's selection over the loaded profile", () => {
    expect(selected("first", loaded)).toBe("first");
  });

  it("falls back to the loaded profile when the selection is no longer visible", () => {
    expect(selected("gone", loaded)).toBe("loaded");
  });

  it("falls back to the first listed profile with nothing loaded", () => {
    expect(selected(null, null)).toBe("first");
  });

  it("selects nothing in an empty library", () => {
    expect(
      resolveSelectedRecord(buildProfileLibrary([], []), null, { record: null, status: "none" }),
    ).toBeNull();
  });
});
