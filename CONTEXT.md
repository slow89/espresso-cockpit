# Espresso Cockpit

Espresso Cockpit is a Streamline Bridge skin for machine-side espresso operation on a tablet.

## Language

**Skin**:
A tablet-first web UI that presents and requests Streamline Bridge behavior without owning machine, device, readiness, or deployment policy.
_Avoid_: Client, cockpit-as-role

**Bridge**:
The Streamline Bridge runtime that owns machine communication, device connection policy, readiness signals, display behavior, presence behavior, and Skin installation.
_Avoid_: Gateway, except when naming URLs, environment variables, endpoints, or existing code identifiers

**Bridge Stream**:
A live WebSocket feed from the **Bridge** that reports machine, device, scale, display, water, or plugin state to the **Skin**.
_Avoid_: Generic socket

**Shot**:
A single espresso extraction captured by the **Bridge** with machine measurements, scale measurements when available, and workflow context.
_Avoid_: Generic run

**Post-Shot Summary**:
An in-place Brew dashboard state for reviewing the just-finished **Shot** before returning to prep controls or opening shot history.
_Avoid_: Separate summary route, history detail page

**Meaningful Extraction**:
A **Shot** with at least five seconds of espresso telemetry, making it worth reviewing after it finishes.
_Avoid_: Accidental shot prep, aborted warmup blip

**Preferred Scale**:
The scale remembered by the Bridge for automatic scale reconnection.
_Avoid_: Skin-managed saved scale

**Preferred Scale Reconnect**:
A Bridge-owned behavior that reconnects the **Preferred Scale** whenever the machine and scale become available in either order, including after the scale temporarily powers off and returns.
_Avoid_: Skin auto-scan loop

**Compatibility Reconnect Adapter**:
A temporary Skin adapter that asks the Bridge to scan with connect enabled while **Preferred Scale Reconnect** is not fully Bridge-owned.
_Avoid_: Reimplementing device selection or preferred-device policy

**Disconnect Scale**:
A temporary action that disconnects the current scale without changing the **Preferred Scale**.
_Avoid_: Forget scale

**Forget Scale**:
A deliberate action that clears the **Preferred Scale**.
_Avoid_: Disconnect scale

**Cockpit**:
The branded name of this Skin.
_Avoid_: Treating Cockpit as a separate architectural role from Skin

**Shot Analysis**:
An on-demand, LLM-generated reading of the just-finished **Shot** — a short diagnosis of the telemetry plus one primary dial-in adjustment with rationale — requested from the **Post-Shot Summary**.
_Avoid_: Auto-applied machine changes, multi-variable adjustment lists

**Taste Compass**:
An optional set of three quick tap scales the operator can give before requesting a **Shot Analysis**: extraction (too sour ↔ balanced ↔ too bitter), strength (weak ↔ right ↔ harsh), and body (thin ↔ right ↔ heavy).
_Avoid_: "Acidity" as an input label (ambiguous between pleasant brightness and under-extraction sourness)

**Profile**:
A named, ordered list of **Steps** plus profile-level settings (beverage type, tank preheat, stop at volume, and where preinfusion ends) that the machine runs during a **Shot**.
_Avoid_: Recipe (that is dose and yield), program

**Step**:
One segment of a **Profile** with its own pump mode (pressure or flow), target, temperature, transition, exit conditions, limiter, and weight exit.
_Avoid_: Frame, except for the machine's runtime index of the running **Step**

**Workflow**:
The **Bridge**'s current brewing setup: the **Active Profile** plus dose and yield, grinder and coffee context, and steam, hot water, and rinse settings.
_Avoid_: Recipe, preset

**Active Profile**:
The copy of a **Profile** embedded in the **Workflow** that the next **Shot** will run.
_Avoid_: Selected profile, current library profile

**Profile Library**:
The **Bridge**-owned collection of saved **Profiles**, including **Bundled Profiles** and operator-created ones.
_Avoid_: Skin-local profiles, profile cache

**Bundled Profile**:
A **Profile** shipped with the **Bridge** whose **Steps** cannot be edited in place.
_Avoid_: Default profile

**Profile Lineage**:
The parent and child chain of **Profiles** saved from one another in the **Profile Library**.
_Avoid_: Profile version (ambiguous with the profile format version)

**Profile Draft**:
An unsaved, in-progress edit of a **Profile**, held by the **Skin** or loaded into the **Workflow**, until it is saved to the **Profile Library**.
_Avoid_: Pending profile, temp profile

