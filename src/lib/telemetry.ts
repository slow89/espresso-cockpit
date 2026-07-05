import type { MachinePhase, MachineSnapshot, ScaleSnapshot } from "@/rest/types";

export type TelemetrySeriesFamily = "pressure" | "flow" | "weight" | "temperature" | "progress";
export type TelemetryStrokeStyle = "solid" | "dashed";
export const maxTelemetrySamples = 180;
// Active shots must never lose their opening samples, so they get a far larger
// budget than the idle backlog. ~10 min at the DE1's stream rate — big enough to
// keep any real shot whole, bounded enough to stay memory-safe.
export const maxShotTelemetrySamples = 2400;
// Samples of idle context kept ahead of an active shot's start, so the chart has
// a little lead-in without dragging the whole pre-shot backlog along.
const shotLeadInSamples = 12;

export type TelemetrySample = Pick<
  MachineSnapshot,
  | "timestamp"
  | "pressure"
  | "targetPressure"
  | "flow"
  | "targetFlow"
  | "mixTemperature"
  | "targetMixTemperature"
  | "groupTemperature"
  | "targetGroupTemperature"
  | "steamTemperature"
  | "profileFrame"
> & {
  state: MachineSnapshot["state"]["state"];
  substate: MachineSnapshot["state"]["substate"];
  elapsedSeconds: number;
  shotElapsedSeconds: number | null;
  weight: number | null;
  weightFlow: number | null;
};

export type TelemetrySeriesDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  unit: string;
  family: TelemetrySeriesFamily;
  color: string;
  strokeStyle: TelemetryStrokeStyle;
  digits: number;
  defaultVisible: boolean;
  comparisonSeriesId?: string;
  accessor: (sample: TelemetrySample) => number | null;
};

export const telemetrySeriesRegistry: readonly TelemetrySeriesDefinition[] = [
  {
    id: "pressure",
    label: "Pressure",
    shortLabel: "Pressure",
    unit: "bar",
    family: "pressure",
    color: "#f7b437",
    strokeStyle: "solid",
    digits: 1,
    defaultVisible: true,
    comparisonSeriesId: "targetPressure",
    accessor: (sample) => sample.pressure,
  },
  {
    id: "targetPressure",
    label: "Target pressure",
    shortLabel: "Target",
    unit: "bar",
    family: "pressure",
    color: "#f6dc97",
    strokeStyle: "dashed",
    digits: 1,
    defaultVisible: true,
    accessor: (sample) => sample.targetPressure,
  },
  {
    id: "flow",
    label: "Flow",
    shortLabel: "Flow",
    unit: "ml/s",
    family: "flow",
    color: "#39c97b",
    strokeStyle: "solid",
    digits: 1,
    defaultVisible: true,
    comparisonSeriesId: "targetFlow",
    accessor: (sample) => sample.flow,
  },
  {
    id: "targetFlow",
    label: "Target flow",
    shortLabel: "Target",
    unit: "ml/s",
    family: "flow",
    color: "#98e2b6",
    strokeStyle: "dashed",
    digits: 1,
    defaultVisible: true,
    accessor: (sample) => sample.targetFlow,
  },
  {
    id: "weight",
    label: "Weight",
    shortLabel: "Weight",
    unit: "g",
    family: "weight",
    color: "#5bbfed",
    strokeStyle: "solid",
    digits: 1,
    defaultVisible: true,
    accessor: (sample) => sample.weight,
  },
  {
    id: "weightFlow",
    label: "Weight flow",
    shortLabel: "W. flow",
    unit: "g/s",
    family: "weight",
    color: "#94d6f5",
    strokeStyle: "solid",
    digits: 1,
    defaultVisible: true,
    accessor: (sample) => sample.weightFlow,
  },
  {
    id: "mixTemperature",
    label: "Mix temperature",
    shortLabel: "Mix",
    unit: "°C",
    family: "temperature",
    color: "#ff7b57",
    strokeStyle: "solid",
    digits: 1,
    defaultVisible: true,
    comparisonSeriesId: "targetMixTemperature",
    accessor: (sample) => sample.mixTemperature,
  },
  {
    id: "targetMixTemperature",
    label: "Target mix temperature",
    shortLabel: "Target mix",
    unit: "°C",
    family: "temperature",
    color: "#ffb19d",
    strokeStyle: "dashed",
    digits: 1,
    defaultVisible: true,
    accessor: (sample) => sample.targetMixTemperature,
  },
  {
    id: "groupTemperature",
    label: "Group temperature",
    shortLabel: "Group",
    unit: "°C",
    family: "temperature",
    color: "#66c9ff",
    strokeStyle: "solid",
    digits: 1,
    defaultVisible: false,
    comparisonSeriesId: "targetGroupTemperature",
    accessor: (sample) => sample.groupTemperature,
  },
  {
    id: "targetGroupTemperature",
    label: "Target group temperature",
    shortLabel: "Target group",
    unit: "°C",
    family: "temperature",
    color: "#b5e4ff",
    strokeStyle: "dashed",
    digits: 1,
    defaultVisible: false,
    accessor: (sample) => sample.targetGroupTemperature,
  },
  {
    id: "steamTemperature",
    label: "Steam temperature",
    shortLabel: "Steam",
    unit: "°C",
    family: "temperature",
    color: "#c792ea",
    strokeStyle: "solid",
    digits: 0,
    defaultVisible: false,
    accessor: (sample) => sample.steamTemperature,
  },
  {
    id: "profileFrame",
    label: "Profile frame",
    shortLabel: "Frame",
    unit: "frame",
    family: "progress",
    color: "#f0be57",
    strokeStyle: "solid",
    digits: 0,
    defaultVisible: false,
    accessor: (sample) => sample.profileFrame,
  },
] as const;

