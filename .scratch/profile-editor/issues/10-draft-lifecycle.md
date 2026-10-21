# What happens to a Profile Draft when the operator leaves the editor?

Type: grilling
Status: open
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
