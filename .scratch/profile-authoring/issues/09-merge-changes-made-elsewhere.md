# 09 — Merge changes made elsewhere

**What to build:** While a draft waits, its source can change: a Brew temperature nudge, another app, or a laptop browser. Those changes merge in by themselves, field by field, and the operator is only asked when the same field changed on both sides.

**Spec:** [spec](../../profile-editor/spec.md): Profile Draft (Changes made elsewhere), Editor layout (message strip).

**Blocked by:** [08 — The dial-in loop](08-dial-in-loop.md)

**Status:** ready-for-agent

- [ ] The source is the **Workflow** copy while the draft's profile is loaded, the library record otherwise, and nothing for New.
- [ ] The check runs whenever the editor shows the draft, on Resume, and on every **Workflow** or library refetch while the editor is open, with no new polling. It's derived from the draft store and the queries rather than mirrored into component state.
- [ ] A three-way merge of base, draft, and source runs over profile-level fields and every **Step** field. A field only the source changed takes the source's value, and a field only the draft changed keeps the draft's. The base then moves to the source, with the note "Updated with changes made outside the editor."
- [ ] Editing **Step** 3's pressure and then nudging Brew temperature +1 °C keeps both changes.
- [ ] A clean draft just reseeds.
- [ ] **Steps** line up by the draft's keys, and base and source by index.
- [ ] An overlap (the same field changed on both sides to different values, or a **Step**-count change in the source) shows the banner "*Title* changed since you started editing", with **Start over from current** and **Keep my edits**. The panel scrolls by about one tile while it shows.
- [ ] A source revised elsewhere merges against the newest visible Revision in its lineage.
- [ ] Loading another profile doesn't touch the draft. If the draft was of the replaced profile, its source becomes the library record and the merge applies.
- [ ] Core tests cover the merge, overlaps, Step-count changes, a reorder in the draft, and reseeding. Browser tests cover the Brew-temperature case and an overlap banner with both choices.
- [ ] `pnpm check` passes.