export type TelemetrySeriesId = (typeof telemetrySeriesRegistry)[number]["id"];

export type TelemetryChartPreferences = {
  selectedSeriesIds: TelemetrySeriesId[];
  laneVisibility: Record<TelemetrySeriesFamily, boolean>;
  activePreset: "live-shot" | "all-signals" | "custom";
};

export const telemetryFamilyOrder = [
  "pressure",
  "flow",
  "weight",
  "temperature",
  "progress",
] as const satisfies readonly TelemetrySeriesFamily[];

export const telemetryFamilyLabels: Record<TelemetrySeriesFamily, string> = {
  pressure: "Pressure",
  flow: "Flow",
  weight: "Weight",
  temperature: "Temperature",
  progress: "Progress",
};

export const telemetryDefaultSeriesIds = telemetrySeriesRegistry
  .filter((series) => series.defaultVisible)
  .map((series) => series.id);

export const telemetryAllSeriesIds = telemetrySeriesRegistry.map((series) => series.id);

const telemetrySeriesMap = new Map<TelemetrySeriesId, TelemetrySeriesDefinition>(
  telemetrySeriesRegistry.map((series) => [series.id, series]),
);

export function isShotActiveMachinePhase(phase: MachinePhase | null | undefined) {
  return phase?.state === "espresso";
}

export function getTelemetrySeriesDefinition(id: TelemetrySeriesId) {
  return telemetrySeriesMap.get(id);
}

export function formatTelemetryValue(
  definition: TelemetrySeriesDefinition,
  value: number | null | undefined,
) {
  if (value == null || Number.isNaN(value)) {
    return `-${definition.unit ? ` ${definition.unit}` : ""}`.trim();
  }

  return `${value.toFixed(definition.digits)} ${definition.unit}`.trim();
}

export function formatTelemetryDelta(
  definition: TelemetrySeriesDefinition,
  value: number | null | undefined,
  comparisonValue: number | null | undefined,
) {
  if (
    value == null ||
    comparisonValue == null ||
    Number.isNaN(value) ||
    Number.isNaN(comparisonValue)
  ) {
    return null;
  }

  const delta = value - comparisonValue;
  const prefix = delta > 0 ? "+" : "";

  return `${prefix}${delta.toFixed(definition.digits)} ${definition.unit}`.trim();
}

export function formatTelemetryClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00.0";
  }

  const wholeMinutes = Math.floor(seconds / 60);
  const remainder = seconds - wholeMinutes * 60;
  const paddedSeconds = remainder.toFixed(1).padStart(4, "0");

  return `${wholeMinutes}:${paddedSeconds}`;
}

