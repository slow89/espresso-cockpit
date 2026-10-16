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
- **Bridge upgrades retire bundled versions under new ids.** A lineage reaching back to a Bundled Profile can therefore hit a hidden, superseded version after an upgrade.
