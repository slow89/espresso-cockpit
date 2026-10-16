# How are numbers entered on the tablet without the soft keyboard?

Type: prototype
Status: open
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
