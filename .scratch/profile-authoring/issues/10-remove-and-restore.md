# 10 — Remove and restore

**What to build:** The operator can hide a **Bundled Profile** or delete any other, at once and with Undo, and restore it later from a Removed list. Removal is always soft and touches nothing else: not the lineage, the **Forks**, the **Workflow**, or a waiting draft.

**Spec:** [spec](../../profile-editor/spec.md): Removing and restoring, Classifying records, Save (the source-removed row), Bridge contract.

**Blocked by:** [04 — Change a Step with the ruler and Save a Profile Revision](04-ruler-step-edit-and-revision.md)

**Status:** ready-for-agent

- [ ] The detail pane's ⋯ offers **Hide** on a **Bundled Profile** and **Delete** on anything else, both using the **Bridge**'s `DELETE`, with no confirm.
- [ ] Toasts last about 8 seconds: "Deleted *House* · Undo", "Hid *Londonium* · Undo", and on the loaded profile "Deleted *House* · still loaded for the next shot · Undo". Undo sets the record `visible`. The selection moves to the next row.
- [ ] These actions stay available while the machine is running.
- [ ] A "not found" reply (404, 400, or 500) refetches and says "*House* was already removed".
- [ ] A "Removed (N) ›" row sits at the end of the list while N > 0, ignoring the chips. It swaps the list column to removed profiles, most recently removed first, with "← Profiles" at the top. **Superseded** and **Retired Bundled Profiles** aren't listed.
- [ ] The detail pane there shows the chart, meta line, notes, and **Restore**.
- [ ] **Restore** sets the record `visible` with the same id and lineage, its **Forks** nest under it again, and it returns to the full list with the profile selected. The toast reads "Restored *House* · Undo".
- [ ] A removed loaded profile stays loaded, the strip reads "Not saved", and Edit loaded still works.
- [ ] A waiting draft of a removed profile keeps its edits, the strip reads "*House* was removed. Save makes a new profile.", and Save makes a Fork of the removed record. Restoring the profile reconnects the draft.
- [ ] A Fork of a removed profile drops to the top level, with its meta line reading "Copy of *House* (removed)".
- [ ] The collision prompt "Identical to *X* (deleted)" now offers **Restore**.
- [ ] No purge is offered anywhere.
- [ ] The fake **Bridge** models `DELETE` (hide for **Bundled**, soft delete otherwise) and the visibility route, with varied not-found codes.
- [ ] Core tests cover the Removed list's contents and the Retired rule. Browser tests cover Hide, Delete, Undo, Restore, a removed loaded profile, and a draft of a removed profile.
- [ ] A screenshot baseline covers the Removed list at 1024×600.
- [ ] `pnpm check` passes.
