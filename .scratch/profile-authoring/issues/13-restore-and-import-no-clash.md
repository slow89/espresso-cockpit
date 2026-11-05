# 13 — Restore and Import never cause a title clash

**What to build:** **Cockpit** never leaves two visible profiles with one title through its own actions. A Restore or an Import that would clash renames the profile and says so, and an import that added nothing says that too, rather than claiming it imported.

**Spec:** [spec](../../profile-editor/spec.md): Removing and restoring (Restore), Import, Titles.

**Blocked by:** [10 — Remove and restore](10-remove-and-restore.md)

**Status:** ready-for-agent

- [ ] When a restored profile's title is held by a visible profile, a title-only `PUT` renames it to "*House* (restored)", then "(restored 2)" and so on, before it's set `visible`. The toast reads "Restored as *House (restored)* · Undo". The id and lineage stay the same.
- [ ] If that `PUT` fails, nothing is restored and the error says so.
- [ ] Undo removes the profile again and puts its title back.
- [ ] A **Bundled Profile** whose title is taken can't be restored: **Restore** is disabled with "Another profile is titled *X*. Rename it first", linking that profile.
- [ ] The collision prompt's Restore is the same action, rename included.
- [ ] When an import adds a new record and another visible profile holds its title, a title-only `PUT` renames it to "*Title* (imported)", then "(imported 2)" and so on. The message reads "Imported as *Title (imported)*", with no Undo.
- [ ] If that `PUT` fails, the message says another profile has this title, and the clash is tolerated.
- [ ] An import that dedups adds nothing, and the message names the returned record: "Already in your library as *X*", or "Already in your library as *X* (removed) · Restore". It's told apart by the returned record predating the import, or being **Bundled**, hidden, or deleted.
- [ ] A removed profile's title is free, so matching only a removed profile's title isn't a clash.
- [ ] Nothing is loaded into the **Workflow** by an import.
- [ ] The fake **Bridge**'s Visualizer import goes through its `POST`, including dedup, and returns the stored record.
- [ ] Core tests cover the suffix sequences and reading an import's result. Browser tests cover a clashing Restore with Undo, a blocked **Bundled** Restore, a clashing Import, and each dedup message.
- [ ] `pnpm check` passes.
