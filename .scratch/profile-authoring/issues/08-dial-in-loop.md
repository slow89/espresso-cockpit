# 08 — The dial-in loop

**What to build:** The operator pulls a **Shot**, opens what's loaded, tweaks it, and tries it on the next **Shot**, with or without saving. The **Workflow**'s copy is the working copy of the loaded profile. Cockpit never changes it while the machine is running anything, and never discards unsaved changes in it without asking.

**Spec:** [spec](../../profile-editor/spec.md): The Active Profile link, Workflow writes and the busy gate, Save (loaded profile), Profile Draft (draft of the loaded profile, How it ends), Editor layout (header), Brew.

**Blocked by:** [04 — Change a Step with the ruler and Save a Profile Revision](04-ruler-step-edit-and-revision.md)

**Status:** ready-for-agent

- [ ] **Edit loaded** in the strip, and **Edit** on the loaded profile's detail pane, open the same draft, seeded from the **Workflow** copy so that Brew-temperature drift is carried in.
- [ ] With no visible match, Edit loaded still works, Save creates a new profile, and **Revert to saved** isn't offered.
- [ ] When the draft is of the loaded profile, the strip shows a **Draft** badge beside the title and **Edit loaded** reads **Resume**, with no separate chip.
- [ ] Save on the loaded profile writes the library, then the **Workflow**, title-only Saves included. After a collision, nothing is written to the **Workflow**. If the **Workflow** write fails, the library save stands and the error says the profile wasn't loaded.
- [ ] Save on any other profile leaves the **Workflow** alone. **Save & use** saves another profile's draft and loads it.
- [ ] **Use for next shot** writes the draft into the **Workflow** only. It keeps the saved title, or the draft's for a Fork or New. The trial stays until saved, reverted, or replaced, and the strip shows "Differs from saved".
- [ ] **Revert to saved** resets the draft to the library version, and writes that version to the **Workflow** if the copy differs.
- [ ] **Discard changes** on the loaded profile drops untried edits but keeps the trial in the **Workflow**.
- [ ] Save & use and Use for next shot from another profile first ask the replace confirm when the loaded profile has unsaved changes.
- [ ] Save on the loaded profile, Save & use, Use for next shot, and Revert to saved when it would write the **Workflow** are disabled with "Available when the shot ends" in every running or unknown machine state. Editing and saving other profiles stay available. No writes are queued.
- [ ] Blocking flags from ticket 05 also disable Use for next shot.
- [ ] Every **Workflow** write sends only the complete `profile`. Dose, yield, and the rest of `context` are never touched, and `target_weight` is copied unchanged.
- [ ] The header shows at most five actions in every state, with Save last and highlighted.
- [ ] A trip from a **Post-Shot Summary** to the editor and back through **Brew** lands on the same summary.
- [ ] Core tests cover the draft-of-the-loaded-profile rule. Browser tests cover drift carried into a draft, a trial, Revert, Save on the loaded profile, Save & use, and the busy gate during a **Shot**.
- [ ] `pnpm check` passes.
