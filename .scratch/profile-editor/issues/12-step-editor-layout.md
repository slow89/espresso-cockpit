# How does the step editor lay out at 1024×600?

Type: prototype
Status: open
Blocked by: 05, 08, 09
Map: [Profile authoring in Cockpit](../map.md)

## Question

This is the core screen. How does a full **Step** editor fit 1024×600 landscape with tap targets ≥36px? Cover:

- **Step list**: navigation, plus add, remove, and reorder.
- **Per-step editing**: the field panel for the selected **Step**, using the field placement and input pattern already decided.
- **Profile-level fields**: where they sit.
- **Live target chart**: a chart of the profile's targets that updates while editing, reusing the existing workflow step chart (currently `workflow-frame-chart`) where sensible.
- **Save / discard**: the controls and where they sit.

Build a rough prototype in the app's visual language, check it in a browser at 1024×600, and decide with the operator.

## Context from research

From [How do existing DE1 profile editors lay out step editing?](03-editor-prior-art.md):

- **Leading candidate layout**: a vertical Step list plus a detail panel for the selected Step, with the target chart acting as a Step selector. Tap a segment to select it; keep it highlighted. `WorkflowFrameChart` already selects on tap.
- **Field groups**: Temperature / Goal / Stop after / Move on if. Pump mode is a role swap between the goal axis and the limiter.
- **Step actions** act on the selection: add after, duplicate, move up or down, delete with confirm.
- **Avoid horizontal Step strips.** They show only 3–4 Steps, and WebView scrollbars can't be dragged.
- **Avoid** "tap to select, tap again to adjust", multi-exit tiles (a DE1 Step holds one exit), and text fields inside the Step panel.

From [Which fields does the editor expose, and what limits does the Skin enforce?](08-field-coverage-and-limits.md):

- **Every Step field is visible in de1app's four groups, with no advanced disclosure.** Fields that are turned off show **Off** instead of disappearing. Only the cap value, limiter range, and exit value appear when their switch is on. Sensor and transition are two-way toggles.
- **The Step name is edited in a text sheet**, never inline. A blank name shows as "Step N".
- **Profile-level fields**: the title goes in the header; notes, author, beverage type, tank preheat, and stop at volume go on one **Profile settings** surface; the preinfusion boundary is a **Preinfusion | Pour divider in the Step list** that the operator moves.
- **Step actions have limits**: Add and Duplicate are disabled at 20 Steps, and Delete at one Step, each with the reason shown.
- **Fields carry flags** in two tiers: blocking (a value that would wrap; Save and Use for next shot are disabled with the reason) and warning (outside the practical range, or an exit of 0). The field also shows what the machine would run.

From [Where does profile authoring live in the app, and what are its entry points?](09-app-placement-and-entry-points.md):

- **The editor is full screen, covering the nav.** Below its header it gets roughly 1024×550.
- **The header must host**:
  - **← Library** and **Brew**;
  - the title with badges (New, Copy, or Editing; Loaded; Differs from saved; Bundled);
  - up to five actions: Revert to saved, Save as new, Use for next shot, Save & use, and Save;
  - disabled actions show their reason in a strip below.
  This ticket may restyle the header, but must keep those.
- **The Library's detail pane already shows a read-only chart** using `workflow-frame-chart` in its tablet layout. The editor's live chart can share it.
