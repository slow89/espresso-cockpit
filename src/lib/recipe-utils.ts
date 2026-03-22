export type RecipePreset = {
  label: string;
  value: number;
};

export function formatBrewRatio(
  targetDose: number | null | undefined,
  targetYield: number | null | undefined,
  fallback = "1:2.0",
) {
  if (
    targetDose == null ||
    targetYield == null ||
    Number.isNaN(targetDose) ||
    Number.isNaN(targetYield) ||
    targetDose <= 0
  ) {
    return fallback;
  }

  return `1:${(targetYield / targetDose).toFixed(1)}`;
}

export function isPresetActive(currentValue: number, presetValue: number) {
  return Math.abs(currentValue - presetValue) < 0.11;
}

export function roundValue(value: number, precision: number) {
  if (!Number.isFinite(value)) {
    return value;
  }

  if (precision === 0) {
    return Math.round(value);
  }

  if (precision > 0 && precision < 1) {
    return Number((Math.round(value / precision) * precision).toFixed(8));
  }

  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

export function formatPrimaryNumber(
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
