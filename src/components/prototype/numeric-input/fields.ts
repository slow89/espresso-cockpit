// PROTOTYPE — throwaway. Field specs for the numeric-input prototype
// (wayfinder ticket .scratch/profile-editor/issues/05-numeric-input-on-tablet.md).
// Ranges and step sizes come from the profile-field-semantics research:
// pressure/flow/exit/limiter in 1/16 on DE1, temperature in 0.5 °C,
// seconds in 0.1 s below 12.75 s then whole seconds to 127, volume in whole mL to 1023.

export type FieldKey =
  | "pressure"
  | "flowLimiter"
  | "temperature"
  | "seconds"
  | "volume"
  | "exitFlow"
  | "weight";

export type FieldSpec = {
  key: FieldKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  /** UI step: what one ± tap or one scrubber tick moves. */
  step: number | ((value: number, direction: 1 | -1) => number);
  /** Coarse step for hold-to-repeat / fast scrub. */
  coarseStep: number;
  /** Digits shown. */
  digits: number;
  /** Machine encoding: how the DE1 quantises this value. Shown so the operator sees drift. */
  encode: (value: number) => number;
  encodeNote: string;
  /** Quick values operators reach for. */
  presets: number[];
};

const sixteenth = (value: number) => Math.round(value * 16) / 16;
const half = (value: number) => Math.round(value * 2) / 2;
const secondsStep = (value: number, direction: 1 | -1) => {
  if (direction === 1) {
    return value < 12.75 ? 0.1 : 1;
  }
  return value <= 12.75 ? 0.1 : 1;
};
const encodeSeconds = (value: number) =>
  value < 12.75 ? Math.round(value * 10) / 10 : Math.round(value);

export const fieldSpecs: ReadonlyArray<FieldSpec> = [
  {
    key: "pressure",
    label: "Pressure",
    unit: "bar",
    min: 0,
    max: 15.9,
    step: 0.1,
    coarseStep: 0.5,
    digits: 1,
    encode: sixteenth,
    encodeNote: "1/16 bar on DE1",
    presets: [6, 8, 9, 10],
  },
  {
    key: "flowLimiter",
    label: "Max flow",
    unit: "mL/s",
    min: 0,
    max: 15.9,
    step: 0.1,
    coarseStep: 0.5,
    digits: 1,
    encode: sixteenth,
    encodeNote: "1/16 mL/s on DE1; 0 = no cap",
    presets: [0, 2, 4, 8],
  },
  {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    min: 0,
    max: 127.5,
    step: 0.5,
    coarseStep: 1,
    digits: 1,
    encode: half,
    encodeNote: "0.5 °C steps",
    presets: [88, 90, 93, 96],
  },
  {
    key: "seconds",
    label: "Max time",
    unit: "s",
    min: 0,
    max: 127,
    step: secondsStep,
    coarseStep: 1,
    digits: 1,
    encode: encodeSeconds,
    encodeNote: "0.1 s below 12.75 s, then whole seconds",
    presets: [5, 10, 30, 60],
  },
  {
    key: "volume",
    label: "Max volume",
    unit: "mL",
    min: 0,
    max: 1023,
    step: 1,
    coarseStep: 10,
    digits: 0,
    encode: Math.trunc,
    encodeNote: "whole mL; 0 = no limit",
    presets: [0, 50, 100, 200],
  },
  {
    key: "exitFlow",
    label: "Exit: flow under",
    unit: "mL/s",
    min: 0,
    max: 15.9,
    step: 0.1,
    coarseStep: 0.5,
    digits: 1,
    encode: sixteenth,
    encodeNote: "1/16 mL/s; 0 is NOT off (never fires)",
    presets: [0.5, 1, 1.5, 2],
  },
  {
    key: "weight",
    label: "Exit: weight over",
    unit: "g",
    min: 0,
    max: 200,
    step: 0.1,
    coarseStep: 1,
    digits: 1,
    encode: (value) => Math.round(value * 10) / 10,
    encodeNote: "Bridge-enforced; 0 = off",
    presets: [0, 18, 36, 40],
  },
];

export type StepDraft = Record<FieldKey, number>;

export const initialStepDraft: StepDraft = {
  pressure: 9,
  flowLimiter: 4,
  temperature: 93,
  seconds: 25,
  volume: 100,
  exitFlow: 2,
  weight: 0,
};

export function getSpec(key: FieldKey) {
  return fieldSpecs.find((spec) => spec.key === key)!;
}

export function stepSize(spec: FieldSpec, value: number, direction: 1 | -1) {
  return typeof spec.step === "function" ? spec.step(value, direction) : spec.step;
}

export function clamp(spec: FieldSpec, value: number) {
  return Math.min(spec.max, Math.max(spec.min, value));
}

export function nudge(spec: FieldSpec, value: number, direction: 1 | -1, coarse = false) {
  const size = coarse ? spec.coarseStep : stepSize(spec, value, direction);
  const next = Number((value + direction * size).toFixed(4));
  return clamp(spec, Number(next.toFixed(spec.digits)));
}

export function formatValue(spec: FieldSpec, value: number) {
  return value.toFixed(spec.digits);
}

export function isInRange(spec: FieldSpec, value: number) {
  return Number.isFinite(value) && value >= spec.min && value <= spec.max;
}

/** Shows what the machine will actually run if it differs from what the operator typed. */
export function encodedDrift(spec: FieldSpec, value: number) {
  const encoded = spec.encode(value);
  if (Math.abs(encoded - value) < 0.0005) {
    return null;
  }
  return encoded;
}
