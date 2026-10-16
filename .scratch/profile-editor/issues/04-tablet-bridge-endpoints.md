# Does the tablet's Bridge expose the profile write endpoints?

Type: task
Status: open
Blocked by: —
Map: [Profile authoring in Cockpit](../map.md)

## Question

Does the Bridge currently running on the operator's tablet support everything the spec will rely on? Without this, the spec can't decide whether it needs a minimum Bridge version or a fallback.

Work (AFK, read-only, no writes to the tablet's library):

- Use `TABLET_GATEWAY_ORIGIN` from the main checkout's `.env`, and ask the human to wake the tablet if it isn't reachable.
- Record the Bridge version or build, and compare it with the release table in *What does the Bridge's profile write API accept…*: `/profiles/defaults` needs ≥ v0.6.2, clean 400s ≥ v0.7.9, and atomic replace ≥ v0.8.0.
- Probe `GET /api/v1/profiles`, `GET /api/v1/profiles/defaults`, `GET /api/v1/profiles/{id}/lineage` for one visible profile, and `GET /api/v1/profiles?includeHidden=true`.
- Record which endpoints respond and their response shapes.
- Note the size of the library: total, bundled, hidden, and user-created counts.
- Record `gatewayMode` from `GET /api/v1/settings`. In `full` mode the Bridge does no stop-at-weight, stop-at-volume, or per-step weight exits (see *What does each profile and step field mean…*).
- Record which machine is connected (DE1 or Bengle), because encoded precision and ceilings differ.
