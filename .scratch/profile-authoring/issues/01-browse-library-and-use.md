# 01 — Browse the Profile Library and load with Use

**What to build:** The Profiles tab stops being a chooser and becomes the master/detail **Profile Library**. The operator can browse every visible **Profile**, narrow the list without the keyboard, see a profile's shape before loading it, and load it with an explicit **Use** that can't fire while the machine is running. This ticket also sets up both test seams the rest of the work builds on: the pure profile library core, and a fake **Bridge** with an in-memory profile model.

**Spec:** [spec](../../profile-editor/spec.md): Modules, Bridge contract, Classifying records, Library list and detail, The Active Profile link, Workflow writes and the busy gate, Testing Decisions. Prototype for reference: branch `prototype/app-placement`, Variant B.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] The Profiles tab has a **Library | Shot setup** switch, with Library as the default. Shot setup holds today's setup controls, unchanged.
- [ ] A loaded-profile strip sits above both segments, showing ● title with "Differs from saved", or "Not saved" when no visible profile has the title.
- [ ] The library is read with hidden records included, and classified as visible, Superseded, Removed, or Retired, in the spec's order. Only visible records are listed.
- [ ] The list shows the operator's profiles first, then **Bundled Profiles**, each alphabetical. The loaded profile has a green dot in its alphabetical place, and is selected and scrolled into view when the Library opens.
- [ ] Filter chips (All, Yours, Espresso, Pour-over, Other) filter on the stored `beverage_type`. There is no search box.
- [ ] A **Profile Fork** nests with ↳ under the visible version of the profile it was copied from, following Revision edges from its parent. It drops to the top level when that profile has no visible version or a chip hides the parent. A **Bundled** record with a `parentId` is not a Fork.
- [ ] Tapping a row selects it without loading it. The detail pane shows the title, origin badge, Loaded and Differs from saved badges, the meta line, two lines of notes, and `workflow-frame-chart`. The other actions in its bar arrive with later tickets.
- [ ] The selection, chip, and segment survive leaving the tab and coming back, held in a UI store rather than the URL.
- [ ] The **Active Profile** links to the visible profile with the same title, compared trimmed and ignoring case. Ticket 15 adds the fewest-changes tiebreak; until then a second match resolves to Yours, then the latest `createdAt`. "Differs from saved" compares only what the machine runs.
- [ ] **Use** sends only the complete `profile` to the **Workflow**, leaving dose, yield, and the rest of `context` alone. On the loaded profile it reads **Loaded** and is disabled.
- [ ] **Use** is disabled with "Available when the shot ends" in every running or unknown machine state the spec lists.
- [ ] If the loaded profile differs from its saved version or has none, loading a different record first asks "*Title* has unsaved changes. Loading another profile discards them." with **Discard and load** or **Cancel**. Cancel writes nothing. With nothing unsaved, it loads straight away.
- [ ] **Import** moves into a dialog opened from the list header, with today's share-code behaviour.
- [ ] The Choose Profile panel and the "4F" frame-preview overlay are gone, along with their component tests. The Profiles tab's browser spec and screenshots are rewritten.
- [ ] Core tests cover classification, list rows, chips, nesting, the title link, and running states. The fake **Bridge** serves hidden and deleted records, the **Bundled** manifest, and a **Bridge** version, with new scenarios for Revisions and Forks, a **Retired Bundled** version, and a busy machine.
- [ ] At 1024×600 there is no critical overflow, text is at least 0.66rem, and tap targets are at least 36px.
- [ ] `pnpm check` passes.
