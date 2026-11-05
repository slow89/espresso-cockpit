# What happens when two visible profiles share a title?

Type: grilling
Status: resolved
Blocked by: 13, 14
Map: [Profile authoring in Cockpit](../map.md)

## Question

Cockpit keeps titles unique among visible profiles only at save time. Several things can still leave two visible profiles with the same title:

- a Restore from the Removed list, or Restore this version from a removed profile's History;
- going back to an earlier version that carries an older title, or to a Bundled original while the Bridge's newer version of it is visible;
- a Bridge update that ships a new version of a **Bundled Profile** the operator revised or hid;
- an import, as already on the tablet.

Decide:

- **The Active Profile.** Ticket 07 links it to "the visible profile with the same title" and assumes there is at most one match. With two matches, which one does it belong to? Candidates: the operator's over a Bundled one, the closer content, or the most recently updated. What do the loaded-profile strip, the Loaded dot, and "Differs from saved" show?
- **The Library.** How the operator tells the two rows apart.
- **Fixing it.** Does Cockpit prompt a rename, and how, given that a Bundled Profile's title is locked? Or does it just tolerate the clash?
- **Saving.** Ticket 06 blocks Save while the draft's title clashes with a visible profile. Does a profile that already shares its title have to be renamed before its next Save?

## Context

From [What does Save do to a profile and its lineage?](06-save-semantics-and-lineage.md):

- **Titles must be unique among visible profiles**, checked in the Skin at save time. A clash that arises later without a Save is tolerated: a Bridge upgrade adding a Bundled Profile of the same name, or a Superseded Profile being brought back.
- **Why it matters**: shot history stores only `profileTitle`, so duplicate visible titles make old shots ambiguous.

From [How does editing relate to the Active Profile and the dial-in loop?](07-active-profile-and-dial-in-loop.md):

- **The Active Profile belongs to the visible profile with the same title.** The answer says that titles are unique among visible profiles, so there is at most one match. That assumption is what breaks here.
- **Rejected there**: exact content match to find the source, and a source id in `context.extras`. A source profile id on the Workflow is a nice-to-have upstream.

