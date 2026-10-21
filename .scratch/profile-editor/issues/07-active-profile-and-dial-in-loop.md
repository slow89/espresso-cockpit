# How does editing relate to the Active Profile and the dial-in loop?

Type: grilling
Status: resolved
Blocked by: 01
Map: [Profile authoring in Cockpit](../map.md)

## Question

The **Active Profile** is a copy embedded in the **Workflow**, not a reference into the **Profile Library**. The common real-world loop is: pull a shot, tweak the profile, pull again. Decide how editing fits that loop:

- Can the operator open "edit what's loaded" directly from the **Active Profile**, even when it no longer matches any library record?
- Does saving a profile make it the **Active Profile** automatically, ask first, or never?
- Is there a "try without saving" path that pushes a **Profile Draft** to the **Workflow** for the next **Shot** without writing to the library?
- What is blocked or deferred while the machine is mid-shot or not idle: opening the editor, saving, or applying?
- How does the Workflow's dose and yield relate to the profile's own target weight while editing? Research found that profile `target_weight` is **dead at runtime**: only the Workflow's `targetYield` stops the shot. So decide whether the editor hides it, shows it read-only, or deliberately syncs it into the Workflow.

Context: `PUT /api/v1/workflow` *merges* profile fields (omitted keys keep their old values; `steps` is replaced whole), so any apply path must send complete profiles.

