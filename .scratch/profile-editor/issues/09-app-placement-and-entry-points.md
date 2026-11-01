# Where does profile authoring live in the app, and what are its entry points?

Type: prototype
Status: resolved
Blocked by: 03, 07
Map: [Profile authoring in Cockpit](../map.md)
Prototype: branch `prototype/app-placement` (commit `7407e96`) → `/workflows?variant=A|B|C`

## Question

Where do the **Profile Library** and the step editor live in Cockpit's navigation at 1024×600?

- **Placement**: a new top-level route, an expansion of the Workflows page's "Choose Profile" panel, or a full-screen editor surface?
- **Entry points**: what are they for New, Duplicate, Edit, and "edit the **Active Profile**", and how does the operator get back to brewing?

Build a rough clickable prototype of the navigation and library list, with the editor itself stubbed. Run it against the fake gateway and decide with the operator.

## Context from research

From [How do existing DE1 profile editors lay out step editing?](03-editor-prior-art.md):

- **No prior editor fits 1024×600 natively.** Down-scaled canvases break the 36px and 0.66rem minimums.
- **Edit vs open**: choosing the editor based on a profile's title went wrong in de1app.
- **Bridge-era entry points**: skins expose Save a copy, version history, and Restore original. These are the entry points this placement needs to host.

From [What does Save do to a profile and its lineage?](06-save-semantics-and-lineage.md):

- **Actions to host**:
  - **Save**, which makes a **Profile Revision**;
  - **Save as new** and library **Duplicate**, which make a **Profile Fork** from a draft titled "<title> copy" and stay disabled until a Step differs;
  - title and notes edits, which are locked on Bundled Profiles until a Step changes.
- **Library list**: one entry per visible record (the current Revision of each profile, every Fork, visible Bundled Profiles); Superseded Profiles appear only in the lineage. This ticket decides how Forks sit next to their parent.
- **Collision prompts**: Save can end on "Identical to *X*", with an action to open, go back to, or restore *X*. The draft stays open.

From [How does editing relate to the Active Profile and the dial-in loop?](07-active-profile-and-dial-in-loop.md):

- **More actions to host**:
  - **"Edit what's loaded"** on the Active Profile, offered even when it has no saved version;
  - a **"Differs from saved"** badge on the Active Profile;
  - **Use for next shot**, which loads the draft without saving;
  - **Save & use** for profiles that aren't loaded;
  - **Revert to saved** in the editor.
- **One profile, one draft.** Every way into the loaded profile (the Active row, the library list, a Brew shortcut) opens the same draft, seeded from the Workflow copy.
- **Busy gate.** Every action that writes the Workflow, Choose Profile included, is disabled with the reason shown while the Bridge reports the machine running something. Editing stays available.
- **Replace confirm.** Choose Profile, Save & use, and Use for next shot from another profile's draft ask "Discard and load / Cancel" when the loaded profile has unsaved changes.

From [Which fields does the editor expose, and what limits does the Skin enforce?](08-field-coverage-and-limits.md):

- **New** opens a one-Step draft ("New profile", 9 bar, 93 °C, 30 s). Nothing is written until Save.
- **Save as new and Duplicate stay disabled until something the machine runs differs from the source**, not just a Step. The reason reads "A copy must change how the profile runs".
- **Title, author, and notes** are the fields that update in place, and they're locked on Bundled Profiles until something that runs has changed.

## Comments

**2026-10-21 — claimed.** Prototype session in progress on branch `t3/wayfinder-09-app-placement`.

**2026-10-21 — prototype built.** Branch `prototype/app-placement`, hosted on the real Profiles tab: `/workflows?variant=A|B|C`, where no variant shows today's page. The pink switcher bar cycles the variants, shows a state readout, and has a shot simulator. Run it with:

```
pnpm exec tsx tests/gateway/server.ts --host 127.0.0.1 --port 18090
VITE_BRIDGE_URL=http://127.0.0.1:18090 pnpm dev --host 127.0.0.1 --port 3010
```

- **The library** is the 73 Bundled Profiles the operator's Bridge ships (generated from decaid `assets/defaultProfiles`), plus four operator records: a Revision of "House", a Fork of House, a Revision of a Bundled Profile, and a Fork of a Bundled Profile.
- **The Active Profile** is the fake gateway's Workflow "House". The library copy is 1 °C hotter, which stands in for Brew temperature drift, so "Differs from saved" shows from the start.
- **Loading** writes the fake gateway's Workflow, so the busy gate and the replace confirm from ticket 07 are live.
- **The editor is a stub.** Its "Simulate an edit" button dirties the draft.

