# Draft issue: Bundled Profile updates bring back profiles the user hid

Target: `decentespresso/decaid`, new issue. Status: **draft, not filed.**
Source: [Which Bridge changes does the spec depend on, and how do we ask for them?](../issues/14-upstream-bridge-changes.md)

---

> *Drafted with AI assistance (Claude Opus 5.5) and reviewed before filing.*

## Summary

When a Decaid update changes a Bundled Profile's content, startup seeding stores the new version as a new, **visible** record. If the user had hidden that profile, it comes back. Seeding should give the new version the visibility of the newest existing record with the same filename, so a hide survives an update.

## Current state (`v0.9.1`, `14361a9`)

- `_loadDefaultProfilesIfNeeded` (`lib/src/controllers/profile_controller.dart:28-100`) builds a record for each manifest file. When no record has that id yet, it stores the new record with the default visibility, `visible` (`:81`).
- `_retireStaleDefaults` (`:139-163`) then hides every **visible** Bundled record that isn't its filename's current version. A version the user had already hidden is skipped and stays hidden. The new version stays visible.
- So a hide lasts only until the next update that changes that profile. On one tablet, the 0.7.11 → 0.8.8 update replaced 9 Bundled Profiles this way.
- The same happens when a skin saves an edited copy of a Bundled Profile and hides the original. The skin Cockpit does exactly this: it `POST`s a child with `parentId`, then sends `DELETE` for the source. After an update, the new Bundled version appears next to the user's copy, under the same title.

## Proposed change

- In `_loadDefaultProfilesIfNeeded`, before storing a new record for a filename, look up the existing Bundled records with that `metadata.filename`. If the newest of them (by `createdAt`) is `hidden`, store the new record as `hidden` too.
- Nothing else changes:
  - a visible current version still retires the old one;
  - a filename new to the manifest still arrives visible;
  - a user can still bring the new version back with `PUT /api/v1/profiles/{id}/visibility` or `POST /api/v1/profiles/restore/{filename}` (`:430-450`), which already un-hides an existing current version.

## Related, smaller: say which records seeding retired

A client that lists hidden profiles, for example in a "restore" view, can't tell a version seeding retired from one the user hid: both are `hidden`. Today it has to infer the difference from `metadata.filename`, `GET /api/v1/profiles/defaults`, and `createdAt`. Either of these would remove the guesswork:

- **Preferred:** each `GET /api/v1/profiles/defaults` entry gains `id`, the record id of that file's current version. `listDefaults` (`:165-197`) already parses each file, so it can compute the id the way seeding does (`ProfileRecord.create(...).id`). Nothing stored changes.
- Or `_retireStaleDefaults` adds a marker such as `"retired": true` to the record's `metadata`.

## Why

- A user hides a Bundled Profile because they don't want it in their list. An update to its content doesn't change that.
- Skins can't fix this without re-implementing seeding policy, for example by re-hiding records on every launch. That policy belongs to Decaid, and the fix would help every skin.
