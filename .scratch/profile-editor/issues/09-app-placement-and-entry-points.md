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
