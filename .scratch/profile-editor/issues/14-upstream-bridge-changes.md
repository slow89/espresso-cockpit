# Which Bridge changes does the spec depend on, and how do we ask for them?

Type: grilling
Status: open
Blocked by: 06, 07, 08
Map: [Profile authoring in Cockpit](../map.md)

## Question

Research turned up Bridge behaviour that the editor must either design around or get changed upstream in tadelv/reaprime. Once Save semantics, the dial-in loop, and guardrails are decided, settle the following for each gap:

- **Disposition**: required upstream before the editor ships, nice-to-have, or designed around in the Skin.
- **Form**: an upstream issue or PR, plus an ADR here where the choice is hard to reverse (as with `0001-bridge-owns-preferred-scale-reconnect`).

Known gaps:

- **Minimum Bridge version.** Below v0.8.0, an execution-changing `PUT` is a non-atomic hard delete followed by an insert, and a content collision then loses the profile. The tablet was on v0.7.11 until it was upgraded to v0.8.8 on 2026-10-15. Decide the floor (v0.8.0, or v0.8.8 as the tested build) and what the Skin does on an older Bridge: block editing, go read-only, or only ever `POST`. `GET /api/v1/info` reports `version` and has done so since v0.5.5. See [Does the tablet's Bridge expose the profile write endpoints?](04-tablet-bridge-endpoints.md).
- `PUT` with an execution change orphans children and drops the old id, so in-place edits lose Profile Lineage.
- `POST` dedups on execution content and ignores title, notes, and `parentId`, so there's no renamed duplicate and Bundled Profiles can't be renamed.
- No range validation, and the encoder wraps values silently. No 20-Step cap.
- Workflow profile changes upload with no idle or shot check.
- No push channel for profile-library or Workflow changes.
- Error inconsistencies:
  - Lineage on an unknown id returns 500.
  - Some bad Step fields return 500 on `POST`.
  - Not-found codes differ across endpoints.
  - `includeHidden=true` includes deleted profiles.
  - A rare self-parent cycle hangs lineage.
- In `full` gateway mode the Bridge does no weight or volume stops.

From [What does Save do to a profile and its lineage?](06-save-semantics-and-lineage.md):

- **Designed around, not required upstream**:
  - `PUT` orphaning children: Save never `PUT`s Step changes; it `POST`s a **Profile Revision** and hides the source.
  - `POST` dedup: the Skin detects it from the returned record, and Duplicate requires a Step change.
  - Bundled Profiles' locked title and notes are accepted.
- **Nice-to-haves surfaced**:
  - a `POST` response that says whether the record already existed (`200` or `created: false`), so the Skin needn't infer it;
  - an atomic "save Revision" (`POST` child plus hide parent), or a `PUT` that keeps lineage. Today's Revision is two requests and not atomic.

From [How does editing relate to the Active Profile and the dial-in loop?](07-active-profile-and-dial-in-loop.md):

- **Designed around, not required upstream**: Workflow profile uploads with no idle or shot check. Cockpit disables every Workflow write while the Bridge reports the machine running something.
- **Nice-to-haves surfaced**:
  - a Bridge-side guard on profile writes during a shot, which would protect every client, not just Cockpit;
  - a source profile id on the Workflow, which could replace Cockpit's title matching for "which library profile is loaded".

From [Which fields does the editor expose, and what limits does the Skin enforce?](08-field-coverage-and-limits.md):

- **Designed around, not required upstream**: the Bridge validates no ranges and wraps out-of-range values. The Skin's ruler clamps to its own limits, and values that would wrap block Save and Use for next shot.
- **Nice-to-have surfaced**: reject with a 400 any profile or Workflow write that has a value the encoder would wrap, or more than 20 Steps. Rejecting rather than clamping makes the bug visible in whichever client sent it, Cockpit's dashboard included. Practical ranges (12 bar, 105 °C) stay in the Skin.
- **Not asked**: a default flow cap on uncapped pressure Steps for Bengle. Bengle is out of scope for this effort.

From [What happens to a Profile Draft when the operator leaves the editor?](10-draft-lifecycle.md):

- **Designed around, not required upstream**:
  - After 10 minutes paused, the Bridge blanks the WebView and reloads the Skin at `/` (`lib/src/skin_feature/skin_view.dart`), so drafts persist in localStorage.
  - Without a push channel, staleness is checked on refetch.
- **Nice-to-haves surfaced**:
  - reloading the Skin at its last URL;
  - a push event for Workflow and library changes.