The variants:

- **A — Choose list grows up.** Today's two columns stay. The Choose Profile column becomes the library, with Yours above Bundled. Tapping a row loads it, and each row has Edit and Duplicate buttons. The editor opens full screen.
- **B — Library page.** The Profiles tab becomes a master/detail library: filter chips, Forks nested under their parent, tap to select, and a detail pane with the chart and every action. Shot setup moves to a segment. The editor opens full screen.
- **C — Workbench.** The rail stays and the editor opens in the right pane, in place of Shot setup, with the nav still visible.

Findings while building:

- **C leaves the Step editor about 740×330 px**, and its action bar already wraps.
- **C's rail lets the operator load another profile mid-edit**, which leaves an open draft pointing at a profile that's no longer loaded.
- **Because Brew temperature drift counts as unsaved changes, the replace confirm from ticket 07 fires on nearly every Choose.** That was already decided; the prototype makes it tangible.
- **Bundled tea profiles are typed `pourover`** (15 of the 25).
- **Cockpit never navigates on shot start today**, so nothing pulls the operator out of a full-screen editor when a shot begins.

**2026-10-21 — decided with the operator.** Seven questions, one at a time, each with a recommendation. The operator took the recommendation every time:

1. Editor: full screen over the nav (A and B). Rejected: the right pane of the Profiles tab (C).
2. Row tap: select, with a detail pane (B). Rejected: tap loads (A).
3. Shot setup: a segment in the Profiles tab. Rejected: moving it to Brew, or giving it its own nav tab.
4. Forks: nested under their parent. Rejected: a flat list with a "Copy of X" subtitle.
5. List: chips, with Yours first. Rejected: two sections without chips, and chips plus a search box.
6. Back to Brew: a Brew button in the editor header. Rejected: loading jumps to Brew, and the back arrow only.
7. Loaded profile: in its alphabetical place and selected on arrival. Rejected: pinned at the top.

At the confirmation summary the operator also accepted four calls made without a question:

- the editor is its own route;
- the detail chart replaces the "4F" preview overlay;
- Visualizer import moves behind an Import button;
- after Save, the Library selection follows the new record.

## Answer

**The Profile Library takes over the Profiles tab as a master/detail page, and the editor is a full-screen surface on top of it.** Tapping a profile selects it; loading is an explicit **Use**. Every way into the editor starts from the Library or the loaded-profile strip, and the editor's header has a **Brew** button for the dial-in loop. Nothing navigates on its own. The decision is visible as Variant B, with A's full-screen editor, on branch `prototype/app-placement`.

**Placement**

