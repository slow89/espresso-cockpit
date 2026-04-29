import type { MachineSnapshot, TimeToReadySnapshot } from "@/rest/types";
import { isShotActiveMachinePhase, type TelemetrySample } from "@/lib/telemetry";

export type DashboardPresentationMode = "controls" | "shot";
export type DashboardPrepStatusTone = "warming" | "ready" | "offline" | "sleeping";
export type DashboardPrepStatus = {
  items: ReadonlyArray<{
    label: string;
    value: string;
  }>;
  title: string;
  tone: DashboardPrepStatusTone;
};

export function formatSecondaryNumber(
  value: number | null | undefined,
  suffix: string,
  fallback: string,
  digits = 1,
) {
  if (value == null || Number.isNaN(value)) {
    return fallback;
  }

  return `${value.toFixed(digits)}${suffix}`;
}

export function getDashboardDevEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("dev") === "true";
}

export function getDashboardPresentationMode({
  simulatedShotActive,
  snapshot,
  telemetry,
}: {
  simulatedShotActive?: boolean;
  snapshot?: MachineSnapshot | null;
  telemetry: TelemetrySample[];
}) {
  if (simulatedShotActive) {
    return "shot";
  }

  if (isShotActiveMachinePhase(snapshot?.state)) {
    return "shot";
  }

  const latestTelemetry = telemetry[telemetry.length - 1];

  return isShotActiveMachinePhase(latestTelemetry) ? "shot" : "controls";
}

export function getDashboardPrepStatus({
  isOffline,
  snapshot,
  timeToReady,
}: {
  isOffline: boolean;
  snapshot?: MachineSnapshot | null;
  timeToReady?: TimeToReadySnapshot | null;
}): DashboardPrepStatus {
  const mixValue = formatTemperature(snapshot?.mixTemperature);
  const targetMixValue = formatTemperature(snapshot?.targetMixTemperature);
  const groupValue = formatTemperature(snapshot?.groupTemperature);
  const targetGroupValue = formatTemperature(snapshot?.targetGroupTemperature);
  const steamValue = formatTemperature(snapshot?.steamTemperature);

  const items = [
    ...(hasReliableWaterTemperature(snapshot)
      ? ([{ label: "Water", value: `${mixValue} / ${targetMixValue}` }] as const)
      : []),
    { label: "Brew head", value: `${groupValue} / ${targetGroupValue}` },
    { label: "Steam", value: steamValue },
  ] as const;

  if (isOffline || snapshot == null) {
    return {
      items,
      title: "Waiting for machine",
      tone: "offline",
    };
  }

  const statusTone = getMachinePrepStatusTone(snapshot, timeToReady);
  const title = formatMachinePhase(snapshot.state);

  if (statusTone === "sleeping") {
    return {
      items,
      title,
      tone: "sleeping",
    };
  }

  if (statusTone === "warming") {
    return {
      items,
      title,
      tone: "warming",
    };
  }

  return {
    items,
    title,
    tone: "ready",
  };
}

function formatTemperature(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "--°C";
  }

  return `${value.toFixed(0)}°C`;
}

function formatMachinePhase(phase: MachineSnapshot["state"]) {
  return `${startCase(phase.state)} / ${startCase(phase.substate)}`;
}

function getMachinePrepStatusTone(
  snapshot: MachineSnapshot,
  timeToReady?: TimeToReadySnapshot | null,
): Exclude<DashboardPrepStatusTone, "offline"> {
  switch (snapshot.state.state) {
    case "sleeping":
      return "sleeping";
    case "heating":
    case "preheating":
      return "warming";
    case "idle":
      if (snapshot.state.substate === "preparingForShot") {
        return "warming";
      }

      if (snapshot.state.substate === "idle") {
        return "ready";
      }

      break;
    default:
      if (snapshot.state.substate === "preparingForShot") {
        return "warming";
      }
  }

  return timeToReady?.status === "reached" ? "ready" : "warming";
}

function hasReliableWaterTemperature(snapshot?: MachineSnapshot | null) {
  switch (snapshot?.state.state) {
    case "espresso":
    case "flush":
    case "hotWater":
    case "cleaning":
    case "descaling":
      return true;
    default:
      return false;
  }
}

function startCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
