# Does Brew get a shortcut into the editor?

Type: grilling
Status: open
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
