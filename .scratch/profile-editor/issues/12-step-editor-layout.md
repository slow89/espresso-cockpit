# How does the step editor lay out at 1024×600?

Type: prototype
Status: resolved
Blocked by: 05, 08, 09
Map: [Profile authoring in Cockpit](../map.md)
Prototype: branch `prototype/step-editor-layout` (commit `2b506a4`) → `/prototype/step-editor?variant=A|B|C`

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

From [What happens to a Profile Draft when the operator leaves the editor?](10-draft-lifecycle.md):

- **The header gains Discard changes**, shown only while the draft has unsaved changes. It still holds at most five actions, because Revert to saved (loaded profile only) and Save & use (other profiles only) never appear together.
- **The editor needs a home for two messages**:
  - a small note after a merge: "Updated with changes made outside the editor";
  - a banner on overlap: "*Title* changed since you started editing", with **Start over from current** and **Keep my edits**.
  The strip below the header that shows disabled reasons is one candidate.
- **The title can carry a Draft badge** while the draft has unsaved changes.
- **Resume restores the selected Step**, which is stored with the draft.
- **Each Step carries a stable key in the draft**, so Steps can be reordered without confusing the merge.

From [How does the operator delete, hide, and restore profiles?](11-delete-hide-restore.md):

- **A draft's profile can be removed from the Library** (Hide or Delete, with an Undo toast) while the draft waits. The draft keeps its edits, and Save makes a new profile. The strip below the header needs a line for it: "*House* was removed. Save makes a new profile."
- **Restoring the profile reconnects the draft**, and the line goes away.

## Comments

**2026-10-31 — claimed.** Prototype session in progress on branch `t3/profile-editor-wayfinder`.

**2026-10-31 — prototype built.** Branch `prototype/step-editor-layout`, route `/prototype/step-editor?variant=A|B|C&profile=…&msg=…`. The pink pill above the ruler switches the variant, the profile, and the message under the header. Run it with:

```
pnpm exec tsx tests/gateway/server.ts --host 127.0.0.1 --port 18081
VITE_BRIDGE_URL=http://127.0.0.1:18081 pnpm dev --host 127.0.0.1 --port 3012
```

- **All three variants edit one in-memory draft** and keep its selection, so switching variants mid-edit loses nothing. Save actions are stubs that only show a toast.
- **Profiles**:
  - `house`: the operator's loaded profile, 4 Steps, with a limiter, an exit, and smooth transitions;
  - `adaptive`: Adaptive v2, Bundled, 7 Steps;
  - `gagne`: 20 Steps, the cap;
  - `rao`: 1 Step;
  - `tea`: Bug Bite Oolong, 9 Steps;
  - `flagged`: an import with values that wrap, values out of range, an exit of 0, a blank Step name, and an off-grid 9.125 s;
  - `new`: ticket 08's one-Step draft.
- **Messages**: none, merge note, overlap banner, removed line, and machine busy.

The variants (each keeps ticket 09's header and ticket 05's ruler along the bottom):

- **A — Step list + grouped panel.** A 236px Step list on the left, with Profile settings as its first row, the divider inside it, and Step actions at its foot. On the right, a short Step chart above the four groups in four columns.
- **B — Chart is the Step list.** A full-width Step chart, one column per Step, selects the Step. A toolbar holds the Step actions, the boundary, and a Profile toggle. The four groups sit below as cards.
- **C — Step table.** One row per Step and one column per value; tapping a cell binds the ruler to it. The selected Step's switches sit in a bar under the table, and the existing `workflow-frame-chart` takes a 272px column on the right.

Findings while building:

