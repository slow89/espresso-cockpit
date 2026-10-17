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
