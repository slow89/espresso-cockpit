# Which Bridge changes does the spec depend on, and how do we ask for them?

Type: grilling
Status: resolved
Blocked by: 06, 07, 08
Map: [Profile authoring in Cockpit](../map.md)
Drafts: [upstream-asks/](../upstream-asks/README.md) (four issues and two comments for Decaid, not yet filed)

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

From [How does editing relate to the Active Profile and the dial-in loop?](07-active-profile-and-dial-in-loop.md):

- **Designed around, not required upstream**: Workflow profile uploads with no idle or shot check. Cockpit disables every Workflow write while the Bridge reports the machine running something.
- **Nice-to-haves surfaced**:
  - a Bridge-side guard on profile writes during a shot, which would protect every client, not just Cockpit;
  - a source profile id on the Workflow, which could replace Cockpit's title matching for "which library profile is loaded".

From [Which fields does the editor expose, and what limits does the Skin enforce?](08-field-coverage-and-limits.md):

- **Designed around, not required upstream**: the Bridge validates no ranges and wraps out-of-range values. The Skin's ruler clamps to its own limits, and values that would wrap block Save and Use for next shot.
- **Nice-to-have surfaced**: reject with a 400 any profile or Workflow write that has a value the encoder would wrap, or more than 20 Steps. Rejecting rather than clamping makes the bug visible in whichever client sent it, Cockpit's dashboard included. Practical ranges (12 bar, 105 °C) stay in the Skin.
- **Not asked**: a default flow cap on uncapped pressure Steps for Bengle. Bengle is out of scope for this effort.

From [What happens to a Profile Draft when the operator leaves the editor?](10-draft-lifecycle.md):

- **Designed around, not required upstream**:
  - After 10 minutes paused, the Bridge blanks the WebView and reloads the Skin at `/` (`lib/src/skin_feature/skin_view.dart`), so drafts persist in localStorage.
  - Without a push channel, staleness is checked on refetch.
- **Nice-to-haves surfaced**:
  - reloading the Skin at its last URL;
  - a push event for Workflow and library changes.

From [How does the operator delete, hide, and restore profiles?](11-delete-hide-restore.md):

- **Designed around, not required upstream**:
  - purge breaking lineage: Cockpit never purges;
  - not-found codes differing across endpoints: any of them, on `DELETE` or a visibility change, is read as "already removed elsewhere";
  - `includeHidden=true` returning deleted records: the Skin classifies hidden and deleted records itself.
- **New gaps**:
  - **A hide or Revision of a Bundled Profile doesn't carry over a content update.** When a Bridge update changes a Bundled Profile's content, seeding stores the new version visible under a new id. `_retireStaleDefaults` only looks at visible records. So a Bundled Profile the operator hid comes back, and one they revised reappears next to their Revision under the same title. Decide whether to ask upstream to carry the hide over, or to design around it in the Skin, and say how without re-implementing Bridge policy.
  - **Retired Bundled versions can't be kept.** Seeding re-hides any visible Bundled record that isn't the manifest's current version, so a restored retired version disappears again at the next launch.
  - **Retired can only be told apart from hidden by inference.** Cockpit infers it from `metadata.filename` against `/defaults` and `createdAt`. Nice-to-have: mark retired records in `metadata`, or have `/defaults` return each entry's current id.

From [How is Profile Lineage shown and navigated?](13-lineage-view.md):

- **Designed around, not required upstream**:
  - `GET …/{id}/lineage` leaves out siblings, returns 500 for an unknown id, and can hang on a self-parent cycle. Cockpit builds History from `GET /api/v1/profiles?includeHidden=true` instead, following `parentId` with its own cycle guard.
  - Going back can't re-save old content, because `POST` dedups. Cockpit swaps visibility instead ([ADR 0004](../../../docs/adr/0004-going-back-swaps-visibility.md)).
- **Nice-to-haves surfaced**:
  - an atomic visibility swap. Going back is two requests today: un-hide, then hide;
  - a `/lineage` that returns the whole tree, siblings included, with a cycle guard and 404 for an unknown id.

## Comments

**2026-11-01 — claimed.** Grilling session in progress on branch `t3/profile-editor-wayfinding`.

**2026-11-01 — decided with the operator.** Three questions, one at a time, each with a recommendation. The operator took the recommendation every time. Smaller calls I settled myself, as the operator prefers, and they're marked *(best judgment)* in the Answer.

1. Minimum Bridge version: **v0.8.0**, with the Library read-only below it (option a). Rejected: v0.8.8, the tested build; no floor and no check; v0.8.0 with editing hidden instead of disabled.
2. Bridge updates that undo the operator's hide: **ask upstream and tolerate it meanwhile** (option a). Rejected: the same ask plus an interim "Updated by Decent" prompt; the Skin re-hiding on its own; tolerating it without asking.
3. Filing: **four focused issues and two comments on existing issues** (option a), drafted here and filed by the operator. Rejected: every ask as its own issue; one umbrella issue; filing nothing until implementation starts.

