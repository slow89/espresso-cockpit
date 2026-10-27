# What happens to a Profile Draft when the operator leaves the editor?

Type: grilling
Status: resolved
Blocked by: 07
Map: [Profile authoring in Cockpit](../map.md)

## Question

A **Profile Draft** is unsaved work held by the **Skin**. What happens to it when the operator:

- navigates to another route
- the tablet hits the sleep screen
- the Skin reloads (including after a `redeploy`)
- starts a **Shot** from the machine

Decide whether drafts persist across reloads (and where: Skin-local storage only, never the **Bridge**). Also decide whether there is an unsaved-changes guard, whether there can be more than one draft at once, and how a stale draft is reconciled if its source profile changed in the library meanwhile.

## Context from research

From [What does the Bridge's profile write API accept…](01-bridge-profile-write-api.md):

- **No WebSocket push for library or Workflow changes.** Staleness can only be detected by refetching; `GET /api/v1/profiles` supports ETag.
- **A Draft's source record can vanish under it**: any execution edit elsewhere moves it to a new id.

From [How does editing relate to the Active Profile and the dial-in loop?](07-active-profile-and-dial-in-loop.md):

- **A trial the operator loaded lives in the Workflow, not the Skin.** Use for next shot writes the draft into the Workflow, and reopening the loaded profile reseeds the draft from it. Such a trial already survives route changes, sleep, and reloads, so this ticket only needs to decide drafts that live in the editor and were never loaded.
- **"Starts a Shot from the machine" no longer threatens a loaded trial.** Cockpit never changes the Workflow while the machine is running something. Editing stays open mid-shot.
- **Deferred to this ticket:** whether a trial replaced by loading another profile (after the operator confirms "Discard and load") is stashed as a draft and offered back the next time that profile is opened.

From [Which fields does the editor expose, and what limits does the Skin enforce?](08-field-coverage-and-limits.md):

- **A draft holds more than the profile**: each Step remembers its target and cap for the mode it isn't using, plus the last exit and limiter values, while the draft is open. If drafts are stashed or survive a reload, those values go with them.
- **"Unsaved" means the draft differs from its source**, not that a field was touched. Edits that are undone leave no change.

From [Where does profile authoring live in the app, and what are its entry points?](09-app-placement-and-entry-points.md):

- **The editor is a full-screen route covering the nav**, with two exits: **← Library** and **Brew**. Both keep the draft; this ticket decides for how long.
- **A reload lands back in the editor's route.** This ticket decides whether the draft is still there.
- **Cockpit doesn't navigate when a shot starts**, so a shot can begin while the editor covers the screen.
- **Save, Save & use, and Use for next shot all stay in the editor.** Nothing closes it automatically.

## Comments

**2026-10-21 — claimed.** Grilling session in progress on branch `t3/wayfinder-10-draft-lifecycle`.

**2026-10-26 — decided with the operator.** Seven questions, one at a time, each with a recommendation. The operator took the recommendation every time. After the seventh, they asked me to settle what remained by best judgment, to be revisited later. Those calls are marked *(best judgment)* in the Answer.

1. A draft that lives only in the editor: stored on the tablet, surviving every reload (option a). Rejected: memory only.
2. How many: one editor draft at a time (option a). Rejected: one draft per profile.
3. The guard: a confirm before a draft with unsaved changes is replaced (option a). Rejected: an undo toast, and no guard.
4. Finding a waiting draft: a draft chip in the loaded-profile strip, a **Draft** badge, and **Resume** in place of Edit (option a). Rejected: badges in the list only, and reopening the editor automatically after a reload.
5. How a draft ends: when it matches its base again, plus a one-tap **Discard changes**, and no expiry (option a). Rejected: no Discard changes, and expiry.
6. The source changed: merge the changes that don't overlap, and ask only when they do (option a). Rejected: always ask, and the draft winning silently.
7. A trial replaced by "Discard and load": not kept (option a). Rejected: moving it into the draft slot, and a separate "recently discarded" slot.

While recording, one wording from question 5 was corrected: **Save as new** writes nothing (ticket 06). It turns the draft into a Fork draft, and that draft's Save ends it.

## Answer

**The Skin keeps one Profile Draft at a time, stored on the tablet and never on the Bridge. It survives route changes, sleep, reloads, and redeploys, and waits until it is saved, discarded, or replaced.** A draft counts as having unsaved changes only while it differs from its **base**. Changes made elsewhere to its source merge in on their own, and only overlapping changes ask. Everything below works on today's Bridge (Decaid v0.8.8) with no upstream change.

**What the tablet does** (decaid `main` `c723a39d`)

- **When the machine sleeps, the screen goes dark.** The Bridge drops its wake lock while the machine is `sleeping` (`lib/src/controllers/display_controller.dart`, `_evaluateWakeLock`), so Android turns the display off and pauses the app.
- **After 10 minutes paused, the Bridge blanks the WebView.** When the app resumes, it reloads the Skin at `/?_=<timestamp>`, which is Brew, not the route it was on (`lib/src/skin_feature/skin_view.dart`). The page is never asked first. A pause under 10 minutes resumes in place, with memory intact.
- **The tablet origin is `localhost:3000`**, so localStorage survives a `redeploy`.
- **Cockpit's sleep screen renders only on Brew** (`src/routes/dashboard-page.tsx`). If the machine sleeps with the editor open, the editor stays on screen until the display goes off.

**Storage**

- **One persisted zustand store**, following the five that already use `persist` (for example `src/stores/shot-analysis-store.ts`). Its key follows the existing naming, e.g. `espresso-cockpit-profile-draft`. Nothing is written to the Bridge.
- **The stored draft holds**:
  - the source: a library record id and title, or none for **+ New**;
  - the kind: Edit, New, or Fork;
  - the **base**;
  - the draft content;
  - a key per Step;
  - each Step's remembered per-mode targets and caps, and its last exit and limiter values (ticket 08);
  - the selected Step, so Resume lands where the operator left off *(best judgment)*.
- **The store is versioned.** After an update, a stored draft the new build can't read is dropped, with a one-time notice: "A draft from an earlier version of Cockpit couldn't be restored." *(best judgment)*
- **Drafts belong to one browser.** A draft started on a laptop doesn't appear on the tablet. Two Cockpit tabs on the same origin share one slot, and the last write wins. This is accepted as rare.

**One draft, and when it has unsaved changes**

- **The base** is what the draft was seeded from, or what it last wrote.
  - Edit: the library record.
  - Edit loaded: the Workflow copy (ticket 07).
  - **+ New**: the one-Step starting draft (ticket 08).
  - Duplicate and Save as new: the source, retitled "<title> copy".
- **Unsaved changes** means the draft differs from its base, by the same comparison as ticket 08. A loaded-profile draft that matches the Workflow copy is clean even when the Workflow copy differs from the library. "Differs from saved" stays ticket 07's separate badge.
- **A clean draft stays stored**, so the editor route still opens it. Nothing flags it as waiting, and nothing guards it.
- **The editor route names no profile.** It shows the current draft. With no draft, it falls back to the Library.

**Leaving and coming back**

- **← Library, Brew, and Android back** all keep the draft. The editor's state lives in the store, so nothing is lost on unmount.
- **Sleep, the Bridge's wake reload, a manual reload, and a `redeploy`** all keep it. A reload of the editor route opens the draft again. The Bridge's wake reload lands on Brew, and nothing navigates on its own, so the draft waits until the operator goes back to it.
- **A Shot starting** doesn't touch the draft. The editor stays open, and Workflow writes are disabled while the machine runs anything (ticket 07). Save of a profile that isn't loaded writes only the library, so it stays available.

**Finding a waiting draft** (one with unsaved changes)

- **A draft chip in the loaded-profile strip**, above both Library and Shot setup: "✎ *Title* · Resume", which opens the editor. A **+ New** draft has no row, so the chip is its only home.
- **When the draft is of the loaded profile**, the strip shows no separate chip. A **Draft** badge sits beside the loaded title, and **Edit loaded** reads **Resume** *(best judgment)*.
- **The draft's profile** shows a **Draft** badge in its Library row and detail header, and its **Edit** reads **Resume**.
- **Brew** is left to *Does Brew get a shortcut into the editor?*

**The guard**

- **The draft is replaced only by opening a different profile in the editor**: Edit, Edit loaded, Duplicate, **+ New**, or a "go back" from the lineage view that opens a draft.
- **Replacing a draft with unsaved changes asks first**: "*Title* has unsaved changes. Opening *Other* discards them." The choices are **Discard and open** or **Cancel**. A clean draft is replaced without asking.
- **Opening the same profile resumes its draft.** This refines ticket 07's "opening the loaded profile reseeds from the Workflow copy": a clean draft reseeds, and a dirty one is merged (below).
- **Loading another profile doesn't touch the editor draft.** Ticket 07's "Discard and load" confirm covers the Workflow. If the draft was of the profile being replaced, its source becomes the library record, and the merge below applies *(best judgment)*.

**How a draft ends** (no expiry)

- **Save and Save & use** write. The base moves to what was written, and the draft's source moves to the new record. The editor stays open (ticket 09), and the chip, badge, and Resume go away.
- **Use for next shot** writes the Workflow. That profile becomes the loaded one, and the base becomes the Workflow copy, which now equals the draft.
- **Save as new** writes nothing. It turns the draft into a Fork draft titled "<title> copy", with the edits kept, and its Save ends it (ticket 06).
- **A collision on Save** writes nothing, so the base doesn't move and the draft stays unsaved (ticket 06).
- **Revert to saved** works as in ticket 07.
- **Discard changes** is a new header action that appears only while the draft has unsaved changes. In one tap, like Revert to saved, it resets the draft to its base:
  - On the loaded profile it drops the untried edits but keeps the current trial in the Workflow. Revert to saved goes all the way back to the library.
  - On a **+ New** or Fork draft it resets to the seed, and the clean draft stops showing as waiting.
- **The header still holds at most five actions.** Revert to saved shows only on the loaded profile and Save & use only on other profiles, so the two never appear together.
- **Replacement**, after the confirm above.

**When the source changes**

- **The source** is the Workflow copy while the draft's profile is loaded (ticket 07's title match), the library record otherwise, and nothing for **+ New**.
- **When it's checked.** There's no push channel (ticket 01), so the check runs whenever the editor shows the draft, on Resume, and on every Workflow or library refetch while the editor is open. That includes Cockpit's own writes from Brew.
- **A three-way merge** of base, draft, and current source, field by field:
  - profile-level fields, and every Step field;
  - a field only the source changed takes the source's value;
  - a field only the draft changed keeps the draft's value.
  - Then the base moves to the current source, and the editor shows a small note: "Updated with changes made outside the editor."
  - The common case: the operator edits Step 3's pressure, then nudges Brew temperature +1 °C. Both changes survive.
