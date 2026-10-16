# How are numbers entered on the tablet without the soft keyboard?

Type: prototype
Status: resolved
Blocked by: —
Map: [Profile authoring in Cockpit](../map.md)

## Question

A full step editor means entering many decimal values: pressure, flow, temperature, seconds, volume, weight, exit thresholds, and limiters. Every input has to work at 1024×600 landscape with touch only, and the Android soft keyboard would cover a large share of the 600px height.

Which input pattern should the editor use for numeric values? Candidates:

- the existing `RecipeValueControl` −/+ stepper with presets
- a compact in-app numeric keypad
- sliders or drag
- dragging points directly on a target chart
- a mix of these by field type

Build a rough prototype of two or three candidates against real field ranges (real step sizes are now known from *What does each profile and step field mean…*: pressure, flow, exit, and limiter values in 1/16 on DE1 or 1/10 on Bengle; temperature in 0.5 °C; seconds in 0.1 s below 12.75 s, then whole seconds to 127; volume in whole mL to 1023) and decide with the operator. Text fields (title, notes, step name) still use the system keyboard. Note how the layout should behave while it is open.

## Context from research

From [How do existing DE1 profile editors lay out step editing?](03-editor-prior-art.md):

- **Prior art converges** on ± steppers with hold-to-repeat, plus tap-the-value to open a full-screen in-app keypad that shows the allowed range and recent values. Native apps add drag-to-adjust. Treat this as the leading candidate to test against.
- **Pitfall 1**: streamline-js steppers land at exactly 36px with 9.75px unit text when scaled to 1024×600.
- **Pitfall 2**: Decenza pushed every ±0.1 tap to the machine. Changes should only reach the machine on commit.

## Comments

**2026-10-15 — claimed; prototype built, awaiting operator reaction.**

Prototype on branch `prototype/numeric-input`, route `/prototype/numeric-input?variant=A|B|C` (switcher bar at the bottom cycles). Run the fake gateway and dev server, then open the route at 1024×600:

```
pnpm exec tsx tests/gateway/server.ts --host 127.0.0.1 --port 18080
VITE_BRIDGE_URL=http://127.0.0.1:18080 pnpm dev --host 127.0.0.1 --port 3000
```

Three structurally different candidates, all on one mock "Pressure rise" Step with the seven numeric fields and a system-keyboard step-name text field so keyboard behaviour can be judged too. Every variant uses real ranges and step sizes from *What does each profile and step field mean…* and shows the machine-encoded value when it drifts from what was entered (e.g. 9.1 bar → 9.125).

- **A — In-place ± steppers + presets.** Every field visible at once in a 3×3 grid, 40px ± buttons with hold-to-repeat that accelerates to the coarse step after ~1 s, four preset chips per field. Nothing opens or hides. Seven fields fit without scrolling; a full Step with more fields will scroll.
- **B — Tap value → keypad drawer.** Fields are read-only tiles; tapping one opens a 372px keypad drawer on the right (range, encoding note, presets, 3×4 keys, fine ±, Cancel/Set). Out-of-range entry turns amber and disables Set; commit happens only on Set. Tiles stay visible beside the drawer.
- **C — Select field → drag ruler.** Tap a field tile, then drag a ruler along the bottom: one 14px tick per UI step, snapping, with labelled major ticks and coarse ± at the rail ends. Range ends shown as dimmed ticks.

Candidates not built: **dragging points on the target chart** (prior art: no DE1 editor does this, and the research notes it is impossible to land 1/16-bar or 0.5 °C precision by touch on a 600px-tall chart) and plain **sliders** (same precision problem; the ruler is the slider done with enough travel). Both ruled out before building.

Things to react to in the browser:

1. Which pattern does a 0.1-bar nudge mid-dial-in feel fastest with, and which does "set max time to 45 s" feel fastest with? (A and C favour nudges, B favours typing.)
2. Do the encoding drift notes ("machine runs 9.125") help or distract? Should the UI step for pressure/flow be 0.1 (shown) or the true 1/16 (0.0625) with two-decimal display?
3. Is a right-side drawer (B) acceptable, or must the keypad be full-screen to get keys above 44px?
4. In A, do the preset chips earn their height, or should they be per-field "recent values" instead?
5. Is a mix wanted: steppers in place (A) plus tap-the-value for a keypad (B)?

**2026-10-15 — operator reaction, round 1.** Leaning **C (drag ruler)**. Problem raised: at three-digit values (temperature) the ruler was too busy, a label every 28px. Fixed in the prototype: labels now sit at a "nice" multiple of the coarse step at least 70px apart, whole-number labels drop the ".0", and ticks are tiered (label / coarse-step / fine). Not yet decided: whether C stands alone or pairs with a keypad for typed entry (question 5 above).

**2026-10-15 — operator decision.** "Looks good, go with that": the drag ruler as prototyped, standalone.

## Answer

**Numeric values are entered with a drag ruler (prototype Variant C).** Tapping a field selects it; a ruler strip along the bottom of the editor is bound to that field. Dragging the ruler changes the value one UI step per 14px tick with snapping, and the ruler's ends are press-and-hold ± buttons that move by the field's coarse step. The Android keyboard is never used for numbers; it remains only for text (title, notes, Step name).

Decided details, all visible in the prototype on branch `prototype/numeric-input` (`/prototype/numeric-input?variant=C`):

- **Step sizes are the machine's where they are usable, 0.1 where not**: pressure, flow, exit, and limiter values step 0.1 with the encoded 1/16 value (DE1) shown when it differs; temperature 0.5 °C; seconds 0.1 s below 12.75 s and 1 s above; volume 1 mL; weight 0.1 g. The ruler shows the encoded value next to the entered one when they drift ("machine 9.125").
- **Coarse steps**: 0.5 bar / 0.5 mL/s, 1 °C, 1 s, 10 mL, 1 g. Used by the rail-end buttons and by hold-to-repeat acceleration.
- **Rail legibility**: labels sit at a "nice" multiple of the coarse step at least 70px apart (so 5 °C, 10 mL, 0.5 bar, 5 s), whole numbers drop the ".0", and ticks are tiered: tall for labelled values, medium for coarse steps, short for fine steps. This was the operator's one correction during review.
- **Range**: out-of-range ticks render dimmed and the value clamps at the field's limits, so the Skin never produces a value the machine would wrap.
- **Commit timing**: ruler edits land in the Profile Draft, never directly on the machine (Decenza's per-tap upload pitfall from the prior-art research).
- **Rejected**: in-place ± steppers with presets (Variant A, too much chrome per field), a keypad drawer (Variant B, typing is rarely the need), sliders and chart-point dragging (not enough travel for 1/16-bar or 0.5 °C precision on a 600px-tall screen).

**Knock-ons for other tickets:**

- *How does the step editor lay out at 1024×600?* must reserve roughly 132px of height for the ruler strip and decide whether field tiles carry preset chips for long jumps (for example 25 s → 90 s is a long drag or 65 coarse taps without them).
- *Which fields does the editor expose, and what limits does the Skin enforce?* owns the per-field min/max the ruler clamps to; the prototype used machine limits as placeholders.
- The existing `RecipeValueControl` stepper on the Brew and Profiles screens is unchanged by this decision.