Checked before asking: Decaid v0.9.0 and v0.9.1 shipped after the research. Between v0.8.8 and v0.9.1, nothing changed in the profile controller, handler, storage, model, or encoder, and the 10-minute blank-and-reload is unchanged (`gh api …/compare/v0.8.8...v0.9.1`). Upstream already has open issues for half of the push gap (#1036, a Workflow WebSocket) and next to the source-id ask (#995, profile identity on `ShotRecord`).

## Answer

**Nothing has to change upstream before the editor ships.** Cockpit needs Decaid **v0.8.0 or newer** and works around every other gap in the Skin. It was tested on v0.8.8, and v0.9.1 has the same profile code. Four issues and two comments go to Decaid, each fixing a gap for every client. None of them blocks the editor, and each workaround can be swapped for the Bridge's fix once it lands.

**Minimum Bridge version**

- **v0.8.0**, read from `version` in `GET /api/v1/info`, which every Bridge has reported since v0.5.5.
- **Why v0.8.0.** It's the release where the profile write API took the shape the spec was designed against: strict 400s (v0.7.9), atomic ID-changing replace, tri-state `metadata`, and `TypeError` → 400 on `PUT` (v0.8.0). Every release since has the same profile routes, up to v0.9.1. Below v0.8.0, a `PUT` from *any* client that changes how a profile runs can delete it (ticket 04), so the notice also nudges an upgrade.
- **Cockpit's own writes would be safe below it.** Save never `PUT`s a Step change (ADR 0003). Before v0.8.0, a `PUT` that leaves out `metadata` keeps it, so a title edit never drops the revision marker. The floor is about the API that was checked, not about a write Cockpit makes.
- **Below the floor, the Library is read-only.**
  - **Still available**: browsing, the filter chips, the detail pane, History, the loaded-profile strip, and **Use**. Use is a Workflow write, and it works on every version.
  - **Disabled, not hidden**: New, Edit loaded, Edit, Duplicate, Save, Save as new, Hide, Delete, Restore, and Go back. The layout stays the same on every Bridge.
  - **One line in the loaded-profile strip**: "Profile editing needs Bridge 0.8.0 or newer · this one runs 0.7.11".
  - **A waiting draft** stays on the tablet with its Resume disabled, and comes back when the Bridge is upgraded *(best judgment)*.
- **Reading the version** *(best judgment)*: Cockpit compares the leading `major.minor.patch` and ignores build and pre-release suffixes, so `0.8.8+2900` is 0.8.8 and `0.9.0-beta.1` is 0.9.0. If the version can't be parsed, editing stays allowed, because Cockpit's own writes are safe on any Bridge with these routes. Cockpit reads it once per Bridge origin. A Bridge upgrade restarts the Bridge, which reloads the Skin.

**Bridge updates undo the operator's hide**

- **What happens.** When an update changes a Bundled Profile's content, `_loadDefaultProfilesIfNeeded` stores the new version as a new, visible record (`profile_controller.dart:81` at v0.9.1). `_retireStaleDefaults` (`:139-163`) hides only *visible* stale records, so the operator's hidden version stays hidden and the new one stays visible.
  - A Bundled Profile the operator **hid** comes back.
  - A Bundled Profile the operator **revised** reappears next to their Revision, under the same title.
- **Ask upstream**: a new version takes the visibility of the newest existing record with the same filename ([draft A](../upstream-asks/a-bundled-updates-keep-hide.md)). This is a nice-to-have, not required.
- **Meanwhile, Cockpit writes nothing on its own.** It doesn't re-hide on load. That would break ticket 06's "no automatic repair on load" and re-implement the Bridge's seeding policy in the Skin.
  - A Bundled Profile that comes back shows as an ordinary visible Bundled Profile. The operator hides it again.
  - The title clash after a revised one comes back belongs to *What happens when two visible profiles share a title?*
  - After such an update, the Bundled original in the Revision's History counts as Retired (ticket 11's `createdAt` rule), so it can't be gone back to (ticket 13). The way back to Decent's version is the new Bundled record.
- **Once draft A lands**, the new version of a hidden or revised profile arrives hidden. Cockpit's Removed list then shows it as a hidden Bundled Profile, since it's neither Superseded nor Retired, and Restore brings it back like any other *(best judgment)*.

**Every gap and what happens to it**

