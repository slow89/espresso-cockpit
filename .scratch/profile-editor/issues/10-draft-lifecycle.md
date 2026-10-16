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