- **The Profiles tab** (nav label "Profiles", today's `/workflows`) holds a **Library | Shot setup** switch at the top. Library is the default. Shot setup moves across unchanged: Workflow name and description, grinder, coffee, and dose and yield.
- **No new nav item.** The nav keeps four tabs.
- **A loaded-profile strip sits above both segments.** It shows ● title, the "Differs from saved" badge ("Not saved" when no visible profile has its title), and **Edit loaded**.
- **The Choose Profile panel and the "4F" frame-preview overlay are retired.** The detail pane's chart replaces the preview.

**Library list** (left column, about 340px)

- **Filter chips**: All · Yours · Espresso · Pour-over · Other.
  - Chips filter on the stored `beverage_type` as-is, with no special handling per type. "Other" is anything that isn't espresso or pourover.
  - All is the default. There's no search box, so the soft keyboard never opens here.
- **Order**: the operator's profiles first, then Bundled Profiles, each alphabetical.
- **Forks are nested under their parent**, indented with ↳, including under a Bundled parent ("Londonium slow ramp" under "Londonium"). A Fork whose parent isn't visible becomes a top-level row. Superseded Profiles never appear; they belong to the lineage.
- **The loaded profile keeps its alphabetical place** with a green dot. It is selected and scrolled into view when the Library opens.
- **The list header** holds **+ New** and **Import**. Import opens a small dialog with the Visualizer share-code field, the same import as today, moved out of the list.
- **Selection, chip, and segment survive leaving and returning.** They're UI state in a store, not in the URL.

**Detail pane** (the rest of the width)

- **Header**: title, then badges:
  - **Bundled** or **Yours**, as the origin badge;
  - **Loaded**, when it's the loaded profile;
  - **Differs from saved**, when that applies.
- **Below the header**: a meta line (author · beverage type · Step count · origin, such as "Copy of House" or "Revised from Bundled"), then two lines of notes.
- **Chart**: the profile's targets, using the existing `workflow-frame-chart` in its tablet layout.
- **Action bar**:
  - **Use** loads the profile. This is Choose Profile from ticket 07, with its busy gate ("Available when the shot ends") and replace confirm. On the loaded profile it reads **Loaded** and is disabled; Revert to saved stays in the editor.
  - **Edit**. On the loaded profile it opens the same draft as Edit loaded, seeded from the Workflow copy.
  - **Duplicate** opens a Fork draft titled "*title* copy".
  - **History** opens the lineage view (ticket 13).
  - **⋯** holds Hide and Delete (ticket 11).

**Editor**

- **Full screen, covering the nav**, with roughly 1024×550 below its header.
- **Its own route**, so a reload lands back in the editor and Android back behaves like the back arrow. Whether the draft survives that reload is ticket 10's call. Path names are left to implementation.
- **Header**:
  - **← Library**, which returns to the Library with the same selection;
  - **Brew**;
  - the title with badges (New, Copy, or Editing; Loaded; Differs from saved; Bundled);
  - the actions from tickets 06 and 07: **Revert to saved** (loaded profile only), **Save as new**, **Use for next shot**, **Save & use** (other profiles only), and **Save**.
  - Disabled actions show their reason in a strip under the header.
- **Leaving keeps the draft.** Both ← Library and Brew leave the editor; how long the draft lives is ticket 10's.
- **Nothing navigates on its own.** Save, Save & use, and Use for next shot all stay in the editor. After Save, the Library selection moves to the new Revision or Fork, so ← Library lands on it.

**Entry points**

- **New**: + New in the list header opens a one-Step draft (ticket 08).
- **Edit**: the detail pane.
- **Edit what's loaded**: Edit loaded in the strip, or Edit on the loaded profile's detail. One profile, one draft.
- **Duplicate**: the detail pane.
- **Save as new**: inside the editor.
- **Back to brewing**: the editor's Brew button, or the nav from the Library.
- **From Brew**: today's Brew profile button still opens the Profiles tab. A shortcut into the editor from Brew or the Post-Shot Summary is a separate ticket.

**Rejected**

- **The editor in the Profiles tab's right pane (C).** The Step editor would get about 740×330, and loading from the rail mid-edit leaves the open draft pointing at a profile that's no longer loaded.
- **Tap to load (A).** With 74 profiles you can't see a profile's shape before loading it. Each row would also need room for Edit, Duplicate, History, and Hide/Delete at 36px or more.
- **A new top-level route or a fifth nav tab.** "Profiles" already names the tab, and five tabs shrink each target from about 256px to about 205px.
- **Shot setup on Brew.** It would change Brew, where the 600px height is already tight.
- **Flat Forks with a subtitle.** Forks of Bundled Profiles would scatter among the operator's own.
- **A search box.** It needs the soft keyboard; chips narrow 74 profiles well enough.
- **Loading jumps to Brew.** Two tweaks in a row would mean reopening the editor each time.
- **Back arrow only.** Every dial-in round trip would take two taps.
- **The loaded profile pinned at the top.** It duplicates the strip and hides where the profile sits in the list.

**Knock-ons for other tickets**

- **Fog → ticket**: "Shortcuts into the editor from Brew" is now ticketable as [Does Brew get a shortcut into the editor?](15-brew-shortcut-into-editor.md).
- *What happens to a Profile Draft when the operator leaves the editor?* gets two concrete exits, ← Library and Brew, and a route the Skin can reload into. Cockpit doesn't navigate when a shot starts, so a shot can begin while the editor covers the screen.
- *How does the step editor lay out at 1024×600?* gets the full width and roughly 550px under a header that already holds back, Brew, title and badges, and up to five actions. It may restyle that header but must host them.
- *How does the operator delete, hide, and restore profiles?* hosts Hide and Delete in the detail pane's ⋯. A view of hidden and deleted profiles could be another chip.
- *How is Profile Lineage shown and navigated?* opens from History in the detail pane. The list already nests Forks under their parent.

