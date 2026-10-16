# How does editing relate to the Active Profile and the dial-in loop?

Type: grilling
Status: open
Blocked by: 01
Map: [Profile authoring in Cockpit](../map.md)

## Question

The **Active Profile** is a copy embedded in the **Workflow**, not a reference into the **Profile Library**. The common real-world loop is: pull a shot, tweak the profile, pull again. Decide how editing fits that loop:

- Can the operator open "edit what's loaded" directly from the **Active Profile**, even when it no longer matches any library record?
- Does saving a profile make it the **Active Profile** automatically, ask first, or never?
- Is there a "try without saving" path that pushes a **Profile Draft** to the **Workflow** for the next **Shot** without writing to the library?
- What is blocked or deferred while the machine is mid-shot or not idle: opening the editor, saving, or applying?
- How does the Workflow's dose and yield relate to the profile's own target weight while editing? Research found that profile `target_weight` is **dead at runtime**: only the Workflow's `targetYield` stops the shot. So decide whether the editor hides it, shows it read-only, or deliberately syncs it into the Workflow.

Context: `PUT /api/v1/workflow` *merges* profile fields (omitted keys keep their old values; `steps` is replaced whole), so any apply path must send complete profiles.

From [What does the Bridge's profile write API accept…](01-bridge-profile-write-api.md):

- The Workflow holds **no profile id**, so "is the Active Profile this library record?" can only be answered by comparing content.
- A Workflow profile change uploads to the machine **immediately, with no idle or shot check**. Mid-shot, the saved Shot then records the new profile. Research recommends applying only when the Bridge reports idle.

From [How do existing DE1 profile editors lay out step editing?](03-editor-prior-art.md):

- **Bridge-era skins** offer "Try / Use for shot" without saving.
- **de1app's "Ok"** applying without saving is a known source of surprise.