**Profile Revision**:
A **Profile** saved from another to replace it in the **Profile Library**.
_Avoid_: Profile version, edit, overwrite

**Superseded Profile**:
A **Profile** that a **Profile Revision** has replaced, kept only as part of its **Profile Lineage**.
_Avoid_: Retired profile (the **Bridge** retires **Bundled Profiles**), old version, hidden profile

**Profile Fork**:
A **Profile** saved from another as a separate profile that sits beside it in the **Profile Library**.
_Avoid_: Copy, branch, duplicate (as a noun)

**Removed Profile**:
A **Profile** the operator took out of the **Profile Library** list, by hiding a **Bundled Profile** or deleting any other **Profile**, and can restore.
_Avoid_: Trash, archived profile, hidden profile (as the general term)

**Retired Bundled Profile**:
An older version of a **Bundled Profile** that the **Bridge** hid because a **Bridge** update changed or dropped it.
_Avoid_: Removed profile, superseded profile, stale default

## Relationships

- A **Skin** talks to exactly one **Bridge** origin at a time.
- A **Skin** observes **Bridge Streams** from its current **Bridge**.
- **Cockpit** is a **Skin**.
- A **Shot** is recorded by the **Bridge**.
- A **Post-Shot Summary** presents exactly one just-finished **Shot** in the **Skin**.
- A **Post-Shot Summary** appears immediately when a **Shot** finishes.
- A **Post-Shot Summary** appears only for a **Meaningful Extraction**.
- A **Post-Shot Summary** remains visible until the operator dismisses it, starts another **Shot**, or navigates away.
- A v1 **Post-Shot Summary** shows only local shot facts: recipe/profile, duration, final yield, actual ratio, target dose/yield, and telemetry.
- A v1 **Post-Shot Summary** is read-only and does not write annotations or derived analysis back to the **Bridge**.
- A v1 **Post-Shot Summary** is a tablet Brew dashboard behavior.
- A v1 **Post-Shot Summary** can open shot history only after the **Bridge** exposes the persisted **Shot** identifier.
- A v1 **Post-Shot Summary** freezes the completed **Shot** telemetry instead of following the live telemetry buffer after the machine returns to idle.
- A **Post-Shot Summary** keeps the frozen **Shot** telemetry chart on screen and replaces the prep controls until it is dismissed.
- A v1 **Post-Shot Summary** may be shown before its **Bridge**-persisted **Shot** identifier is known.
- A v1 **Post-Shot Summary** does not show placeholder analysis or recommendation content.
- The **Bridge** owns machine, device, readiness, display, presence, and Skin installation policy.
- The **Bridge** owns **Preferred Scale Reconnect** for the **Preferred Scale**.
- The **Compatibility Reconnect Adapter** may exist only while **Preferred Scale Reconnect** is missing from the **Bridge**.
- **Disconnect Scale** does not change the **Preferred Scale**.
- **Forget Scale** clears the **Preferred Scale**.
- A **Shot Analysis** consumes the Skin's frozen local **Shot** telemetry and shot facts, not the Visualizer record.
- A **Shot Analysis** is requested by the Skin directly from the LLM provider; the **Bridge** is not involved.
- A **Shot Analysis** runs only when the operator asks for it, never automatically.
- A **Shot Analysis** may include the **Taste Compass** when the operator has tapped any of its scales.
- The **Taste Compass** is always optional; a **Shot Analysis** without taste input reads telemetry alone.
- A v1 **Shot Analysis** and its **Taste Compass** input are ephemeral: they are discarded with the **Post-Shot Summary** and are not written to the **Bridge** or Visualizer.
- A **Shot Analysis** recommends; the operator applies. It never changes machine, profile, or workflow state.
- A **Shot Analysis** and its **Taste Compass** are presented in place inside the expanded **Post-Shot Summary**, never on a separate route or modal.
- A **Shot Analysis** requires an operator-supplied API key kept in Skin-local settings; without one the Analyze affordance leads to setup, not an error.
- A **Profile** has one or more **Steps**.
- A **Workflow** holds exactly one **Active Profile**.
- An **Active Profile** is a copy, not a reference: changing a **Profile** in the **Profile Library** does not change the **Active Profile** by itself.
- An **Active Profile** belongs to the visible **Profile** with the same title, if there is one, and may differ from it in content.
- A **Profile Draft** of the **Profile** the **Active Profile** belongs to starts from the **Active Profile**, not the library copy.
- Saving a **Profile Draft** of the **Profile** the **Active Profile** belongs to also updates the **Active Profile**; saving any other **Profile Draft** leaves the **Workflow** alone.
- A **Profile Draft** can be loaded into the **Workflow** as the **Active Profile** without being saved; it stays there until it is saved, reverted, or replaced.
- The **Active Profile** never changes while the machine is running a **Shot**, steam, hot water, a flush, or a cleaning or maintenance cycle.
- Yield belongs to the **Workflow**, not the **Profile**: a **Profile**'s stored target weight never stops a **Shot**.
- The **Profile Library** is owned by the **Bridge**; the **Skin** reads and writes it but keeps no library of its own.
- A **Bundled Profile** can be duplicated, hidden, or restored, but its **Steps** cannot be edited in place.
- A **Profile Draft** becomes a **Profile** only when it is saved to the **Profile Library**.
- The **Skin** holds at most one **Profile Draft** of its own at a time, apart from one loaded into the **Workflow**. It is kept on the tablet, never on the **Bridge**, and survives reloads until it is saved, discarded, or replaced.
- A **Profile Draft** has unsaved changes only while it differs from what it started from or last wrote.
- Changes made elsewhere to a **Profile Draft**'s **Profile** merge into the draft; only changes that overlap the draft's own edits ask the operator.
- Saving a **Profile Draft** that changes how the **Profile** runs (its **Steps** or profile-level settings) makes a **Profile Revision**; the **Profile** it came from becomes a **Superseded Profile**.
- Changing only a **Profile**'s title, author, or notes updates it in place and makes no **Profile Revision**.
- A **Profile Fork** never supersedes its parent; both stay in the **Profile Library**.
- A **Profile Lineage** links **Profile Revisions** and **Profile Forks** alike; only a **Profile Revision** supersedes its parent.
- A **Superseded Profile** is not the same as a **Profile** the operator hid.
- A **Bundled Profile** can be hidden but never deleted; any other **Profile** is deleted. Either way it becomes a **Removed Profile**.
- A **Removed Profile** can always be restored; **Cockpit** never removes a **Profile** permanently.
- Removing a **Profile** leaves its **Superseded Profiles** in its **Profile Lineage** and its **Profile Forks** in the **Profile Library**.
- Removing a **Profile** does not change the **Active Profile**.
- A **Retired Bundled Profile** is neither a **Removed Profile** nor a **Superseded Profile**, and it cannot be restored: the **Bridge** hides it again at every launch.

