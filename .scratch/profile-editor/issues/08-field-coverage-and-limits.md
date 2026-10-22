# Which fields does the editor expose, and what limits does the Skin enforce?

Type: grilling
Status: resolved
Blocked by: 01, 02
Map: [Profile authoring in Cockpit](../map.md)

## Question

The editor covers every field, but not every field deserves equal space at 1024×600. Decide:

- **Field placement**: which **Step** fields and profile-level fields are always visible, which sit behind an "advanced" disclosure, and which are shown only when relevant (e.g. the limiter only applies to the opposite pump mode).
- **Guardrails, and who owns them**: research found that the Bridge validates **no** ranges and the encoder **wraps silently** (on DE1, 16 bar becomes 0 bar and −0.1 bar becomes 15.94; 130 °C becomes 2 °C), and nothing enforces the 20-Step cap. Decide which limits the Skin enforces before save, whether to also ask the Bridge upstream to validate (per `AGENTS.md`, the Bridge is the source of truth), and how to treat the "exit value 0" trap (0 is not "off"; omitting `exit` is).
- **Machine-specific defaults**: on Bengle, pressure Steps without a limiter run uncapped (de1app adds 8 mL/s; 162 of the 189 bundled pressure Steps are uncapped). Should the editor default or warn?
- **Round-trip safety**: how does the editor preserve fields it doesn't show (legacy and unknown keys) so editing never silently strips data?
- **Units and precision**: display units and decimal precision per field, matched to what the machine actually encodes (DE1 1/16 vs Bengle 1/10 for pressure, flow, exit, and limiter values; 0.5 °C).
- **Dropped fields**: the Bridge keeps only the target that matches the pump mode, so switching pump mode loses the other target after a round trip. Should the editor remember it locally while the Step is in the Draft?

Input: [What does each profile and step field mean…](02-profile-field-semantics.md) has a field-importance table that feeds the advanced-disclosure split.

