# 03 — Find, resume, and discard a waiting draft

**What to build:** A draft with unsaved changes can wait for as long as it needs to. The operator can always see that one is waiting, get back to it, or drop it, and can't lose it to another profile without being asked. Brew says when work is waiting.

**Spec:** [spec](../../profile-editor/spec.md): Profile Draft (Finding it, The guard, How it ends), Brew.

**Blocked by:** [02 — Open a profile in the editor and save its title, author, and notes](02-editor-title-author-notes.md)

**Status:** ready-for-agent

- [ ] A draft with unsaved changes shows a chip in the loaded-profile strip: "✎ *Title* · Resume", which opens the editor.
- [ ] The draft's profile shows a **Draft** badge in its row and detail header, and its **Edit** reads **Resume**.
- [ ] A clean draft stays stored, but nothing flags it as waiting and nothing guards it.
- [ ] **Discard changes** appears in the editor header only while the draft has unsaved changes, and resets the draft to its base in one tap.
- [ ] Opening a different profile replaces the draft. If the draft has unsaved changes, it first asks "*Title* has unsaved changes. Opening *Other* discards them." with **Discard and open** or **Cancel**. Opening the same profile resumes its draft.
- [ ] The draft survives **← Library**, **Brew**, Android back, and a reload.
- [ ] A stored draft the current build can't read is dropped, with a one-time notice: "A draft from an earlier version of Cockpit couldn't be restored."
- [ ] Brew's top-bar profile button reads "✎ DRAFT" instead of "PROFILES" while any draft has unsaved changes. It keeps its width and target, and still opens the Library. It's derived from the draft store.
- [ ] The Library's and editor's layouts stay within 1024×600 with these badges and the chip showing.
- [ ] Browser tests cover the chip, Resume, Discard changes, the replace confirm with both choices, the Brew label, and a stored draft from an older store version.
- [ ] `pnpm check` passes.
