# What does each profile and step field mean, and what ranges does the machine allow?

Type: research
Status: resolved
Blocked by: —
Map: [Profile authoring in Cockpit](../map.md)
Findings: branch `research/profile-field-semantics` → `docs/research/profile-field-semantics.md`

## Question

For the v2 profile JSON (Kletsky's spec, as implemented by the Bridge's `lib/src/models/data/profile.dart` and its DE1 encoder), what does every field mean to the operator, and what values are legal?

- **Step fields**: `name`, `pump` (pressure | flow), `pressure`, `flow`, `temperature`, `sensor` (coffee | water), `transition` (fast | smooth), `seconds`, `volume`, `weight`, `exit` (type, condition, value), `limiter` (value, range). Cover the meaning, unit, legal range, and the precision the DE1 actually encodes (e.g. 1/16 bar for DE1 v1, 1/10 for Bengle v2). Note which fields are ignored or meaningless given another field's value (e.g. `pressure` when `pump: flow`).
- **Profile-level fields**: `title`, `author`, `notes`, `beverage_type` (allowed values), `tank_temperature`, `target_weight`, `target_volume`, `target_volume_count_start`, `version`. What does each do at runtime?
- **Precedence**: how do the profile's `target_weight` / `target_volume` interact with the Workflow's `targetYield` / `targetWaterVolume`? Which one actually stops the shot?
- **Machine limits**: maximum steps, maximum step seconds, pressure, flow, and temperature ceilings, and any firmware-side clamping.
- **Exits vs weight exits**: who enforces each (firmware vs Bridge), and what values mean "no exit".

Sources: reaprime source, the pyDE1 v2 profile JSON spec, and de1app's profile code where the Bridge defers to it.

## Answer

Full findings, with citations into reaprime `74369af`, de1app and pyDE1: branch `research/profile-field-semantics` (commit `692af9d`), file `docs/research/profile-field-semantics.md`.

- **A Step is one machine frame.** It uses one pump mode (pressure or flow) with one target, plus a temperature (coffee or water sensor), a transition (fast or smooth), a max `seconds`, and optional early exits on volume, pressure/flow threshold, or cup weight. Whichever exit fires first ends the Step. Firmware enforces seconds, volume, and pressure/flow exits. The Bridge enforces weight exits via `skipStep`.
- **Encoded precision:**
  - Pressure, flow, exit values, and limiter values: 1/16 on DE1 (max 15.9375), 1/10 on Bengle (max 25.5).
  - Temperature: 0.5 °C steps (max 127.5).
  - Seconds: 0.1 s below 12.75 s, then whole seconds up to 127.
  - Step volume: whole mL from 0 to 1023, truncated.
- **Hard limits:** 20 Steps per profile (enforced by de1app and pyDE1), 127 s per Step, 1023 mL per Step. **The Bridge validates none of these.**
- **Out-of-range values wrap silently instead of clamping**; only seconds is clamped. On DE1, 16 bar becomes 0 and −0.1 bar becomes 15.94. 130 °C becomes 2 °C. 1024 mL becomes 0, which means no limit.
- **Only the target matching the pump mode survives.** The Bridge drops the other one on save.
- **Limiter**: caps the quantity the Step isn't controlling (max flow on a pressure Step, max pressure on a flow Step). 0 means no cap. The range only matters when a cap is set.
- **No exit = omit the `exit` object.** An exit value of 0 is *not* "off": "pressure over 0" fires almost immediately, and "flow under 0" never fires. This is inferred from the firmware flags, not hardware-tested. Step `weight`/`volume` of 0 *does* mean off.
- **Profile `target_weight` is dead at runtime.** Stop-at-weight uses only the Workflow's `targetYield`. Stop-at-volume uses the Workflow's `targetWaterVolume`, falling back to the profile's `target_volume`, and only when no usable scale is present.
- **`target_volume_count_start`** is where preinfusion ends and volume counting starts.
- **`tank_temperature`** preheats the water tank (0 = off, 0–45 °C).
- **`beverage_type`** only matters for `cleaning` and `calibrate` (no scale required, shot not saved). Unknown values silently become `espresso`.
- **`version`** changes the profile hash id even though it doesn't affect the machine.

**Knock-on findings for other tickets** (also noted on those tickets):

- The Skin must enforce every machine range itself, or the Bridge must start validating, because bad values wrap silently. → *Which fields does the editor expose, and what limits does the Skin enforce?*
- Editing profile `target_weight` doesn't change when the shot stops. → *How does editing relate to the Active Profile and the dial-in loop?*
- In Bridge `full` gateway mode, the Bridge does no stop-at-weight, stop-at-volume, or per-step weight exits. → *Does the tablet's Bridge expose the profile write endpoints?* now records `gatewayMode`.
- On Bengle, pressure Steps run with no flow cap. de1app adds an 8 mL/s cap to uncapped pressure Steps; the Bridge doesn't, and 162 of the 189 bundled pressure Steps are uncapped.
- `PUT /workflow` *merges* profile fields (omitted fields keep their old values; `steps` is replaced whole), so the Skin should send complete profiles.
- **Skin schema gaps:**
  - `workflowContextSchema` is strict and lacks `targetWaterVolume`, so it gets dropped.
  - The temperature nudge rounds to 0.1 °C rather than 0.5 °C.
  - `workflowProfileSchema` validates nothing inside Steps.
- The Bridge's mock machine ignores per-step volume and treats exit value 0 as no exit, so fake-gateway tests won't catch the 0-exit trap.
- Newer de1app Step kinds (power exits; power, lever, and hold Steps) are rejected by the Bridge.
- **Open (undocumented):** what the machine does with a 0-second Step or with more than 20 Steps.
