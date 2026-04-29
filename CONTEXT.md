# Espresso Cockpit

Espresso Cockpit is a Streamline Bridge skin for machine-side espresso operation on a tablet.

## Language

**Skin**:
A tablet-first web UI that presents and requests Streamline Bridge behavior without owning machine, device, readiness, or deployment policy.
_Avoid_: Client, cockpit-as-role

**Bridge**:
The Streamline Bridge runtime that owns machine communication, device connection policy, readiness signals, display behavior, presence behavior, and Skin installation.
_Avoid_: Gateway, except when naming URLs, environment variables, endpoints, or existing code identifiers

**Preferred Scale**:
The scale remembered by the Bridge for automatic scale reconnection.
_Avoid_: Skin-managed saved scale

**Preferred Scale Reconnect**:
A Bridge-owned behavior that reconnects the **Preferred Scale** whenever the machine and scale become available in either order, including after the scale temporarily powers off and returns.
_Avoid_: Skin auto-scan loop

**Compatibility Reconnect Adapter**:
A temporary Skin adapter that asks the Bridge to scan with connect enabled for the **Preferred Scale** while **Preferred Scale Reconnect** is not fully Bridge-owned.
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

## Relationships

- A **Skin** talks to exactly one **Bridge** origin at a time.
- **Cockpit** is a **Skin**.
- The **Bridge** owns machine, device, readiness, display, presence, and Skin installation policy.
- The **Bridge** owns **Preferred Scale Reconnect** for the **Preferred Scale**.
- The **Compatibility Reconnect Adapter** may exist only while **Preferred Scale Reconnect** is missing from the **Bridge**.
- **Disconnect Scale** does not change the **Preferred Scale**.
- **Forget Scale** clears the **Preferred Scale**.

## Example dialogue

> **Dev:** "Should the **Skin** decide whether the machine is ready?"
> **Domain expert:** "No. The **Skin** should present readiness from Streamline Bridge."

## Flagged ambiguities

- "Cockpit" is branding for the **Skin**, not a distinct architectural role.
- "Gateway" appears in code and environment names, but **Bridge** is the canonical domain term.
- Missing **Preferred Scale Reconnect** behavior should be implemented in the **Bridge**, not permanently recreated as a **Skin** auto-scan loop.
- Temporary off/sleep/disconnect cases should preserve the **Preferred Scale**; only **Forget Scale** clears it.
- **Preferred Scale Reconnect** covers machine-first startup, scale-first startup, and scale-off-then-on-again scenarios.
- The **Compatibility Reconnect Adapter** should be throttled, should only run when a **Preferred Scale** exists, a machine is connected, and no scale is connected, and should only ask the **Bridge** to scan with connect enabled.
- The **Compatibility Reconnect Adapter** is not for first-time pairing or guessing which scale to use.
- **Disconnect Scale** is the normal temporary row action and preserves the **Preferred Scale**.
- **Forget Scale** belongs in settings, clears the **Preferred Scale**, and may also disconnect the scale if it is currently connected.
