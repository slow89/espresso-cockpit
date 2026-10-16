# How does the operator delete, hide, and restore profiles?

Type: grilling
Status: open
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
