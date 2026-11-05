# How is Profile Lineage shown and navigated?

Type: prototype
Status: resolved
Blocked by: 06, 09
Map: [Profile authoring in Cockpit](../map.md)
Prototype: branch `prototype/lineage-view` (commit `d075a80`) → `/workflows?lineage=A|B|C`

## Question

Given the save semantics, how does the operator see a profile's **Profile Lineage** (parents and children) at 1024×600?

- **Viewing history**: how the chain is laid out on screen.
- **Comparing**: what changed between two versions, if anything is shown at all.
- **Going back**: does "go back" make an older version active, make it the head of the lineage, or start a new **Profile Draft** from it?
- **Bundled origins**: how lineage reaching back to a **Bundled Profile** is shown.

Build a rough prototype and decide with the operator.

## Context from research

From [What does the Bridge's profile write API accept…](01-bridge-profile-write-api.md):

- **Response shape**: lineage returns `[root…parent, self, descendants]`, includes hidden and deleted records, excludes siblings, and stops silently at a missing ancestor.
- **Orphaned children**: execution-changing `PUT`s orphan children.
- **Self-parent cycle**: a rare cycle can make the lineage request hang.

From [How do existing DE1 profile editors lay out step editing?](03-editor-prior-art.md): Bridge-era skins (streamline-js) already ship version history and "Restore original" on top of the Bridge lineage API. Their surfaces are linked in the research doc.

From [Does the tablet's Bridge expose the profile write endpoints?](04-tablet-bridge-endpoints.md):

- **Lineage is almost empty today.** Only one record on the tablet has a `parentId` (bundled provenance: Adaptive v3 → v2). Every other lineage is a single record.
- **Bridge upgrades retire bundled versions under new ids.** A lineage reaching back to a Bundled Profile can therefore hit a hidden, Bridge-retired version after an upgrade. (Not a **Superseded Profile**: that term is reserved for a record a **Profile Revision** replaced.)

From [What does Save do to a profile and its lineage?](06-save-semantics-and-lineage.md):

- **Save makes Profile Revisions.** Step changes `POST` a child carrying a revision marker in `metadata`, then hide the source as a **Superseded Profile**. **Save as new** and Duplicate make **Profile Forks**, which carry no marker and leave the source visible. The lineage can show Revisions as a linear history and Forks as branches.
- **Going back can't re-save old content**, because `POST` dedups and returns the Superseded record. This ticket owns what "go back" does: un-hide the old record and hide the current head, or open a draft. Either way, keep the Superseded rule meaningful: a hidden record whose child carries the revision marker.
- **A collision on Save offers "go back"**: a draft whose Steps match a Superseded Profile in its lineage offers to go back to that version. Same action, same semantics.
- **No automatic repair on load.** A Superseded Profile the operator brought back stays visible.

From [Where does profile authoring live in the app, and what are its entry points?](09-app-placement-and-entry-points.md):

- **History opens from the Library's detail pane.**
- **The list already nests Forks under their visible parent**, so the lineage view needn't be the only place Forks are visible.
- **After Save, the Library selection moves to the new Revision or Fork.**

From [What happens to a Profile Draft when the operator leaves the editor?](10-draft-lifecycle.md):

- **There is one editor draft at a time.** A "go back" that opens a draft replaces it, so the replace confirm applies when the current draft has unsaved changes.
- **A draft whose source was revised on another device** merges against the newest visible Revision in the lineage.

From [How does the operator delete, hide, and restore profiles?](11-delete-hide-restore.md):

- **Delete removes only the visible record.** Its Superseded ancestors stay hidden and keep counting as Superseded. A lineage can therefore end in a deleted head.
- **Getting a Bundled original back after deleting the operator's Revision** takes Restore (from the Removed list), then History, then go back. Decide whether History is also reachable from the Removed list's detail pane, which today offers only Restore.
- **The lineage response includes deleted records, Retired Bundled Profiles, and Superseded ones.** The view has to tell them apart. A Retired Bundled Profile can't be made visible for long: the Bridge re-hides it at every launch.
- **Restore tolerates a title clash.** So may a go-back that brings back a Superseded Profile. How Cockpit handles two visible profiles with one title is [What happens when two visible profiles share a title?](16-duplicate-visible-titles.md), which waits on this ticket.

From [How does the step editor lay out at 1024×600?](12-step-editor-layout.md):

- **The editor has a new Step chart**: one equal-width column per Step, showing the target (jump or ramp), cap, temperature, and how each Step ends. It reads at about 108px tall, so a compare between two versions could stack two of them.
- **The Library's detail pane keeps `workflow-frame-chart`** (ticket 09), so the two charts differ.

## Comments

**2026-11-01 — claimed.** Prototype session in progress on branch `t3/wayfinder-13-lineage-view`.

**2026-11-01 — prototype built.** Branch `prototype/lineage-view`, built on ticket 09's Library prototype (`prototype/app-placement`) with ticket 12's Step chart. **History** in the detail pane opens the variant named by `/workflows?lineage=A|B|C`, and the pink pill at the top switches it. Run it with:

```
pnpm exec tsx tests/gateway/server.ts --host 127.0.0.1 --port 18081
VITE_BRIDGE_URL=http://127.0.0.1:18081 pnpm dev --host 127.0.0.1 --port 3013
```

- **Fixtures** (in-memory, nothing is written to the Bridge):
  - **House**: five Revisions from 2 Sep to 31 Oct, covering a pressure change, every Step +1 °C, a longer Soak plus an added Decline, and a flow change. A Fork, *House decaf*, was copied from the 12 Oct version.
  - **Londonium**: two Revisions of the Bundled Profile, plus *Londonium slow ramp*, a Fork of the Bundled original.
  - **Gentle and sweet**: a Revision of a Bundled Profile that the Bridge has since retired. The Bridge's new version sits in the Library under the same title.
- **Go back** really swaps visibility in the prototype's store and loads the profile into the fake gateway's Workflow when it's the loaded one. **Open as draft** opens ticket 09's editor stub.

The variants:

- **A: History in the list column.** It swaps the Library's list for the versions, newest first, like the Removed list. Each row shows the date, badges, and a one-line summary of the save. Copies sit under the version they came from, and the origin is at the foot. The detail pane shows the version's chart, with a change list beside it that switches between "What this save changed" and "Going back changes". The actions sit underneath.
- **B: Full-screen compare.** Covers the nav, like the editor. A 208px rail of dates sits on the left. On the right, the selected version's Step chart sits above the current one, changed Steps are outlined, and the "Going back changes" list sits below.
- **C: Timeline, expand in place.** Takes the whole Library body: a rail of dots, one row per version, and Copies as chips on the right. Tapping a row expands it in place to show its Step chart, changes, and actions.

Findings while building:

- **`/lineage` can't draw this view on its own.** It leaves out siblings, so it omits Forks of earlier versions and any branch below an ancestor. It also returns 500 for an unknown id and can hang on a self-parent cycle. The prototype builds History from the whole library instead.
- **Ticket 06's Superseded rule doesn't survive going back by swap.** The version gone back from is hidden, but no child of it carries the revision marker, so the rule would put it in the Removed list.
- **Open as draft can't restore a version exactly.** Unchanged, it `POST`s content that already exists, so the Bridge dedups to the old record. Ticket 06's collision prompt then offers to go back anyway.
- **A Fork of an earlier version drops to the top level of the Library.** Its parent is a Superseded record, which ticket 09's nesting rule doesn't see. *House decaf* showed this.
- **A retired Bundled origin needs its own state.** Making it visible would last only until the Bridge next starts.
- **The change summaries read well as text.** Matching Steps by name keeps an added Step from marking every later Step as changed. A shift of every Step's temperature reads better collapsed into one line.

**2026-11-01 — decided with the operator.** I asked two questions at once: which layout, and what going back does. I recommended A and "Go back only". The operator chose both.

- **Layout: A.** Rejected: B and C.
- **Going back: Go back only.** Rejected: Open as draft only, and both side by side.

Smaller calls I made while building are marked *(best judgment)* in the Answer.

**2026-11-03 — refined by [What happens when two visible profiles share a title?](16-duplicate-visible-titles.md).** "Going back brings the version back exactly as it was, title included" below is replaced. **Going back changes only what the machine runs**: Cockpit copies the current title, author, and notes onto the version with a title-only `PUT` before swapping visibility. A Bundled original whose title another visible profile holds can't be gone back to. Restore this version carries the removed profile's title the same way, then renames on a clash like Restore.

## Answer

**History swaps the Library's list column for the profile's versions, and the detail pane shows the selected version and what changed. Going back makes an older version current again by swapping which record is visible.** No record is written, every version stays in History, and going back can be undone. Everything below works on today's Bridge (Decaid v0.8.8) with no upstream change. The decision is Variant A on branch `prototype/lineage-view`, without its Open as draft button. Why going back swaps visibility is recorded in [ADR 0004](../../../docs/adr/0004-going-back-swaps-visibility.md).

**Opening History**

- **From History in the Library's detail pane** (ticket 09).
- **Also from the Removed list's detail pane**, next to Restore, which answers ticket 11's open question *(best judgment)*. See **Removed profiles** below.
- **History takes over the list column** (340px), like the Removed list (ticket 11):
  - the top row reads "← Profiles · History of *House*";
  - the filter chips are hidden while it shows;
  - ← Profiles returns to the full list with the profile's current version selected and scrolled into view *(best judgment)*.
- **The open History survives leaving the tab and coming back**, like the Library's selection, chip, and segment (ticket 09) *(best judgment)*.

**What History lists**

- **Every version of the profile.** These are the records joined to it by Revision edges, where the child carries the revision marker (ticket 06), from its first version to its newest. That includes a branch, where two Revisions share one parent.
- **Newest first, by save time** (`createdAt`).
- **Title or notes edits never show up as versions.** They update in place (ticket 06).
- **Each row is at least 52px tall** and shows:
  - the save date and time;
  - badges: **Current** (the visible one), **Bundled** (a Bundled record), **Retired** (a Retired Bundled Profile), **Removed** (a deleted version);
  - one line saying what that save changed against the version it was saved from, such as "Pour · target 8.5 bar → 9 bar" or "Soak · seconds 8 s → 12 s +1 more". The first version reads "First version", and a Bundled original reads "Bundled original".
- **Copies sit under the version they were copied from**, as an indented row: "↳ Copied to *House decaf* ›". Tapping it closes History and selects that Fork in the Library.
- **The origin closes the list**:
  - "Created 2 Sep";
  - "Copied from *House*, version of 12 Oct". Tapping it opens *House*'s History at that version *(best judgment)*;
  - "Bundled with the Bridge as *Londonium*".
- **Links the Bridge makes between Bundled records** (Adaptive v3 → v2, with no revision marker) are Bridge provenance, not the operator's history, so they aren't shown *(best judgment)*.

**Where History comes from** *(best judgment)*

- **Cockpit builds History from the library.** It uses the same `GET /api/v1/profiles?includeHidden=true` the Removed list already reads and follows each record's `parentId`. It doesn't call `GET …/{id}/lineage`. Following `parentId` reads the Bridge's data and adds no Bridge policy.
- **Why not `/lineage`**: it leaves out siblings, so Forks of earlier versions and branches would be missing. It also returns 500 for an unknown id and can hang on a self-parent cycle.
- **The walk keeps a visited set**, so a cycle ends it, and a missing parent ends it the same way `/lineage` does.

**Detail pane** (the selected version)

- **Header**: the title as that version had it, its badges, and a meta line ("Saved 12 Oct, 07:40 · 3 Steps").
- **Chart**: `workflow-frame-chart` in its tablet layout, the same as the Library's detail pane.
- **Change list**, about 250px beside the chart, with a two-way switch:
  - **What this save changed**: against the version it was saved from. This is the default.
  - **Going back changes**: from the current version to this one, which is exactly what Go back would do. It's disabled on the current version.
- **How changes are written**:
  - one field per line: "Pour · target 8.5 bar → 9 bar", "Added Step 4 Decline", "Removed Step 4 Decline", "Tank preheat 0 → 40";
  - Steps are matched by name, then by position, so inserting a Step doesn't make every later Step read as changed *(best judgment)*;
  - a temperature shift on every Step collapses to one line, "Every Step +1 °C" *(best judgment)*.
- **Compare is limited to "against the previous version" and "against the current one".** There's no way to pick two arbitrary versions *(best judgment)*.
- **Actions**: a single primary action, with the reason strip above it when it's disabled (as in ticket 09):
  - **Go back to this version** on an older version, or **Go to this version** on a newer one *(best judgment)*;
  - **Go back & use** when the profile is loaded (see below).
  - There's no Use, Edit, or Duplicate here. Go back, then use the Library's actions *(best judgment)*.

**Going back**

- **Going back makes the selected version current.** Cockpit sets it `visible`, then sets the current version `hidden`. No record is written and no version is lost.
  - **Un-hide first** *(best judgment)*, so a failure leaves both versions visible rather than neither.
  - **If the hide fails**, Cockpit retries once, then says both versions are now visible. That matches ticket 06's partial failure, and as there, nothing repairs it automatically.
- **The Superseded rule widens.** A hidden record is a **Superseded Profile** when it carries the revision marker *or* one of its children does. So the version gone back from stays in History and out of the Removed list.
  - Bundled records never carry the marker, so ticket 11's sorting of hidden Bundled records is unchanged.
  - If another app hides one of Cockpit's Revisions, Cockpit now reads it as Superseded. That is accepted.
  - A deleted record is still always a **Removed Profile**, and **Retired** takes precedence over Superseded.
- **In the Library**, the older version takes the profile's place, its Forks nest under it, and the selection moves to it.
- **A toast offers Undo**: "*House* is back to the version of 12 Oct · Undo". It stays up for about 8 seconds, as in ticket 11. Undo makes the same swap in reverse.
- **Going forward** is the same action. Newer versions stay listed above the current one, and Go to this version on one swaps back.
- **On the loaded profile, the action is Go back & use.** It also loads the version into the Workflow, as Save does on the loaded profile (ticket 07).
  - It's disabled during a shot, with "Available when the shot ends". The whole action waits, not only the Workflow write *(best judgment)*.
  - If the loaded copy has unsaved changes ("Differs from saved"), it asks first: "*House* has unsaved changes. Going back discards them." This is ticket 07's confirm *(best judgment)*.
- **On any other profile**, going back changes only the library.
- **A waiting draft of the profile** follows ticket 10's merge rule, because going back is a change made outside the editor. Fields the draft didn't touch take the older version's values. Overlaps ask when the editor next opens: Start over from current, or Keep my edits *(best judgment)*.
- **Editing after going back is ordinary editing.** Save makes a Revision of the version gone back to, so History branches: 12 Oct → 20 Oct (gone back from) and 12 Oct → the new save. Both are listed by save time, and each summary is against its own parent.
- **Ticket 06's collision prompt uses this action.** When a draft's Steps match an earlier version, it reads "Same as the version from 12 Oct · Go back". On the loaded profile it is Go back & use.
- **A Bundled original can be gone back to.** That un-hides it, so the profile shows the Bundled badge again and its title and notes lock again (ticket 06). The operator's Revisions stay in History. This is Cockpit's "Restore original".
- **A Retired Bundled version can't be gone back to.** The Bridge would hide it again at its next launch.
  - The button is disabled with "A Bridge update replaced this version".
  - If the Bridge's current version of that Bundled Profile is in the Library (the same `metadata.filename`), the detail pane links it: "Current Bundled version: *Gentle and sweet* ›" *(best judgment)*.
- **Going back brings the version back exactly as it was, title included.** Title edits update in place (ticket 06), so an older version can carry an older title. Cockpit doesn't copy the current title onto it *(best judgment)*. A clash that results is ticket 16's.

**Removed profiles** *(best judgment)*

- **The Removed list's detail pane gets History** next to Restore.
- **On a removed profile, the action reads Restore this version.** It sets that version `visible` and moves the removed version from `deleted` to `hidden`. The removed version then carries the marker and counts as Superseded, so it leaves the Removed list.
- **Getting a Bundled original back after deleting the operator's Revision** becomes: Removed → History → the Bundled original → Restore this version. Before, it took Restore, then History, then Go back.

**Forks in the Library** *(best judgment; refines ticket 09)*

- **A Fork nests under the visible version of the profile it was copied from**, not only under its exact parent record. Since Save makes Revisions, a Fork's parent is usually a Superseded version, and without this every Fork of an edited profile would drop to the top level.
- **A Fork drops to the top level only when that profile has no visible version.**
- **The meta line still reads "Copy of *House*".**

**Rejected**

- **B, full-screen compare.** Stacked Step charts with outlined Steps compare well, but it leaves the Library and covers the nav for a view that is mostly read. The change list already carries the comparison.
- **C, timeline expanding in place.** An expanded row pushes the rest of the list off a 600px screen, and only about five rows fit.
- **Open as draft** (streamline-js): it can't restore a version exactly, because the `POST` dedups to the old record. A draft whose content differs from its own source also muddies ticket 10's rule that a draft is unsaved when it differs from its base.
- **Offering both Go back and Open as draft.** Two ways to do one thing, and one of them can't finish the job.
- **Writing a new record to go back.** The Bridge dedups the `POST`, so it's impossible.
- **Marking the version gone back from** in its `metadata`. It costs a third request, and the widened Superseded rule already covers the case.
- **Building History from `/lineage`.** It leaves out siblings, returns 500 for an unknown id, and can hang.
- **Comparing any two versions.** Picking two versions costs another selection mode, and comparing against the previous version and against the current one covers the dial-in loop.

**Knock-ons for other tickets**

- *What happens when two visible profiles share a title?*:
  - **Going back never leaves two versions of one profile visible**, because it swaps them. The "Superseded Profile brought back" case in its question becomes one where going back brings back an **older title** that may clash.
  - **Restore this version** from the Removed list can clash the same way Restore does.
  - The Bundled case remains: going back to a Bundled original while the Bridge's newer version of it is visible.
- *Which Bridge changes does the spec depend on, and how do we ask for them?*:
  - **Designed around, not required upstream**: `/lineage` leaving out siblings, its 500 on an unknown id, and its self-parent hang. Cockpit builds History from the library and guards cycles itself.
  - **Nice-to-haves surfaced**:
    - an atomic visibility swap, since going back is two requests;
    - a `/lineage` that returns the whole tree, siblings included.
- **CONTEXT.md**: the **Superseded Profile** definition now covers a version the operator went back from.
- **Not yet specified**: nothing graduates and nothing new appears.