From [Does the tablet's Bridge expose the profile write endpoints?](04-tablet-bridge-endpoints.md):

- **It already happens on the operator's tablet.** The only operator-created profile, "Extractamundo Dos!", is a Visualizer import that shares its title with a visible Bundled Profile.

From [How does the operator delete, hide, and restore profiles?](11-delete-hide-restore.md):

- **Restore is never blocked by a title clash.** The toast says "Restored *House* · another profile has this title".
- **A Bridge update that changes a Bundled Profile's content stores the new version visible.** If the operator had revised that profile, their Revision and the new Bundled version then share a title. If they had hidden it, it reappears. Whether that gets fixed upstream is *Which Bridge changes does the spec depend on, and how do we ask for them?*

From [Which Bridge changes does the spec depend on, and how do we ask for them?](14-upstream-bridge-changes.md):

- **The Bridge-update case is tolerated, and asked upstream** ([draft A](../upstream-asks/a-bundled-updates-keep-hide.md)). Cockpit writes nothing on its own: no automatic re-hide.
- **Until the fix lands**, every Bridge update that changes a Bundled Profile the operator revised leaves the new Bundled version visible under the Revision's title. A Bundled Profile the operator hid comes back as an ordinary visible profile.
- **Once it lands**, the new version arrives hidden and shows in the Removed list. Restoring it then clashes like any other Restore.
- **After such an update, the Bundled original in the Revision's History counts as Retired**, so it can't be gone back to. Decent's newer version is a separate visible record.
- **A source profile id on the Workflow** is asked upstream as a comment on #995 ([draft F](../upstream-asks/f-comment-995-profile-identity.md)). Until then, the Active Profile is matched by title.

From [How is Profile Lineage shown and navigated?](13-lineage-view.md):

- **Going back swaps which version is visible.** It never leaves two versions of one profile visible.
- **Going back can still cause a title clash.** Title edits update in place, so an older version can carry an older title. Going back brings the version back exactly as it was, title included, and Cockpit doesn't copy the current title onto it.
- **Going back to a Bundled original** un-hides it with its own title. A clash follows if the Bridge has since shipped a newer version of it under the same title.
- **Restore this version** from a removed profile's History can clash the same way Restore does.
- **The loaded profile**: Go back & use loads the version gone back to, so the Active Profile follows its title.

## Comments

**2026-11-01 — claimed.** Grilling session in progress on branch `t3/profile-editor-wayfinding-1`.

**2026-11-03 — decided with the operator.** Seven questions, one at a time, each with a recommendation. The operator took the recommendation every time. Smaller calls I settled myself, as the operator prefers, and they're marked *(best judgment)* in the Answer.

1. The operator asked first why Cockpit can't simply prevent clashes. That reframed the ticket: **Cockpit prevents the clashes it causes and tolerates the rest** (option a). Rejected: tolerating every clash, as tickets 11 and 13 had it.
2. Going back: **it changes only what the machine runs**; the current title, author, and notes carry over (option a). The operator checked that History still keeps every version; it does. Rejected: restoring the version exactly and blocking on a clash, and bringing back the old title unless it clashes.
3. Restore: **it renames the profile automatically on a clash**, to "*House* (restored)" (option a). Rejected: asking for a title first, and blocking.
4. Import: **it renames the imported profile straight after on a clash**, to "… (imported)" (option a). Rejected: asking for a title, and leaving the clash.
5. The Active Profile with two same-title matches: **the one with the fewest changes from the Workflow copy** (option a). Rejected: Yours over Bundled ignoring content, exact match then Yours, and the tablet remembering which record it last loaded.
6. The Library: **a "Same title" badge on both rows, and a note in the detail pane offering Rename or Hide** (option a). Rejected: also flagging the clash in a banner, and showing nothing new.
7. Saving: **Save is blocked only when it would create a new clash** (option a). Rejected: blocking until the clash is resolved, and never blocking on title.

Checked before asking:

- **Shots keep what they ran.** A shot record embeds the whole Workflow, profile included, and Cockpit's History page reads the profile from it (`src/routes/history-page.tsx:374`). Only the indexed `profileTitle` column (`shot_tables.dart:8`) groups shots of two same-title profiles under one name.
- **The Visualizer import only adds to the library.** The Bridge plugin (`assets/plugins/visualizer.reaplugin/plugin.js:317-414`) sends one `POST /api/v1/profiles` with `metadata.comment`. Its result carries Visualizer's `profileTitle` and the stored record (`workflowResult`), and it doesn't load anything into the Workflow, despite the variable name `workflowResponse`. A dedup returns the existing record, and today Cockpit still says "Imported *X*".
- **A title-only `PUT` keeps the record's id, `parentId`, `createdAt`, visibility, and `metadata`** (branch `research/bridge-profile-write-api` → `docs/research/bridge-profile-write-api.md`, lines 223 and 247). History is dated and sorted by `createdAt` (ticket 13), so renaming a hidden version doesn't move it.
- **Ticket 14 already closed one case in the Question.** After a Bridge update, the Bundled original in a Revision's History counts as Retired and can't be gone back to, so "going back to a Bundled original while the Bridge's newer version of it is visible" can't happen.
- **The Library prototype links by title alone** (`src/components/prototype/app-placement/use-active-link.ts` on `prototype/lineage-view`). With two matches, both rows got the Loaded dot, and Edit on either opened the loaded profile's draft.

## Answer

**Cockpit never leaves two visible profiles with one title through anything it does itself. Clashes it can't prevent are tolerated: the Active Profile links to the closer match, the Library marks both and offers a one-tap fix, and Save is blocked only when it would add a new clash.** Everything below works on today's Bridge (Decaid v0.8.8) with no upstream change.

**Where clashes come from**

- **Caused by Cockpit, and prevented**: Go back, Restore, Restore this version, and Import.
- **Not caused by Cockpit, and tolerated**:
  - a Bridge update that ships a new version of a **Bundled Profile** the operator revised, until [draft A](../upstream-asks/a-bundled-updates-keep-hide.md) lands;
  - another app writing to the library;
  - existing data, such as the import "Extractamundo Dos!" next to the Bundled one on the operator's tablet.
- **Cockpit never renames or hides anything on load.** Tolerated clashes stay until the operator acts on them (ticket 06's "no automatic repair on load").
- **Asking the Bridge to enforce unique titles** was ruled out. It would reject Visualizer imports and its own Bundled updates, and push Cockpit's naming policy onto every other app.

**Go back changes only what the machine runs** (refines ticket 13)

- **The current title, author, and notes carry over** onto the version gone back to. Cockpit sends a title-only `PUT` to that hidden version, then un-hides it, then hides the current one.
- **History keeps everything it shows.** The `PUT` keeps the version's id, `parentId`, `createdAt`, visibility, and `metadata` (so the revision marker stays). Only the older title and notes text stored on that version is overwritten, and History never tracked those.
- **History's detail header** shows the version's stored title, so a version gone back to and then left now shows the profile's title at the time.
- **Going forward and Undo follow the same rule.**
- **Ticket 06's collision prompt** ("Same as the version from 12 Oct · Go back") keeps the draft's current title.
- **A Bundled original can't be retitled**, because the Bridge rejects any edit to a Bundled record. If another visible profile already has its title, Go back (and Go back & use) is disabled with "Another profile is titled *X*", linking that profile.
- *(best judgment)* **If the `PUT` fails, nothing else happens.** Go back stops before changing visibility and says so.

**Restore renames on a clash** (refines ticket 11)

- **When the restored profile's title is held by a visible profile**, Cockpit sends a title-only `PUT` with "*House* (restored)" ("(restored 2)", and so on, if that is taken), then sets it `visible`. The id and lineage stay the same.
- **The toast reads "Restored as *House (restored)* · Undo".** It's still one tap with no confirm, and the Removed list never opens the soft keyboard. The operator can rename it properly in the editor, where a title-only Save updates in place.
- **Ticket 06's objection to auto-suffixing doesn't apply.** The saved title can't differ from one the operator typed, because they typed none.
- **A Bundled Profile whose title is taken can't be restored.** Restore is disabled with "Another profile is titled *X*. Rename it first", linking that profile.
- *(best judgment)* **Undo removes the profile again and puts its title back.**
- *(best judgment)* **Restore this version** (a removed profile's History) carries the removed profile's current title, author, and notes onto that version, as Go back does, then applies the same rename on a clash.
- **The Save collision prompt's Restore** ("Identical to *X* (deleted) → Restore", ticket 06) is the same action, rename included.
- *(best judgment)* **If the `PUT` fails, nothing is restored**, and the error says so.

**Import renames on a clash**

- **When the import adds a new record and another visible profile has its title**, Cockpit sends a title-only `PUT` with "*Title* (imported)" ("(imported 2)", and so on). The message reads "Imported as *Extractamundo Dos! (imported)*".
- **No Undo.** Undoing the rename would only bring the clash back.
- *(best judgment)* **An import that dedups adds nothing, and the message says so**, naming the record the Bridge returned, as ticket 06's collision messages do: "Already in your library as *X*", or "Already in your library as *X* (removed) · Restore". It tells a dedup apart the way ticket 06 does: the returned record predates the import, or is Bundled, hidden, or deleted.
- **A removed profile's title is free**, so an import that matches only a removed profile's title isn't renamed.

**The Active Profile with two matches** (refines ticket 07)

- **It links to the same-title visible profile with the fewest changes from the Workflow copy.** Changes are counted as lines of History's change summary (ticket 13), which matches Steps by name and folds a shift of every Step's temperature into one line.
- **Ties go to Yours over Bundled, then to the most recently saved** (`createdAt`).
- **Right after a Use the match is exact**, so the link follows the last Use. Drift from the Brew temperature control doesn't move it.
- **The link decides everything ticket 07 hangs on it**: the Loaded dot and badge, "Differs from saved", Edit loaded, Revert to saved, and which record Save on the loaded profile supersedes.
- **Only the linked row is loaded.** Edit on the other same-title row opens a draft of that record, not the loaded profile's draft.
- **It's derived, not stored.** There's no new tablet state.

**The Library** (refines ticket 09)

- **Both rows get a "Same title" badge.**
- **The detail pane gets one line**: "Another profile is titled *Londonium*. Shots of both are filed under one name." The other profile's name is a link that selects it.
- **The fix fits the record**:
  - on one of the operator's own profiles, **Rename** opens the editor's title sheet, and a title-only Save updates it in place;
  - on a Bundled Profile, **Hide** is ticket 11's Hide, with its Undo toast. For a Bridge update, that's exactly what draft A would do automatically.
- **No dialogs and no banner.** Nothing is written until the operator taps.
- *(best judgment)* **The loaded-profile strip shows the linked profile's origin** ("● Londonium · Bundled"), but only while its title is shared.
- *(best judgment)* **When both profiles are Yours**, the save date in the detail pane's meta line tells them apart.
- **Brew's top-bar profile button is unchanged** (ticket 15).

**Saving** (refines ticket 06)

- **Save is blocked only when it would create a new clash.**
  - **Keeping the title the profile already has is always allowed**, for a Revision or a title-only Save, even while another visible profile shares it.
  - **Still blocked, as in ticket 06**: renaming onto a title another visible profile holds, and a Fork or New whose title is taken.
- *(best judgment)* **The editor shows the same note as the Library** ("Another profile is titled *Londonium*") in its message strip. It doesn't block Save.

**Rejected**

- **Tolerating every clash**, as tickets 11 and 13 had it. Three of the four causes are actions Cockpit takes itself.
- **Bringing back the old title on Go back**, whether blocked on a clash or kept only when free. It ties the title to a version when title edits deliberately aren't versions, and brings old notes back silently.
- **Asking for a title on Restore**, or blocking it. A keyboard step, or a trip to rename the other profile, for a one-tap action.
- **Asking for a title after Import**, or leaving the clash.
- **Yours over Bundled, ignoring content.** Trying Decent's new version would leave the operator's Revision marked as loaded, and Save would supersede it with Decent's content.
- **Exact content match, otherwise Yours.** The first Brew temperature nudge would silently move the link.
- **The tablet remembering the last record it loaded.** New state that goes stale whenever another app loads a profile, which is why ticket 07 rejected a source id.
- **A banner when a clash first appears.** It needs tablet state to remember which clashes were seen.
- **Blocking Save until a clash is resolved.** It would stall the dial-in loop over something the operator didn't do.
- **Never blocking Save on title.** It would undo ticket 06's rule for renames and Forks.
- **Re-hiding or renaming on load.** It breaks ticket 06's "no automatic repair on load" and ticket 14's "Cockpit writes nothing on its own".
- **The Bridge enforcing unique titles.** See above.

**Knock-ons for other tickets**

- [What does Save do to a profile and its lineage?](06-save-semantics-and-lineage.md): "titles unique among visible profiles" now means Save never creates a new clash.
- [How does editing relate to the Active Profile and the dial-in loop?](07-active-profile-and-dial-in-loop.md): the title link gets the fewest-changes tiebreak.
- [Where does profile authoring live in the app, and what are its entry points?](09-app-placement-and-entry-points.md): the "Same title" badge, the clash note with Rename or Hide, and the origin in the strip.
- [How does the operator delete, hide, and restore profiles?](11-delete-hide-restore.md): a clashing Restore renames instead of tolerating the clash, and a Bundled one is blocked.
- [How is Profile Lineage shown and navigated?](13-lineage-view.md): going back carries the current title, author, and notes, and a Bundled original whose title is taken can't be gone back to.
- **`CONTEXT.md`**: the Active Profile relationship covers two same-title matches, and going back keeps the title, author, and notes.
- **Not yet specified**: nothing graduates and nothing new appears. The frontier is now empty, so the next step is `/to-spec`.
