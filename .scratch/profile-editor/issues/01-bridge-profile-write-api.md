# What does the Bridge's profile write API accept, reject, and return?

Type: research
Status: resolved
Blocked by: —
Map: [Profile authoring in Cockpit](../map.md)
Findings: branch `research/bridge-profile-write-api` → `docs/research/bridge-profile-write-api.md`

## Question

What exactly does Streamline Bridge (tadelv/reaprime, current `main`) do for every profile write the Skin would make? Answer from the source and `doc/Profiles.md`, citing files and lines:

- **Create (`POST /api/v1/profiles`)**: required fields, and what `Profile.fromJson` rejects. Do numeric fields round-trip as strings (as in the bundled JSON, e.g. `"93.00"`) or as numbers? Which unknown or legacy fields (`legacy_profile_type`, `type`, `lang`, `hidden`, `reference_file`, …) are preserved, dropped, or normalised?
- **Update (`PUT /api/v1/profiles/{id}`)**: when execution fields change, the id changes and the old record is replaced atomically. What happens to `parentId`, `createdAt`, and lineage on that replace? What does a metadata-only change do? What exactly is rejected for **Bundled Profiles** (`isDefault`)?
- **Delete / visibility / purge / restore / `GET /defaults`**: exact behaviour and responses.
- **Lineage (`GET /api/v1/profiles/{id}/lineage`)**: shape and ordering. Does it include siblings and the record itself?
- **Error bodies**: the shape of 400/404/409-style responses, so the Skin can show useful messages.
- **Live updates**: does the Bridge push profile-library changes over any WebSocket, or must the Skin refetch?
- **Workflow interaction**: when a library profile is updated, does anything change the Workflow's embedded **Active Profile**? What happens if `PUT /api/v1/workflow` changes the profile while a shot is running, or while the machine is not idle?
- **Limits**: maximum number of steps, and any length limits on title or notes.
- **Release history**: in which Bridge release did each endpoint above land?

## Answer

Full findings, with citations into reaprime `main` @ `74369af2`: branch `research/bridge-profile-write-api` (commit `6ccf3d0`), file `docs/research/bridge-profile-write-api.md`. A full clone with tags is at `/tmp/reaprime-api-research`.

- **Create (`POST {profile, parentId?, metadata?}`)**
  - Requires a non-empty `title`, a non-empty `steps`, `tank_temperature`, and `target_volume_count_start`.
  - Each Step requires `pump` (pressure|flow), `name`, `transition`, `sensor`, `volume`, `seconds`, `temperature`, and its pump target.
  - String numbers are accepted, but the Bridge stores and returns **real JSON numbers**.
- **Fields kept and dropped**
  - Only 10 profile keys and 11 Step keys are kept.
  - Legacy keys are dropped: `legacy_profile_type`, `type`, `lang`, `hidden`, `reference_file`, `changes_since_last_espresso`, `parent_id`, and `id`. So is the unused pump target.
  - An unknown `beverage_type` silently becomes `espresso`.
- **Create dedups silently.**
  - The id hashes execution fields, and **Step names count as execution fields**.
  - If that content already exists, POST returns 201 with the *existing* record unchanged, even if it is deleted, hidden, or a Bundled Profile.
  - The new title, notes, `parentId`, and `metadata` are ignored.
- **Update (`PUT`) is a full replace, not a merge.**
  - An execution change moves the record atomically to a new id.
  - `parentId`, `createdAt`, `visibility`, and `metadata` carry over.
  - The old id survives only in a log line, and **its children are orphaned**.
  - A collision with existing content returns 400 and changes nothing.
  - A title/author/notes-only change keeps the id.
- **Bundled Profiles**
  - Any PUT body containing `profile`, even a title-only change, returns 400 `Cannot modify default profile content`.
  - DELETE hides them.
  - `deleted` and purge return 400.
  - Restore is by manifest filename.
- **Errors**
  - Bodies are `{error, message}`; the detail is in `message`.
  - Not-found codes vary by endpoint: 404 for GET, DELETE, and restore; 400 for PUT, visibility, and purge; 500 for lineage.
  - No endpoint returns 409.
- **Lineage** returns `[root…parent, self, descendants]`. It includes hidden and deleted records, excludes siblings, and stops silently at a missing ancestor.
- **Live updates**
  - No WebSocket carries profile or Workflow changes; the Skin must refetch.
  - `GET /api/v1/profiles` supports ETag, so polling is cheap.
- **Workflow**
  - Library writes never touch the Workflow; it holds a copy and no profile id.
  - `PUT /api/v1/workflow` deep-merges, so send the full profile with explicit nulls.
  - The change uploads to the machine **immediately, with no idle or shot check**, and retries in the background on failure.
- **Limits**: only "at least one Step". There is no Step maximum, no text-length limit (just the 1 MiB body cap), and no range checks. Values wrap silently: 20 bar goes out as 4 bar.
- **Release history**

  | Capability | First release |
  |---|---|
  | All CRUD, visibility, lineage, purge, import, export, and restore | v0.1.0 |
  | `/profiles/defaults` and ETag | v0.6.2 |
  | Clean 400s for invalid profiles | v0.7.9 |
  | Atomic replace and three-way `metadata` | v0.8.0 |
  | Body limits | v0.8.3 |

**Knock-on findings** (also noted on the affected tickets):

1. **Edit-in-place loses lineage.** To keep history, Save must POST a child, and the old record then stays visible. True in-place edit with history needs an upstream change. → *What does Save do to a profile and its lineage?*
2. **"Duplicate and rename" can't work.** A copy that differs only in title returns the original record, which may be Bundled or deleted. Bundled Profiles can't be renamed or annotated at all. → *What does Save do…*, *How does the operator delete, hide, and restore profiles?*
3. **No mid-shot protection.** Changing the Workflow profile during a shot re-uploads it, and the saved shot records the new profile. The Skin should apply only when the Bridge reports idle. → *How does editing relate to the Active Profile and the dial-in loop?*
4. **The Skin owns all validation.** That covers the 20-Step cap, ranges, text lengths, and float rounding to avoid accidental id churn. The Skin must not compute ids itself: Dart writes `93.0` where JS writes `93`. → *Which fields does the editor expose, and what limits does the Skin enforce?*
5. **Skin client gaps.**
   - `src/rest/client.ts` surfaces `error` ("Invalid request") instead of `message`.
   - The Step schema is too loose; `exit`, `weight`, and `limiter` arrive as explicit nulls.
   - Numeric types already match.
6. **Upstream candidates.**
   - Lineage on an unknown id returns 500 instead of 404.
   - POST returns 500 instead of 400 for some bad Step fields.
   - Not-found codes are inconsistent across endpoints.
   - `includeHidden=true` also returns deleted profiles.
   - A rare self-parent cycle makes lineage hang.
   - There is no push channel for library or Workflow changes.