From [What does the Bridge's profile write API accept…](01-bridge-profile-write-api.md):

- **The Bridge enforces only "at least one Step"**: no Step cap, no text-length limit beyond a 1 MiB body, and no ranges.
- **Legacy and unknown keys are dropped by the Bridge on save regardless**, so round-trip safety is about not losing *kept* fields, not preserving legacy ones.
- **Round floats to the machine's encoded precision.** Otherwise cosmetic float drift churns the content-hash id.
- **Never compute ids in the Skin**: Dart writes `93.0` where JS writes `93`.

From [Does the tablet's Bridge expose the profile write endpoints?](04-tablet-bridge-endpoints.md):

- **The operator's machine is a DE1Pro** (not Bengle; firmware 1333, empty `/machine/capabilities`). Their precision is 1/16 for pressure, flow, exit, and limiter values. The spec still has to cover Bengle.
- **Two Bundled Profiles already sit at the 20-Step cap** (Gagné Adaptive Shot / Allongé). Duplicating either leaves no room to add a Step.
- **`gatewayMode` is `tracking`**, so per-Step weight exits and stop-at-weight are live for this operator (whenever a scale is connected).

From [How does editing relate to the Active Profile and the dial-in loop?](07-active-profile-and-dial-in-loop.md):

- **`target_weight` is decided: hidden and preserved.** The editor doesn't show it, and every save or load copies the stored value unchanged. It is part of the profile's hash, so leaving it alone avoids id churn. Yield stays a Workflow setting, so field placement can skip it.
- **The editor never writes the Workflow's `context`.** Dose and yield aren't editor fields.

## Comments

**2026-10-21 — claimed.** Grilling session in progress on branch `t3/wayfinder-08-field-coverage`.

**2026-10-21 — grilling with the operator.** Fourteen questions, one at a time, each with a recommendation. The operator took the recommendation every time, with one scope change:

1. Limits: one practical set for every machine (option A), not ceilings that follow the connected machine.
2. Exits and limiters: Off omits them, values start one step above 0, and turning them back on restores the last value.
3. Values the editor wouldn't write: load as stored, flag in two tiers (blocking or warning), and never clamp on load.
4. Step count is 1–20. The preinfusion boundary is a divider in the Step list that follows adds and deletes, and keeps its count on moves.
5. Pump switch: each Step remembers its target and cap per mode while the draft is open, and caps never cross axes.
6. Bengle: do nothing. The operator then ruled **Bengle out of scope** for this spec altogether (6b).
7. Precision: save the value shown; untouched values are kept exactly as stored.
8. Step fields: de1app's four groups, everything visible, using Off states, and no advanced disclosure.
9. Bulk edits: out of scope.
10. Profile-level fields: the title in the header, everything else on one Profile settings surface, with ranges.
11. Save boundary: anything the machine runs makes a Revision; title, author, or notes update in place. This refines the save-semantics decision; `CONTEXT.md` is updated.
12. New profile: a one-Step draft with plain defaults.
13. Round trip and text: the draft is the complete Bridge profile; "changed" means differing from the source; titles clash regardless of letter case.
14. Upstream: ask the Bridge to reject values that would wrap, as a nice-to-have.

While preparing question 3, the dashboard's Brew temperature control was found to push Step temperatures past the wrap point. It was ruled out of scope as a separate fix.

## Answer

**The Skin owns every limit, and the ruler never produces a value the machine would wrap. Stored values are kept exactly as they arrive until the operator touches them, and every Step field is visible in de1app's four groups.** Everything below works on today's Bridge (Decaid v0.8.8) with no upstream change. Bengle-specific behaviour is out of scope; the limits below are safe on it anyway.

**Limits** (the ruler clamps to these on every machine)

| Value | Range | Basis |
|---|---|---|
| Pressure: target, pressure exit, pressure cap | 0–12 bar | de1app's editor limit. Bundled profiles go up to 11. |
| Flow: target, flow exit, flow cap | 0–15.9 mL/s | de1app allows 20, but a DE1 wraps anything ≥ 15.97. |
| Temperature | 0–105 °C | de1app. Bundled profiles span 10–105. |
| Max time | 0–127 s, 0 shown as **Instant** | The firmware ceiling. |
| Max volume | 0–1023 mL, 0 = **Off** | The firmware ceiling. 1024 wraps to "off". |
| Weight exit | 0–1000 g, 0 = **Off** | de1app. Not encoded, so it can't wrap. |
| Exit value, cap value (when on) | 0.1 up to the ceiling for that axis | See "Exits and limiters". |
| Limiter range (when on) | 0.1 up to the ceiling for that axis, starting at 0.6 | Almost every bundled Step uses 0.6. |
| Steps per profile | 1–20 | de1app and pyDE1. The Bridge needs at least one. |
| Tank preheat | 0–45 °C in whole degrees, 0 = **Off** | de1app. |
| Stop at volume | 0–2000 mL in whole mL, 0 = **Off** | de1app. |
| Preinfusion boundary | 0 to the number of Steps | Volume counting starts after it. |

- The limits don't depend on the machine, so the editor works with no machine connected, and a profile saved on one machine can't wrap on another.
- The ruler's step sizes and coarse steps are as decided in [How are numbers entered on the tablet without the soft keyboard?](05-numeric-input-on-tablet.md).

**Exits and limiters**

- **Move on if** is one five-way choice: **Off**, pressure over, pressure under, flow over, flow under. **Off** removes `exit`; it never writes a value of 0. So the editor can't make "pressure over 0", which fires at once, or "flow under 0", which never fires.
- **Limiter** is an on/off switch per Step. **Off** is saved as `null`, as the Bridge writes it.
- **The last value is remembered** while the draft is open. Turning an exit or limiter off and back on, or switching exit type, brings that value back.
- **Undo leaves no trace.** A Step whose limiter was off when loaded (stored as missing, or as value 0; bundled profiles use both) keeps that exact form. Turning the limiter on and back off restores it, so no Revision results.

**Stored values the editor wouldn't write**

These can come from Visualizer imports, from the dashboard's Brew temperature drift, from the five bundled exits set to 0, or from profiles with more than 20 Steps. Every value loads exactly as stored and is flagged on its field:

- **Blocking.** A value past the wrap point (16 bar, −1 °C, 130 °C, 1024 mL), or more than 20 Steps.
  - The field shows what the machine would run, e.g. "Runs as 0 bar".
  - **Save** and **Use for next shot** are disabled until it's fixed, and the reason is shown.
- **Warning.** A value outside the ranges above but below the wrap point (13 bar, 108 °C, a 1200 g weight exit), an exit value of 0 ("fires at once" or "never fires"), or a preinfusion boundary past the last Step.
  - The field shows a note, and saving is still allowed.
  - Exit 0 has to stay non-blocking. Otherwise *Best Practice* couldn't be revised without changing a Step the operator never touched.
- **Nothing is clamped on load.** A value changes only when the operator moves the ruler on it, and then it snaps into range.

**Steps and the preinfusion boundary**

- **Add and Duplicate are disabled at 20 Steps**, with the reason "A profile holds at most 20 Steps". This applies to both Gagné Adaptive profiles as soon as they're opened. **Delete is disabled with one Step left.**
- **The boundary is a divider in the Step list (Preinfusion | Pour)** that the operator moves directly.
- **Adding, duplicating, and deleting keep the same Steps in preinfusion.**
  - A Step added or duplicated anywhere before the first Pour Step joins Preinfusion.
  - Deleting a Preinfusion Step shrinks Preinfusion by one.
  - Deleting a Pour Step leaves Preinfusion as it is.
- **Moving a Step keeps the count.** The divider stays put, and a Step moved across it changes sides. Preinfusion has to be the first N Steps, so the boundary can't follow particular Steps through a move.

**Switching pump mode**

- **While the draft is open, each Step keeps one pair of values per mode**: the pressure target with its flow cap, and the flow target with its pressure cap. Switching mode brings back the other pair, and switching back restores the original exactly.
- **A cap never carries over to the other axis.** A 3 mL/s cap never becomes a 3 bar cap.
- **A mode the Step hasn't used yet in this draft starts at 9.0 bar or 2.0 mL/s**, with the cap **Off**.
- Exits and every other field are unchanged. The remembered values exist only in the draft, because the Bridge keeps only the active mode's target.

**Precision and display**

- **Save exactly the value the operator saw.**
  - A ruler edit stores the value at its grid step, rounded to the field's decimals: 9.1 is saved as `9.1`, never `9.125` or `9.099999`. The Bridge does the 1/16 encoding, and float noise can't change the profile id.
  - Values the operator hasn't touched are saved exactly as stored, including off-grid ones such as 9.125 from a de1app import or 92.3 °C from dashboard drift.
- **Display.**
  - A stored value shows as many decimals as it actually has, up to 3, so off-grid values look off-grid.
  - The DE1 "machine" hint appears whenever the machine would run something different (92.3 → "machine 92.5").
  - Grid values use the field's normal precision: one decimal for bar, mL/s, g, and °C ("93.5", "93"); seconds to 0.1 below 12.75 s and whole seconds above; whole mL.
- **Units** are bar, mL/s, °C, s, mL, and g. There are no unit settings.

**Field placement**

Step fields sit in de1app's four groups, with **no advanced disclosure**. A field that's turned off shows **Off** rather than disappearing.

| Group | Always shown | Shown only when on |
|---|---|---|
| **Temperature** | Temperature, sensor (coffee / water toggle) | — |
| **Goal** | Pump mode, target, transition (fast / smooth toggle), limiter (**Off** or on) | Cap value, limiter range |
| **Stop after** | Max time, max volume (**Off**), weight (**Off**) | — |
| **Move on if** | Exit (**Off** or one of the four types) | Exit value |

- **The Step name is edited in its own text sheet**, so the keyboard never covers the fields.
- **Sensor and transition stay visible** even though they're rarely changed. If they were hidden, an unusual setting would be hidden too.
- **Weight is always shown.** It only acts with a scale connected, but it is saved either way.

Profile-level fields:

| Field | Where | Input |
|---|---|---|
| Title | Editor header, edited in a text sheet | Required; unique among visible profiles |
| Notes, Author | Profile settings, edited in a text sheet | Free text |
| Beverage type | Profile settings | Espresso, Pour-over, Manual, Cleaning, Calibrate: exactly the Bridge's values |
| Tank preheat | Profile settings | See Limits |
| Stop at volume | Profile settings, labelled "Used only without a scale" | See Limits |
| Preinfusion boundary | Divider in the Step list | See above |
| `target_weight`, `version` | Hidden, saved unchanged | — |

- An unknown beverage type such as `tea_portafilter` never reaches the Skin; the Bridge has already read it as Espresso.
- The Workflow's `targetWaterVolume` overrides Stop at volume. The Skin's `workflowContextSchema` currently drops that field, so the editor can't say when the override is active. Fixing the schema is an implementation detail.

**What Save treats as a change** (refining [What does Save do to a profile and its lineage?](06-save-semantics-and-lineage.md))

- **A change to anything the machine runs makes a Profile Revision.** That covers the Steps, beverage type, tank preheat, stop at volume, and the preinfusion boundary: every field the Bridge hashes into the profile id (plus `target_weight` and `version`, which the editor never changes).
- **Changing only the title, author, or notes updates the profile in place.** These stay locked on a Bundled Profile until something that runs has changed.
- **Save as new and Duplicate:** Save stays disabled until something the machine runs differs from the source. The reason reads "A copy must change how the profile runs". A copy that only changes tank preheat is allowed.
- **"Changed" means the draft differs from its source**, not that a field was touched. Edits that are undone leave no change.

**New profiles**

- **Create new opens a one-Step draft.** Nothing is written until Save.
  - **The Step:** named "Step 1"; pressure 9.0 bar, 93 °C at the coffee sensor, fast transition, max time 30 s. The limiter, exit, volume, and weight start **Off**.
  - **The profile:** titled "New profile" (or "New profile 2" if taken), Espresso, tank preheat Off, stop at volume Off, preinfusion boundary 0, author empty, `target_weight` 0, and `version` "2", matching the bundled profiles.
- **Use for next shot works on a new draft too**, as for any draft.

**Round-trip safety and text**

- **The draft is the complete profile as the Bridge returned it.** The editor changes only the fields the operator edits, and every write, to the library or to the Workflow, sends the complete profile. Nothing is re-derived or normalised.
- **Legacy and unknown keys need no handling.** The Bridge drops them on every parse, so the Skin never receives any.
- **Text fields** (title, author, notes, Step names):
  - no length limit; lists truncate with an ellipsis;
  - titles and Step names are trimmed of leading and trailing spaces when saved;
  - **a title must not be empty, and two titles clash if they differ only in letter case**, because an operator would read them as the same profile in shot history;
  - **a blank Step name is allowed.** The list and chart show "Step 3", but nothing is written into the name, which counts toward the profile id.

**Upstream**

- **Nice-to-have:** the Bridge rejects with a 400 any profile or Workflow write that has a value the encoder would wrap, or more than 20 Steps. Rejecting surfaces bugs in every client (Cockpit's dashboard included); clamping would just be another silent change.
- **Practical ranges stay in the Skin.** Limits like 12 bar and 105 °C are editor choices, not machine limits.
- **The Skin keeps its own limits either way**, so the editor works the same with or without the change.

**Rejected**

- **Ceilings that follow the connected machine.** The editor would need the model and a fallback when no machine is connected, and a profile made on a Bengle could wrap on a DE1.
- **Allowing exit value 0 with a warning.** "Flow under 0" is the same as Off, and "pressure over 0.1" does what "pressure over 0" would.
- **Clamping on load.** It would make a Revision for a change the operator never made.
- **Blocking Save on warnings.** Too strict for profiles the operator didn't author.
- **A plain boundary number with no automatic adjustment** (de1app's slider). Inserting or deleting a Step would silently change which Steps count as preinfusion.
- **Role swap on a pump switch** (the old target becomes the cap). It quietly turns on a cap, and switching back doesn't restore the Step.
- **Saving values encoded at 1/16, or rounding off-grid values for display.** The saved number would differ from the one the operator entered or saw.
- **"More" disclosure for sensor, transition, and limiter range.** It hides the most unusual settings.
- **Updating profile-level settings in place.** A `PUT` that changes the id orphans Forks and is rejected on Bundled Profiles.
- **Starting New from a picker, or from Skin-owned templates.** The first applies the Fork rule to New; the second makes the Skin own profile content.
- **Exact-match title clashes.** Two profiles that look the same in shot history could both exist.

**Knock-ons for other tickets**

- *How does the step editor lay out at 1024×600?* has to fit:
  - the four groups with every field visible and Off states, with cap value, limiter range, and exit value appearing only when on;
  - a text sheet for the Step name;
  - a Profile settings surface;
  - the Preinfusion | Pour divider in the Step list;
  - Add and Duplicate disabled at 20 Steps and Delete at 1, with reasons;
  - the blocking and warning flags on fields;
  - "Step N" for blank names.
- *What happens to a Profile Draft when the operator leaves the editor?*: if drafts are stashed, the per-mode values a Step remembers belong to the draft too.
- *Which Bridge changes does the spec depend on, and how do we ask for them?*: one more nice-to-have, rejecting values that would wrap and more than 20 Steps. Range checks are designed around in the Skin.
- *What does Save do to a profile and its lineage?*: its "Steps changed" now reads "anything the machine runs changed" (see "What Save treats as a change").
