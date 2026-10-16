# How do existing DE1 profile editors lay out step editing?

Type: research
Status: resolved
Blocked by: —
Map: [Profile authoring in Cockpit](../map.md)
Findings: branch `research/profile-editor-prior-art` → `docs/research/profile-editor-prior-art.md`

## Question

What prior art exists for editing DE1 profiles step by step, especially on the 7" Decent tablet in landscape? For each editor, capture how it handles:

- the step list
- per-step field editing
- the visual curve/preview
- number entry on touch
- add, remove, and reorder
- save, fork, and versioning

Use links and screenshots wherever they exist. Candidates:

- de1app's "advanced" profile editor and its skins (Insight, DSx/DSx2, Streamline), which run on the same tablet
- Visualizer's profile pages
- the Bridge's own Flutter UI (tadelv/reaprime `lib/src`), if it has any profile editing
- any other community DE1 / Bengle apps

Finish with a short list of patterns worth stealing and known pain points to avoid at 1024×600 with touch-only input.

## Answer

Full survey, with links pinned to commits: branch `research/profile-editor-prior-art` (commit `172e4a0`), file `docs/research/profile-editor-prior-art.md`. Caveats:

- The Decent Diaspora forum (private) and Home-Barista (403) were unreachable, so complaints come from GitHub issues, changelogs, and code comments.
- Sizes at 1024×600 are computed from each app's scaling code, not measured on a tablet.
- `tadelv/reaprime` now redirects to `decentespresso/decaid`.

**Landscape of existing editors**

- **Two layouts dominate.**
  - **List plus detail** is the majority: a numbered Step list, a field panel for the selected Step, and a read-only curve. Used by de1app Insight/default, Beanie, NSX, Passione, and Decenza.
  - **Step columns**: Decent's Bridge-era `streamline-js` puts one card per Step in a horizontally scrolling strip, with a plain-language summary mode.
- **No editor supports dragging the curve.** The best ones make chart segments tap-to-select the Step and highlight the selection.
- **de1app's field grouping is near-universal**: Temperature (+ sensor), Goal (pump mode, target, limiter on the other axis, transition), Stop after (time, volume, weight), and Move on if (a single exit). Profile-level limits sit on a separate tab.
- **Number entry converges** on ± steppers plus tap-the-value to open a full-screen in-app keypad that shows the range and recent values. Native apps add hold-to-repeat and drag-to-adjust.
- **Save models differ.** de1app forks only by renaming. Bridge-era skins fork Bundled Profiles on edit and add Save a copy, version history, Restore original, and "Try / Use for shot" without saving.
- **The Bridge's own Flutter UI has no profile editor**, only the API and a "Profile Generator" questionnaire. Visualizer offers downloads and share codes only. pyDE1 has no editor.

**Patterns worth stealing**

1. List plus detail, with the chart as a Step selector: tap a segment to select it, and keep it highlighted. Cockpit's `WorkflowFrameChart` already selects on tap.
2. de1app's four field groups (Temperature / Goal / Stop after / Move on if), plus a separate Limits surface.
3. ± stepper with hold-to-repeat, plus tap-the-value for a full-screen in-app keypad that shows range and recent values. Never the Android keyboard for numbers.
4. One set of Step actions acting on the selection: add after, duplicate, move up or down, delete with confirm. Always keep a Step selected and in view. Pump mode is a role swap (the goal axis vs the limiter on the other axis), with a visible "off".
5. A lineage-aware save model: Save (Bundled always forks) and Save a copy, a dirty state derived by comparing against the source, version history, restore original, and "Try" without saving. Upload to the machine only on commit.

**Pain points to avoid at 1024×600**

1. The soft keyboard covers more than half the screen on the Decent tablet. Keep text fields out of the Step panel, and never auto-focus.
2. Down-scaled large canvases break minimums. Measured examples: de1app's pump button is 96×34px; streamline-js steppers are exactly 36px with 9.75px unit text. Design natively for 1024×600.
3. Horizontal Step strips show only 3–4 Steps, and native scrollbars can't be dragged in Android WebView. Prefer a vertical list that keeps the selection in view; Beanie had a selection-loss bug past Step 8.
4. Hidden modes and controls that promise more than the machine can do. Examples: de1app's "tap to select, tap again to adjust"; Beanie's exit that couldn't be turned off; four exit tiles implying multiple exits when a DE1 Step holds one. Mode toggles that rewrite the profile, and choosing the editor from the profile's title, also went wrong.
5. Save surprises and chatty uploads. de1app's "Ok" applies without saving. Content-hash ids changing on save lost favourites and caused dedup clashes. Decenza pushed every ±0.1 tap to the machine.
