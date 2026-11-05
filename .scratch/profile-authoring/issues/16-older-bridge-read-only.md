# 16 — Older Bridges are read-only

**What to build:** On a **Bridge** older than v0.8.0, the operator can still browse and brew, but can't change the library. The controls stay where they are, disabled, and one line says why and what to do.

**Spec:** [spec](../../profile-editor/spec.md): Older Bridges.

**Blocked by:** [03 — Find, resume, and discard a waiting draft](03-waiting-draft.md), [07 — New, Duplicate, and Save as new](07-new-duplicate-save-as-new.md), [08 — The dial-in loop](08-dial-in-loop.md), [14 — History of a removed profile and Restore this version](14-removed-history-restore-version.md)

**Status:** ready-for-agent

- [ ] Cockpit reads `version` from `GET /api/v1/info` once per **Bridge** origin, and compares the leading `major.minor.patch`, ignoring suffixes (`0.8.8+2900` is 0.8.8, and `0.9.0-beta.1` is 0.9.0). If it can't be parsed, editing stays allowed.
- [ ] Below v0.8.0, browsing, the chips, the detail pane, **History**, the strip, and **Use** still work.
- [ ] New, Edit loaded, Edit, Duplicate, Save, Save as new, Hide, Delete, Restore, Restore this version, Go back, and Import are disabled rather than hidden, so the layout doesn't change.
- [ ] One line in the strip reads "Profile editing needs Bridge 0.8.0 or newer · this one runs 0.7.11".
- [ ] A waiting draft stays on the tablet with Resume disabled, and comes back once the **Bridge** is upgraded.
- [ ] At v0.8.0 and above, nothing changes.
- [ ] Core tests cover version parsing, suffixes, the floor, and an unparseable version. Browser tests cover a v0.7.11 scenario and a waiting draft across the change of version.
- [ ] `pnpm check` passes.