- **Steps line up by the draft's own Step keys.** The base and the source line up by index, because nothing outside the editor reorders Steps. A source with a different Step count from the base counts as an overlap.
- **A clean draft just reseeds**, which falls out of the same merge.
- **An overlap** is the same field changed on both sides to different values, or a Step-count change in the source. It shows a banner: "*Title* changed since you started editing", with:
  - **Start over from current**: the draft reseeds from the source;
  - **Keep my edits**: the base moves to the current source, so the next write replaces the other change.
- **A source revised on another device** (its record is now a Superseded Profile) merges against the newest visible Revision in its lineage *(best judgment)*.
- **A source gone** (deleted, or hidden by the operator elsewhere): the draft keeps its edits, and Save acts as Save as new *(best judgment)*. *How does the operator delete, hide, and restore profiles?* can refine this.

**A trial replaced by "Discard and load"** (deferred from ticket 07) **is not kept.** The confirm names the profile and the loss, and Cancel then Save or Save as new keeps it.

**Rejected**

- **Memory-only drafts.** The Bridge blanks the page after 10 minutes paused, without asking, so a coffee break would silently lose a half-built profile, and no warning could prevent it.
- **Storing drafts on the Bridge.** The Profile Library has no draft concept, and anything else written there would show up to other Skins.
- **One draft per profile.** It means one stale check per draft, a growing pile of forgotten drafts, and a way to find and clear them. Dial-in works on one profile at a time, and a trial in the Workflow already gives a second slot in practice.
- **An undo toast instead of a confirm.** On a 7" screen it's easy to miss, and the loss is the whole draft.
- **Badges in the list only.** They're hard to find among 74 profiles, and a **+ New** draft has no row to badge.
- **Reopening the editor after a reload.** It breaks "nothing navigates on its own", and the tablet would wake into the editor instead of Brew.
- **No Discard changes.** There'd be no direct way to drop edits to a profile that isn't loaded.
- **Expiring drafts.** Silent loss, when localStorage costs nothing to keep.
- **Always asking when the source changed.** In the Brew-temperature case, both choices lose something.
- **The draft winning silently.** The next Use for next shot would quietly undo the Brew nudge.
- **Keeping a trial replaced by "Discard and load".** "Discard" would no longer mean discard, and it either competes for the one draft slot or brings back the second slot rejected in question 2.