| Gap | Disposition | Decided in | Upstream |
|---|---|---|---|
| Below v0.8.0, an execution-changing `PUT` can lose a profile | v0.8.0 floor, read-only below | this ticket | — |
| `PUT` with an execution change orphans children | Step changes `POST` a **Profile Revision** and hide the source | 06, ADR 0003 | not filed: atomic Revision |
| `POST` dedups and ignores title, notes, and `parentId` | detect the returned record; Duplicate needs a Step change; Bundled titles and notes stay locked | 06 | not filed: an "existed" flag |
| No range validation, the encoder wraps values, no Step cap | the Skin owns every limit; a value that would wrap blocks Save | 08 | [B](../upstream-asks/b-reject-wrapping-values.md) |
| Workflow profile changes upload with no idle or shot check | no Workflow writes while the machine runs anything | 07 | [C](../upstream-asks/c-profile-changes-during-shot.md) |
| No push channel for the library or the Workflow | refetch with `ETag`; merge changes made elsewhere on refetch | 01, 10 | [E](../upstream-asks/e-comment-1036-workflow-websocket.md) |
| The Active Profile carries no source id | title match | 07 | [F](../upstream-asks/f-comment-995-profile-identity.md) |
| Lineage: 500 on an unknown id, self-parent hang, no siblings | History built from `?includeHidden=true` with Cockpit's own cycle guard | 13 | [D](../upstream-asks/d-profile-api-errors-and-lineage.md) |
| `POST` answers 500 to some bad Steps | the Skin validates before writing | 08 | D |
| "Not found" differs across endpoints | any of them reads as "already removed elsewhere" | 11 | D |
| `includeHidden=true` returns deleted records | the Skin classifies records itself | 11 | D |
| Error text is in `message`, but Cockpit's client shows `error` | Skin fix: show `message`, falling back to `error` *(best judgment)* | this ticket | — |
| Bridge updates undo the operator's hide or Revision | tolerated; no Skin writes | this ticket | [A](../upstream-asks/a-bundled-updates-keep-hide.md) |
| Retired Bundled versions can't be kept | accepted as Bridge policy: not restorable, not gone back to | 11, 13 | — |
| Retired can be told from hidden only by inference | `metadata.filename` against `/defaults`, plus `createdAt` | 11 | A (`id` on `/defaults`) |
| The 10-minute pause reloads the Skin at `/` | drafts live in localStorage | 10 | not filed |
| Going back is two requests | un-hide first, then hide | 13, ADR 0004 | not filed: atomic swap |
| `full` gateway mode runs no weight exits or stop-at-weight | a hint under the weight exit (below) | this ticket | — (Bridge design: in `full` mode the skin owns the shot) |
| Bengle default flow cap | out of scope | 08 | — |

**What goes upstream** ([index](../upstream-asks/README.md))

- **Four new issues**, one concern each, as Decaid's `CONTRIBUTING.md` asks:
  - **A.** Bundled Profile updates keep the user's hide, and `/defaults` entries gain their current record `id`.
  - **B.** Reject profile and Workflow writes with a value the encoder would wrap, or more than 20 Steps.
  - **C.** Record a shot with the profile it ran, and add an opt-in lockout on profile changes mid-shot (like `blockTareDuringShot`).
  - **D.** Profile API status codes and lineage fixes.
- **Two comments on open issues**:
  - **E.** On #1036 (Workflow WebSocket): Cockpit's use case, plus the same for the library.
  - **F.** On #995 (profile identity on `ShotRecord`): a `sourceProfileId` on the Workflow, which `ShotRecord` would then carry.
- **Not filed**, kept as nice-to-haves: a `POST` "existed" flag, an atomic Revision or a lineage-keeping `PUT`, an atomic visibility swap, and reloading the Skin at its last URL. File one if implementation keenly feels its absence.
- **Who files**: the operator, or an agent on the operator's say-so. The drafts are reviewed first, and each states that it was drafted with AI help, as upstream issues already do. Update the index's Status column with a link once filed.
- **No new ADR** *(best judgment)*. Every choice here can be reversed when its upstream fix lands, and ADR 0003 already records the Save trade-off.

**Smaller calls** *(best judgment)*

- **`full` gateway mode**: when the Bridge reports `gatewayMode: "full"`, the editor shows one line under a Step's weight exit: "The Bridge doesn't run weight exits in Full gateway mode." Cockpit reads the mode and never sets it.
- **Error text**: Cockpit's REST client shows the error body's `message`, falling back to `error`. Today it prefers `error` (`src/rest/client.ts:57-60`), which is only a category such as "Invalid request".

**Rejected**

- **v0.8.8 as the floor.** It locks out v0.8.0–0.8.7, which have the same profile write API.
- **No floor.** The error shapes on older Bridges weren't checked, and nothing would nudge an upgrade on a Bridge that can lose profiles.
- **Hiding the editing controls on an older Bridge.** The layout would change from Bridge to Bridge, and nothing would tell the operator why editing is missing.
- **An interim "Updated by Decent" prompt.** Detecting the hidden case is partly inference, and it adds Skin logic for a gap the Bridge should close.
- **The Skin re-hiding on its own.** It writes without the operator and re-implements seeding policy.
- **Tolerating it without asking.** The fix belongs in Bridge policy and helps every client.
- **Every ask as its own issue.** The four unfiled asks mostly help Cockpit, and more issues mean more triage for maintainers.
- **One umbrella issue.** It goes against upstream's one-concern grain, and maintainers would split it.
- **Filing nothing until implementation.** Filing early gives maintainers lead time, and nothing waits on the answers.

**Knock-ons for other tickets**

- *What happens when two visible profiles share a title?* is unblocked. The Bridge-update case is **tolerated**, with draft A asked upstream. Until A lands, every Bridge update that changes a revised Bundled Profile produces a clash. Once it lands, the new version arrives hidden, and restoring it clashes like any other Restore.
- **For the spec**: the version check and read-only state, the `full`-mode hint, and showing the error `message`.
