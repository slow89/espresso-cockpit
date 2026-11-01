# Draft issue: Profile API — status codes and lineage fixes

Target: `decentespresso/decaid`, new issue. Status: **draft, not filed.**
Source: [Which Bridge changes does the spec depend on, and how do we ask for them?](../issues/14-upstream-bridge-changes.md)

---

> *Drafted with AI assistance (Claude Opus 5.5) and reviewed before filing.*

## Summary

Building a profile editor on the profile API turned up a handful of small bugs and mismatches between the docs and the code. None of them blocks a client that knows about them. Each one surprises a client that follows `assets/api/rest_v1.yml` and `doc/Profiles.md`. They're grouped here because they share two files. Happy to split them.

## Findings (`v0.9.1`, `14361a9`)

1. **Lineage on an unknown id returns `500`, not `404`.** `getLineage` throws `ArgumentError` (`lib/src/controllers/profile_controller.dart:342`). `_handleGetLineage` has no handler for it, so its catch-all answers `500` (`lib/src/services/webserver/profile_handler.dart:230-243`). The `404` branch at `:235-236` can't be reached. `rest_v1.yml` documents `404`.
2. **Lineage can loop forever on a self-parent record.** `getLineage` walks up parents (`profile_controller.dart:349`) and down children (`:356-364`) with no visited set. Such a record is reachable through the public API: purge A, then `PUT` its child B with A's exact content, and the replacement gets `id == parentId == A`. A lineage request for it never returns.
3. **Lineage leaves out siblings.** It returns the ancestor chain plus the record's own subtree. `doc/Profiles.md` and `doc/Skins.md` describe it as "the full version tree (all parents and children)".
4. **`POST /api/v1/profiles` answers `500` to malformed Steps that `PUT` answers `400` to.**
   - `_handleCreate` has no `TypeError` handler (`profile_handler.dart:101-137`); `_handleUpdate` does (`:175-176`). A Step missing `name`, `transition`, `sensor`, `seconds`, `volume`, or `temperature` is a `400` on `PUT` and a `500` on `POST`.
   - An invalid `pump` throws a plain `Exception` (`lib/src/models/data/profile.dart:215`), so it's a `500` on both.
5. **"Not found" uses three status codes.** It's `404` for `GET`, `DELETE`, and restore; `400` for `PUT`, visibility, and purge; and `500` for lineage. The docs say `404` throughout.
6. **`includeHidden=true` also returns deleted records.** `getAll(includeHidden: true)` returns everything stored (`profile_controller.dart:204-212`). The parameter name suggests hidden records only.

## Proposed change

- Answer `404` for an unknown id on every profile route.
- Map `TypeError` and an invalid `pump` to `400` on `POST /api/v1/profiles`, as `PUT` already does for `TypeError`.
- Give `getLineage` a visited set in both directions.
- Either return siblings from `/lineage`, or correct the docs to "ancestors and descendants".
- Either document that `includeHidden=true` includes deleted records, or add `includeDeleted`.
