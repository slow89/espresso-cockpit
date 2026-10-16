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
