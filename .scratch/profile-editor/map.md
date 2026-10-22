# Map: Profile authoring in Cockpit

Label: wayfinder:map
Tickets: [issues/](./issues/), one file per ticket. The frontier is every open, unblocked, unclaimed ticket; lowest number goes first.

## Destination

A handoff-ready spec for creating and editing **Profiles** inside Cockpit, tuned for the default 7" Decent tablet in landscape (1024×600). Every design question is decided, so the spec can be cut straight into implementation tickets. The map ends where building starts.

## Notes

- **Domain**: Cockpit is a **Skin** on Streamline **Bridge**. Use the vocabulary in `CONTEXT.md`: **Profile**, **Step** (never "frame", except for the machine's runtime index), **Workflow**, **Active Profile**, **Profile Library**, **Bundled Profile**, **Profile Lineage**, **Profile Draft**, **Profile Revision**, **Superseded Profile**, **Profile Fork**. Update `CONTEXT.md` inline via `/domain-modeling` as terms settle.
- **Bridge is the source of truth** for profile storage, ids, validation, and machine upload: [tadelv/reaprime](https://github.com/tadelv/reaprime) (now redirects to `decentespresso/decaid`), especially `doc/Profiles.md`. Decent's own Bridge-era skin `decentespresso/streamline-js` already has a profile editor and is the closest prior art. Inspect it before deciding anything that depends on Bridge behaviour. The Skin does not re-implement Bridge policy.
- **Scope already fixed while charting**:
  - **Edit depth**: a full **Step** editor. Add, remove, and reorder **Steps**. Edit pump mode, targets, temperature, transition, exits, limiter, and weight exit per **Step**, plus the profile-level fields.
  - **Library operations in scope**: create new, duplicate (including **Bundled Profiles**), delete, hide, restore, and **Profile Lineage**.
  - **Beverage types**: the editor works on every profile the Bridge stores (espresso, filter/pour-over, tea, cleaning). Beverage type is a field, with no special handling per type.
- **Form factor**: judge every UI at 1024×600 landscape, touch only. Keep text ≥0.66rem and tap targets ≥36px. The Android soft keyboard covers a large share of the 600px height.
- **Skills by ticket type**:
  - **grilling** tickets: `/grilling` + `/domain-modeling`
  - **prototype** tickets: `/prototype`. UI prototypes are checked in a browser at 1024×600 against the repo's fake gateway (`tests/gateway/`).
  - **research** tickets: `/research`
- **Code conventions the spec must respect** (see `AGENTS.md`): zustand stores and derived state over `useEffect` / mirrored state, the React compiler with no manual memoisation, and components under ~300 lines.
- **Plan, don't do**: tickets produce decisions, not shipped code. When the frontier is empty, run `/to-spec` to write the spec from Decisions so far, then hand off.
- **Tracker**: local markdown, on `main` (merged in PR #2). Ticket edits ride on whichever branch the session uses, so merge them back promptly. Research findings live on throwaway `research/<name>` branches, linked from each research ticket.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [How do existing DE1 profile editors lay out step editing?](issues/03-editor-prior-art.md) — list + detail with chart-as-Step-selector dominates (no curve dragging anywhere); de1app's four field groups are universal; numbers via ± stepper + full-screen in-app keypad; Bridge-era skins fork Bundled Profiles, offer Save a copy / history / Try-without-saving; the Bridge has no editor UI of its own.
- [What does the Bridge's profile write API accept, reject, and return?](issues/01-bridge-profile-write-api.md) — ids hash execution fields incl. Step names; PUT replace moves to a new id and orphans children; POST dedups silently (title-only copies return the original); Bundled Profiles reject any `profile` edit; no push channel (refetch, ETag); Workflow profile changes upload immediately with no idle check; Bridge validates no ranges.
- [What does each profile and step field mean, and what ranges does the machine allow?](issues/02-profile-field-semantics.md) — 20 Steps max, DE1 1/16 bar, 0.5 °C steps; the Bridge wraps out-of-range values silently instead of rejecting them; profile `target_weight` is dead at runtime (Workflow `targetYield` stops the shot); "no exit" = omit `exit`, not 0.
- [Does the tablet's Bridge expose the profile write endpoints?](issues/04-tablet-bridge-endpoints.md) — yes, after the operator upgraded v0.7.11 → Decaid v0.8.8, which matches the researched `main` for profiles; below v0.8.0 an execution-changing PUT can lose the profile. DE1Pro, `tracking` mode; 1 operator profile among 86 bundled, all 13 hidden ones retired by the Bridge; the Active Profile already drifts from the library (dashboard temperature offset). Tablet moved to `192.168.68.50`.
- [How are numbers entered on the tablet without the soft keyboard?](issues/05-numeric-input-on-tablet.md) — a drag ruler bound to the selected field: 14px snapping ticks at the machine step, coarse ± at the rail ends, adaptive labels, encoded value shown on drift, edits go to the Profile Draft only; no keypad, no sliders, no chart dragging. Prototype on branch `prototype/numeric-input`.
- [What does Save do to a profile and its lineage?](issues/06-save-semantics-and-lineage.md) — Step changes `POST` a marked **Profile Revision** and hide the source as a **Superseded Profile**, Bundled Profiles included; title/notes-only edits `PUT` in place (locked on Bundled); Save as new / Duplicate make a **Profile Fork** and need a Step change; collisions write nothing and name the match; titles unique among visible profiles. No upstream change needed.
- [How does editing relate to the Active Profile and the dial-in loop?](issues/07-active-profile-and-dial-in-loop.md) — the Active Profile belongs to the visible profile with the same title, with a "Differs from saved" badge; its draft always starts from the Workflow copy (Revert to saved); Save on it also updates the Workflow, Save & use loads others; Use for next shot loads a trial without saving; no Workflow writes while the machine is running anything (disabled, not queued); loading a different profile over unsaved changes asks first; `target_weight` hidden and preserved, yield stays in the Workflow.
- [Which fields does the editor expose, and what limits does the Skin enforce?](issues/08-field-coverage-and-limits.md) — the Skin owns every limit, with one practical set for every machine (0–12 bar, 0–15.9 mL/s, 0–105 °C, 1–20 Steps); Off omits an exit or limiter, so no value-0 exits; stored values load untouched and are flagged (wrap = blocking, out of range = warning); the preinfusion boundary is a divider in the Step list; each Step remembers its per-mode targets and caps in the draft; the value shown is the value saved; every field is visible in de1app's four groups, profile settings sit on one surface; anything the machine runs makes a Revision, while title, author, or notes update in place; New is a one-Step draft; asking the Bridge to reject values that would wrap is a nice-to-have.
- [Where does profile authoring live in the app, and what are its entry points?](issues/09-app-placement-and-entry-points.md) — the Profiles tab becomes a master/detail **Profile Library** ("Library | Shot setup" segments, filter chips, Yours first, Forks nested under their parent, tap selects, explicit Use) with a loaded-profile strip and Edit loaded; the editor is a full-screen route over the nav with ← Library and a Brew button; nothing navigates on its own; no new nav tab. Prototype on branch `prototype/app-placement`.

## Not yet specified

_Nothing right now. The last patch, a shortcut into the editor from Brew, graduated to [Does Brew get a shortcut into the editor?](issues/15-brew-shortcut-into-editor.md)._

## Out of scope

- **Import/export of profile JSON** (library backup/restore, single-file transfer) and **sharing or uploading edited profiles to Visualizer**. Ruled out while charting. The existing Visualizer share-code import stays as it is.
- **Parametric editors** (de1app-style basic pressure/flow, D-Flow, A-Flow generators). The full **Step** editor was chosen instead, and the Bridge deliberately doesn't reimplement those generators.
- **Remembering dose and yield per profile** (as streamline-js does on a profile switch). That is a **Workflow** feature, not part of the editor; profile `target_weight` stays inert.
- **Gating the dashboard's own Workflow writes** (dose, yield, Brew temperature) while the machine is busy. They carry the same mislabelled-shot risk as profile loads, but sit outside the editor; worth a separate fix.
- **Bengle-specific behaviour**: a default flow cap on uncapped pressure Steps, ceilings above the DE1's, and accurate machine-value hints at Bengle's 1/10 precision. The operator's machine is a DE1, and the editor's limits are already safe on a Bengle. Ruled out in [Which fields does the editor expose, and what limits does the Skin enforce?](issues/08-field-coverage-and-limits.md).
- **Bulk edits across Steps** (shift every temperature, one limiter range for every limited Step). The dashboard's Brew temperature already shifts the loaded profile, and limiter range is 0.6 almost everywhere.
- **The dashboard's Brew temperature control pushing Step temperatures past the wrap point.** It shifts every Step with no upper bound, so a Step can exceed 105 °C, wrap above 127.5 °C, or wrap below 0 °C (`src/components/dashboard/dashboard-view-model.ts:260-261`). It sits outside the editor, which flags such values; worth a separate fix.
- **Building the feature.** The destination is the spec. Implementation comes after handoff.