- **`workflow-frame-chart` reads only in a tall column (C).** At 108–170px tall it was illegible, so A and B use a new Step chart. It also plots stored fields as-is, one point per Step, so a flow Step still shows its leftover pressure.
- **All three fit 1024×600 with the ruler**, including Gagné's 20 Steps. In B these become ~50px columns with truncated names. A's list shows about 7 rows and then scrolls; C shows about 6.
- **A shows each Step name twice**, once in the list and once in the chart.
- **The overlap banner plus the reason strip take about 70px.** A's panel then scrolls by roughly one tile.
- **"Save: nothing has changed" costs about 22px on every clean open** (ticket 09's rule).

**2026-10-31 — decided with the operator.** I asked three questions at once: which layout, which chart, and whether the strip should drop the "nothing has changed" line. I recommended B, the new chart, and dropping the line. The operator answered: "a is best".

- **Layout: A.** Rejected: B and C.
- **Chart: the new Step chart, as A shows it.** The operator chose A as prototyped, chart included. Rejected: `workflow-frame-chart` in the editor.
- **The strip: unchanged.** The operator didn't take up dropping the clean-draft line, so ticket 09's rule stands.

Smaller calls I made while building are marked *(best judgment)* in the Answer.

## Answer

**The step editor is a Step list on the left and the selected Step's panel on the right, with a Step chart across the top of the panel and the drag ruler along the bottom of the screen.** The list carries navigation, the Preinfusion | Pour divider, and the Step actions. The panel shows all four field groups side by side, or the Profile settings. The decision is Variant A on branch `prototype/step-editor-layout`.

**Screen, top to bottom** (1024×600)

- **Header**, about 52px: ticket 09's, as listed below.
- **Message strip**: about 22px per line, plus about 44px for the overlap banner when it shows.
- **Body**: the Step list (236px) and the panel (the rest of the width).
- **Ruler**, about 116px: ticket 05's, bound to the selected field.

**Step list** (left column, 236px)

- **First row: Profile settings.** Tapping it swaps the panel to the profile fields. Tapping any Step swaps it back.
- **One 40px row per Step**:
  - the number;
  - the name, or "Step N" when blank;
  - a flag dot, red for blocking and amber for warning;
  - the goal in short ("F 4.0 mL/s", "P 8.5 bar").
- **The selected Step** has an amber bar on its left edge and a tinted background. One Step is always selected.
- **The Preinfusion | Pour divider is a row in the list**, with ▲ and ▼ buttons that move it one Step at a time. It sits above Step 1 when there's no preinfusion. It follows ticket 08's rules on add, delete, and move.
- **The list scrolls vertically past about 7 rows.** The chart above the panel always shows every Step, so a Step off the list is still one tap away. Selecting a Step from the chart scrolls its row into view *(best judgment)*.
- **Step actions in a toolbar at the foot of the list**: Add after, Duplicate, Move up, Move down, and Delete. They're five 40px icon buttons acting on the selected Step.
  - The limits from ticket 08 disable them, with the reason underneath: "Add · Duplicate: a profile holds at most 20 Steps", "Delete: a profile needs at least one Step".
  - **Delete acts at once, with an Undo toast** ("Deleted *Fill* · Undo"), like profile removal in ticket 11 *(best judgment; prior art used a confirm)*.
  - **Add after** inserts a Step after the selection and selects it. The new Step takes the selected Step's pump mode, targets, temperature, and sensor. Its transition is fast, max time is 10 s, volume and weight are Off, and it has no limiter, no exit, and a blank name *(best judgment)*.

**Panel** (right of the list)

- **Step chart**, about 108px tall, full panel width. It is a new chart, not `workflow-frame-chart`:
  - one equal-width column per Step, at least 44px wide, so 20 Steps fit;
  - each column shows the Step number, name, and flag dot;
  - the column draws the target, jumping on a fast transition and ramping on a smooth one;
  - the cap is drawn as a dashed line and temperature as a thin line on a 75–105 °C scale;
  - a caption gives the goal and how the Step ends ("F4 P>3", "P8.5 6s");
  - Preinfusion columns are tinted, and the boundary is a blue line;
  - the selected column is amber;
  - tapping a column selects that Step;
  - it updates live as the draft changes.
- **The Step heading**: "Step 1 of 4 · *Fill* ✎". Tapping it opens the Step name's text sheet.
- **The four groups in four columns**: Temperature, Goal, Stop after, and Move on if, at roughly 0.8 : 1.3 : 0.9 : 1.
  - **Temperature**: the temperature tile, then Coffee | Water.
  - **Goal**: Pressure | Flow and Fast | Smooth side by side, then the target tile, then No limit | Max flow (Max pressure on a flow Step). When the limiter is on, the cap and Range tiles appear below.
  - **Stop after**: Max time, Max volume, and Weight tiles. Each reads Off at 0, and Max time reads Instant.
  - **Move on if**: Off | Pressure | Flow. When an exit is set, Over | Under and the exit value tile appear below. When it's off, the group reads "Runs until a Stop after limit."
  - The toggles use the words above in normal case, at 0.72rem *(best judgment)*.
- **Value tiles** are at least 44px tall. Tapping one binds the ruler to it, and the bound tile has an amber border. A flagged tile shows its flag text, and a value that drifts shows what the machine runs (ticket 05).
- **When the overlap banner shows**, the panel scrolls by about one tile.

**Profile settings** (in the panel, with the chart still above)

- Beverage type as a five-way choice: Espresso, Pour-over, Manual, Cleaning, and Calibrate.
- Tank preheat and Stop at volume as value tiles bound to the ruler.
- Author and Notes as rows that open the text sheet.
- The title is edited from the header: tapping it opens the same text sheet.

**Text sheet** *(best judgment)*: one sheet for the title, Step name, author, and notes. It's anchored to the top of the screen, so the Android keyboard never covers it. The title can't be left empty.

**Header and strip**: as decided in tickets 09–11, restyled only to fit:

- left: **← Library**, **Brew**, then the title ✎ with its badges (New or Editing, Loaded, Differs from saved, Bundled, Draft);
- right: up to five actions, Save last and highlighted;
- the strip below, one line per message, stacked in this order:
  - the overlap banner, with Start over from current and Keep my edits;
  - machine busy;
  - the merge note;
  - "*House* was removed. Save makes a new profile.";
  - the reason Save or Use for next shot is disabled, which on a clean draft is "Save: nothing has changed".

**Rejected**

- **B — the chart as the Step list.** Recommended by me, not chosen. It shows all 20 Steps without scrolling, but each is a ~50px column with a truncated name, and every Step action plus the boundary and the Profile toggle crowd one toolbar.
- **C — a Step table.** About 6 rows fit. The selected Step's switches sit in a bar away from the values they change. The chart needs its own 272px column.
- **`workflow-frame-chart` as the editor's chart.** It's illegible in a 108px strip, and it plots fields the Step doesn't run. It stays in the Library's detail pane (ticket 09).
- **Dropping "Save: nothing has changed" from the strip.** Not taken up.
- **Dragging the divider.** The ▲▼ buttons are exact and need no drag target inside a scrolling list *(best judgment)*.
- **A confirm before deleting a Step.** The Undo toast covers it, as in ticket 11 *(best judgment)*.

**Knock-ons for other tickets**

- *How is Profile Lineage shown and navigated?*: the Step chart reads at about 108px tall, so a compare between two versions could stack two of them.
- *Does Brew get a shortcut into the editor?*: the selected Step is stored with the draft (ticket 10), and the list and chart both show it. A shortcut can therefore open the editor with a particular Step selected, such as the one a Shot Analysis recommendation names.
- **For implementation**: the Step chart is new code. `workflow-frame-chart` stays as is for the Library.
