# Does Brew get a shortcut into the editor?

Type: grilling
Status: resolved
Blocked by: —
Map: [Profile authoring in Cockpit](../map.md)

## Question

The dial-in loop is: pull a **Shot**, tweak the **Active Profile**, pull again. The editor's header has a Brew button, but the only way from Brew into the editor is the Profiles tab, then Edit loaded. Decide:

- **Whether Brew gets a direct "edit what's loaded" shortcut.** If so, where:
  - the profile button in the top bar;
  - the **Post-Shot Summary**;
  - next to a **Shot Analysis** recommendation;
  - or several of these.
- **What the shortcut opens.** The loaded profile's draft, seeded from the Workflow copy (one profile, one draft), or the Library with the loaded profile selected.
- **Shot Analysis.** Does its recommendation travel with the shortcut, for example by pre-selecting the Step it mentions or showing the advice in the editor? **Shot Analysis** still never applies a change itself.
- **The top-bar profile button.** Today it opens the Profiles tab. Does that change?

## Context

From [Where does profile authoring live in the app, and what are its entry points?](09-app-placement-and-entry-points.md):

- **The editor is a full-screen route covering the nav.** Its header has ← Library and **Brew**; leaving keeps the draft.
- **Edit loaded** lives in a strip above both segments of the Profiles tab. A shortcut from Brew would open the same draft.
- **Nothing navigates on its own.** Cockpit doesn't navigate when a shot starts, and Use for next shot stays in the editor.

From [How does editing relate to the Active Profile and the dial-in loop?](07-active-profile-and-dial-in-loop.md):

- **Editing stays available while the machine is busy.** Only Workflow writes are disabled. So a mid-shot shortcut is allowed, but Use for next shot waits for the shot to end.

In the code:

- **The top-bar profile button** is `DashboardRecipeButton` in `src/components/dashboard/dashboard-top-bar-cards.tsx`. It links to `/workflows`.
- **The Post-Shot Summary** is `src/components/dashboard/dashboard-tablet-post-shot-summary.tsx`.
- **Shot Analysis** is `src/components/dashboard/dashboard-post-shot-analysis.tsx`.

From [What happens to a Profile Draft when the operator leaves the editor?](10-draft-lifecycle.md):

- **One editor draft at a time, stored on the tablet.** A shortcut to the loaded profile resumes its waiting draft. If the waiting draft belongs to another profile and has unsaved changes, the replace confirm fires: "*Title* has unsaved changes. Opening *Other* discards them."
- **The Bridge's wake reload lands on Brew**, so Brew is where the operator is most likely to be when a draft is waiting. Today, only the loaded-profile strip in the Profiles tab shows it, as "✎ *Title* · Resume". Whether Brew shows it too is this ticket's call.
- **Brew temperature nudges merge into a waiting draft of the loaded profile**, unless the draft changed the same temperatures.

From [How does the step editor lay out at 1024×600?](12-step-editor-layout.md):

- **The selected Step shows in both the Step list and the Step chart**, and it's stored with the draft (ticket 10). A shortcut can open the editor with a particular Step already selected, such as the one a **Shot Analysis** recommendation names. It can also bind the ruler to a particular field.
- **The editor's header and message strip are unchanged** from ticket 09. Advice carried in from Shot Analysis would need its own line there, or a place in the panel.

## Comments

**2026-11-01 — claimed.** Grilling session in progress on branch `t3/wayfinder-15-brew-shortcut`.

**2026-11-01 — decided with the operator.** Three questions, one at a time, each with a recommendation. Smaller calls I settled myself, as the operator prefers, and they're marked *(best judgment)* in the Answer.

1. Placement: **no shortcut on Brew**. The operator turned down the recommendation, an Edit profile button on the Post-Shot Summary. Also rejected: a ✎ split on the top-bar profile button, and both together.
2. A waiting draft on Brew: **a cue in the top-bar button**, as recommended. Rejected: no cue on Brew.
3. The Post-Shot Summary across a trip away from Brew: **the code is right**, as recommended. The summary survives the trip, and the Shot Analysis reading doesn't. Rejected: keeping the reading too, and ending the summary when the operator leaves Brew.

