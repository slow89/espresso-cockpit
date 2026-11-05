# 07 — New, Duplicate, and Save as new

**What to build:** The operator can create a profile from scratch, or branch from any profile as a **Profile Fork** that sits beside its parent, **Bundled Profiles** included. Forks must change how the profile runs, because the **Bridge** can't store an exact copy.

**Spec:** [spec](../../profile-editor/spec.md): Save (the Fork and New rows), Titles (Default titles), Fields and limits (New profile), Profile Draft (base by entry point).

**Blocked by:** [04 — Change a Step with the ruler and Save a Profile Revision](04-ruler-step-edit-and-revision.md)

**Status:** ready-for-agent

- [ ] **+ New** in the list header opens a one-**Step** draft with the spec's defaults, titled "New profile" or "New profile 2". Nothing is written until Save, which sends a `POST` with no parent.
- [ ] **Duplicate** in the detail pane opens a Fork draft titled "*title* copy", or "*title* copy 2" if that's taken, including from a **Bundled Profile**.
- [ ] **Save as new** in the editor header writes nothing, and turns the current draft into a Fork draft, keeping its edits.
- [ ] Saving a Fork sends a `POST` with `parentId` and no revision marker, and the source stays visible. Save is disabled until something the machine runs differs from the source, with "A copy must change how the profile runs".
- [ ] A Fork or New whose title a visible profile holds is blocked with an inline message.
- [ ] The editor's badges read New or Copy.
- [ ] **Discard changes** on a New or Fork draft resets it to its seed.
- [ ] These entry points use the same draft replacement as Edit, including its replace confirm.
- [ ] After Save, the Library selection moves to the new record, and a Fork nests under its parent.
- [ ] Core tests cover default titles and the Fork rule. Browser tests cover creating from + New, Duplicate from a **Bundled Profile**, Save as new, and the disabled reason, asserting what the fake holds.
- [ ] `pnpm check` passes.
