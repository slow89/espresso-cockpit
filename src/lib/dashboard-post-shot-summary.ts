import type { TelemetrySample } from "@/lib/telemetry";
import { isShotActiveMachinePhase } from "@/lib/telemetry";
import type { ShotRecord, WorkflowRecord } from "@/rest/types";

export const minimumPostShotSummarySeconds = 5;

export type DashboardPostShotWorkflowSummary = {
  coffeeName: string | null;
  name: string | null;
  profileTitle: string | null;
  targetDoseWeight: number | null;
  targetYield: number | null;
};

export type DashboardPostShotSummary = {
  endedAt: string;
  localId: string;
  startedAt: string;
  telemetry: TelemetrySample[];
  workflow: DashboardPostShotWorkflowSummary;
};

export function buildDashboardPostShotSummary({
  telemetry,
  workflow,
}: {
  telemetry: TelemetrySample[];
  workflow?: WorkflowRecord | null;
}): DashboardPostShotSummary | null {
  const shotTelemetry = getLatestShotTelemetrySegment(telemetry);
  const durationSeconds = getPostShotDurationSeconds(shotTelemetry);
  const firstSample = shotTelemetry[0];
  const lastSample = shotTelemetry[shotTelemetry.length - 1];

  if (
    firstSample == null ||
    lastSample == null ||
    durationSeconds == null ||
    durationSeconds < minimumPostShotSummarySeconds
  ) {
    return null;
  }

  return {
    endedAt: lastSample.timestamp,
    localId: `${firstSample.timestamp}-${lastSample.timestamp}`,
    startedAt: firstSample.timestamp,
    telemetry: shotTelemetry,
    workflow: {
      coffeeName: workflow?.context?.coffeeName ?? null,
      name: workflow?.name ?? null,
      profileTitle: workflow?.profile?.title ?? null,
      targetDoseWeight: workflow?.context?.targetDoseWeight ?? null,
      targetYield: workflow?.context?.targetYield ?? null,
    },
  };
}

export function getLatestShotTelemetrySegment(telemetry: TelemetrySample[]) {
  let endIndex = telemetry.length - 1;

  while (endIndex >= 0 && !isShotActiveMachinePhase(telemetry[endIndex])) {
    endIndex -= 1;
  }

  if (endIndex < 0) {
    return [];
  }

  let startIndex = endIndex;

  while (startIndex > 0 && isShotActiveMachinePhase(telemetry[startIndex - 1])) {
    startIndex -= 1;
  }

  return telemetry.slice(startIndex, endIndex + 1);
}

export function getPostShotDurationSeconds(telemetry: TelemetrySample[]) {
  const firstSample = telemetry[0];
  const lastSample = telemetry[telemetry.length - 1];
  const shotElapsedSeconds = lastSample?.shotElapsedSeconds;

  if (typeof shotElapsedSeconds === "number" && Number.isFinite(shotElapsedSeconds)) {
    return Math.max(0, shotElapsedSeconds);
  }

  const firstTimestampMs = getTimestampMs(firstSample?.timestamp);
  const lastTimestampMs = getTimestampMs(lastSample?.timestamp);

  if (firstTimestampMs == null || lastTimestampMs == null) {
    return null;
  }

  return Math.max(0, (lastTimestampMs - firstTimestampMs) / 1000);
}

export function getPostShotFinalWeight(telemetry: TelemetrySample[]) {
  for (let index = telemetry.length - 1; index >= 0; index -= 1) {
    const weight = telemetry[index]?.weight;

    if (typeof weight === "number" && Number.isFinite(weight)) {
      return weight;
    }
  }

  return null;
}

export function getPostShotActualRatio(summary: DashboardPostShotSummary) {
  const dose = summary.workflow.targetDoseWeight;
  const finalWeight = getPostShotFinalWeight(summary.telemetry);

  if (
    dose == null ||
    finalWeight == null ||
    Number.isNaN(dose) ||
    Number.isNaN(finalWeight) ||
    dose <= 0
  ) {
    return null;
  }

  return finalWeight / dose;
}

export function getPostShotHistoryShotId(
  summary: DashboardPostShotSummary,
  latestShot: ShotRecord | null | undefined,
) {
  const latestShotId = latestShot?.id;
  const latestShotTimestampMs = getTimestampMs(latestShot?.timestamp ?? undefined);
  const summaryStartedAtMs = getTimestampMs(summary.startedAt);

  if (!latestShotId || latestShotTimestampMs == null || summaryStartedAtMs == null) {
    return null;
  }

  return latestShotTimestampMs >= summaryStartedAtMs ? latestShotId : null;
}

function getTimestampMs(timestamp: string | undefined) {
  if (!timestamp) {
    return null;
  }

  const value = new Date(timestamp).getTime();

  return Number.isNaN(value) ? null : value;
}
