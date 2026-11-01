# Draft comment on #995: "record the profile identity (profileId/hash) on ShotRecord"

Target: `decentespresso/decaid#995` (open, `needs-refinement`), comment. Status: **draft, not posted.**
Source: [Which Bridge changes does the spec depend on, and how do we ask for them?](../issues/14-upstream-bridge-changes.md)

---

> *Drafted with AI assistance (Claude Opus 5.5) and reviewed before posting.*

A related need from the skin side, which could solve point 1 here with the same field.

A skin also needs to know which library record the Workflow's profile came from. The Workflow embeds a copy of the profile with no id (`lib/src/models/data/workflow.dart`). So Cockpit, a skin ([slow89/espresso-cockpit](https://github.com/slow89/espresso-cockpit)), matches the loaded profile to the library by title. Matching by content hash doesn't work once the copy drifts. For example, Cockpit's dashboard temperature control shifts every Step's temperature in the Workflow copy. That leaves the copy recognisably the same profile, but with a different hash.

**Suggestion:** an optional `sourceProfileId` on the Workflow.

- A client sets it alongside `profile` in `PUT /api/v1/workflow` when it loads a library profile.
- It's kept when a later `PUT` changes the profile and sends the same id, and cleared when a `PUT` changes the profile without one.
- `ShotRecord` already stores the Workflow, so every shot would carry the id of the library profile it came from. Shots pulled from one profile could be grouped by that id, whatever their stop condition or small edits. That's the case this issue describes.
