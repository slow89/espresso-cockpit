# 12 — Go back

**What to build:** The operator can make an earlier version current again, and undo that. Going back swaps which record is visible and changes only what the machine runs: the profile keeps its current title, author, and notes, and every version stays in **History** with its date and place.

**Spec:** [spec](../../profile-editor/spec.md): Going back, History (Actions). Why it swaps: [ADR 0004](../../../docs/adr/0004-going-back-swaps-visibility.md).

**Blocked by:** [08 — The dial-in loop](08-dial-in-loop.md), [11 — Read a profile's History](11-read-history.md)

**Status:** ready-for-agent

- [ ] A version offers one primary action: **Go back to this version**, **Go to this version** on a newer one, or **Go back & use** when the profile is loaded.
- [ ] If the version isn't **Bundled** and its title, author, or notes differ from the current version's, a title-only `PUT` copies them onto it first. With nothing to copy, the `PUT` is skipped. If it fails, nothing else happens, and the error says so.
- [ ] Cockpit then sets the version `visible`, then the current version `hidden`. If the hide fails, it retries once, then says both versions are now visible.
- [ ] The toast reads "*House* is back to the version of 12 Oct · Undo", for about 8 seconds. Undo and going forward are the same action in reverse.
- [ ] The version gone back from stays in **History** and out of the Removed list.
- [ ] In the Library, the version takes the profile's place, its **Forks** nest under it, and the selection moves to it.
- [ ] On the loaded profile, **Go back & use** also writes the version into the **Workflow**. It's disabled entirely with "Available when the shot ends" in every running or unknown machine state. With unsaved changes, it first asks "*House* has unsaved changes. Going back discards them."
- [ ] On any other profile, going back changes only the library.
- [ ] A **Retired** version's action is disabled with "A Bridge update replaced this version". If the **Bridge**'s current version is in the Library (same `metadata.filename`), the detail pane links it: "Current Bundled version: *Gentle and sweet* ›".
- [ ] A **Bundled** original can be gone back to. It shows the **Bundled** badge again and its title and notes lock. If another visible profile holds its title, the action is disabled with "Another profile is titled *X*", linking that profile. If its title or notes differ from the current version's, **Going back changes** adds a line for them.
- [ ] Editing after going back is ordinary editing: Save makes a Revision of that version, and **History** branches.
- [ ] The collision prompt "Same as the version from *time*" now offers **Go back**, or **Go back & use** on the loaded profile.
- [ ] Browser tests cover going back and Undo with what the fake holds, the title staying put with `createdAt` and order unchanged, Go back & use during a **Shot**, a **Retired** version, a **Bundled** original, the collision prompt, and failures of the `PUT` and the hide.
- [ ] `pnpm check` passes.
