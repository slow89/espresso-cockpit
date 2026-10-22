# Where does profile authoring live in the app, and what are its entry points?

Type: prototype
Status: open
Blocked by: 03, 07
Map: [Profile authoring in Cockpit](../map.md)

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
