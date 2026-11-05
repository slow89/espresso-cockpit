# Spec: Profile authoring in Cockpit

Status: ready-for-agent
Map: [Profile authoring in Cockpit](./map.md)
Decisions: every ticket in [issues/](./issues/), indexed by the map's Decisions so far, plus [ADR 0003](../../docs/adr/0003-save-makes-a-profile-revision.md) and [ADR 0004](../../docs/adr/0004-going-back-swaps-visibility.md)

## Problem Statement

The operator dials in espresso on a 7" Decent tablet running Cockpit. The loop is: pull a **Shot**, tweak the **Profile**, pull again. Cockpit can load a **Profile** and import one from a Visualizer share code, but it can't change one. The **Bridge** has no editor of its own, so any change to a **Step** means leaving the machine for another app.

The **Bridge**'s profile API also can't simply be wrapped in a form:

- Ids hash what the machine runs, so a `PUT` that changes a **Step** moves the record to a new id and orphans everything saved from it.
- `POST` dedups silently. Content that already exists returns the old record, even a deleted one, and ignores the new title.
- **Bundled Profiles** reject every edit to their `profile`.
- Nothing validates ranges, and out-of-range values wrap. 16 bar runs as 0 bar.
- Changing the **Workflow**'s profile uploads to the machine immediately, even during a **Shot**.
- Nothing pushes changes, and after 10 minutes paused the **Bridge** blanks the page and reloads the **Skin** at Brew.

Numbers are also a problem at 1024×600 with touch only. The Android soft keyboard covers a large share of the 600px height, and there's little room for a **Step**'s fields.

## Solution

The Profiles tab becomes a master/detail **Profile Library**, and a full-screen editor opens over it. The editor is a **Step** list on the left, the selected **Step**'s fields on the right, a **Step** chart above them, and a drag ruler along the bottom for every number, so the keyboard only ever opens for text.

Save never overwrites what the machine runs. It saves a new record and hides the old one, so the Library shows one entry per profile while every earlier version stays in **History**, where the operator can go back to it. **Bundled Profiles** work the same way. Unsaved work is a single **Profile Draft** stored on the tablet, which survives leaving the editor, sleep, reloads, and redeploys. The operator can try a change on the next **Shot** without saving it. **Cockpit** changes nothing in the **Workflow** while the machine is running anything, and it never writes without the operator asking.

Everything works on today's **Bridge** with no upstream change, from Decaid v0.8.0. Below that, the Library is read-only.

## User Stories

### Browsing the Profile Library

1. As an operator, I want the Profiles tab to open on the **Profile Library**, so that browsing profiles is the first thing I can do there.
2. As an operator, I want a **Library | Shot setup** switch, so that grinder, coffee, dose, and yield stay in the same tab without crowding the list.
3. As an operator, I want a loaded-profile strip above both segments, so that I can always see what the next **Shot** will run.
4. As an operator, I want every visible **Profile** listed with my own first and **Bundled Profiles** after, each alphabetical, so that my profiles are easy to find among 70-odd **Bundled** ones.
5. As an operator, I want filter chips (All, Yours, Espresso, Pour-over, Other), so that I can narrow the list without opening the soft keyboard.
6. As an operator, I want **Profile Forks** nested under the visible version of the profile they were copied from, so that related profiles sit together, even under a **Bundled Profile**.
7. As an operator, I want a **Profile Fork** whose profile has no visible version to show as a top-level row, so that it never disappears from the list.
8. As an operator, I want tapping a row to select it without loading it, so that I can look at a profile's shape before committing to it.
9. As an operator, I want a detail pane with the title, origin badge, meta line, notes, and chart, so that I can judge a profile without opening the editor.
10. As an operator, I want the loaded profile marked with a green dot in its alphabetical place, so that I can see where it sits in the list.
11. As an operator, I want the loaded profile selected and scrolled into view when the Library opens, so that I start from what's loaded.
12. As an operator, I want the Library's selection, chip, and segment to survive leaving and returning, so that a trip to Brew doesn't lose my place.
13. As an operator, I want a "Differs from saved" badge on the loaded profile, so that I know the next **Shot** won't run exactly what's in the Library.
14. As an operator, I want the strip to read "Not saved" when no visible profile has the loaded title, so that I know the loaded profile exists only in the **Workflow**.
15. As an operator, I want **Superseded Profiles** and **Retired Bundled Profiles** left out of the list, so that it shows one entry per profile.

### Loading a profile

16. As an operator, I want an explicit **Use** action, so that browsing can never change what the next **Shot** runs.
17. As an operator, I want **Use** to read **Loaded** and be disabled on the loaded profile, so that it's clear there's nothing to do.
18. As an operator, I want **Use** disabled while the machine is running anything, with the reason shown, so that a **Shot** can't be recorded with the wrong profile.
19. As an operator, I want to be asked before a load discards unsaved changes in the loaded profile, so that I don't lose a trial by accident.
20. As an operator, I want a load to happen straight away when nothing is unsaved, so that ordinary switching takes one tap.
21. As an operator, I want loading a profile to leave my dose, yield, and the rest of the **Workflow** alone, so that I don't have to set them again.

### Creating and opening profiles

22. As an operator, I want **+ New** to open a one-**Step** draft with sensible values, so that I can build a profile from scratch without a template picker.
23. As an operator, I want **Edit** in the detail pane, so that I can open any visible profile.
24. As an operator, I want **Edit loaded** in the strip, so that I can tweak what I just brewed in one tap from the Profiles tab.
25. As an operator, I want the loaded profile's draft to start from the **Workflow** copy, so that changes from the dashboard's Brew temperature control are carried in.
26. As an operator, I want **Edit loaded** to work even when no visible profile matches, so that I can still save what's loaded as a new profile.
27. As an operator, I want **Duplicate** to open a **Profile Fork** draft titled "*title* copy", so that I can branch from a profile, including a **Bundled** one.
28. As an operator, I want **Save as new** in the editor, so that I can turn the edits I've already made into a separate profile.
29. As an operator, I want the editor to fill the screen over the nav, so that a **Step** editor has all the room 1024×600 can give it.
30. As an operator, I want a **← Library** button, so that I return to the Library with the same selection.
31. As an operator, I want a **Brew** button in the editor, so that a dial-in round trip takes one tap each way.
32. As an operator, I want Android back to act like **← Library**, and a reload to land back in the editor, so that the editor behaves like any other page.
33. As an operator, I want nothing to navigate on its own, so that Save, Use for next shot, or a **Shot** starting never moves me off the screen I'm on.

### The Step list and Step chart

34. As an operator, I want a **Step** list showing each **Step**'s number, name, flag, and short goal, so that I can see the whole profile and pick a **Step**.
35. As an operator, I want one **Step** always selected, so that the fields on the right always have a subject.
36. As an operator, I want a **Step** chart with one column per **Step**, so that I can read the shape of the shot at a glance, up to 20 **Steps**.
37. As an operator, I want tapping a chart column to select that **Step** and scroll its row into view, so that a **Step** off the list is one tap away.
38. As an operator, I want the chart to update as I edit, so that I can see what a change does to the shape.
39. As an operator, I want **Add after** to insert a **Step** that copies the selected **Step**'s goal and temperature, so that I start from something close to what I want.
40. As an operator, I want to duplicate a **Step**, so that I can repeat one with small changes.
41. As an operator, I want to move a **Step** up and down, so that I can reorder without retyping it.
42. As an operator, I want deleting a **Step** to act at once with an Undo toast, so that it's quick and recoverable.
43. As an operator, I want Add and Duplicate disabled at 20 **Steps** and Delete disabled at one, with the reason shown, so that I can't make a profile the machine can't run.
44. As an operator, I want a **Preinfusion | Pour** divider in the list that I move with ▲ and ▼, so that I can set where preinfusion ends exactly, without dragging inside a scrolling list.
45. As an operator, I want adding, duplicating, and deleting a **Step** to keep the same **Steps** in preinfusion, so that an edit doesn't silently change where volume counting starts.
46. As an operator, I want moving a **Step** to keep the preinfusion count, with the **Step** changing sides if it crosses the divider, so that the divider stays predictable.

