import type { MonitorStatusItem } from "@/components/chart-monitor/chrome";
import type { WorkflowProfile } from "@/rest/types";

export type FrameRecord = Record<string, unknown>;
export type WorkflowFrameFamily =
  | "pressure"
  | "flow"
  | "temperature"
  | "progress"
  | "other";
export type WorkflowFrameChartPreset = "core-frames" | "all-series" | "custom";
export type WorkflowFrameSeriesId = string;
export type WorkflowFrameChartSeriesDefinition = {
  accessor: (sample: WorkflowFrameSample) => number | null;
  color: string;
  defaultVisible: boolean;
  digits: number;
  family: WorkflowFrameFamily;
  id: WorkflowFrameSeriesId;
  label: string;
  shortLabel: string;
  strokeStyle: "solid";
  unit: string;
};

export type WorkflowFrameSample = {
  elapsedSeconds: number;
  frame: FrameRecord;
  frameIndex: number;
  profileFrame: number;
  shotElapsedSeconds: null;
  timestamp: string;
  values: Record<string, number | null>;
};

export type FramePreviewData = {
  defaultSeriesIds: WorkflowFrameSeriesId[];
  frames: FrameRecord[];
  numericKeys: string[];
  samples: WorkflowFrameSample[];
  series: WorkflowFrameChartSeriesDefinition[];
  seriesIds: WorkflowFrameSeriesId[];
};

const preferredFrameKeys = [
  "pressure",
  "flow",
  "temperature",
  "temp",
  "seconds",
  "duration",
  "volume",
  "weight",
] as const;

const familyOrder = [
  "pressure",
  "flow",
  "temperature",
  "progress",
  "other",
] as const satisfies readonly WorkflowFrameFamily[];

const familyColorPalettes: Record<WorkflowFrameFamily, string[]> = {
  pressure: ["#f7b437", "#f6dc97", "#f19a3e"],
  flow: ["#39c97b", "#98e2b6", "#67baf6"],
  temperature: ["#ff7b57", "#66c9ff", "#c792ea"],
  progress: ["#f0be57", "#d6a44e", "#e3d39b"],
  other: ["#6ab4ff", "#d9dce4", "#8ce0b4", "#f5c76c"],
};

const familyLabels: Record<WorkflowFrameFamily, string> = {
  pressure: "Pressure",
  flow: "Flow",
  temperature: "Temperature",
  progress: "Progress",
  other: "Other",
};

export function buildFramePreviewData(profile: WorkflowProfile): FramePreviewData {
  const frames = (profile.steps ?? []).filter(
    (step): step is FrameRecord => typeof step === "object" && step !== null,
  );
  const numericFieldCounts = new Map<string, number>();

  frames.forEach((frame) => {
    Object.entries(frame).forEach(([key, value]) => {
      if (getNumericValue(value) != null) {
        numericFieldCounts.set(key, (numericFieldCounts.get(key) ?? 0) + 1);
      }
    });
  });

  const numericKeys = [...numericFieldCounts.entries()]
    .sort(([leftKey, leftCount], [rightKey, rightCount]) =>
      compareFrameKeys(leftKey, leftCount, rightKey, rightCount),
    )
    .map(([key]) => key);
  const samples = frames.map((frame, index) => {
    const values = Object.fromEntries(
      numericKeys.map((key) => [key, getNumericValue(frame[key])]),
    ) as Record<string, number | null>;

    return {
      elapsedSeconds: index,
      frame,
      frameIndex: index + 1,
      profileFrame: index + 1,
      shotElapsedSeconds: null,
      timestamp: `frame-${index + 1}`,
      values,
    } satisfies WorkflowFrameSample;
  });

  const series = buildSeriesDefinitions(numericKeys, samples);

  return {
    defaultSeriesIds: pickDefaultSeriesIds(series),
    frames,
    numericKeys,
    samples,
    series,
    seriesIds: series.map((seriesDefinition) => seriesDefinition.id),
  };
}

export function buildWorkflowFrameStatusItems({
  preview,
  selectedFrameIndex,
  selectedSeriesIds,
}: {
  preview: FramePreviewData;
  selectedFrameIndex: number;
  selectedSeriesIds: string[];
}): MonitorStatusItem[] {
  const selectedSample = preview.samples[selectedFrameIndex] ?? null;
  const selectedSeries = selectedSeriesIds
    .map((seriesId) => preview.series.find((series) => series.id === seriesId))
    .filter((series): series is WorkflowFrameChartSeriesDefinition => series != null)
    .slice(0, 3);

  return [
    {
      detail: `${preview.frames.length} total frames`,
      label: "Frame",
      value: `${selectedFrameIndex + 1}/${Math.max(preview.frames.length, 1)}`,
    },
    ...selectedSeries.map((series) => ({
      detail: familyLabels[series.family],
      label: series.shortLabel,
      value: formatWorkflowSeriesValue(series, selectedSample ? series.accessor(selectedSample) : null),
    })),
  ];
}

export function getWorkflowFrameFamilyLabel(family: WorkflowFrameFamily) {
  return familyLabels[family];
}

