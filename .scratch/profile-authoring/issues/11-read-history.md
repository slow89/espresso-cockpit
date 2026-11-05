# 11 — Read a profile's History

**What to build:** The operator can see every version of a profile, what each save changed, and what going back would change, without leaving the Library. This ticket is read-only. Going back arrives in ticket 12. Tests use seeded Revisions, so this doesn't need Save to exist.

**Spec:** [spec](../../profile-editor/spec.md): History. Prototype for reference: branch `prototype/lineage-view`, Variant A, without its Open as draft button.

**Blocked by:** [01 — Browse the Profile Library and load with Use](01-browse-library-and-use.md)

**Status:** ready-for-agent

- [ ] **History** in the detail pane swaps the list column for the profile's versions, with the top row "← Profiles · History of *House*" and the chips hidden. ← Profiles returns with the current version selected. An open History survives leaving the tab.
- [ ] History is built from the library by following `parentId`, without calling `/lineage`. A visited set ends the walk on a cycle, and a missing parent ends it too.
- [ ] It lists the records joined by Revision edges, branches included, newest first by `createdAt`. Title and notes edits never appear as versions.
- [ ] Each row is at least 52px tall, with the date and time, badges (**Current**, **Bundled**, **Retired**, **Removed**), and one line of what that save changed. The first version reads "First version", and a **Bundled** original reads "Bundled original".
- [ ] Copies sit under their version as "↳ Copied to *House decaf* ›", which selects that Fork in the Library.
- [ ] The origin closes the list: "Created 2 Sep", "Copied from *House*, version of 12 Oct", or "Bundled with the Bridge as *Londonium*". The second opens that profile's History at that version.
- [ ] **Bridge** links between **Bundled** records aren't shown.
- [ ] The detail pane shows the version's stored title, its badges, the meta line ("Saved 12 Oct, 07:40 · 3 Steps"), `workflow-frame-chart`, and a change list of about 250px beside it, switching between **What this save changed** and **Going back changes** (disabled on the current version).
- [ ] The change summary has one field per line, compares only what the machine runs, matches **Steps** by name and then position, and collapses a temperature shift on every **Step** to "Every Step +1 °C".
- [ ] Core tests cover History building, branches, Forks, origins, the cycle and missing-parent guards, and the change summary. Browser tests cover a seeded profile with Revisions and Forks, and a **Retired** version.
- [ ] At 1024×600 there is no critical overflow, and a screenshot baseline covers History.
- [ ] `pnpm check` passes.
