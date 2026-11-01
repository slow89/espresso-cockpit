# Draft issue: A profile change during a shot is uploaded at once and relabels the shot

Target: `decentespresso/decaid`, new issue. Status: **draft, not filed.**
Source: [Which Bridge changes does the spec depend on, and how do we ask for them?](../issues/14-upstream-bridge-changes.md)

---

> *Drafted with AI assistance (Claude Opus 5.5) and reviewed before filing.*

## Summary

`PUT /api/v1/workflow` with a new profile is applied and uploaded to the machine straight away, even mid-shot. The shot then gets saved with the new profile, not the one it brewed. Two changes would fix this: record the shot with the profile it started with, and offer an opt-in lockout like `blockTareDuringShot`.

## Current state (`v0.9.1`, `14361a9`)

- `PUT /api/v1/workflow` commits the Workflow. `WorkflowDeviceSync._drain` (`lib/src/controllers/workflow_device_sync.dart:76-88`) then uploads the profile with `setProfile`. Nothing checks the machine or shot state.
- The running `ShotSequencer` keeps the profile it was started with (`lib/src/controllers/de1_state_manager.dart:777-786`).
- `_persistShotIfNeeded` builds the `ShotRecord` from `_workflowController.currentWorkflow` as it is when the shot ends (`de1_state_manager.dart:872-897`). A profile changed mid-shot is therefore recorded as the shot's profile.
- What the firmware does with frames written mid-shot isn't visible from Decaid's source.

## Proposed change

1. **Record the profile the shot ran.** Build the `ShotRecord`'s profile from the one captured at shot start, which the sequencer already holds. This is a bug fix and needs no setting.
2. **An opt-in lockout**, following `blockTareDuringShot` (`doc/Api.md:462`, #499). While a shot is brewing, a `PUT /api/v1/workflow` that changes the profile is rejected with `400` (`type: "block_profile_change_during_shot"`). Context-only changes, such as dose or grinder, still go through. Deferring the upload until the shot ends would also work, but a rejection tells the client what happened.

## Why

A skin can disable its own Workflow writes while the machine is busy, and Cockpit does. That only protects that one client. A plugin or another skin can still change the profile mid-shot, and the shot history is then wrong with nothing to show for it. Fixing it in Decaid protects every client.
