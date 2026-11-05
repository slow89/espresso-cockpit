# 06 — Add, move, and delete Steps, and the Preinfusion divider

**What to build:** The operator can change a profile's structure: add, duplicate, reorder, and delete **Steps**, and set where preinfusion ends. Structural edits keep the same **Steps** in preinfusion wherever they can, so nothing silently changes where volume counting starts.

**Spec:** [spec](../../profile-editor/spec.md): Editor layout (Step list), Fields and limits (Preinfusion boundary, Add after).

**Blocked by:** [04 — Change a Step with the ruler and Save a Profile Revision](04-ruler-step-edit-and-revision.md)

**Status:** ready-for-agent

- [ ] A toolbar at the foot of the **Step** list has five 40px icon buttons acting on the selected **Step**: Add after, Duplicate, Move up, Move down, and Delete.
- [ ] **Add after** inserts a **Step** after the selection and selects it, copying its pump mode, targets, temperature, and sensor, with a fast transition, max time 10 s, volume and weight Off, no limiter or exit, and a blank name.
- [ ] **Delete** acts at once with an Undo toast ("Deleted *Fill* · Undo").
- [ ] Add and Duplicate are disabled at 20 **Steps**, and Delete at one, with the reason underneath.
- [ ] The Preinfusion | Pour divider is a row in the list, moved one **Step** at a time with ▲ and ▼. It sits above Step 1 when there's no preinfusion. The **Step** chart shows the same boundary.
- [ ] A **Step** added or duplicated before the first Pour **Step** joins Preinfusion. Deleting a Preinfusion **Step** shrinks it by one. Deleting a Pour **Step** leaves it as it is. Moving a **Step** keeps the count, and the **Step** changes sides if it crosses the divider.
- [ ] Edits follow a **Step** through a reorder by its stable key. Reordering and moving back counts as no change.
- [ ] Any of these changes counts as a change to what the machine runs, and Save makes a **Profile Revision**.
- [ ] Core tests cover the boundary rules on add, duplicate, delete, and move, and the Add after defaults. Browser tests cover the toolbar, Undo, the limits with a 20-**Step** profile, and the divider.
- [ ] `pnpm check` passes.
