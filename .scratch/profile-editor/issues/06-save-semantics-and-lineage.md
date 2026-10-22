# What does Save do to a profile and its lineage?

Type: grilling
Status: resolved
Blocked by: 01
Map: [Profile authoring in Cockpit](../map.md)

## Question

When the operator saves a **Profile Draft**, what happens in the **Profile Library**? The Bridge gives profiles content-hash ids, replaces the record atomically when execution fields change, and tracks a `parentId` chain. Within that, decide:

- **Editing an operator-created profile**: replace it in place (`PUT`, new hash id, old record gone), or create a child version (`POST` with `parentId`, old record kept)? Or offer both ("Save" vs "Save as new")?
- **Editing a Bundled Profile**: its **Steps** can't be edited in place, so is it forked automatically on save? What is the copy called?
- **Metadata-only edits** (title, notes): do they behave differently?
- **Library list**: does it show every version, or only the latest of each **Profile Lineage**?
- **Collisions**: what happens when a save would produce content identical to an existing profile (same hash id)?

## Context from research

From [What does the Bridge's profile write API accept…](01-bridge-profile-write-api.md):

- **`PUT` with an execution change** moves the record to a new id and **orphans its children**. In-place edits and Profile Lineage don't mix without an upstream Bridge change.
- **Step names are execution fields**, so renaming a Step changes the id.
- **`POST` dedups silently.** Content identical to an existing record (even a deleted, hidden, or Bundled one) returns that record, and the new title, notes, and `parentId` are ignored. So "Duplicate" can't produce an unmodified renamed copy, and Bundled Profiles can't be renamed or annotated.
- **A `PUT` that collides with existing content** returns 400 and changes nothing.

## Comments

**2026-10-15 — claimed.** Grilling session in progress on branch `t3/wayfinder-06-save-semantics`.

**2026-10-15 — grilling with the operator.** Seven questions, one at a time, each with a recommendation. The operator took the recommendation every time:

1. Save on Step changes: post a child and hide the source (option B), rather than overwriting in place or offering both Save and Save as new on top of overwrite.
2. Telling replaced versions from deliberately hidden ones: a marker on the *new* record, written by the same `POST` (option c).
3. Vocabulary: **Profile Revision**, **Superseded Profile**, **Profile Fork**. Added to `CONTEXT.md`.
4. Bundled Profiles: Save makes a Revision, like any other profile.
5. Duplicate with no Step change: opens a draft, and Save stays disabled until a Step differs (option a).
6. Collisions: never land silently on an existing record.
7. Titles: unique among visible profiles (option b).

During the confirmation summary, an earlier suggestion of mine ("retry the hide on next load") was withdrawn. It would re-hide a Superseded Profile the operator had deliberately brought back.

**2026-10-21 — refined by [Which fields does the editor expose, and what limits does the Skin enforce?](08-field-coverage-and-limits.md).** "Steps changed" below should be read as "anything the machine runs changed": the Steps, beverage type, tank preheat, stop at volume, or preinfusion boundary, which are every field the Bridge hashes into the id. "Title or notes" should be read as "title, author, or notes". A copy must change how the profile runs, not necessarily a Step.

## Answer

**Save never overwrites a profile's Steps. It saves a new record and hides the old one, so the library shows one entry per profile while every earlier version stays in its Profile Lineage.** Everything below works on today's Bridge (Decaid v0.8.8) with no upstream change. The reason Save doesn't overwrite is recorded in [ADR 0003](../../../docs/adr/0003-save-makes-a-profile-revision.md).

**Saving**

- **Steps changed → Save makes a Profile Revision.** This applies to operator profiles and Bundled Profiles alike.
  1. Cockpit sends `POST /api/v1/profiles` with `parentId` = the source record and a revision marker in `metadata`.
  2. Cockpit then sets the source's visibility to `hidden`, making it a **Superseded Profile**.
  - The title carries over unless the operator renames it.
  - For a Bundled Profile, the operator's Revision takes its place in the list without the Bundled badge. The original stays reachable as the root of the lineage, and the Bridge's startup seeding keeps it hidden.
- **Only the title or notes changed → update in place.** This is a `PUT` with the same id; it makes no Revision and leaves the lineage untouched. On a Bundled Profile, the title and notes are **locked until a Step changes**: the Bridge rejects any edit to a Bundled Profile's `profile`, and a title-only `POST` dedups back to the Bundled record.
- **Save as new and Duplicate → Profile Fork.**
  - Both open a **Profile Draft** seeded from the source and titled "<title> copy". Nothing is written yet.
  - On Save, Cockpit `POST`s it with `parentId` = the source. The source stays visible.
  - **Save stays disabled until a Step differs from the source**, with the reason shown ("A copy must differ in at least one Step"), because the Bridge cannot store an exact copy.
- **The marker.** The new record's `metadata` carries the revision marker, written in the same `POST` and never edited later. Forks carry none, or a fork marker. Because existing `metadata` belongs to other writers (Bundled records hold `{source, filename}` and Visualizer imports hold `{comment}`), Cockpit namespaces its key and never replaces anyone else's metadata. The exact key name is left to implementation.

**Reading the library**

- **Superseded vs hidden.** A hidden record is a **Superseded Profile** exactly when one of its children carries the revision marker. Every other hidden record was hidden by the operator, or, for a Bundled Profile, retired by the Bridge. Other skins ignore the marker and simply see a hidden record.
- **Library list.** The list shows every visible record: the current Revision of each profile, every Fork, and the visible Bundled Profiles. Superseded Profiles appear only in the lineage. How Forks are grouped in the list is left to *Where does profile authoring live in the app, and what are its entry points?*

**Guardrails**

- **Collisions: Save never lands silently on an existing record.**
  - Detection uses the record the `POST` returns. A returned record that predates the save, or whose title or `parentId` doesn't match what was sent, means the Bridge deduped and wrote nothing. The Skin never reproduces the Bridge's hash: Dart writes `93.0` where JS writes `93`, and the field set is Bridge policy.
  - On a match, Cockpit skips hiding the source and names the record that matched, with one action:
    - a **visible** profile → "Identical to *X*", offering to open it;
    - a **Superseded Profile** in this lineage → "Same as the version from <time>", offering to go back to it. What "go back" does is decided by *How is Profile Lineage shown and navigated?*;
    - a **hidden or deleted** record → "Identical to *X* (deleted)", offering to restore it.
  - The draft stays open and unsaved in every case.
- **Titles must be unique among visible profiles.**
  - Checked in the Skin at save time; hidden, deleted, and Superseded records don't count.
  - A Fork's default title is "<title> copy", or "<title> copy 2" if that is taken.
  - A clashing title shows an inline message and keeps Save disabled. There is no silent auto-suffix.
  - A clash that arises later without a save is tolerated, for example a Bridge upgrade adding a Bundled Profile with the same name, or a Superseded Profile being brought back.
  - Why it matters: shot history stores only `profileTitle`, so duplicate visible titles make old shots ambiguous.
- **Partial failure.** If the `POST` succeeds but hiding the source fails, Save retries the hide once. If that also fails, Save reports that both versions are now visible. **There is no automatic repair on load**, because it would re-hide a Superseded Profile the operator deliberately brought back.
- **Accepted edge.** Two sessions revising the same profile at once (the tablet and a laptop browser, say) leave two visible Revisions branching from one parent. This is rare on a single-operator machine, so it is not guarded against.

**Rejected**

- **Overwriting in place** (`PUT` with Step changes). It loses the previous content and orphans every Fork of the profile.
- **Save plus Save as new on top of overwrite** (the streamline-js model). It keeps the orphaning problem.
- **Inferring Superseded from the tree alone.** It misclassifies a parent the operator hid on purpose once it has a visible Fork.
- **Marking the old record instead of the new one.** It costs a third request and means editing a record that is being retired.
- **Always forking Bundled Profiles.** Save would then mean two different things, and every Fork would need a new title.
- **Silently changing a Step name to make Duplicate unique.** The operator would see a change they never made.
- **Checking for collisions before Save.** The Skin would have to reproduce the Bridge's hash.
- **Auto-suffixing titles.** The saved title would differ from the one typed.

**Knock-ons for other tickets**

- *How is Profile Lineage shown and navigated?* owns "go back to a Superseded Profile". Since `POST` dedups, going back can't re-save the old content. It must either un-hide the old record and hide the current head, or open a draft. Whatever it picks must keep the Superseded rule (a hidden record whose child carries the revision marker) meaningful. The lineage can now show Revisions as a linear history and Forks as branches.
- *How does the operator delete, hide, and restore profiles?* must treat **Superseded Profiles as a third kind of hidden record**, separate from operator-hidden and Bridge-retired ones. A Hidden view shouldn't list them; they belong to the lineage. Restoring the original of a Bundled Profile now means bringing back a Superseded root. Deleting the current Revision raises the question of what happens to its Superseded ancestors.
- *Where does profile authoring live in the app, and what are its entry points?* hosts Save, Save as new, and Duplicate, and decides how Forks sit next to their parent in the library list.
- *Which Bridge changes does the spec depend on, and how do we ask for them?*: the two `PUT` and `POST` gaps are now **designed around**, so neither is required upstream. Two nice-to-haves remain:
  - a `POST` response that says whether the record already existed (e.g. `200` or `created: false`), replacing the Skin's inference;
  - an atomic "save Revision", or a `PUT` that keeps lineage. Today's Revision is two requests and not atomic.
- *How does editing relate to the Active Profile and the dial-in loop?*: saving makes a new record with a new id. Whether a Save also updates the **Active Profile** belongs to that ticket.