Checked before asking:

- **Shot Analysis can't name a Step.** Its system prompt allows only grind, dose, yield/ratio, or temperature (`src/lib/shot-analysis.ts:114`), and the prompt carries shot facts and telemetry but not the profile's Steps.
- **`CONTEXT.md` contradicted the code.** It said the Post-Shot Summary ends when the operator navigates away. The summary sits in an in-memory store (`src/stores/dashboard-ui-store.ts`) that's cleared only when a Shot starts, on sleep, or on reset (`src/stores/machine-store.ts:109-112`, `:246`), and no route clears it. The Shot Analysis reading and Taste Compass taps are component state in `src/components/dashboard/dashboard-post-shot-analysis.tsx`, so they're lost when Brew unmounts.
- **The top-bar profile button** (`DashboardRecipeButton`, `src/components/dashboard/dashboard-top-bar-cards.tsx`) shows the Active Profile's title and a "PROFILES" label, and links to `/workflows`.

## Answer

**Brew gets no shortcut into the editor.** The way in stays as [Where does profile authoring live in the app, and what are its entry points?](09-app-placement-and-entry-points.md) left it: the top-bar profile button opens the Profiles tab, and **Edit loaded** (or **Resume**) opens the editor. The only change to Brew is a cue on that button while a **Profile Draft** is waiting.

**No shortcut**

- **The top-bar profile button still opens the Profile Library.** Its title is still the **Active Profile**'s.
- **The Post-Shot Summary keeps its Shots and Done buttons**, with no Edit.
- **Shot Analysis carries nothing into the editor.** It never recommends a **Step** change, so there's no Step to pre-select or advice to show there.
- **What a shortcut would open** no longer needs deciding. Every way into the editor starts from the Library or its loaded-profile strip.

**The waiting-draft cue** (left to this ticket by [What happens to a Profile Draft when the operator leaves the editor?](10-draft-lifecycle.md))

- **While a Profile Draft has unsaved changes, the button's "PROFILES" label reads "✎ DRAFT".** Same width, same tap target. It still opens the Library, where the strip's chip or **Resume** opens the draft.
- **It covers the case where a draft is otherwise invisible.** The Bridge's wake reload always lands on Brew, and nothing navigates on its own.
- *(best judgment)* **Any profile's draft triggers the cue**, not only one of the loaded profile. The button's title stays the Active Profile's.
- *(best judgment)* **A clean draft shows no cue**, matching ticket 10, where nothing flags a clean draft as waiting.
- *(best judgment)* **Brew shows no "Differs from saved" badge.** That stays in the Profiles tab.
- **The cue is derived from the persisted draft store**, using ticket 10's comparison against the draft's base. It needs no effect or mirrored state.

**The Post-Shot Summary across the dial-in trip**

- **The summary lasts until Done, the next Shot, or sleep.** A trip to the editor and back through its **Brew** button lands on the same shot's summary. This is how the code already behaves.
- **The Shot Analysis reading and Taste Compass taps are lost on leaving Brew.** Analyze has to be run again for another reading. No code change.
- **`CONTEXT.md` now matches the code**, for both the Post-Shot Summary and Shot Analysis.

**Rejected**

- **An Edit profile button on the Post-Shot Summary.** It would sit beside Shots and Done, next to the frozen shot.
- **A ✎ split on the top-bar profile button** (title opens the Library, ✎ opens the editor). It would take width from a top bar that's already full at 1024px.
- **Both of these.**
- **No cue on Brew.** A waiting draft would only show in the Profiles tab.
- **Keeping the Shot Analysis reading across the trip**, by moving it into the dashboard store.
- **Ending the summary when the operator leaves Brew**, which is what `CONTEXT.md` used to say.

**Knock-ons for other tickets**

- *What happens to a Profile Draft when the operator leaves the editor?*: its open question about Brew is settled by the cue above.
- *What happens when two visible profiles share a title?*: nothing changes. The top-bar button shows the Active Profile's title, as it does today.
- **Out of scope**: profile-aware Shot Analysis, meaning Step recommendations or a link into the editor. It belongs to Shot Analysis, not the editor, and Brew has no shortcut to carry it.
