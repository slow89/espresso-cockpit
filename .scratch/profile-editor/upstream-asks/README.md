# Upstream asks for Decaid (Streamline Bridge)

Drafts from [Which Bridge changes does the spec depend on, and how do we ask for them?](../issues/14-upstream-bridge-changes.md). None of them is required for the profile editor to ship: Cockpit works around every gap on today's Bridge. Each one would fix the gap for every client and let Cockpit drop a workaround.

Decaid's `CONTRIBUTING.md` wants one concern per issue, opened before any PR, and accepted by a maintainer (`ready-for-agent` or `ready-for-human`) before work starts. So these are issues and comments, not PRs. The operator files them, or tells an agent to. Update the Status column with a link once filed.

| Ask | Form | Status |
|---|---|---|
| [Bundled Profile updates bring back profiles the user hid](a-bundled-updates-keep-hide.md) | new issue | draft |
| [Reject profile values the machine encoder would wrap](b-reject-wrapping-values.md) | new issue | draft |
| [A profile change during a shot is uploaded at once and relabels the shot](c-profile-changes-during-shot.md) | new issue | draft |
| [Profile API: status codes and lineage fixes](d-profile-api-errors-and-lineage.md) | new issue | draft |
| [Workflow WebSocket: Cockpit's use case, plus library changes](e-comment-1036-workflow-websocket.md) | comment on #1036 | draft |
| [Profile identity: a source profile id on the Workflow](f-comment-995-profile-identity.md) | comment on #995 | draft |

**Not filed** (nice-to-haves that mostly help Cockpit; file one if implementation keenly feels its absence):

- a `POST /api/v1/profiles` response that says whether the record already existed;
- an atomic "save Revision" (child `POST` plus parent hide), or a `PUT` that keeps lineage;
- an atomic visibility swap for going back;
- reloading the Skin at its last URL after the 10-minute pause, instead of at `/`.