export function formatTelemetryTimestampLabel(timestamp: string) {
  const value = new Date(timestamp);

  if (Number.isNaN(value.getTime())) {
    return "Invalid timestamp";
  }

  return value.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function getTelemetryTimelineSample(samples: TelemetrySample[]) {
  const latest = samples[samples.length - 1];

  if (!isShotActiveMachinePhase(latest)) {
    return samples;
  }

  const shotSamples = samples.filter((sample) => sample.shotElapsedSeconds != null);

  return shotSamples.length > 0 ? shotSamples : samples;
}

export function appendTelemetryHistory(
  telemetry: TelemetrySample[],
  snapshot: MachineSnapshot,
  scaleSnapshot?: ScaleSnapshot | null,
) {
  const previousSample = telemetry[telemetry.length - 1];
  const firstTimestampMs =
    getTimestampMs(telemetry[0]?.timestamp) ?? getTimestampMs(snapshot.timestamp);
  const currentTimestampMs = getTimestampMs(snapshot.timestamp);
  const elapsedSeconds =
    firstTimestampMs == null || currentTimestampMs == null
      ? telemetry.length
      : Math.max(0, (currentTimestampMs - firstTimestampMs) / 1000);

  const previousSampleTimestampMs = getTimestampMs(previousSample?.timestamp);
  const previousShotStartTimestamp =
    previousSample?.shotElapsedSeconds != null && previousSampleTimestampMs != null
      ? previousSampleTimestampMs - previousSample.shotElapsedSeconds * 1000
      : null;
  const isShotActive = isShotActiveMachinePhase(snapshot.state);
  const wasShotActive = isShotActiveMachinePhase(previousSample);
  const shotStarted = isShotActive && !wasShotActive;
  const shotStartTimestampMs = !isShotActive
    ? null
    : shotStarted
      ? currentTimestampMs
      : previousShotStartTimestamp;
  const shotElapsedSeconds =
    shotStartTimestampMs == null || currentTimestampMs == null
      ? null
      : Math.max(0, (currentTimestampMs - shotStartTimestampMs) / 1000);

  return trimTelemetryHistory([
    ...telemetry,
    {
      timestamp: snapshot.timestamp,
      pressure: snapshot.pressure,
      targetPressure: snapshot.targetPressure,
      flow: snapshot.flow,
      targetFlow: snapshot.targetFlow,
      mixTemperature: snapshot.mixTemperature,
      targetMixTemperature: snapshot.targetMixTemperature,
      groupTemperature: snapshot.groupTemperature,
      targetGroupTemperature: snapshot.targetGroupTemperature,
      steamTemperature: snapshot.steamTemperature,
      profileFrame: snapshot.profileFrame,
      state: snapshot.state.state,
      substate: snapshot.state.substate,
      elapsedSeconds,
      shotElapsedSeconds,
      weight: scaleSnapshot?.weight ?? null,
      weightFlow: scaleSnapshot?.weightFlow ?? null,
    },
  ]);
}

// Trims the rolling telemetry buffer without ever discarding the opening of an
// in-progress shot. When idle, the buffer is a plain ring of `maxTelemetrySamples`.
// Once a shot is active, we anchor retention to that shot's first sample (plus a
// small idle lead-in) so a long shot always renders from t=0, capped only by the
// generous `maxShotTelemetrySamples` ceiling.
export function trimTelemetryHistory(samples: TelemetrySample[]) {
  const latest = samples[samples.length - 1];

  if (!isShotActiveMachinePhase(latest)) {
    return samples.length > maxTelemetrySamples ? samples.slice(-maxTelemetrySamples) : samples;
  }

  // Walk back over the trailing run of active-shot samples to find where it began.
  let shotStartIndex = samples.length - 1;
  while (shotStartIndex > 0 && isShotActiveMachinePhase(samples[shotStartIndex - 1])) {
    shotStartIndex -= 1;
  }

  const keepFrom = Math.max(0, shotStartIndex - shotLeadInSamples);
  const kept = keepFrom > 0 ? samples.slice(keepFrom) : samples;

  return kept.length > maxShotTelemetrySamples ? kept.slice(-maxShotTelemetrySamples) : kept;
}

export function mergeScaleSnapshotIntoTelemetry(
  telemetry: TelemetrySample[],
  scaleSnapshot: ScaleSnapshot,
) {
  const latestSample = telemetry[telemetry.length - 1];

  if (latestSample == null || latestSample.timestamp !== scaleSnapshot.timestamp) {
    return telemetry;
  }

  return [
    ...telemetry.slice(0, -1),
    {
      ...latestSample,
      weight: scaleSnapshot.weight ?? null,
      weightFlow: scaleSnapshot.weightFlow ?? null,
    },
  ];
}

function getTimestampMs(timestamp: string | undefined) {
  if (!timestamp) {
    return null;
  }

  const value = new Date(timestamp).getTime();

  return Number.isNaN(value) ? null : value;
}
