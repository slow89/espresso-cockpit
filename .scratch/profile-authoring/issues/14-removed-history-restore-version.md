# 14 — History of a removed profile and Restore this version

**What to build:** The operator can recover any version of a removed profile, not just the one that was removed. This is also how to get a **Bundled** original back after deleting the Revision of it.

**Spec:** [spec](../../profile-editor/spec.md): Removing and restoring (Restore this version), History (Opening).

**Blocked by:** [12 — Go back](12-go-back.md), [13 — Restore and Import never cause a title clash](13-restore-and-import-no-clash.md)

**Status:** ready-for-agent

- [ ] The Removed list's detail pane offers **History** next to **Restore**, with the same History view.
- [ ] On a removed profile, a version's action reads **Restore this version**.
- [ ] It copies the removed profile's current title, author, and notes onto that version, unless the version is **Bundled**, applies the same rename on a title clash, and sets it `visible`. It then moves the removed version from `deleted` to `hidden`, where it counts as Superseded and leaves the Removed list.
- [ ] If the title `PUT` fails, nothing is restored and the error says so.
- [ ] A **Bundled** version whose title is taken can't be restored, with "Another profile is titled *X*. Rename it first", linking that profile.
- [ ] A **Retired** version can't be restored.
- [ ] Deleting the operator's Revision of a **Bundled Profile**, then Removed → History → the **Bundled** original → Restore this version, brings Decent's profile back.
- [ ] Browser tests cover that path, a non-**Bundled** version, and a clash, asserting what the fake holds.
- [ ] `pnpm check` passes.
