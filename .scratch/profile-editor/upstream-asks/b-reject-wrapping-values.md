# Draft issue: Reject profile values the machine encoder would wrap

Target: `decentespresso/decaid`, new issue. Status: **draft, not filed.**
Source: [Which Bridge changes does the spec depend on, and how do we ask for them?](../issues/14-upstream-bridge-changes.md)

---

> *Drafted with AI assistance (Claude Opus 5.5) and reviewed before filing.*

## Summary

Profile and Workflow writes accept any number. The DE1 encoder writes each value into a single byte and keeps the low 8 bits, so an out-of-range value silently becomes a different one: 20 bar goes to the machine as 4 bar, and −5 bar as about 11 bar. There's also no limit on the number of Steps. Decaid should reject such a write with a `400`, so the bug shows up in the client that sent it instead of in the cup.

## Current state (`v0.9.1`, `14361a9`)

- `Profile.fromJson` (`lib/src/models/data/profile.dart:60-66`) checks shape: a title, at least one Step, and the required fields. It checks no ranges.
- The encoder, `lib/src/models/device/impl/de1/unified_de1/unified_de1.profile.dart`, writes into `Uint8List`s:
  - the Step count into one byte (`:20`, `:89`);
  - the pump target and exit value as value × 16 on a DE1, or × 10 on a Bengle (`:33`, `:47`, `:53`);
  - the limiter value and range the same way (`:73-74`);
  - the temperature as value × 2 (`:49`);
  - the volume as a 10-bit number (`:55`);
  - limiter frames at index `32 + i` (`:62`), so 32 or more Steps would collide with them.
- What fits, by field:

  | Field | DE1 | Bengle |
  |---|---|---|
  | pressure or flow target, exit value, limiter value and range | 0–15.9 | 0–25.5 |
  | Step temperature | 0–127.5 °C | 0–127.5 °C |
  | Step volume | under 1024 mL | under 1024 mL |
  | `target_volume_count_start` | 0–255 | 0–255 |

  Negative values wrap on both machines.
- de1app refuses to add a 21st Step: "the maximum number of steps that the espresso machine can handle" (`decentespresso/de1app` `de1plus/vars.tcl:2710-2713`). The largest Bundled Profiles have exactly 20.

## Proposed change

- `POST` and `PUT /api/v1/profiles`: reject with `400 {"error":"Invalid request","message":…}` any value that no supported machine can encode (the Bengle column above), and any profile with more than 20 Steps. The message names the Step and the field.
- `PUT /api/v1/workflow`: the same, checked against the connected machine's range when one is connected (the DE1 column on a DE1).
- Reject rather than clamp. Clamping hides the client's bug just as wrapping does.
- Validate on write only, so records already stored still load. Shot records are unaffected: they're parsed by `Profile.fromRecordedJson` since v0.8.6.
- Practical limits, such as 12 bar or 105 °C, stay each client's choice.

## Why

A skin, plugin, or import with a bug can send 20 bar today, and the machine then brews at 4 bar with no error anywhere. Cockpit validates its own editor input, but its dashboard temperature control can push Step temperatures past the wrap point, and other clients can make the same mistake. One check in Decaid catches all of them.
