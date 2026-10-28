# How does the operator delete, hide, and restore profiles?

Type: grilling
Status: resolved
Blocked by: 06, 09
Map: [Profile authoring in Cockpit](../map.md)

## Question

The Bridge soft-deletes operator profiles, can only hide **Bundled Profiles**, can restore either, and can purge permanently. Decide how the Skin presents this on a touch screen:

- **Destructive actions**: confirm dialogs or undo toasts?
- **Where hidden and deleted profiles go**: a filter, a "trash" view, or nothing?
- **Restoring Bundled Profiles**: how they are restored via `/profiles/defaults`.
- **Purge**: whether it is exposed at all.
- **Active Profile**: what happens if the profile being deleted is the **Active Profile**?
- **Lineage**: how deleting interacts with **Profile Lineage**, e.g. deleting a parent.

## Context from research

From [What does the Bridge's profile write API accept…](01-bridge-profile-write-api.md):

- **Bundled Profiles**: DELETE hides; `deleted` and purge return 400.
- **`includeHidden=true` also returns deleted profiles.**
- **Re-creating content identical to a deleted profile returns the deleted record** (`POST` dedups and ignores visibility), so "create" can silently resurrect into the trash.
- **Not-found codes are inconsistent** across endpoints (404, 400, or 500).

From [Does the tablet's Bridge expose the profile write endpoints?](04-tablet-bridge-endpoints.md):

- **Every hidden profile on the tablet was hidden by the Bridge, not the operator.** All 13 are Bundled Profiles the Bridge retired as stale: 9 of them during the v0.7.11 → v0.8.8 upgrade, which replaced their content under new ids. A "Hidden" view would mostly show these old bundled versions.
- **A retired Bundled Profile can leave the manifest** ("Rao Allongé 3"), so restore-by-filename via `/defaults` can't bring it back. Only a visibility change can.
- **Bridge upgrades rewrite the Bundled side of the library**, so a fork whose `parentId` points at a bundled id can end up parented to a hidden record.

From [What does Save do to a profile and its lineage?](06-save-semantics-and-lineage.md):

- **There are three kinds of hidden record**:
  - **Superseded Profiles**: replaced by a **Profile Revision**, identified by a child carrying the revision marker in `metadata`;
  - profiles the operator hid;
  - Bundled Profiles the Bridge retired.
  A Hidden view shouldn't list Superseded Profiles, which belong to the lineage.
- **Restoring a Bundled Profile's original** after the operator revised it means bringing back the Superseded root of that lineage. The two copies then share a title, which is tolerated, because titles are only checked for uniqueness at save time.
- **Still open here**: what deleting the current Revision does to its Superseded ancestors.
- **A collision on Save** with a hidden or deleted record offers to restore it, so restore must work from that prompt too.

From [Where does profile authoring live in the app, and what are its entry points?](09-app-placement-and-entry-points.md):

- **Hide and Delete live behind ⋯ in the Library's detail pane.**
- **The list has filter chips** (All · Yours · Espresso · Pour-over · Other). A chip is one candidate home for hidden and deleted profiles.
- **Forks nest under their visible parent.** A Fork whose parent is hidden or deleted becomes a top-level row.
- **The loaded profile is marked in the list** with a green dot and a Loaded badge, and a strip above the Library always shows it.

From [What happens to a Profile Draft when the operator leaves the editor?](10-draft-lifecycle.md):

- **The Skin keeps one Profile Draft at a time**, stored on the tablet. Its profile shows a **Draft** badge in the list and detail pane while it has unsaved changes.
- **Still open here**: what deleting or hiding that profile from the ⋯ does to its waiting draft. The options are to warn, discard it, or keep it as a would-be Fork.
- **A source deleted or hidden elsewhere** (on another device): the draft currently keeps its edits, and Save acts as Save as new. This ticket can refine that.

## Comments

**2026-10-26 — claimed.** Grilling session in progress on branch `t3/wayfinder-11-delete-hide-restore`.

**2026-10-26 — decided with the operator.** Six questions, one at a time, each with a recommendation. The operator took the recommendation every time. Smaller calls I settled myself, as the operator prefers, and they're marked *(best judgment)* in the Answer.

1. Removal actions: one per kind, **Hide** for a Bundled Profile and **Delete** for the operator's own (option a). Rejected: Hide and Delete both on the operator's profiles; one word ("Remove") for both.
2. Asking first: neither asks. The profile goes at once, with an **Undo** toast (option a). Rejected: a confirm every time; a confirm only when the profile is loaded, has Forks, or has a waiting draft.
3. Where removed profiles go: a **Removed (N)** row at the end of the list (option a). Rejected: a sixth filter chip; nowhere, so only the toast could bring a profile back.
4. Purge: not offered (option a). Rejected: "Delete forever" on profiles with no children; a bulk "Empty".
5. Lineage: Delete removes only the visible record (option a). Rejected: un-hiding the version it replaced; cascading to Superseded ancestors.
6. The loaded profile: it can be removed, and the toast says it stays loaded (option a). Rejected: blocking it while loaded; a confirm just for it.

## Answer

**Removing a profile in Cockpit is always soft and always reversible.** A Bundled Profile is hidden and any other profile is deleted, both through the Bridge's `DELETE`. It goes at once with an **Undo** toast, then waits in a **Removed** list until it's restored. Cockpit never purges. Removing a profile touches nothing else: not its lineage, its Forks, the Workflow, or a waiting draft. Everything below works on today's Bridge (Decaid v0.8.8) with no upstream change.

**What the Bridge does** (decaid `main` `f2248a75`, `lib/src/controllers/profile_controller.dart`)

- **`DELETE /api/v1/profiles/{id}`** hides a Bundled Profile and soft-deletes any other (`delete`). Both are reversible with `PUT …/{id}/visibility {"visibility":"visible"}` (`setVisibility`), which also bumps `updatedAt`.
- **On every launch, the Bridge re-hides any visible Bundled record that isn't the manifest's current version** (`_retireStaleDefaults`). A **Retired Bundled Profile** therefore can't be kept visible: a restore lasts only until the Bridge next starts.
- **Seeding leaves a hidden current version hidden.** When a Bridge update changes a Bundled Profile's content, though, the new version is stored visible under a new id. The hidden old one then counts as retired.

**Actions**

- **One action per profile, in the detail pane's ⋯**:
  - **Hide** on a Bundled Profile;
  - **Delete** on any other profile, including the operator's Revision of a Bundled one.
  - Both send the Bridge's `DELETE`, and both can be restored.
  - ⋯ keeps the action two taps away, even though it holds one item *(best judgment)*.
- **No confirm.** The profile goes at once, and a toast offers **Undo**:
  - "Deleted *House* · Undo";
  - "Hid *Londonium* · Undo";
  - on the loaded profile: "Deleted *House* · still loaded for the next shot · Undo".
  - The toast stays up about 8 seconds, longer than sonner's 4-second default, for the 7" screen *(best judgment)*.
- **Undo is Restore.** It sets the record back to `visible`.
- **After a removal, the Library selection moves to the next row** *(best judgment)*.
- **Library actions stay available while the machine is busy** (ticket 07). Removing and restoring write only the library.
- **A "not found" reply** (404, 400, or 500, since the Bridge is inconsistent) means the profile was already removed elsewhere. Cockpit refetches and says "*House* was already removed" *(best judgment)*.

**The Removed list**

- **A "Removed (N) ›" row at the end of the Library list**, shown only while N > 0. It ignores the filter chips and counts every removed profile *(best judgment)*.
- **Tapping it swaps the list column to the removed profiles**, with "← Profiles" at the top.
  - Most recently removed first, by `updatedAt` *(best judgment)*.
  - The detail pane shows the chart, meta line, and notes. Its only action is **Restore** *(best judgment)*.
  - After Restore, the column returns to the full list with the restored profile selected and scrolled into view *(best judgment)*.
- **What it lists** (one `GET /api/v1/profiles?includeHidden=true`, classified in the Skin):
  - the operator's deleted profiles (`deleted`);
  - Bundled Profiles the operator hid;
  - anything another app hid.
- **What it leaves out**:
  - **Superseded Profiles**, which belong to the lineage (ticket 06's rule: a hidden record with a child carrying the revision marker);
  - **Retired Bundled Profiles**, because the Bridge would re-hide them at its next launch.
- **Telling retired from hidden without hashing** *(best judgment)*. A hidden Bundled record is retired when either:
  - its `metadata.filename` is gone from `GET /api/v1/profiles/defaults`, or
  - a Bundled record with the same filename was created after it (`createdAt`).
  - On the operator's tablet today, all 13 hidden records are retired, so there's no Removed row.

**Restore**

- **Restore sets visibility to `visible`** for both kinds. `POST …/restore/{filename}` and `/defaults` add nothing here, because startup seeding always keeps the current version's record. `/defaults` is read only to spot retired records.
- **The profile returns exactly as it was**: same id, same lineage, and its Forks nest under it again.
- **A Restore that duplicates a visible title is allowed**, following ticket 06 (clashes that arise without a Save are tolerated). The toast says "Restored *House* · another profile has this title" *(best judgment)*. Which of the two the Active Profile then belongs to is left to *What happens when two visible profiles share a title?*
- **The Save collision prompt** ("Identical to *X* (deleted) → Restore", ticket 06) uses the same Restore.

**Purge**: not offered anywhere. Removed records cost almost nothing. Purging would leave children with a `parentId` that points at nothing, and could set up the Bridge's self-parent lineage hang. Bundled Profiles can't be purged anyway.

**Lineage and Forks**

- **Delete removes only the visible record.** Its Superseded ancestors stay hidden in its lineage and keep counting as Superseded, so they stay out of the Removed list. Restore brings back the profile with its history intact.
- **Deleting the operator's Revision of a Bundled Profile** takes that profile out of the list entirely. The Bundled original stays Superseded. To get it back: Restore, then History, then go back (ticket 13).
- **Forks are never touched.** A Fork whose parent is removed becomes a top-level row (ticket 09). Its meta line reads "Copy of *House* (removed)" *(best judgment)*.

**The loaded profile**

- **It can be hidden or deleted like any other.** The Workflow keeps its copy, so the next shot still runs it.
- **The loaded-profile strip then reads "Not saved"**, because no visible profile has its title (tickets 07 and 09). Edit loaded still works.
- **Save on it** creates a new profile (ticket 07). If the content still matches the removed record, the collision prompt offers to restore it instead.

**A waiting draft of a removed profile** *(best judgment)*

- **The draft is left alone.** Nothing asks first, as for any removal.
- **It follows ticket 10's "source gone" rule**: the draft keeps its edits, and Save makes a new profile, a Fork of the removed record.
- **Its title stays as it is**, since a removed profile's title is free.
- **Restoring the profile reconnects the draft** (same id), and the normal merge applies.

**Rejected**

- **Hide and Delete both on the operator's profiles.** Two soft states that act the same, and the operator has to tell them apart.
- **One word for both.** It hides that a Bundled Profile can't be deleted.
- **A confirm every time, or only when it's risky.** Nothing is lost: Undo and the Removed list cover every case, and the action is already two taps deep.
- **A "Removed" filter chip.** The chip row already measures about 450px in a 340px column, so a sixth chip would start off-screen. It would also mix visibility into a row of beverage-type filters.
- **No Removed list.** Missing the toast would mean losing the profile in Cockpit for good.
- **Purge, in either form.** It breaks lineage, and nothing needs it.
- **Delete un-hiding the version it replaced.** It turns Delete into "undo my last Revision", and going back belongs to ticket 13.
- **Delete cascading to ancestors.** More requests, and nothing visible changes.
- **Blocking removal of the loaded profile, or a confirm just for it.** The Workflow copy is unaffected, and the strip already explains the state.
- **Listing Retired Bundled Profiles for restore.** The Bridge re-hides them at its next launch.

**Knock-ons for other tickets**

- *How does the step editor lay out at 1024×600?*: the strip below the header needs a line for a draft whose profile was removed: "*House* was removed. Save makes a new profile."
- *How is Profile Lineage shown and navigated?*:
  - getting a Bundled original back after deleting the operator's Revision takes Restore, then History, then go back. Should History also be reachable from the Removed list?
  - the lineage returns deleted records, Retired Bundled Profiles, and Superseded ones, and the view has to show them;
  - a lineage can now end in a removed head.
- *Which Bridge changes does the spec depend on, and how do we ask for them?*: three new gaps:
  - **a hide or Revision of a Bundled Profile doesn't carry over** when a Bridge update changes its content. The new version arrives visible, sometimes with the same title as the operator's Revision;
  - **retired versions can't be kept**, because seeding re-hides them at every launch;
  - **retired can only be told apart from hidden by inference**. Nice-to-have: mark retired records in `metadata`, or have `/defaults` return each entry's current id.
- **New ticket**: *What happens when two visible profiles share a title?* Tolerated clashes (a Restore, a Superseded Profile brought back, a Bridge update) break ticket 07's "at most one match" for the Active Profile.
