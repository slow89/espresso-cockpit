# Which fields does the editor expose, and what limits does the Skin enforce?

Type: grilling
Status: open
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
