# How is Profile Lineage shown and navigated?

Type: prototype
Status: open
Blocked by: 06, 09
Map: [Profile authoring in Cockpit](../map.md)

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