### Editing Step and profile fields

47. As an operator, I want every **Step** field visible in four groups (Temperature, Goal, Stop after, Move on if), so that nothing unusual is hidden behind a disclosure.
48. As an operator, I want a field that's off to read **Off** rather than disappear, so that I can see it's available.
49. As an operator, I want to tap a value tile to bind the ruler to it, so that I always know which number I'm changing.
50. As an operator, I want to drag a snapping ruler to change a number, so that I get exact values with no keyboard.
51. As an operator, I want press-and-hold ± buttons at the ruler's ends, so that I can cover long jumps at a coarse step.
52. As an operator, I want the ruler to stop at the field's limits, so that I can't produce a value the machine would wrap.
53. As an operator, I want a "machine 9.125" hint when the machine would run something different from the value shown, so that I know what actually runs.
54. As an operator, I want to choose a **Step**'s pump mode, sensor, and transition with labelled toggles, so that they take one tap.
55. As an operator, I want switching pump mode to remember each mode's target and cap, so that switching back restores the **Step** exactly.
56. As an operator, I want a cap never to carry over to the other axis, so that a 3 mL/s cap doesn't become a 3 bar cap.
57. As an operator, I want **Move on if** to offer Off and Pressure or Flow, then Over or Under, so that I can't make an exit that fires at once or never fires.
58. As an operator, I want turning a limiter or exit off and on again to bring back its last value, so that I can compare with and without it.
59. As an operator, I want a limiter that was off when loaded to return to its exact stored form when I turn it back off, so that undoing an edit doesn't make a new version.
60. As an operator, I want to edit a **Step**'s name, the title, the author, and the notes in a text sheet at the top of the screen, so that the keyboard never covers what I'm typing.
61. As an operator, I want a blank **Step** name to display as "Step N" without being saved that way, so that I don't have to name every **Step**.
62. As an operator, I want a Profile settings row in the **Step** list, so that beverage type, tank preheat, stop at volume, author, and notes have one home.
63. As an operator, I want a hint under the weight exit when the **Bridge** is in Full gateway mode, so that I know weight exits won't run there.

### Keeping stored profiles safe

64. As an operator, I want every value to load exactly as stored, so that opening a profile can't change it.
65. As an operator, I want a stored value the machine would wrap flagged with what it would actually run ("Runs as 0 bar"), so that I can fix a value that's dangerous.
66. As an operator, I want Save and Use for next shot disabled until a wrapping value or a profile over 20 **Steps** is fixed, so that the machine never runs it.
67. As an operator, I want a stored value that's merely outside the usual range flagged as a warning without blocking Save, so that I can still revise profiles I didn't author.
68. As an operator, I want a value to change only when I move the ruler on it, so that **Steps** I never touched stay exactly as they were.
69. As an operator, I want a value saved exactly as shown, so that 9.1 is saved as 9.1 and not 9.125 or 9.099999.
70. As an operator, I want edits I've undone to count as no change, so that they don't make a new version.
71. As an operator, I want stored `target_weight` preserved and hidden, so that the editor doesn't show a number that does nothing.

### Saving

72. As an operator, I want Save on a change to what the machine runs to make a **Profile Revision**, so that the Library still shows one entry and the earlier version stays in **History**.
73. As an operator, I want saving a **Bundled Profile** to work the same way, so that I can tune it without keeping a pile of copies.
74. As an operator, I want a change to only the title, author, or notes to update the profile in place, so that notes don't make versions.
75. As an operator, I want a **Bundled Profile**'s title and notes locked until something it runs has changed, with the reason shown, so that the editor doesn't offer what the **Bridge** refuses.
76. As an operator, I want Save as new and Duplicate to require a change to how the profile runs, with the reason shown, so that I understand why an exact copy can't be stored.
77. As an operator, I want a message naming the existing profile when my draft is identical to it ("Identical to *X*"), with an action to open it, so that Save never silently lands on an existing record.
78. As an operator, I want "Same as the version from 12 Oct · Go back" when my draft matches an earlier version, so that going back is one tap.
79. As an operator, I want "Identical to *X* (deleted)" with a restore action when my draft matches a removed profile, so that I can get it back.
80. As an operator, I want my draft kept open and unsaved after any collision, so that nothing is lost.
81. As an operator, I want to be told when a Save left both versions visible, so that I can sort it out myself rather than have **Cockpit** guess.
82. As an operator, I want the Library selection to follow a Save to the new record, so that **← Library** lands on what I just saved.
83. As an operator, I want a title that's empty or taken to show an inline reason and keep Save disabled, so that titles stay usable in shot history.
84. As an operator, I want titles that differ only in letter case to count as taken, so that shot history can't hold two profiles that read as the same.
85. As an operator, I want "Save: nothing has changed" in the strip on a clean draft, so that a disabled Save always explains itself.
86. As an operator, I want errors from the **Bridge** to show its detailed message, so that I see more than "Invalid request".

### The dial-in loop

87. As an operator, I want Save on the loaded profile to update the **Workflow** too, so that the next **Shot** runs what I just saved.
88. As an operator, I want Save on any other profile to leave the **Workflow** alone, so that preparing tomorrow's profile doesn't change today's shot.
89. As an operator, I want **Save & use** on other profiles, so that saving and loading can be one action.
90. As an operator, I want **Use for next shot** to load my draft without saving it, so that every dial-in tweak doesn't become a version.
91. As an operator, I want a trial to stay loaded until I save, revert, or replace it, so that it can last several **Shots**.
92. As an operator, I want **Revert to saved** on the loaded profile, so that I can return to the Library's version in one visible tap.
93. As an operator, I want every action that writes the **Workflow** disabled while the machine is running anything, with the reason shown, so that a **Shot** is never recorded with a profile it didn't run.
94. As an operator, I want editing and saving other profiles to stay available during a **Shot**, so that I can prepare the next tweak while one pulls.
95. As an operator, I want the Post-Shot Summary still there when I come back from the editor, so that I can read the **Shot** I'm tuning against.
96. As an operator, I want the top-bar profile button to read "✎ DRAFT" while a draft has unsaved changes, so that Brew tells me work is waiting.
97. As an operator, I want yield to stay a **Workflow** setting, so that loading a profile doesn't overwrite my dialled-in yield.

### Keeping unsaved work

98. As an operator, I want a draft kept through **← Library**, **Brew**, and Android back, so that leaving the editor never loses work.
99. As an operator, I want a draft kept through sleep, the **Bridge**'s wake reload, a manual reload, and a redeploy, so that a coffee break can't lose a half-built profile.
100. As an operator, I want a draft chip in the strip ("✎ *Title* · Resume"), so that I can find a waiting draft, including a **+ New** draft that has no row.
101. As an operator, I want a **Draft** badge on the profile's row and detail header, with its **Edit** reading **Resume**, so that the draft is visible where I'd look for it.
102. As an operator, I want Resume to land on the **Step** I left, so that I can pick up where I stopped.
103. As an operator, I want "unsaved" to mean the draft really differs from where it started, so that nothing nags me about a draft I've undone.
104. As an operator, I want one-tap **Discard changes**, so that I can drop edits to any profile.
105. As an operator, I want Discard changes on the loaded profile to keep the trial in the **Workflow**, so that it drops only what I hadn't tried.
106. As an operator, I want to be asked before opening another profile replaces a draft with unsaved changes, so that I don't lose it by accident.
107. As an operator, I want a Brew temperature nudge to merge into my waiting draft, so that both my edit and the nudge survive.
108. As an operator, I want changes made elsewhere to merge field by field, with a small note, so that I'm only asked when there's a real conflict.
109. As an operator, I want a banner offering **Start over from current** or **Keep my edits** when the same field changed on both sides, so that I decide what wins.
110. As an operator, I want a draft to keep its edits if its source was removed, with Save making a new profile, so that the work isn't lost.
111. As an operator, I want a notice if an update makes a stored draft unreadable, so that it doesn't silently vanish.

