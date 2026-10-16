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
