# What does Save do to a profile and its lineage?

Type: grilling
Status: open
Blocked by: 01
Map: [Profile authoring in Cockpit](../map.md)

## Question

When the operator saves a **Profile Draft**, what happens in the **Profile Library**? The Bridge gives profiles content-hash ids, replaces the record atomically when execution fields change, and tracks a `parentId` chain. Within that, decide:

- **Editing an operator-created profile**: replace it in place (`PUT`, new hash id, old record gone), or create a child version (`POST` with `parentId`, old record kept)? Or offer both ("Save" vs "Save as new")?
- **Editing a Bundled Profile**: its **Steps** can't be edited in place, so is it forked automatically on save? What is the copy called?
- **Metadata-only edits** (title, notes): do they behave differently?
- **Library list**: does it show every version, or only the latest of each **Profile Lineage**?
- **Collisions**: what happens when a save would produce content identical to an existing profile (same hash id)?

## Context from research

From [What does the Bridge's profile write API accept…](01-bridge-profile-write-api.md):

- **`PUT` with an execution change** moves the record to a new id and **orphans its children**. In-place edits and Profile Lineage don't mix without an upstream Bridge change.
- **Step names are execution fields**, so renaming a Step changes the id.
- **`POST` dedups silently.** Content identical to an existing record (even a deleted, hidden, or Bundled one) returns that record, and the new title, notes, and `parentId` are ignored. So "Duplicate" can't produce an unmodified renamed copy, and Bundled Profiles can't be renamed or annotated.
- **A `PUT` that collides with existing content** returns 400 and changes nothing.

## Comments

**2026-10-15 — claimed.** Grilling session in progress on branch `t3/wayfinder-06-save-semantics`.
