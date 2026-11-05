# 02 — Open a profile in the editor and save its title, author, and notes

**What to build:** The operator taps **Edit** on a visible profile and gets a full-screen editor over the nav, then changes the title, author, or notes and saves them in place. The work is a **Profile Draft** stored on the tablet, so a reload doesn't lose it. This is the thinnest path through the editor route, the draft store, and a library write. **Step** editing arrives in the next tickets.

**Spec:** [spec](../../profile-editor/spec.md): Save (the in-place row), Titles, Profile Draft, Editor layout (header, message strip, text sheet), Bridge contract.

**Blocked by:** [01 — Browse the Profile Library and load with Use](01-browse-library-and-use.md)

**Status:** ready-for-agent

- [ ] **Edit** in the detail pane opens a full-screen route over the nav, with a header holding **← Library**, **Brew**, the title ✎ with its badges, and **Save**.
- [ ] **← Library** returns with the same selection, Android back acts the same, and **Brew** goes to Brew. Nothing navigates on its own.
- [ ] The editor route names no profile. It shows the current draft, a reload lands back on it, and with no draft it falls back to the Library.
- [ ] The draft is held in one persisted store on the tablet, never on the **Bridge**. It holds the complete profile as the **Bridge** returned it, and it's versioned from the start.
- [ ] A single text sheet, anchored to the top of the screen, edits the title (from the header) and the author and notes (from a Profile settings row in the left column). The title can't be left empty.
- [ ] A draft has unsaved changes only while it differs from its base. An edit that is undone counts as no change, and a clean draft shows "Save: nothing has changed" in the strip.
- [ ] Saving a change to only the title, author, or notes sends a `PUT` with the complete profile and no `metadata` key. The id, `parentId`, `createdAt`, visibility, and `metadata` are kept. The editor stays open, and the base moves to what was written.
- [ ] On a **Bundled Profile**, these fields are locked with the reason shown.
- [ ] Titles are trimmed when saved, and compared trimmed and ignoring case. Save is blocked with an inline message only when it would create a new clash: keeping the title the profile already has is always allowed. Removed and Superseded records don't count.
- [ ] Disabled actions show their reason in the message strip.
- [ ] **Bridge** errors show the body's `message`, falling back to `error`.
- [ ] The fake **Bridge** models the in-place `PUT`, and answers 400 to a `profile` edit on a **Bundled** record.
- [ ] Core tests cover the draft comparison and the title rules. Browser tests cover an in-place Save, asserting what the fake holds afterwards, and a reload mid-edit.
- [ ] `pnpm check` passes.
