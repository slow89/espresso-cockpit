import type {
  ShotDetailRecord,
  ShotMeasurement,
  ShotRecord,
} from "@/rest/types";
import type { TelemetrySample } from "@/lib/telemetry";

export function adaptShotMeasurementsToTelemetry(
  measurements: ShotMeasurement[],
): TelemetrySample[] {
  const relevantMeasurements = trimTrailingIdleMeasurements(measurements);
  const firstTimestampMs = getTimestampMs(relevantMeasurements[0]?.machine.timestamp);
  const shotStartTimestampMs =
    getTimestampMs(
      relevantMeasurements.find((measurement) => measurement.machine.state.state === "espresso")
        ?.machine.timestamp,
    ) ?? firstTimestampMs;

  return relevantMeasurements.map((measurement) => {
    const currentTimestampMs = getTimestampMs(measurement.machine.timestamp);
    const elapsedSeconds =
      firstTimestampMs == null || currentTimestampMs == null
        ? 0
        : Math.max(0, (currentTimestampMs - firstTimestampMs) / 1000);
    const timerValue = measurement.scale?.timerValue;
    const shotElapsedSeconds =
      typeof timerValue === "number" && Number.isFinite(timerValue)
        ? Math.max(0, timerValue / 1000)
        : shotStartTimestampMs == null || currentTimestampMs == null
          ? null
          : Math.max(0, (currentTimestampMs - shotStartTimestampMs) / 1000);

    return {
      timestamp: measurement.machine.timestamp,
      pressure: measurement.machine.pressure,
      targetPressure: measurement.machine.targetPressure,
      flow: measurement.machine.flow,
      targetFlow: measurement.machine.targetFlow,
      mixTemperature: measurement.machine.mixTemperature,
      targetMixTemperature: measurement.machine.targetMixTemperature,
      groupTemperature: measurement.machine.groupTemperature,
      targetGroupTemperature: measurement.machine.targetGroupTemperature,
      steamTemperature: measurement.machine.steamTemperature,
      profileFrame: measurement.machine.profileFrame,
      state: measurement.machine.state.state,
      substate: measurement.machine.state.substate,
      elapsedSeconds,
      shotElapsedSeconds,
      weight: measurement.scale?.weight ?? null,
      weightFlow: measurement.scale?.weightFlow ?? null,
    };
  });
}

export function getShotDisplayTitle(shot: Pick<ShotRecord, "workflow"> | ShotDetailRecord) {
  return shot.workflow?.profile?.title ?? shot.workflow?.name ?? "Untitled shot";
}

export function getShotDurationSeconds(measurements: ShotMeasurement[]) {
  const maxTimerValue = measurements.reduce<number | null>((currentMax, measurement) => {
    const timerValue = measurement.scale?.timerValue;

    if (timerValue == null || Number.isNaN(timerValue)) {
      return currentMax;
    }

    return currentMax == null ? timerValue : Math.max(currentMax, timerValue);
  }, null);

  if (maxTimerValue != null) {
    return Math.max(0, maxTimerValue / 1000);
  }

  const telemetry = adaptShotMeasurementsToTelemetry(measurements);
  const latestTelemetry = telemetry[telemetry.length - 1];

  return latestTelemetry?.shotElapsedSeconds ?? latestTelemetry?.elapsedSeconds ?? null;
}

export function getShotFinalWeight(measurements: ShotMeasurement[]) {
  for (let index = measurements.length - 1; index >= 0; index -= 1) {
    const weight = measurements[index]?.scale?.weight;

    if (typeof weight === "number" && Number.isFinite(weight)) {
      return weight;
    }
  }

  return null;
}

export function getShotActualRatio(
  shot: Pick<ShotDetailRecord, "measurements" | "workflow">,
) {
  const dose = shot.workflow?.context?.targetDoseWeight;
  const finalWeight = getShotFinalWeight(shot.measurements);

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

function trimTrailingIdleMeasurements(measurements: ShotMeasurement[]) {
  let lastEspressoIndex = -1;

  measurements.forEach((measurement, index) => {
    if (measurement.machine.state.state === "espresso") {
      lastEspressoIndex = index;
    }
  });

  if (lastEspressoIndex === -1) {
    return measurements;
  }

  return measurements.slice(0, lastEspressoIndex + 1);
}

function getTimestampMs(timestamp: string | undefined) {
  if (!timestamp) {
    return null;
  }

  const value = new Date(timestamp).getTime();

  return Number.isNaN(value) ? null : value;
}
