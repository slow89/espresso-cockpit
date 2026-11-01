# Draft comment on #1036: "Add a Workflow WebSocket, so skins see a change made elsewhere at once"

Target: `decentespresso/decaid#1036` (open, `needs-refinement`), comment. Status: **draft, not posted.**
Source: [Which Bridge changes does the spec depend on, and how do we ask for them?](../issues/14-upstream-bridge-changes.md)

---

> *Drafted with AI assistance (Claude Opus 5.5) and reviewed before posting.*

Another skin with the same need. Cockpit ([slow89/espresso-cockpit](https://github.com/slow89/espresso-cockpit)) is adding a profile editor. It keeps an unsaved draft of the loaded profile and merges in changes made to the Workflow elsewhere, so a draft doesn't overwrite them on its next save. Today it learns of those changes only when it reads the Workflow again. `ws/v1/workflow` as proposed here would let it merge at once. The revision envelope would help too, because Cockpit compares the draft against the Workflow it started from.

**The same gap exists for the profile library.** `GET /api/v1/profiles` supports `ETag`, which makes polling cheap, but nothing pushes. `ProfileController` has only an in-process `profileCount` stream (`lib/src/controllers/profile_controller.dart:14-15`). Could this work also cover the library? For example, a `ws/v1/profiles` that sends the library's ETag after each write, so a skin knows when to refetch. If you'd rather keep this issue to the Workflow, I can open a separate one.
