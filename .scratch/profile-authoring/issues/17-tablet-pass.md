# 17 — Run it on the tablet

**What to build:** The fake **Bridge** can only model what the research found, so the feature isn't done until it has run against the real one. The operator redeploys to the tablet (Decaid v0.8.8 or newer) and works through the real writes at the machine. Anything that behaves differently from the fake becomes a new ticket, and the fake is corrected to match.

**Spec:** [spec](../../profile-editor/spec.md): Testing Decisions (On the real Bridge).

**Blocked by:** [05 — Every Step field and flagged stored values](05-all-step-fields-and-flags.md), [06 — Add, move, and delete Steps, and the Preinfusion divider](06-step-operations-and-divider.md), [09 — Merge changes made elsewhere](09-merge-changes-made-elsewhere.md), [15 — Clashes Cockpit can't prevent](15-tolerated-title-clashes.md), [16 — Older Bridges are read-only](16-older-bridge-read-only.md)

**Status:** ready-for-human

- [ ] Redeployed to the tablet with the existing deploy workflow, on Decaid v0.8.8 or newer.
- [ ] A **Profile Revision**: change a **Step**, Save, and check the Library shows one entry and the earlier version in **History**.
- [ ] A **Bundled** Revision: revise a **Bundled Profile**, and check that the original stays hidden after a **Bridge** restart.
- [ ] A title `PUT`: rename a profile in place, and check its id, lineage, and revision marker survive.
- [ ] **Go back**, then Undo, on a profile with an older title.
- [ ] **Hide** or **Delete**, then **Restore**, including one that clashes.
- [ ] A Visualizer import that clashes, and one that dedups.
- [ ] The dial-in loop on the machine: **Use for next shot**, pull a **Shot**, check the record shows the right profile, and confirm Workflow writes are disabled during the **Shot**.
- [ ] The draft surviving a sleep long enough to trigger the **Bridge**'s 10-minute reload.
- [ ] "Extractamundo Dos!" shows as a tolerated clash, with the link following the last Use.
- [ ] Every screen read and tapped at the machine: text is legible, targets are reachable, and the ruler feels exact.
- [ ] Differences from the fake are recorded here, with a new ticket for each.
