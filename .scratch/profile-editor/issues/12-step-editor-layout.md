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