## Example dialogue

> **Dev:** "Should the **Skin** decide whether the machine is ready?"
> **Domain expert:** "No. The **Skin** should present readiness from Streamline Bridge."

## Flagged ambiguities

- "Cockpit" is branding for the **Skin**, not a distinct architectural role.
- "Gateway" appears in code and environment names, but **Bridge** is the canonical domain term.
- Missing **Preferred Scale Reconnect** behavior should be implemented in the **Bridge**, not permanently recreated as a **Skin** auto-scan loop.
- Temporary off/sleep/disconnect cases should preserve the **Preferred Scale**; only **Forget Scale** clears it.
- **Preferred Scale Reconnect** covers machine-first startup, scale-first startup, and scale-off-then-on-again scenarios.
- A **Meaningful Extraction** is intentionally simple in the Skin: five or more seconds of espresso telemetry.
- The **Compatibility Reconnect Adapter** should be throttled, should only run when a machine is connected and no scale is connected, and should only ask the **Bridge** to scan with connect enabled so the **Bridge** can apply its device policy.
- The **Compatibility Reconnect Adapter** is not for first-time pairing or guessing which scale to use.
- **Disconnect Scale** is the normal temporary row action and preserves the **Preferred Scale**.
- **Forget Scale** belongs in settings, clears the **Preferred Scale**, and may also disconnect the scale if it is currently connected.
- Existing UI copy says "frames" (the frame-count button, the frame preview overlay); the canonical term is **Step**, and "frame" survives only as the machine's runtime index of the running **Step**.
- The **Bridge** calls **Bundled Profiles** "default profiles" (`isDefault`); "default" is avoided in the **Skin** because it also reads as "the profile selected by default".
- A **Profile**'s JSON `version` field is the profile format version, not a position in its **Profile Lineage**.
- The **Bridge**'s `hidden` visibility covers three things: **Superseded Profiles**, **Bundled Profiles** the operator hid, and **Retired Bundled Profiles**. Its `deleted` covers the operator's own deleted profiles. Only operator-hidden and deleted records are **Removed Profiles**.