### History and going back

112. As an operator, I want **History** to replace the list column with the profile's versions, newest first, so that I can read how it changed without leaving the Library.
113. As an operator, I want each version to show its date, badges, and a one-line summary of that save, so that I can find the one I want.
114. As an operator, I want **Profile Forks** shown under the version they were copied from, and the origin at the foot, so that I can see where things came from.
115. As an operator, I want each version's chart beside **What this save changed** and **Going back changes**, so that I know what a version did and what going back would do.
116. As an operator, I want a temperature shift on every **Step** folded into one line, so that the list stays readable.
117. As an operator, I want going back to swap which version is visible, with an Undo toast, so that it's instant and reversible.
118. As an operator, I want going back to change only what the machine runs, so that my current title, author, and notes stay.
119. As an operator, I want every version to stay in **History** after going back, with its date and place unchanged, so that I can go forward again.
120. As an operator, I want **Go back & use** on the loaded profile, disabled while the machine is running, and asking first if it would discard a trial, so that the next **Shot** follows the version I chose.
121. As an operator, I want going back on any other profile to change only the Library, so that the next **Shot** isn't affected.
122. As an operator, I want a **Retired Bundled Profile** version shown but not offered for going back, with a link to Decent's current version, so that I understand why.
123. As an operator, I want a **Bundled** original offered as a version to go back to, so that I can return to Decent's profile.
124. As an operator, I want **History** to survive leaving the tab, so that a trip to Brew doesn't close it.
125. As an operator, I want **History** available from the Removed list, with **Restore this version**, so that I can recover any version of a removed profile.

### Removing and restoring

126. As an operator, I want **Hide** on a **Bundled Profile** and **Delete** on anything else, in the detail pane's ⋯, so that they're two taps away.
127. As an operator, I want removal to act at once with an Undo toast and no confirm, so that it's quick and recoverable.
128. As an operator, I want to remove the loaded profile and have it stay loaded, with the toast saying so, so that the next **Shot** isn't affected.
129. As an operator, I want a "Removed (N)" row at the end of the list, so that I can find what I removed without another nav item.
130. As an operator, I want Restore to bring a profile back with its id, lineage, and **Forks** intact, so that nothing was really lost.
131. As an operator, I want removing a profile to leave its **Superseded Profiles** and **Forks** alone, so that it touches only what I asked for.
132. As an operator, I want a message rather than an error if a profile was already removed elsewhere, so that I know what happened.
133. As an operator, I want a waiting draft of a removed profile left alone, so that the edits survive.

### Two profiles with one title

134. As an operator, I want a clashing Restore to rename the profile ("*House* (restored)") and say so, so that **Cockpit** never creates a clash and I don't have to type anything.
135. As an operator, I want restoring a **Bundled Profile** whose title is taken to be blocked, with a link to the other profile, so that I know what to rename.
136. As an operator, I want a clashing Import renamed ("… (imported)") and told so, so that importing never creates a clash.
137. As an operator, I want an import that added nothing to say so and name the existing profile, so that I'm not told it imported when it didn't.
138. As an operator, I want the **Active Profile** linked to the closer of two same-title profiles, so that Save supersedes the right one and a Brew temperature nudge doesn't move the link.
139. As an operator, I want only the linked row to show as loaded, and **Edit** on the other row to open that record, so that the two stay separate.
140. As an operator, I want both rows marked "Same title", with a note linking the other profile, so that I can see the clash.
141. As an operator, I want **Rename** on my own profile and **Hide** on a **Bundled** one, so that a clash I didn't cause takes one action to fix.
142. As an operator, I want the strip to show the loaded profile's origin while its title is shared, so that I know which one I'm brewing.
143. As an operator, I want Save allowed when I keep a profile's existing title, even while another profile shares it, so that a Bridge update can't stall my dial-in.
144. As an operator, I want **Cockpit** never to rename or hide anything on its own when it loads, so that nothing changes without me asking.

### An older Bridge

145. As an operator on a **Bridge** older than v0.8.0, I want the Library read-only, with browsing, **History**, and **Use** still working, so that I can still brew.
146. As an operator on an older **Bridge**, I want editing controls disabled rather than hidden, with one line in the strip naming the version needed, so that I know why and what to do.
147. As an operator, I want a waiting draft to come back after the **Bridge** is upgraded, so that the upgrade doesn't lose work.

### Working on the tablet

148. As an operator, I want every screen to fit 1024×600 with no overflow, so that nothing is cut off on the 7" tablet.
149. As an operator, I want text at 0.66rem or larger and tap targets at 36px or larger, so that I can read and hit everything at the machine.
150. As an operator, I want every disabled action to say why, so that I'm never left guessing.

### Building it

151. As a developer, I want a fake **Bridge** that behaves like the real profile API, so that browser tests catch dedups, id changes, and **Bundled** rejections.
152. As a developer, I want the rules in one pure module, so that they can be tested exhaustively without a browser.

## Implementation Decisions

### Modules

- **Profile library core** (new, pure TypeScript, no React or HTTP). It takes the **Bridge**'s records, the **Bundled** manifest, the **Workflow**'s profile, and the draft. It answers everything the screens show and every write decision. Screens and commands call it and hold no rules of their own. It covers:
  - record classification, Library rows, the Removed list, and **History**;
  - the change summary between two profiles;
  - the **Active Profile** link and "Differs from saved";
  - title checks and suffixed titles;
  - what a Save would do, and reading a write's response as a dedup;
  - the draft comparison and three-way merge;
  - field specs, flags, the display of values, and the ruler's steps;
  - the **Bridge** version floor.