**Knock-ons for other tickets**

- *How does the step editor lay out at 1024×600?*:
  - the header gains **Discard changes** without going over five actions;
  - the editor needs a place for the merge note and the overlap banner, for example the strip below the header that already shows disabled reasons;
  - Resume restores the selected Step.
- *Does Brew get a shortcut into the editor?*:
  - a shortcut to the loaded profile resumes a waiting draft of it, or fires the replace confirm if the waiting draft belongs to another profile;
  - Brew temperature nudges merge into a waiting draft of the loaded profile;
  - whether Brew shows that a draft is waiting is still that ticket's call.
- *How does the operator delete, hide, and restore profiles?*:
  - deleting or hiding a profile that has the waiting draft (from Cockpit's ⋯) needs a rule: warn, discard, or keep the draft as a would-be Fork;
  - a draft whose source vanished elsewhere currently keeps its edits, and Save acts as Save as new.
- *How is Profile Lineage shown and navigated?*: a "go back" that opens a draft replaces the one draft, so the replace confirm applies.
- *Which Bridge changes does the spec depend on, and how do we ask for them?*: the Bridge's wake reload at `/` and the lack of a push channel are designed around. Two nice-to-haves:
  - reloading the Skin at its last URL;
  - a push event for Workflow and library changes, which would replace the refetch-driven staleness check.
