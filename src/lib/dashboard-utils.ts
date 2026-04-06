import type { MachineSnapshot, TimeToReadySnapshot } from "@/rest/types";
import type { TelemetrySample } from "@/lib/telemetry";

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

  if (snapshot?.state.state === "espresso") {
    return "shot";
  }

  const latestTelemetry = telemetry[telemetry.length - 1];

  return latestTelemetry?.state === "espresso" ? "shot" : "controls";
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

  if (snapshot.state.state === "sleeping") {
    return {
      items,
      title: "Machine asleep",
      tone: "sleeping",
    };
  }

  if (timeToReady?.status !== "reached") {
    return {
      items,
      title: "Heating up",
      tone: "warming",
    };
  }

  return {
    items,
    title: "Ready to brew",
    tone: "ready",
  };
}

function formatTemperature(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "--°C";
  }

  return `${value.toFixed(0)}°C`;
}

function hasReliableWaterTemperature(snapshot?: MachineSnapshot | null) {
  switch (snapshot?.state.state) {
    case "espresso":
    case "flush":
    case "hotWater":
    case "hotWaterRinse":
    case "clean":
    case "descale":
      return true;
    default:
      return false;
  }
}
