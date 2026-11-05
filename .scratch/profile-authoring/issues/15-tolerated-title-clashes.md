# 15 — Clashes Cockpit can't prevent

**What to build:** A **Bridge** update, another app, or existing data can still leave two visible profiles with one title, like "Extractamundo Dos!" on the operator's tablet. **Cockpit** links the **Active Profile** to the right one, marks the clash, offers a one-tap fix, and writes nothing until the operator asks.

**Spec:** [spec](../../profile-editor/spec.md): The Active Profile link, Titles (Clashes Cockpit can't prevent).

**Blocked by:** [08 — The dial-in loop](08-dial-in-loop.md), [10 — Remove and restore](10-remove-and-restore.md), [11 — Read a profile's History](11-read-history.md)

**Status:** ready-for-agent

- [ ] With two or more same-title visible profiles, the **Active Profile** links to the one with the fewest changes from the **Workflow** copy, counted as lines of the change summary. Ties go to Yours over **Bundled**, then the latest `createdAt`. The link is derived, never stored.
- [ ] Right after **Use** on either profile, the link follows that Use. A Brew-temperature change doesn't move it.
- [ ] Only the linked row shows as loaded. **Edit** on the other row opens a draft of that record, and **Use** on it counts as loading a different profile.
- [ ] Save on the loaded profile supersedes the linked record and leaves the other alone.
- [ ] Both rows get a **Same title** badge.
- [ ] The detail pane says "Another profile is titled *X*. Shots of both are filed under one name.", with the other profile's name linking to it.
- [ ] On the operator's own profile, **Rename** opens the editor's title sheet, with the draft guard if another draft is waiting. On a **Bundled Profile**, **Hide** uses the existing Hide with its Undo toast.
- [ ] The strip shows the linked profile's origin ("● Londonium · Bundled"), only while its title is shared.
- [ ] When both are Yours, the save date in the meta line tells them apart.
- [ ] The editor's message strip shows the same note, without blocking Save. Keeping the existing title can still be saved.
- [ ] **Cockpit** never renames or hides anything on load, and Brew's top-bar button doesn't change.
- [ ] Core tests cover the link with no match, one match, an exact match, drift, a trial, both tiebreaks, and letter case. Browser tests cover a Yours and **Bundled** clash scenario through the link, badges, Rename, and Hide.
- [ ] `pnpm check` passes.
