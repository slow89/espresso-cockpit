# Does the tablet's Bridge expose the profile write endpoints?

Type: task
Status: resolved
Blocked by: —
Map: [Profile authoring in Cockpit](../map.md)
Findings: branch `research/tablet-bridge-endpoints` (commit `a592583`) → `docs/research/tablet-bridge-endpoints/` (probe script plus a report before and after the upgrade)

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

## Answer

**What was done** (GETs only; nothing was written to the library):

- **The tablet moved.** It is now at `192.168.68.50:8080`, not the `.51` in the main checkout's `.env`; DHCP reassigned it. Found it by sweeping the LAN for port 8080. `TABLET_GATEWAY_ORIGIN` needs updating before the next `redeploy`.
- **First probe, on v0.7.11+1915** (sideloaded, built 2026-07-07). Every endpoint answered 200, but this build sits below the atomic-replace line.
- **The operator then upgraded the tablet to Decaid v0.8.8+2900**, the current stable release. Re-probed afterwards. The Android package id is unchanged (`net.tadel.reaprime`), so the library and Workflow carried over in place; the Workflow is byte-identical. The first install attempt failed with "out of memory", meaning storage: the APK is 115 MB.

**Facts later tickets depend on:**

- **Bridge**: v0.8.8 meets every line of the release table: `/profiles/defaults` ≥ v0.6.2, clean 400s ≥ v0.7.9, atomic replace ≥ v0.8.0, and body limits ≥ v0.8.3. Between v0.8.8 and the reaprime `main` @ `74369af2` that the research cited, nothing changed in the profile controller, handler, storage, model, or encoder; only Workflow grinder-context fields did. So the three research tickets apply to the tablet as written.
- **Why the version floor matters**: on v0.7.11, an execution-changing `PUT` is a non-atomic **hard delete followed by a plain insert** (`profile_controller.dart` `update`, with `drift_profile_storage.dart` `store` doing a bare `insert`). When the new content already exists, the insert fails with a 500 *after* the original has been deleted, so the profile is lost. Fixed in v0.8.0 by `586fde77`, "make ID-changing updates atomic".
- **Endpoints**: everything the spec relies on responds with the documented shapes.
  - `GET /profiles`, `?includeHidden=true`, `?visibility=hidden|deleted`, `/profiles/{id}`, `/profiles/{id}/lineage`, and `/profiles/defaults`.
  - Records carry `id, profile, parentId, visibility, isDefault, createdAt, updatedAt, metadata, metadataHash, compoundHash`.
  - Numbers arrive as real JSON numbers. `exit` and `limiter` arrive as explicit `null`s: 349 and 283 of 552 Steps respectively. `weight` is always present.
  - `/defaults` entries are `{filename, title, author, notes, beverageType}`.
  - The ETag works: `If-None-Match` returns 304.
- **Library on v0.8.8**: 87 records.
  - 74 are visible: 73 bundled and **1 operator-created** ("Extractamundo Dos!", a Visualizer import that shares its title with a visible Bundled Profile).
  - **13 hidden**, all bundled, and the operator hid none of them. The Bridge retired each one as stale: 4 before the upgrade, and 9 more replaced by new content versions during the upgrade, e.g. 7g basket, Default, and four A-Flow presets.
  - 0 deleted.
  - Beverage types: espresso 61, pourover 22, cleaning 2, manual 2.
  - Two Bundled Profiles already sit at the **20-Step cap** (Gagné Adaptive Shot / Allongé).
  - Only one record has a `parentId`: Adaptive v3 → v2, through bundled provenance. Lineage is otherwise a single record.
- **`gatewayMode` is `tracking`**: the Bridge controls shots (stop-at-weight and weight exits) without its own UI. The Acaia Lunar scale was disconnected at probe time.
- **Machine**: a **DE1Pro**, not Bengle. Firmware 1333, GHC, 120 V, and `/machine/capabilities` is empty. So the operator's precision is 1/16 bar (or mL/s) for pressure, flow, exit, and limiter values. Machine state was `idle`.
- **Active Profile drift is real**: the Workflow's "Blooming Espresso" (dose 19 g, yield 46 g) matches no library record. Every Step's temperature is 9.5 °C below the library copy, from Cockpit's dashboard brew-temperature control (`src/components/dashboard/dashboard-view-model.ts:164-178`).

**Knock-on findings** (also noted on the affected tickets):

1. **A minimum Bridge version is a real decision.** Below v0.8.0, the Skin's own Save can destroy a profile. The tablet now runs v0.8.8, but other operators may not. → *Which Bridge changes does the spec depend on, and how do we ask for them?*
2. **Bridge upgrades rewrite the Bundled side of the library.** They hide old versions under new ids and add new ones. Anything keyed to a bundled id (a fork's `parentId`, an Active Profile matched by content) can silently point at a now-hidden record after an upgrade. → *How does the operator delete, hide, and restore profiles?*, *How is Profile Lineage shown and navigated?*
3. **A "Hidden" view would be mostly Bridge-retired versions.** The operator never hid any of the 13. "Rao Allongé 3" has also left the manifest, so `/defaults` restore can't bring it back. → *How does the operator delete, hide, and restore profiles?*
4. **The Active Profile already diverges from the library** through the dashboard temperature control, so "edit what's loaded" has to handle a profile with no library match. → *How does editing relate to the Active Profile and the dial-in loop?*
5. **The operator's machine is a DE1**, so Bengle-only concerns (uncapped pressure Steps, 1/10 precision) don't affect this operator. The spec still covers both. → *Which fields does the editor expose, and what limits does the Skin enforce?*