From [What does the Bridge's profile write API accept…](01-bridge-profile-write-api.md):

- The Workflow holds **no profile id**, so "is the Active Profile this library record?" can only be answered by comparing content.
- A Workflow profile change uploads to the machine **immediately, with no idle or shot check**. Mid-shot, the saved Shot then records the new profile. Research recommends applying only when the Bridge reports idle.

From [How do existing DE1 profile editors lay out step editing?](03-editor-prior-art.md):

- **Bridge-era skins** offer "Try / Use for shot" without saving.
- **de1app's "Ok"** applying without saving is a known source of surprise.

From [Does the tablet's Bridge expose the profile write endpoints?](04-tablet-bridge-endpoints.md):

- **The Active Profile already drifts from the library.** On the operator's tablet, the Workflow's "Blooming Espresso" matches no library record. Every Step runs 9.5 °C cooler than the library copy, because Cockpit's dashboard brew-temperature control rewrites Step temperatures in the Workflow copy (`src/components/dashboard/dashboard-view-model.ts:164-178`). So "edit what's loaded" with no library match is the normal case, not an edge case.

From [What does Save do to a profile and its lineage?](06-save-semantics-and-lineage.md):

- **Every Save that changes Steps makes a new record with a new id** (a **Profile Revision** or a **Profile Fork**). The old record is hidden or left as it was, never rewritten. Whether a Save also updates the **Active Profile** belongs to this ticket.
- **Dial-in back-and-forth** (9.0 → 9.2 → 9.0 bar) makes the second Save collide with the Superseded 9.0 version. It writes nothing and offers to go back to that version.

## Comments

**2026-10-18 — claimed.** Grilling session in progress on branch `t3/wayfinder-07-active-profile`.

**2026-10-20 — grilling with the operator.** Seven questions, one at a time, each with a recommendation. The operator took the recommendation every time:

1. Which library profile the Active Profile belongs to: the visible profile with the same title (option a). Content only decides a "Differs from saved" badge. Rejected: exact content match, and a source id kept in the Workflow's `context.extras`.
2. Whether Save updates the Workflow: Save follows the Active Profile, and a separate **Save & use** loads any other profile (option a). Rejected: always, ask every time, never.
3. Where the loaded profile's draft starts: always from the Workflow copy, with **Revert to saved** (option a). Rejected: a separate library entry seeded from the library record, and always seeding from the library record.
4. Trying an edit without saving: **Use for next shot** writes the Workflow only (option a). Rejected: no trial path, and a one-shot trial that reverts after the shot.
5. Busy machine: Workflow writes are disabled with the reason shown (option a). Rejected: queueing until idle, and blocking only during a shot.
6. Replacing unsaved changes: Choose Profile asks first (option a). Rejected: no warning, and quietly stashing the replaced trial.
7. The profile's `target_weight`: hidden and preserved (option a). Rejected: read-only display, and copying it into the Workflow's yield.

At the confirmation summary the operator also agreed to two rules that follow from these but weren't asked directly: a title-only Save on the loaded profile updates the Workflow's title too, and the confirm from question 6 covers every action that loads a different profile.

## Answer

**The Workflow's copy is the working copy of the loaded profile. Editing starts from it, trials load into it, and Save writes the library and the Workflow together. Cockpit never changes it while the machine is busy, and never discards unsaved changes in it without asking.** Everything below works on today's Bridge (Decaid v0.8.8) with no upstream change.

**Which profile is loaded**

- **The Active Profile belongs to the visible profile with the same title.** Hidden, deleted and Superseded records don't count. Titles are unique among visible profiles, so there is at most one match.
- **Content decides only the "Differs from saved" badge.** The badge shows when the Active Profile's content differs from its match, whatever the cause: a loaded trial, or drift from the Brew temperature control. The Skin compares content; it never computes ids.
- **No title match means no saved version.** "Edit what's loaded" still works. Save creates a new profile, and Revert to saved isn't offered.
- **Accepted edge.** If another client renames the loaded profile in the library, or loads a profile under a title that matches nothing, the link is lost until the titles match again.

**Drafts of the loaded profile**

- **One profile, one draft.** Opening the loaded profile from anywhere (the Active row, the library list, a later shortcut from Brew) seeds the draft from the Workflow copy, so drift is carried in.
- **"Edit what's loaded"** is offered on the Active Profile, whether or not it has a saved version.
- **Revert to saved** resets the draft to the library version. When the Workflow copy differs from it, Revert also writes the library version to the Workflow. It's one visible tap.

**Saving and loading**

- **Save on the loaded profile's draft** does what [What does Save do to a profile and its lineage?](06-save-semantics-and-lineage.md) says (a Profile Revision, or an in-place title and notes update), then writes the saved content into the Workflow. That includes title-only Saves, so the title link holds.
- **Save on any other profile's draft** leaves the Workflow alone.
- **Save & use** saves another profile's draft, then loads it.
- **If Save ends on a collision**, nothing is written to the Workflow either.
- **Use for next shot** writes the draft into the Workflow only and leaves the library untouched.
  - It keeps the saved title; title changes land only through Save.
  - The trial stays loaded until it's saved, reverted, or replaced, and reopening the editor picks it back up.
  - The Active Profile then shows "Differs from saved".
- **Every Workflow write from the editor sends the complete `profile` and nothing else.** `PUT /api/v1/workflow` merges, and `steps` is replaced whole. Dose, yield, and the rest of `context` are never touched.

**Busy machine**

- **Workflow writes are disabled while the machine is running something**, with the reason shown ("Available when the shot ends"). This covers:
  - Use for next shot;
  - Save on the loaded profile's draft;
  - Save & use;
  - Revert to saved when it would write the Workflow;
  - picking from Choose Profile.
- **What counts as running** comes only from the machine state the Bridge reports.
  - Running: `espresso`, `skipStep`, `steam`, `steamRinse`, `hotWater`, `flush`, `cleaning`, `descaling`, `airPurge`, `calibration`, `selfTest`, `fwUpgrade`.
  - Free: `idle` (any substate, including warming up), `schedIdle`, `heating`, `preheating`, `sleeping`, and no machine connected. With no machine connected, the Bridge pushes the profile on the next connect.
  - `booting`, `busy`, `needsWater` and `error` weren't discussed. They default to disabled, the safe side, and `/to-spec` can revisit them.
- **Always available:** opening the editor, editing, saving profiles that aren't loaded, and every other library action. The operator can prepare the next tweak during a shot and load it when the shot ends.
- **No queueing.** Cockpit holds no pending writes and doesn't watch for state changes.

**Replacing unsaved changes**

- **Any action that loads a different profile asks first** if the loaded profile differs from its saved version or has none. Those actions are Choose Profile, Save & use, and Use for next shot from another profile's draft.
  - The confirm reads "*Title* has unsaved changes. Loading another profile discards them." It offers **Discard and load** or **Cancel**.
  - The confirm comes before anything is written; Cancel writes nothing.
- **With nothing unsaved**, the profile loads straight away, as Choose Profile does today.

**Yield and target weight**

- **The editor hides `target_weight`.** Revisions, Forks, and Use for next shot copy the stored value unchanged. Because it is part of the profile's hash, leaving it alone also avoids id churn.
- **Yield stays a Workflow setting** (`context.targetYield`), set on Brew and Shot setup as today.

**Rejected**

- **Exact content match to find the source.** Brew temperature drift is the common case, so Save would usually create a second profile with a clashing title.
- **A source id in `context.extras`.** It goes stale whenever another client loads a profile, and it would be a second record of provenance next to the Bridge's own data.
- **Save always loading, asking every time, or never loading.** Respectively: it swaps what's loaded when you edit for tomorrow; it puts a dialog on the most frequent Save; forgetting Use brews the old version silently.
- **Separate "edit loaded" and "edit saved" entries.** The same profile would behave differently depending on the button, and Save through the library entry would silently wipe the drift.
- **No trial path.** Every dial-in tweak would become a Profile Revision.
- **A one-shot trial that reverts after the shot.** Cockpit would have to watch for the shot's end and rewrite the Workflow itself, and a sleeping tablet or a closed page would miss the revert.
- **Queueing writes until idle.** The same orchestration, and a page reload loses the queued write.
- **Blocking only during a shot.** Nobody knows what the DE1 firmware does with profile writes during steam or hot water.
- **Replacing unsaved changes without warning, or stashing them quietly.** The first loses work; the second needs Skin-side draft storage, which belongs to *What happens to a Profile Draft when the operator leaves the editor?*
- **Showing `target_weight` read-only, or copying it into the yield.** The first shows a number that does nothing. The second overwrites the dialled-in yield on every load and re-implements de1app policy the Bridge deliberately dropped.

**Knock-ons for other tickets**

- *Where does profile authoring live in the app, and what are its entry points?* also hosts:
  - "Edit what's loaded" on the Active Profile;
  - the "Differs from saved" badge;
  - Use for next shot, Save & use, and Revert to saved;
  - the busy gate and the replace confirm on Choose Profile.
- *What happens to a Profile Draft when the operator leaves the editor?* is narrower now. A trial the operator loaded is already held by the Workflow. The ticket decides drafts that live only in the editor, and whether a replaced trial is stashed (the deferred option from question 6). "Starts a Shot from the machine" no longer threatens a loaded trial, since the Workflow isn't changed mid-shot.
- *Which fields does the editor expose, and what limits does the Skin enforce?*: `target_weight` is decided (hidden and preserved), so it drops out of field placement.
- *Which Bridge changes does the spec depend on, and how do we ask for them?*: Workflow uploads with no idle check are now designed around. Two nice-to-haves surfaced:
  - a Bridge-side guard on profile writes during a shot, which would protect every client;
  - a source profile id on the Workflow, which could replace title matching.
