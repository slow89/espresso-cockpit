# 04 — Change a Step with the ruler and Save a Profile Revision

**What to build:** This is the core of the feature. The operator picks a **Step**, drags the ruler to change its target or temperature, watches the **Step** chart move, and taps Save. Save makes a **Profile Revision** and hides the source, so the Library still shows one entry and the earlier version stays as a **Superseded Profile**. **Bundled Profiles** work the same way. The other fields and the list's actions arrive in the next tickets.

**Spec:** [spec](../../profile-editor/spec.md): Save, Ruler, Fields and limits (limits, precision and display), Editor layout (Step list, Panel), Bridge contract. Why Save doesn't overwrite: [ADR 0003](../../../docs/adr/0003-save-makes-a-profile-revision.md). Prototypes for reference: branches `prototype/numeric-input`, Variant C, and `prototype/step-editor-layout`, Variant A.

**Blocked by:** [02 — Open a profile in the editor and save its title, author, and notes](02-editor-title-author-notes.md)

**Status:** ready-for-agent

- [ ] The left column (236px) lists Profile settings first, then one 40px row per **Step**: number, name or "Step N", and the goal in short. One **Step** is always selected, marked with an amber bar and tint. The list scrolls past about 7 rows.
- [ ] The panel shows "Step 1 of 4 · *Fill* ✎", which opens the name's text sheet, plus tiles for the target and temperature. A blank **Step** name displays as "Step N", and nothing is written into the name.
- [ ] A new **Step** chart, about 108px tall, has one equal-width column per **Step**, at least 44px wide, as the spec describes. It updates as the draft changes. Tapping a column selects that **Step** and scrolls its row into view. A 20-**Step** profile fits.
- [ ] Tapping a value tile binds the ruler to it, marked by an amber border.
- [ ] The ruler sits along the bottom of the editor (about 116px). Dragging moves one fine step per 14px tick with snapping, and press-and-hold ± ends move by the coarse step with acceleration. Labels, tick tiers, dimmed out-of-range ticks, and clamping follow the spec. The keyboard never opens for a number.
- [ ] A ruler edit stores the value at its grid step with no float noise, so 9.1 is saved as 9.1. Untouched values are saved exactly as stored. Stored values show their real decimals up to 3, and the DE1 "machine" hint shows when the machine would run something different.
- [ ] Save on a change to what the machine runs sends a `POST` with `parentId` and the namespaced revision marker, then sets the source `hidden`. The title carries over unless it was renamed. New records' `metadata` holds only the marker.
- [ ] A **Bundled Profile** is saved the same way, and the Revision takes its place without the **Bundled** badge. Its title, author, and notes unlock once something the machine runs has changed.
- [ ] "Changed" means the draft differs from its source. An undone edit makes no Revision.
- [ ] A dedup is read from the `POST`'s response, never checked beforehand. Cockpit then skips the hide and keeps the draft open and unsaved, and the message names the match: "Identical to *X*" with an action to open it, "Same as the version from *time*", or "Identical to *X* (deleted)". Tickets 12 and 10 add the last two's actions.
- [ ] If the hide fails, Cockpit retries once, then says both versions are now visible. Nothing repairs this automatically.
- [ ] After a Save, the editor stays open, the base and source move to the new record, and the Library selection follows it.
- [ ] The selected **Step** is stored with the draft, using stable per-**Step** keys, so Resume lands where the operator left off.
- [ ] The fake **Bridge** hashes ids over what the machine runs, Step names included, dedups `POST` even onto hidden, deleted, or **Bundled** records, ignores the new title and `parentId` on a dedup, and gains a control that fails the next matching request.
- [ ] Core tests cover what a Save would do, dedup reading, grid rounding, display decimals, and machine hints. Browser tests cover a Revision and a **Bundled** Revision against what the fake holds, each collision message, a failed hide, and the ruler changing and clamping a value.
- [ ] At 1024×600 there is no critical overflow with 20 **Steps**, and tap targets are at least 36px.
- [ ] One Save round trip is tagged `@smoke`, so that `pnpm check` runs it, and a screenshot baseline covers the editor.
- [ ] `pnpm check` passes.