export function getWorkflowFrameFamilyOrder() {
  return familyOrder;
}

export function getNumericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function formatSeriesKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatFrameValue(value: unknown) {
  if (value == null) {
    return "-";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

export function formatWorkflowSeriesValue(
  definition: Pick<WorkflowFrameChartSeriesDefinition, "digits" | "unit">,
  value: number | null | undefined,
) {
  if (value == null || Number.isNaN(value)) {
    return `-${definition.unit ? ` ${definition.unit}` : ""}`.trim();
  }

  return `${value.toFixed(definition.digits)} ${definition.unit}`.trim();
}

function buildSeriesDefinitions(
  numericKeys: string[],
  samples: WorkflowFrameSample[],
): WorkflowFrameChartSeriesDefinition[] {
  if (numericKeys.length === 0) {
    return [];
  }

  const seriesFromFrames = numericKeys.map((key) => {
    const family = inferSeriesFamily(key);
    const palette = familyColorPalettes[family];
    const familyIndex = numericKeys.filter((candidate) => inferSeriesFamily(candidate) === family).indexOf(key);
    const values = samples
      .map((sample) => sample.values[key])
      .filter((value): value is number => value != null);

    return {
      accessor: (sample) => sample.values[key],
      color: palette[familyIndex % palette.length],
      defaultVisible: false,
      digits: inferDigits(values),
      family,
      id: key,
      label: formatSeriesKey(key),
      shortLabel: formatSeriesKey(key),
      strokeStyle: "solid",
      unit: inferSeriesUnit(key),
    } satisfies WorkflowFrameChartSeriesDefinition;
  });

  const hasProgressSeries = seriesFromFrames.some((series) => series.family === "progress");

  if (hasProgressSeries) {
    return seriesFromFrames;
  }

  return [
    ...seriesFromFrames,
    {
      accessor: (sample) => sample.frameIndex,
      color: familyColorPalettes.progress[0],
      defaultVisible: false,
      digits: 0,
      family: "progress",
      id: "frameIndex",
      label: "Frame Index",
      shortLabel: "Frame",
      strokeStyle: "solid",
      unit: "frame",
    },
  ];
}

function pickDefaultSeriesIds(series: WorkflowFrameChartSeriesDefinition[]) {
  const firstByFamily = familyOrder.flatMap((family) => {
    const match = series.find((candidate) => candidate.family === family);

    return match ? [match.id] : [];
  });
  const selected = new Set(firstByFamily.slice(0, 4));

  series.forEach((definition) => {
    if (selected.size >= 5) {
      return;
    }

    selected.add(definition.id);
  });

  return [...selected];
}

function compareFrameKeys(leftKey: string, leftCount: number, rightKey: string, rightCount: number) {
  const leftPreferredIndex = getPreferredFrameKeyIndex(leftKey);
  const rightPreferredIndex = getPreferredFrameKeyIndex(rightKey);

  if (leftPreferredIndex !== -1 || rightPreferredIndex !== -1) {
    if (leftPreferredIndex === -1) {
      return 1;
    }

    if (rightPreferredIndex === -1) {
      return -1;
    }

    return leftPreferredIndex - rightPreferredIndex;
  }

  if (inferSeriesFamily(leftKey) !== inferSeriesFamily(rightKey)) {
    return familyOrder.indexOf(inferSeriesFamily(leftKey)) - familyOrder.indexOf(inferSeriesFamily(rightKey));
  }

  if (rightCount !== leftCount) {
    return rightCount - leftCount;
  }

  return leftKey.localeCompare(rightKey);
}

function getPreferredFrameKeyIndex(key: string) {
  return preferredFrameKeys.findIndex((candidate) => key.toLowerCase().includes(candidate));
}

function inferSeriesFamily(key: string): WorkflowFrameFamily {
  if (/(pressure|pump|bar)/i.test(key)) {
    return "pressure";
  }

  if (/(flow|rate)/i.test(key)) {
    return "flow";
  }

  if (/(temp|temperature|steam)/i.test(key)) {
    return "temperature";
  }

  if (isProgressKey(key)) {
    return "progress";
  }

  return "other";
}

function isProgressKey(key: string) {
  return /(time|second|duration|frame|step|elapsed)/i.test(key);
}

function inferSeriesUnit(key: string) {
  if (/(pressure|bar)/i.test(key)) {
    return "bar";
  }

  if (/(flow|rate)/i.test(key)) {
    return "ml/s";
  }

  if (/(temp|temperature|steam)/i.test(key)) {
    return "°C";
  }

  if (/(weight|mass|dose|yield)/i.test(key)) {
    return "g";
  }

  if (/(volume)/i.test(key)) {
    return "ml";
  }

  if (/(second|duration|time|elapsed)/i.test(key)) {
    return "s";
  }

  if (/(frame|step)/i.test(key)) {
    return "frame";
  }

  return "";
}

function inferDigits(values: number[]) {
  if (values.length === 0) {
    return 1;
  }

  return values.every((value) => Number.isInteger(value)) ? 0 : 1;
}