- **Profile commands** (new, thin). One function per operator action: save, use for next shot, revert to saved, discard changes, go back, restore, remove, and import. Each runs the request sequence below against the REST client, refetches, and returns what to tell the operator.
- **Profile draft store** (new, persisted zustand). It holds the one draft, following the existing persisted stores.
- **REST layer** (modified). Adds the requests below. **Bridge** errors show `message`, falling back to `error`. The Step schema accepts explicit nulls for `exit`, `weight`, and `limiter`. `workflowContextSchema` gains `targetWaterVolume`. The profile schemas keep unknown keys, so the draft stays the complete profile as the **Bridge** returned it.
- **Library page** (replaces today's chooser in the Profiles tab): the segments, loaded-profile strip, list, detail pane, Removed list, and **History**.
- **Editor route** (new, full screen over the nav): header, message strip, **Step** list, panel, new **Step** chart, value tiles, ruler, and text sheet.
- **Brew top-bar profile button** (modified): the "✎ DRAFT" label.
- **Retired**: the Choose Profile panel and the "4F" frame-preview overlay. The existing `workflow-frame-chart` stays, in the Library's detail pane.

Project conventions apply: state lives in zustand stores and queries, with derived state and event handlers rather than new `useEffect` or mirrored state. The React compiler is on, so no manual memoisation. Components stay under about 300 lines. In particular, the merge check and "unsaved" are derived from the draft store and the queries, not mirrored into component state.

### Bridge contract

Floor: Decaid v0.8.0. No upstream change is needed.

| Purpose | Request | What the Skin relies on |
|---|---|---|
| Read the library | `GET /api/v1/profiles?includeHidden=true` | Includes hidden and deleted records. The Skin classifies them. Cheap to refetch, because it supports `ETag`. |
| Read the **Bundled** manifest | `GET /api/v1/profiles/defaults` | Used only to spot retired records. |
| Read the version | `GET /api/v1/info` | `version`, read once per **Bridge** origin. |
| Create | `POST /api/v1/profiles` with `profile`, `parentId`, `metadata` | Returns 201 even on a dedup, with the existing record unchanged. |
| Change title, author, or notes | `PUT /api/v1/profiles/{id}` with the complete `profile` and no `metadata` key | A full replace. Keeps the id, `parentId`, `createdAt`, visibility, and `metadata`. A **Bundled** record answers 400. |
| Change visibility | `PUT /api/v1/profiles/{id}/visibility` | `visible` or `hidden`. Bumps `updatedAt`. |
| Remove | `DELETE /api/v1/profiles/{id}` | Hides a **Bundled Profile**, and soft-deletes anything else. |
| Load | `PUT /api/v1/workflow` with only the complete `profile` | Merges, and replaces `steps` whole. Uploads immediately, with no idle check. |
| Import | The Visualizer plugin's existing import route | One `POST` to the library. Nothing is loaded into the **Workflow**. The result carries the stored record in `workflowResult`. |

Never used: a `PUT` that changes what the machine runs, `/lineage`, purge, and `POST …/restore/{filename}`. The Skin never computes ids, because Dart writes `93.0` where JS writes `93`.

"Not found" arrives as 404, 400, or 500, depending on the endpoint. Any of these on a removal or restore reads as "already removed elsewhere": Cockpit refetches and says "*House* was already removed".

### Classifying records

*From [What does Save do to a profile and its lineage?](issues/06-save-semantics-and-lineage.md), [How does the operator delete, hide, and restore profiles?](issues/11-delete-hide-restore.md), and [How is Profile Lineage shown and navigated?](issues/13-lineage-view.md)*

Checked in this order:

1. `visible`: in the Library.
2. `deleted`: a **Removed Profile**.
3. `hidden`:
   - **Retired** when it's a **Bundled** record and either its `metadata.filename` is gone from `/defaults`, or a **Bundled** record with the same filename was created after it (`createdAt`). Retired takes precedence over Superseded.
   - **Superseded** when it carries the revision marker, or one of its children does.
   - Otherwise a **Removed Profile**: a **Bundled Profile** the operator hid, or anything another app hid.

The **revision marker** is a namespaced key in `metadata`, written in the same `POST` and never edited. New records carry only that key, and Cockpit never rewrites anyone else's `metadata`. A **Profile Fork** is a non-**Bundled** record with a `parentId` and no marker. **Bridge** links between **Bundled** records (Adaptive v3 → v2) aren't Forks, and they aren't shown.

### Library list and detail

*From [Where does profile authoring live in the app, and what are its entry points?](issues/09-app-placement-and-entry-points.md). Prototype on branch `prototype/app-placement`, Variant B.*

- **Layout**: a list column of about 340px, and the detail pane in the rest of the width. The strip sits above both segments, and shows ● title, the badge, and **Edit loaded**. Shot setup moves across unchanged.
- **Chips** filter on the stored `beverage_type` as it is. "Other" is anything that isn't espresso or pourover. All is the default, and there's no search box.
- **List header**: **+ New** and **Import**. Import opens a small dialog with the share-code field.
- **Nesting**: a Fork nests under the visible version of the profile it was copied from, indented with ↳, following Revision edges up from its parent and down to the visible record. Its meta line still reads "Copy of *House*". It drops to the top level when that profile has no visible version, or the chip hides it.
- **Row badges**: **Yours**, **Draft**, and **Same title**. Titles truncate before badges.
- **Detail header badges**: **Bundled** or **Yours**, **Loaded**, **Differs from saved**, and **Draft**.
- **Meta line**: author · beverage type · **Step** count · origin ("Copy of House", "Revised from Bundled").
- **Action bar**: **Use**, **Edit**, **Duplicate**, **History**, and ⋯ (Hide or Delete).
- **The selection, chip, segment, and open History** are UI state in a store, not in the URL.

### The Active Profile link

*From [How does editing relate to the Active Profile and the dial-in loop?](issues/07-active-profile-and-dial-in-loop.md) and [What happens when two visible profiles share a title?](issues/16-duplicate-visible-titles.md)*

- The **Active Profile** belongs to the visible profile with the same title. Hidden, deleted, and Superseded records don't count.
- With two or more matches, it links to the one with the fewest changes from the **Workflow** copy, counted as lines of the change summary. Ties go to Yours over **Bundled**, then to the latest `createdAt`.
- The link is derived, never stored. Right after a Use the match is exact, so the link follows the last Use, and Brew-temperature drift doesn't move it.
- With no match there's no saved version: the strip reads "Not saved", Save creates a new profile, and Revert to saved isn't offered.
- The link decides the Loaded dot and badge, "Differs from saved", Edit loaded, Revert to saved, and which record Save on the loaded profile supersedes. "A different profile" in the replace confirm means a different record from the linked one.
- "Differs from saved" compares only what the machine runs.

### Save

*From [What does Save do to a profile and its lineage?](issues/06-save-semantics-and-lineage.md), refined by [Which fields does the editor expose, and what limits does the Skin enforce?](issues/08-field-coverage-and-limits.md). Why Save doesn't overwrite is in [ADR 0003](../../docs/adr/0003-save-makes-a-profile-revision.md).*

**What the machine runs** means the **Steps**, beverage type, tank preheat, stop at volume, and preinfusion boundary: every field the **Bridge** hashes into the id, apart from `target_weight` and `version`, which the editor never changes. "Changed" means the draft differs from its source, not that a field was touched.

| Draft | Change | Requests |
|---|---|---|
| Edit | What the machine runs | **Profile Revision**: `POST` with `parentId` and the marker, then set the source `hidden`. The title carries over unless renamed. |
| Edit | Only title, author, or notes | `PUT` in place. Locked on a **Bundled Profile** until something the machine runs has changed. |
| Fork (Duplicate, Save as new) | What the machine runs | `POST` with `parentId`, no marker. The source stays visible. Disabled otherwise: "A copy must change how the profile runs". |
| New, or Edit loaded with no saved version | Anything | `POST` with no parent. |
| Edit whose source was removed | Anything | Saves as a Fork of the removed record. The strip reads "*House* was removed. Save makes a new profile." |

- **Partial failure**: if the hide fails, retry once, then report that both versions are now visible. Nothing repairs this automatically.
- **Collisions** are read from the `POST`'s response, never checked before it. A returned record that predates the save, or whose title or `parentId` doesn't match what was sent, means the **Bridge** deduped and wrote nothing. Cockpit skips the hide and the **Workflow** write, and keeps the draft open and unsaved:
  - a visible record: "Identical to *X*", offering to open it;
  - a **Superseded Profile** in this lineage: "Same as the version from *time* · Go back" (or Go back & use);
  - a hidden or deleted record: "Identical to *X* (deleted)", offering Restore.
- **After a Save**, the editor stays open, the base moves to what was written, the draft's source moves to the new record, and the Library selection moves there too.
- **On the loaded profile**, Save writes the saved content into the **Workflow** after the library write, title-only Saves included. If that write fails, the library save stands, and the error says the profile wasn't loaded. **Save & use** does the same for another profile. Any other Save leaves the **Workflow** alone.

### Titles

*From [What does Save do to a profile and its lineage?](issues/06-save-semantics-and-lineage.md) and [What happens when two visible profiles share a title?](issues/16-duplicate-visible-titles.md)*

- **One comparison everywhere**: trimmed, ignoring letter case. Titles and **Step** names are trimmed when saved.
- **A title can't be empty.**
- **Save is blocked only when it would create a new clash.** Keeping the title the profile already has is always allowed. Renaming onto a title another visible profile holds is blocked, and so is a Fork or New with a taken title: an inline message, and no auto-suffix on a title the operator typed. Removed and Superseded records don't count.
- **Default titles**: "*title* copy", then "*title* copy 2"; "New profile", then "New profile 2".
- **Clashes Cockpit can't prevent** are tolerated: a **Bridge** update that re-ships a **Bundled Profile** the operator revised, another app, and existing data. Cockpit never renames or hides on load. For these:
  - both rows get a **Same title** badge;
  - the detail pane says "Another profile is titled *X*. Shots of both are filed under one name.", with the other profile's name linking to it;
  - the fix is **Rename** on the operator's own profile, which opens the editor's title sheet (the draft guard applies if another draft is waiting), or **Hide** on a **Bundled** one;
  - the strip shows the linked profile's origin ("● Londonium · Bundled") only while its title is shared;
  - when both are Yours, the save date in the meta line tells them apart;
  - the editor's strip shows the same note, without blocking Save.

### Workflow writes and the busy gate

*From [How does editing relate to the Active Profile and the dial-in loop?](issues/07-active-profile-and-dial-in-loop.md)*

- **Use for next shot** writes the draft into the **Workflow** only. It keeps the saved title, since title changes land only through Save; a Fork or New draft has no saved title, so it uses the draft's. The trial stays until saved, reverted, or replaced.
- **Revert to saved** (loaded profile only) resets the draft to the library version, and writes that version to the **Workflow** if the copy differs. One visible tap.
- **The replace confirm**: any action that loads a different record, if the loaded profile differs from its saved version or has none, first asks "*Title* has unsaved changes. Loading another profile discards them." with **Discard and load** or **Cancel**. Cancel writes nothing. A replaced trial isn't kept.
- **The busy gate**: Use, Use for next shot, Save on the loaded profile, Save & use, Revert to saved when it would write the **Workflow**, and Go back & use are disabled with "Available when the shot ends". Cockpit doesn't queue writes.
  - **Running**, from the state the **Bridge** reports: `espresso`, `skipStep`, `steam`, `steamRinse`, `hotWater`, `flush`, `cleaning`, `descaling`, `airPurge`, `calibration`, `selfTest`, `fwUpgrade`.
  - **Free**: `idle` in any substate, `schedIdle`, `heating`, `preheating`, `sleeping`, and no machine connected.
  - **Unknown**: `booting`, `busy`, `needsWater`, and `error` are disabled, the safe side.
  - **Always available**: opening the editor, editing, saving profiles that aren't loaded, and every other library action.
- **`target_weight`** is hidden and copied unchanged. **Yield** stays `context.targetYield`.

### Profile Draft

*From [What happens to a Profile Draft when the operator leaves the editor?](issues/10-draft-lifecycle.md)*

The draft is one persisted store on the tablet, never on the **Bridge**. Its key follows the existing naming. The store is versioned, and a stored draft the new build can't read is dropped with a one-time notice: "A draft from an earlier version of Cockpit couldn't be restored."

```ts
// Adapted from the step-editor prototype's draft store, with the fields the lifecycle decision added.
type StoredProfileDraft = {
  kind: "edit" | "new" | "fork";
  source: { recordId: string; title: string } | null; // null for New, or Edit loaded with no saved version
  base: WorkflowProfile; // what it was seeded from, or last wrote
  draft: WorkflowProfile; // the complete profile, as the Bridge returned it
  stepKeys: string[]; // stable per-Step keys, so edits follow a Step through a reorder
  modeMemo: Record<StepKey, Partial<Record<"pressure" | "flow", { target: number; limiter: unknown }>>>;
  lastExit: Record<StepKey, { type: "pressure" | "flow"; condition: "over" | "under"; value: number }>;
  lastLimiter: Record<StepKey, { value: number; range: number }>;
  selectedStepKey: string;
};
```

- **The base by entry point**: Edit uses the library record. Edit loaded uses the **Workflow** copy. + New uses the one-**Step** seed. Duplicate and Save as new use the source, retitled.
- **The draft is of the loaded profile** when its source is the record the **Active Profile** links to. Opening the same profile resumes its draft.
- **The editor route names no profile.** It shows the current draft, and falls back to the Library when there's none.
- **Unsaved changes** means the draft differs from its base. A clean draft stays stored, but nothing flags or guards it. The chip, badges, Resume, and "✎ DRAFT" show only while it's unsaved.
- **Finding it**: the chip "✎ *Title* · Resume" in the strip. When the draft is of the loaded profile, there's no separate chip: a **Draft** badge sits beside the title and **Edit loaded** reads **Resume**. Any profile's unsaved draft triggers the Brew label.
- **The guard**: the draft is replaced only by opening a different profile in the editor (Edit, Edit loaded, Duplicate, + New). A dirty draft first asks "*Title* has unsaved changes. Opening *Other* discards them." with **Discard and open** or **Cancel**. Loading another profile doesn't touch the draft; if the draft was of the replaced profile, its source becomes the library record and the merge applies.
- **How it ends**: Save and Save & use move the base to what was written. Use for next shot moves the base to the **Workflow** copy. Save as new writes nothing, and turns the draft into a Fork draft titled "*title* copy", edits kept. A collision moves nothing. Revert to saved works as above. **Discard changes**, shown only while unsaved, resets the draft to its base in one tap. There's no expiry.
- **Changes made elsewhere**: the source is the **Workflow** copy while the profile is loaded, the library record otherwise, and nothing for New. It's checked whenever the editor shows the draft, on Resume, and on every **Workflow** or library refetch while the editor is open. There's no new polling.
  - **A three-way merge** of base, draft, and source runs field by field, over profile-level fields and every **Step** field. A field only the source changed takes the source's value. A field only the draft changed keeps the draft's. The base then moves to the source, with the note "Updated with changes made outside the editor."
  - **Steps line up** by the draft's keys. Base and source line up by index, since nothing outside the editor reorders **Steps**.
  - **An overlap** is the same field changed on both sides to different values, or a **Step**-count change in the source. It shows "*Title* changed since you started editing", with **Start over from current** (reseed from the source) and **Keep my edits** (the base moves to the source, so the next write replaces the other change).
  - **A source revised elsewhere** merges against the newest visible Revision in its lineage. **A source gone** keeps the edits, and Save follows the table above.

### Fields and limits

*From [Which fields does the editor expose, and what limits does the Skin enforce?](issues/08-field-coverage-and-limits.md) and [How are numbers entered on the tablet without the soft keyboard?](issues/05-numeric-input-on-tablet.md). Prototype on branch `prototype/numeric-input`, Variant C.*

The **Skin** owns every limit. They don't depend on the machine, so the editor works with none connected, and a profile saved on one machine can't wrap on another.

| Value | Range | Fine step | Coarse step |
|---|---|---|---|
| Pressure: target, exit, cap | 0–12 bar | 0.1 | 0.5 |
| Flow: target, exit, cap | 0–15.9 mL/s | 0.1 | 0.5 |
| Temperature | 0–105 °C | 0.5 | 1 |
| Max time | 0–127 s, 0 shown as **Instant** | 0.1 below 12.75 s, then 1 | 1 |
| Max volume | 0–1023 mL, 0 = **Off** | 1 | 10 |
| Weight exit | 0–1000 g, 0 = **Off** | 0.1 | 1 |
| Exit value, cap value, limiter range (when on) | 0.1 up to that axis's ceiling; range starts at 0.6 | 0.1 | 0.5 |
| Tank preheat | 0–45 °C, whole degrees, 0 = **Off** | 1 | 1 |
| Stop at volume | 0–2000 mL, whole mL, 0 = **Off** | 1 | 10 |
| Preinfusion boundary | 0 to the number of **Steps** | one **Step** | — |
| **Steps** per profile | 1–20 | — | — |

```ts
// Shape from the step-editor prototype. Its wrap rules are replaced by the table below.
type FieldSpec = {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number | ((value: number) => number);
  coarseStep: number;
  digits: number;
  zeroLabel?: string; // shown at 0 where 0 means off
  encode?: (value: number) => number; // what the DE1 runs; absent when the value isn't encoded
};
```

**Flags on stored values** (nothing is clamped on load; a value changes only when the ruler moves on it, and then snaps into range):

| Flag | When | Effect |
|---|---|---|
| **Blocking** | Pressure, flow, exit, cap, or range ≥ 15.97 or ≤ −0.094. Temperature ≥ 127.75 or negative. Volume ≥ 1024. Negative seconds. More than 20 **Steps**. | The field shows what would run ("Runs as 0 bar"). Save and Use for next shot are disabled, with the reason. |
| **Warning** | Outside the ranges above but short of wrapping: 13 bar, 108 °C, a 1200 g weight exit, seconds above 127 (the **Bridge** clamps these). Also an exit value of 0 ("fires at once" or "never fires"), and a preinfusion boundary past the last **Step**. | A note on the field. Saving is allowed. |

**Exits and limiters**

- **Move on if** is one five-way choice: Off, pressure over, pressure under, flow over, flow under. **Off** omits `exit` and never writes 0.
- **A limiter** is on or off per **Step**. Off is saved as `null`, except that a limiter that was off when loaded (stored as missing, or as value 0) keeps that exact form, so undoing leaves no change.
- **The last value is remembered** while the draft is open, across turning off and on and across exit type.

**Pump mode**: each **Step** keeps one pair per mode: the pressure target with its flow cap, and the flow target with its pressure cap. A mode not yet used in this draft starts at 9.0 bar or 2.0 mL/s, with the cap Off. The pairs exist only in the draft, because the **Bridge** keeps only the active mode's target.

**Preinfusion boundary**: a **Step** added or duplicated before the first Pour **Step** joins Preinfusion. Deleting a Preinfusion **Step** shrinks it by one. Deleting a Pour **Step** leaves it as it is. Moving a **Step** keeps the count, and the **Step** changes sides if it crosses the divider.

**Precision and display**

- A ruler edit stores the value at its grid step, rounded to the field's decimals. **Untouched values are saved exactly as stored**, off-grid ones included.
- A stored value shows as many decimals as it has, up to 3. Grid values use the field's normal precision.
- The DE1 "machine" hint shows whenever the machine would run something different (92.3 → "machine 92.5").
- Units are fixed: bar, mL/s, °C, s, mL, g.

**New profile**: titled as above, Espresso, tank preheat Off, stop at volume Off, preinfusion boundary 0, author empty, `target_weight` 0, `version` "2". One **Step**, named "Step 1": pressure 9.0 bar, 93 °C at the coffee sensor, fast transition, max time 30 s, with limiter, exit, volume, and weight Off.

**Add after** copies the selected **Step**'s pump mode, targets, temperature, and sensor. It's a fast transition, max time 10 s, volume and weight Off, no limiter or exit, and a blank name.

**Full gateway mode**: when the **Bridge** reports `gatewayMode: "full"`, one line sits under the weight exit: "The Bridge doesn't run weight exits in Full gateway mode." Cockpit reads the mode and never sets it.

**Round trip**: every write, to the library or the **Workflow**, sends the complete profile. Nothing is re-derived or normalised.

### Ruler

*From [How are numbers entered on the tablet without the soft keyboard?](issues/05-numeric-input-on-tablet.md)*

- It's a strip along the bottom of the editor, bound to the selected field. Dragging moves one fine step per 14px tick, with snapping.
- The rail's ends are press-and-hold ± buttons that move by the coarse step, with hold-to-repeat acceleration.
- Labels sit at a "nice" multiple of the coarse step at least 70px apart, and whole numbers drop the ".0". Ticks are tiered: tall for labelled values, medium for coarse steps, short for fine steps.
- Out-of-range ticks render dimmed, and the value clamps at the limits.
- Edits land in the **Profile Draft**, never on the machine. There's no keypad, no sliders, and no chart dragging.

### Editor layout

*From [How does the step editor lay out at 1024×600?](issues/12-step-editor-layout.md). Prototype on branch `prototype/step-editor-layout`, Variant A.*

Top to bottom at 1024×600:

- **Header, about 52px**. Left: **← Library**, **Brew**, then the title ✎ with its badges (New, Copy, or Editing; Loaded; Differs from saved; Bundled; Draft). Right: at most five actions, Save last and highlighted, from **Revert to saved** (loaded only), **Discard changes** (while unsaved), **Save as new**, **Use for next shot**, **Save & use** (other profiles only), and **Save**.
- **Message strip**, about 22px per line, plus about 44px for the banner. One line per message, in this order: the overlap banner, machine busy, the merge note, the source-removed line, then why Save or Use for next shot is disabled. The clash note and the older-**Bridge** state also go here.
- **Body**: the **Step** list (236px) and the panel (the rest of the width).
- **Ruler, about 116px.**

**Step list**

- The first row is Profile settings, which swaps the panel to the profile fields.
- One 40px row per **Step**: the number, the name or "Step N", a flag dot (red blocking, amber warning), and the goal in short ("F 4.0 mL/s", "P 8.5 bar"). The selected row has an amber left bar and a tinted background.
- The Preinfusion | Pour divider is a row with ▲ and ▼. It sits above Step 1 when there's no preinfusion.
- The list scrolls vertically past about 7 rows.
- The foot holds five 40px icon buttons acting on the selected **Step**: Add after, Duplicate, Move up, Move down, and Delete. Reasons for disabled ones sit underneath. Delete acts at once with a toast ("Deleted *Fill* · Undo").

**Panel**

- **Step chart**, about 108px tall and full panel width. New code, not `workflow-frame-chart`. One equal-width column per **Step**, at least 44px wide, showing the number, name, and flag dot. The target jumps on a fast transition and ramps on a smooth one. The cap is dashed, and temperature is a thin line on a 75–105 °C scale. A caption gives the goal and how the **Step** ends ("F4 P>3", "P8.5 6s"). Preinfusion columns are tinted and the boundary is a blue line. The selected column is amber. Tapping selects.
- **Step heading**: "Step 1 of 4 · *Fill* ✎". Tapping opens the name's text sheet.
- **Four groups in four columns**, at roughly 0.8 : 1.3 : 0.9 : 1:
  - **Temperature**: the temperature tile, then Coffee | Water.
  - **Goal**: Pressure | Flow and Fast | Smooth, the target tile, then No limit | Max flow (Max pressure on a flow **Step**). When on, cap and Range tiles appear below.
  - **Stop after**: Max time, Max volume, and Weight tiles.
  - **Move on if**: Off | Pressure | Flow. When set, Over | Under and the value tile appear below. When off: "Runs until a Stop after limit."
- **Value tiles** are at least 44px tall. The bound tile has an amber border. Toggles use normal case at 0.72rem. The panel scrolls by about one tile when the banner shows.
- **Profile settings**: beverage type as a five-way choice (Espresso, Pour-over, Manual, Cleaning, Calibrate), Tank preheat and Stop at volume tiles (Stop at volume labelled "Used only without a scale"), and Author and Notes rows. `target_weight` and `version` are hidden and saved unchanged.

**Text sheet**: one sheet for the title, **Step** name, author, and notes, anchored to the top of the screen. There's no length limit; lists truncate with an ellipsis.

### History

*From [How is Profile Lineage shown and navigated?](issues/13-lineage-view.md). Prototype on branch `prototype/lineage-view`, Variant A.*

- **Opening**: from History in the detail pane or the Removed list's detail pane. It takes over the list column, with the top row "← Profiles · History of *House*". The chips are hidden while it shows. ← Profiles returns with the current version selected.
- **Built from the library**, following `parentId` from `?includeHidden=true`, with a visited set so a cycle or a missing parent ends the walk.
- **What it lists**: the records joined by Revision edges, branches included, newest first by `createdAt`. Title and notes edits never appear as versions.
- **Each row** is at least 52px tall: date and time; badges (**Current**, **Bundled**, **Retired**, **Removed**); and one line of what that save changed. The first version reads "First version", and a **Bundled** original reads "Bundled original".
- **Copies** sit under their version: "↳ Copied to *House decaf* ›", which selects that Fork in the Library.
- **The origin** closes the list: "Created 2 Sep", "Copied from *House*, version of 12 Oct" (opens that History), or "Bundled with the Bridge as *Londonium*".
- **Detail pane**: the version's stored title, badges, and a meta line ("Saved 12 Oct, 07:40 · 3 Steps"); `workflow-frame-chart`; and a change list of about 250px beside it, switching between **What this save changed** (default) and **Going back changes** (disabled on the current version).
- **The change summary**: one field per line ("Pour · target 8.5 bar → 9 bar", "Added Step 4 Decline", "Tank preheat 0 → 40"). **Steps** match by name, then position. A temperature shift on every **Step** collapses to "Every Step +1 °C". It compares only what the machine runs. Only "against the previous version" and "against the current one" are offered.
- **Actions**: one primary action, **Go back to this version**, or **Go to this version** on a newer one, or **Go back & use** when the profile is loaded.

### Going back

*From [How is Profile Lineage shown and navigated?](issues/13-lineage-view.md) and [What happens when two visible profiles share a title?](issues/16-duplicate-visible-titles.md). [ADR 0004](../../docs/adr/0004-going-back-swaps-visibility.md) records why it swaps.*

Going back writes no new record, and changes only what the machine runs. The sequence:

1. If the version isn't **Bundled** and its title, author, or notes differ from the current version's, a title-only `PUT` copies them onto it. If this fails, stop and say so, with visibility untouched.
2. Set the version `visible`. Un-hide first, so that a failure leaves two versions rather than none.
3. Set the current version `hidden`. If this fails, retry once, then say both versions are now visible.
4. On the loaded profile (**Go back & use**), write the version into the **Workflow**.

- **The toast**: "*House* is back to the version of 12 Oct · Undo", for about 8 seconds. Undo and going forward are the same action in reverse.
- **On the loaded profile**: disabled entirely while the machine is running. With unsaved changes it first asks "*House* has unsaved changes. Going back discards them."
- **A waiting draft** follows the merge rule, since going back is a change made outside the editor.
- **Editing after going back** is ordinary editing. Save makes a Revision of that version, so History branches, each summary against its own parent.
- **A Retired version** can't be gone back to: disabled with "A Bridge update replaced this version". If the **Bridge**'s current version is in the Library (same `metadata.filename`), the detail pane links it: "Current Bundled version: *Gentle and sweet* ›".
- **A Bundled original** can be gone back to. It shows the **Bundled** badge again and its title and notes lock. Its title can't be carried over: if another visible profile holds its title, Go back is disabled with "Another profile is titled *X*". If its title or notes differ from the current version's, **Going back changes** adds a line for them.

### Removing and restoring

*From [How does the operator delete, hide, and restore profiles?](issues/11-delete-hide-restore.md) and [What happens when two visible profiles share a title?](issues/16-duplicate-visible-titles.md)*

- **Hide** on a **Bundled Profile** and **Delete** on anything else, both behind ⋯, both the **Bridge**'s `DELETE`, no confirm. Toasts last about 8 seconds: "Deleted *House* · Undo", "Hid *Londonium* · Undo", and on the loaded profile "Deleted *House* · still loaded for the next shot · Undo". Undo sets the record `visible`. The selection moves to the next row.
- **Library actions stay available while the machine is busy**, since they write only the library.
- **Removed (N)** is a row at the end of the list, shown only while N > 0. It ignores the chips. Tapping it swaps the list column to removed profiles, most recently removed first by `updatedAt`, with "← Profiles" at the top. The detail pane shows the chart, meta line, and notes, with **Restore** and **History**.
- **Restore** sets the record `visible` and returns to the full list with it selected. The toast reads "Restored *House* · Undo".
  - **On a title clash**, a title-only `PUT` first renames it to "*House* (restored)" ("(restored 2)" and so on), and the toast reads "Restored as *House (restored)* · Undo". If the `PUT` fails, nothing is restored and the error says so. Undo removes it again and puts the title back.
  - **A Bundled Profile whose title is taken** can't be restored: disabled with "Another profile is titled *X*. Rename it first", linking that profile.
- **Restore this version** (a removed profile's History) carries the removed profile's current title, author, and notes onto the version, applies the same rename on a clash, sets it `visible`, and moves the removed version from `deleted` to `hidden`, where it counts as Superseded.
- **The Save collision prompt's Restore** is the same action.
- **No purge anywhere.**
- **Removing touches nothing else**: not the lineage, Forks, the **Workflow**, or a waiting draft. The strip reads "Not saved" for a removed loaded profile, and Edit loaded still works. A Fork of a removed profile reads "Copy of *House* (removed)". Restoring a profile reconnects a waiting draft, and the merge applies.
- **Getting a Bundled original back after deleting its Revision**: Removed → History → the **Bundled** original → Restore this version.

### Import

*From [What happens when two visible profiles share a title?](issues/16-duplicate-visible-titles.md)*

- **It stays the existing Visualizer share-code import**, moved into the dialog. Import requires Visualizer to be enabled, as today.
- **A clash**: when the import added a new record and another visible profile holds its title, a title-only `PUT` renames it to "*Title* (imported)" ("(imported 2)" and so on). The message reads "Imported as *Title (imported)*". There's no Undo. If the `PUT` fails, the message says another profile has this title, and the tolerated-clash treatment applies.
- **A dedup adds nothing**, and the message names the returned record: "Already in your library as *X*", or "Already in your library as *X* (removed) · Restore". It's told apart the way a Save collision is: the returned record predates the import, or is **Bundled**, hidden, or deleted.
- **A removed profile's title is free**, so a match only against one isn't a clash.

### Older Bridges

*From [Which Bridge changes does the spec depend on, and how do we ask for them?](issues/14-upstream-bridge-changes.md)*

- **Version**: `version` from `GET /api/v1/info`. Compare the leading `major.minor.patch`, ignoring suffixes (`0.8.8+2900` is 0.8.8, `0.9.0-beta.1` is 0.9.0). If it can't be parsed, editing stays allowed.
- **Below v0.8.0**: browsing, chips, the detail pane, History, the strip, and **Use** still work. New, Edit loaded, Edit, Duplicate, Save, Save as new, Hide, Delete, Restore, Go back, and Import are disabled, not hidden, so the layout doesn't change. One line in the strip reads "Profile editing needs Bridge 0.8.0 or newer · this one runs 0.7.11". A waiting draft stays, with Resume disabled.

### Brew

*From [Does Brew get a shortcut into the editor?](issues/15-brew-shortcut-into-editor.md)*

- **There's no shortcut into the editor.** The top-bar profile button still opens the Library, and the Post-Shot Summary keeps Shots and Done.
- **The button's "PROFILES" label reads "✎ DRAFT"** while any draft has unsaved changes. Same width, same target. It's derived from the draft store.
- **The Post-Shot Summary survives a trip to the editor and back.** The Shot Analysis reading doesn't. Both are today's behaviour, and need no change.

## Testing Decisions

**What makes a good test here**: it exercises external behaviour only. At the browser seam, it asserts what the operator sees and what the fake **Bridge** ended up holding. At the core seam, it feeds in **Bridge**-shaped records and asserts what comes out. Neither reaches into store internals, component structure, or request order, except where the request order is the behaviour under test (see the partial-failure cases).

**Two seams, and no others.**

### Seam 1: the browser against the fake Bridge (existing)

Playwright at `tablet-7-landscape`, driving the repo's fake gateway. Prior art: the existing specs and their fixtures for overflow, bottom-nav reachability, and app errors, plus scenario loading and the `/__control` state endpoints.

- **The fake gains a faithful in-memory model of the profile API**: ids hashed over what the machine runs, Step names included; `POST` deduping to the existing record, even a hidden, deleted, or **Bundled** one, and ignoring the new title and `parentId`; a title-only `PUT` updating in place with `createdAt` and `metadata` kept; **Bundled** records answering 400 to any `profile` edit; visibility, soft `DELETE`, and `includeHidden`; `/defaults`; the **Bridge** version in `/info`; `gatewayMode`; and the Visualizer import going through the same `POST` and returning the stored record. Its hash doesn't have to match the real **Bridge**'s, since the **Skin** never computes ids.
- **New scenarios**: a profile with Revisions and Forks; a **Bundled Profile** with a Revision; a **Retired Bundled** version; a same-title clash (Yours and **Bundled**); a removed profile whose title is taken; a v0.7.11 **Bridge**; a busy machine; `full` gateway mode; and stored values that wrap or warn.
- **One new control**: fail the next matching request, for the partial-failure paths.
- **What it covers**: every flow end to end, including
  - browse, Use, and the replace confirm;
  - New, Edit, Edit loaded, and Duplicate through Save, with what the fake holds asserted afterwards;
  - Revision hiding the source, and in-place title edits;
  - each collision message;
  - Use for next shot, Revert to saved, and the busy gate;
  - the draft surviving a reload, Resume, Discard changes, and the replace confirm;
  - a Brew-temperature change merging into a draft, and an overlap banner;
  - History, Go back with Undo, and Go back & use;
  - Hide, Delete, Undo, Removed, Restore, and Restore this version;
  - the clash rename on Restore and Import, and an import that dedups;
  - Same title rows, and Rename and Hide;
  - the read-only state below v0.8.0;
  - the failed hide after a Save, and a failed `PUT` on Go back and Restore;
  - the ruler changing a value, clamping at a limit, and its ± ends.
- **Layout at 1024×600**: no critical overflow, tap targets at 36px or more, text at 0.66rem or more, and a 20-**Step** profile in the list and chart. Screenshot baselines for the Library, the editor, History, and the Removed list.
- **Smoke**: a small `@smoke` subset, including one Save round trip, stays in `pnpm check`.

### Seam 2: the profile library core (new)

Vitest, pure and table-driven. Prior art: the pure tests of the frame preview, shot history, and shot analysis helpers. Each rule gets its edge cases here rather than in the browser:

- **Classification**: each record state, with Retired over Superseded, deleted always Removed, a hidden record with a marked child, a version gone back from, and a **Bundled** record with a `parentId`.
- **Library rows**: order, chips, Fork nesting through a Superseded parent, top-level Forks, and the Same title flag.
- **History**: branches, Forks, origins, cycle and missing-parent guards, and `createdAt` order after a title `PUT`.
- **Change summary**: fields, added and removed **Steps**, reorder, and the collapsed temperature shift.
- **The Active Profile link**: no match, one match, exact match, drift, trial, ties on both tiebreaks, and letter case.
- **Save classification**: every row of the Save table, undone edits, the limiter's stored forms, and dedup reading.
- **Titles**: trim and case, keeping a clashing title, renaming onto one, Fork and New defaults, and the suffix sequences.
- **Draft**: unsaved against the base, three-way merge, overlaps, a **Step**-count change, a reorder, and reseeding.
- **Fields**: every limit, the wrap and warning boundaries, grid rounding with no float noise, display decimals, machine hints, the pump-mode pairs, the boundary rules on add, delete, and move, and the New and Add after defaults.
- **Version**: parsing, suffixes, the floor, and an unparseable version.

### Not tested separately

- **Component tests mocking the query hooks**: none for the new screens. The existing test for the Choose Profile page goes, along with the frame-preview overlay's, and the browser spec for the Profiles tab is rewritten.
- **Request sequences** in the commands layer: thin, and covered through seam 1's fault injection.

### On the real Bridge

Before calling it done, run one pass on the operator's tablet (Decaid v0.8.8 or newer), since the fake can only model what the research found: a Revision, a title `PUT`, Go back, Restore, an import, and a **Bundled** Revision. Use the existing tablet deploy workflow.

## Out of Scope

- **Import and export of profile JSON**, and **sharing or uploading edited profiles to Visualizer**. The existing share-code import stays.
- **Parametric editors**: de1app-style basic pressure or flow, D-Flow, and A-Flow generators.
- **Remembering dose and yield per profile.** That's a **Workflow** feature.
- **Gating the dashboard's own Workflow writes** (dose, yield, Brew temperature) while the machine is busy. It's a separate fix.
- **The dashboard's Brew temperature control pushing Step temperatures past the wrap point.** It's a separate fix. The editor flags such values.
- **Bengle-specific behaviour**: a default flow cap, higher ceilings, and machine hints at 1/10 precision.
- **Bulk edits across Steps.**
- **Profile-aware Shot Analysis**: recommending **Step** changes, or linking into the editor.
- **A shortcut from Brew into the editor.**
- **Filing the upstream asks** isn't part of building this. The drafts wait in [upstream-asks/](./upstream-asks/README.md) for the operator, and nothing here depends on them. Each workaround can be swapped for the **Bridge**'s fix once it lands.

## Further Notes

**The decisions behind this spec** live in the map's Decisions so far, one ticket per decision. Each ticket holds what was rejected and why. When this spec and a ticket disagree, this spec wins, because it includes later refinements.

**Prototypes are for reference, not for merging.** Branches: `prototype/numeric-input`, `prototype/app-placement`, `prototype/step-editor-layout`, `prototype/lineage-view`. Where a prototype and this spec differ, follow this spec. For example, the Library prototype links by title alone, and the step-editor prototype's wrap rules are looser than the table above.

**Calls made while writing this spec** that no ticket settled. They're easy to reverse, and worth a look before implementation:

1. **One title comparison** (trimmed, ignoring case) everywhere, including the **Active Profile** link. Tickets 07 and 16 say "same title", and ticket 08 says titles clash ignoring case.
2. **"Loads a different profile"** means a different record from the linked one, not a different title. Otherwise **Use** on a same-title row wouldn't ask first.
3. **"Differs from saved" compares only what the machine runs**, so a notes difference doesn't raise it.
4. **Going back to a Bundled original** adds a line to Going back changes when its title or notes differ, since those can't carry over. Ticket 16 says the list has only what the machine runs, which holds for every other version.
5. **Go back's `PUT` is skipped** when there's nothing to copy.
6. **Every Restore gets a toast with Undo.** Ticket 11 specified a toast only on a clash, and ticket 16 added Undo to the rename.
7. **A failed rename after an Import** leaves the clash and says so. The import has already happened.
8. **Import is disabled below v0.8.0**, in line with `CONTEXT.md`'s read-only Library. Ticket 14's lists don't mention it.
9. **`booting`, `busy`, `needsWater`, and `error` stay on the disabled side of the busy gate**, as ticket 07 suggested pending this spec.
10. **New records' `metadata` holds only the revision marker, Forks carry no marker, and a Bundled record with a `parentId` isn't a Fork.** Ticket 06 left the Fork marker open.
11. **A failed Workflow write after a successful library Save** leaves the save standing, and the error says the profile wasn't loaded.
12. **A Fork whose parent is hidden by a chip** shows at the top level.
13. **Wrap thresholds come from the field research rather than the prototype**: pressure wraps at ≥ 15.97, not ≥ 16; seconds above 127 are a warning, because the **Bridge** clamps them; and negative seconds block.

**Suggested order**, for cutting tickets: the fake **Bridge** and REST additions; the core; the read-only Library, retiring the chooser; the draft store and editor shell; fields and ruler; Save; Workflow actions and the busy gate; History and Go back; Removed and Restore; clash handling; the older-**Bridge** state and the Brew label.

**The tablet** is the reference environment: Decaid v0.8.8, a DE1Pro, `tracking` gateway mode, 74 visible profiles at last count, with "Extractamundo Dos!" already a tolerated clash. See [Does the tablet's Bridge expose the profile write endpoints?](issues/04-tablet-bridge-endpoints.md) for the probe script and reports.
