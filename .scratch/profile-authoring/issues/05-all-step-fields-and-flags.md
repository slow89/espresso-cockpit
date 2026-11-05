# 05 — Every Step field and flagged stored values

**What to build:** The operator can edit everything a **Step** and a **Profile** carry, all visible with nothing behind a disclosure, and a value the machine would wrap is called out rather than quietly run. Opening a profile can't change it: stored values load untouched, and undoing an edit leaves no trace.

**Spec:** [spec](../../profile-editor/spec.md): Fields and limits (all of it), Editor layout (Panel, Profile settings).

**Blocked by:** [04 — Change a Step with the ruler and Save a Profile Revision](04-ruler-step-edit-and-revision.md)

**Status:** ready-for-agent

- [ ] The panel shows four groups in four columns: **Temperature**, **Goal**, **Stop after**, and **Move on if**, with the toggles, tiles, and Off states the spec lists. Cap, Range, and the exit's value appear only when on.
- [ ] Every tile clamps to the spec's limits and uses its fine and coarse steps. Max time reads Instant at 0; Max volume and Weight read Off at 0.
- [ ] Switching pump mode keeps one pair per mode (target with its cap) and restores it exactly on switching back. A mode not yet used starts at 9.0 bar or 2.0 mL/s with the cap Off. A cap never carries over to the other axis.
- [ ] **Off** on an exit omits `exit` and never writes 0. **Move on if** can't make an exit of value 0 from the ruler.
- [ ] A limiter turned off saves as `null`, except that one that was off when loaded returns to its exact stored form, so undoing leaves no change.
- [ ] Turning an exit or limiter off and on, or switching exit type, brings back the last value while the draft is open. These remembered values persist with the draft.
- [ ] Stored values load exactly as stored, and a value changes only when the ruler moves on it, snapping into range.
- [ ] A **blocking** value (per the spec's table, using the research's thresholds) shows what would run ("Runs as 0 bar"), gives its **Step** row a red dot, and disables Save with the reason.
- [ ] A **warning** value shows a note, gives its row an amber dot, and allows saving. This includes an exit value of 0 and a preinfusion boundary past the last **Step**.
- [ ] Profile settings show beverage type as a five-way choice, Tank preheat and Stop at volume tiles (the latter labelled "Used only without a scale"), and Author and Notes rows. `target_weight` and `version` are hidden and saved unchanged.
- [ ] When the **Bridge** reports `gatewayMode: "full"`, one line under the weight exit reads "The Bridge doesn't run weight exits in Full gateway mode."
- [ ] Every write sends the complete profile, with nothing re-derived. The **Step** schema accepts explicit nulls for `exit`, `weight`, and `limiter`, and `targetWaterVolume` is no longer dropped from the **Workflow** context.
- [ ] Core tests cover every limit, the wrap and warning boundaries, pump-mode pairs, and the limiter's stored forms. Browser tests cover a scenario with stored values that wrap and warn, and the `full` gateway mode.
- [ ] At 1024×600, all four groups fit with every field on, and the panel scrolls only as the spec allows.
- [ ] `pnpm check` passes.
