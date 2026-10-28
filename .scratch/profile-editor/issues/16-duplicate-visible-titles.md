# What happens when two visible profiles share a title?

Type: grilling
Status: open
Blocked by: 13, 14
Map: [Profile authoring in Cockpit](../map.md)

## Question

Cockpit keeps titles unique among visible profiles only at save time. Several things can still leave two visible profiles with the same title:

- a Restore from the Removed list;
- a **Superseded Profile** brought back from the lineage;
- a Bridge update that ships a new version of a **Bundled Profile** the operator revised or hid;
- an import, as already on the tablet.

Decide:

- **The Active Profile.** Ticket 07 links it to "the visible profile with the same title" and assumes there is at most one match. With two matches, which one does it belong to? Candidates: the operator's over a Bundled one, the closer content, or the most recently updated. What do the loaded-profile strip, the Loaded dot, and "Differs from saved" show?
- **The Library.** How the operator tells the two rows apart.
- **Fixing it.** Does Cockpit prompt a rename, and how, given that a Bundled Profile's title is locked? Or does it just tolerate the clash?
- **Saving.** Ticket 06 blocks Save while the draft's title clashes with a visible profile. Does a profile that already shares its title have to be renamed before its next Save?

## Context

From [What does Save do to a profile and its lineage?](06-save-semantics-and-lineage.md):

- **Titles must be unique among visible profiles**, checked in the Skin at save time. A clash that arises later without a Save is tolerated: a Bridge upgrade adding a Bundled Profile of the same name, or a Superseded Profile being brought back.
- **Why it matters**: shot history stores only `profileTitle`, so duplicate visible titles make old shots ambiguous.

From [How does editing relate to the Active Profile and the dial-in loop?](07-active-profile-and-dial-in-loop.md):

- **The Active Profile belongs to the visible profile with the same title.** The answer says that titles are unique among visible profiles, so there is at most one match. That assumption is what breaks here.
- **Rejected there**: exact content match to find the source, and a source id in `context.extras`. A source profile id on the Workflow is a nice-to-have upstream.

From [Does the tablet's Bridge expose the profile write endpoints?](04-tablet-bridge-endpoints.md):

- **It already happens on the operator's tablet.** The only operator-created profile, "Extractamundo Dos!", is a Visualizer import that shares its title with a visible Bundled Profile.

From [How does the operator delete, hide, and restore profiles?](11-delete-hide-restore.md):

- **Restore is never blocked by a title clash.** The toast says "Restored *House* · another profile has this title".
- **A Bridge update that changes a Bundled Profile's content stores the new version visible.** If the operator had revised that profile, their Revision and the new Bundled version then share a title. If they had hidden it, it reappears. Whether that gets fixed upstream is *Which Bridge changes does the spec depend on, and how do we ask for them?*

Blocked by *How is Profile Lineage shown and navigated?*, whose "go back" may itself bring back a Superseded Profile next to the current head, and by *Which Bridge changes does the spec depend on, and how do we ask for them?*, which decides whether the Bridge-update case is fixed upstream or designed around.
