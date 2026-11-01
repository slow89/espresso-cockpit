// PROTOTYPE — throwaway. Field specs and Step accessors for the step-editor layout prototype
// (wayfinder ticket .scratch/profile-editor/issues/12-step-editor-layout.md).
// Limits are the Skin's from ticket 08; step sizes and coarse steps from ticket 05.

export type ProtoStep = Record<string, unknown>;

export type Axis = "pressure" | "flow";

export type StepFieldKey =
  | "temperature"
  | "target"
  | "cap"
  | "range"
  | "seconds"
  | "volume"
  | "weight"
  | "exitValue";

export type ProfileFieldKey = "tankPreheat" | "stopAtVolume";

export type FieldKey = StepFieldKey | ProfileFieldKey;

export type FieldSpec = {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number | ((value: number) => number);
  coarseStep: number;
  digits: number;
  /** Label shown at 0 for fields where 0 means off. */
  zeroLabel?: string;
  /** What the DE1 runs; null when the value isn't encoded. */
  encode?: (value: number) => number;
  /** A stored value past this wraps on the machine. */
  wraps?: (value: number) => string | null;
};

const sixteenth = (value: number) => Math.round(value * 16) / 16;
const half = (value: number) => Math.round(value * 2) / 2;

const pressureSpec: FieldSpec = {
  label: "Pressure",
  unit: "bar",
  min: 0,
  max: 12,
  step: 0.1,
  coarseStep: 0.5,
  digits: 1,
  encode: sixteenth,
  wraps: (value) => (value >= 16 ? `Runs as ${(value % 16).toFixed(1)} bar` : null),
};

const flowSpec: FieldSpec = {
  label: "Flow",
  unit: "mL/s",
  min: 0,
  max: 15.9,
  step: 0.1,
  coarseStep: 0.5,
  digits: 1,
  encode: sixteenth,
  wraps: (value) => (value >= 15.97 ? `Runs as ${(value % 16).toFixed(1)} mL/s` : null),
};

export const axisSpec: Record<Axis, FieldSpec> = { pressure: pressureSpec, flow: flowSpec };

export const temperatureSpec: FieldSpec = {
  label: "Temperature",
  unit: "°C",
  min: 0,
  max: 105,
  step: 0.5,
  coarseStep: 1,
  digits: 1,
  encode: half,
  wraps: (value) =>
    value < 0
      ? "Runs as 127.5 °C"
      : value > 127.5
        ? `Runs as ${(value - 128).toFixed(1)} °C`
        : null,
};

export const secondsSpec: FieldSpec = {
  label: "Max time",
  unit: "s",
  min: 0,
  max: 127,
  step: (value) => (value < 12.75 ? 0.1 : 1),
  coarseStep: 1,
  digits: 1,
  zeroLabel: "Instant",
  encode: (value) => (value < 12.75 ? Math.round(value * 10) / 10 : Math.round(value)),
  wraps: (value) => (value > 127 ? "Runs as Instant" : null),
};

export const volumeSpec: FieldSpec = {
  label: "Max volume",
  unit: "mL",
  min: 0,
  max: 1023,
  step: 1,
  coarseStep: 10,
  digits: 0,
  zeroLabel: "Off",
  encode: Math.trunc,
  wraps: (value) => (value >= 1024 ? "Runs as Off" : null),
};

export const weightSpec: FieldSpec = {
  label: "Weight",
  unit: "g",
  min: 0,
  max: 1000,
  step: 0.1,
  coarseStep: 1,
  digits: 1,
  zeroLabel: "Off",
};

export const rangeSpec = (axis: Axis): FieldSpec => ({
  ...axisSpec[axis],
  label: "Limiter range",
  min: 0.1,
});

export const tankPreheatSpec: FieldSpec = {
  label: "Tank preheat",
  unit: "°C",
  min: 0,
  max: 45,
  step: 1,
  coarseStep: 5,
  digits: 0,
  zeroLabel: "Off",
};

export const stopAtVolumeSpec: FieldSpec = {
  label: "Stop at volume",
  unit: "mL",
  min: 0,
  max: 2000,
  step: 1,
  coarseStep: 10,
  digits: 0,
  zeroLabel: "Off",
};

export const num = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const pumpOf = (step: ProtoStep): Axis => (step.pump === "flow" ? "flow" : "pressure");
export const otherAxis = (axis: Axis): Axis => (axis === "pressure" ? "flow" : "pressure");

type Limiter = { value: number; range: number } | null | undefined;
type Exit = { type: Axis; condition: "over" | "under"; value: number } | undefined;

export const limiterOf = (step: ProtoStep) => step.limiter as Limiter;
export const limiterOn = (step: ProtoStep) => num(limiterOf(step)?.value) > 0;
export const exitOf = (step: ProtoStep) => step.exit as Exit;

export type ExitChoice = "off" | "pressure-over" | "pressure-under" | "flow-over" | "flow-under";

export const exitChoices: ReadonlyArray<{ key: ExitChoice; label: string }> = [
  { key: "off", label: "Off" },
  { key: "pressure-over", label: "Pressure over" },
  { key: "pressure-under", label: "Pressure under" },
  { key: "flow-over", label: "Flow over" },
  { key: "flow-under", label: "Flow under" },
];

export function exitChoiceOf(step: ProtoStep): ExitChoice {
  const exit = exitOf(step);
  return exit ? (`${exit.type}-${exit.condition}` as ExitChoice) : "off";
}

/** The spec and stored value of a Step field, resolved for the Step's pump mode and exit. */
export function stepField(step: ProtoStep, key: StepFieldKey) {
  const pump = pumpOf(step);
  switch (key) {
    case "temperature":
      return { spec: temperatureSpec, value: num(step.temperature) };
    case "target":
      return { spec: { ...axisSpec[pump], label: "Target" }, value: num(step[pump]) };
    case "cap":
      return {
        spec: { ...axisSpec[otherAxis(pump)], label: `Max ${otherAxis(pump)}`, min: 0.1 },
        value: num(limiterOf(step)?.value),
      };
    case "range":
      return { spec: rangeSpec(otherAxis(pump)), value: num(limiterOf(step)?.range, 0.6) };
    case "seconds":
      return { spec: secondsSpec, value: num(step.seconds) };
    case "volume":
      return { spec: volumeSpec, value: num(step.volume) };
    case "weight":
      return { spec: weightSpec, value: num(step.weight) };
    case "exitValue": {
      const axis = exitOf(step)?.type ?? "pressure";
      return { spec: { ...axisSpec[axis], label: "Exit value" }, value: num(exitOf(step)?.value) };
    }
  }
}

export function stepSize(spec: FieldSpec, value: number) {
  return typeof spec.step === "function" ? spec.step(value) : spec.step;
}

export function clamp(spec: FieldSpec, value: number) {
  return Math.min(spec.max, Math.max(spec.min, value));
}

export function nudge(spec: FieldSpec, value: number, direction: 1 | -1, coarse = false) {
  const size = coarse ? spec.coarseStep : stepSize(spec, value);
  return clamp(spec, Number((value + direction * size).toFixed(spec.digits)));
}

/** Stored off-grid values show their real decimals (up to 3), so they look off-grid. */
export function formatValue(spec: FieldSpec, value: number) {
  if (value === 0 && spec.zeroLabel) return spec.zeroLabel;
  const actual = (String(Number(value.toFixed(3))).split(".")[1] ?? "").length;
  const digits = spec === secondsSpec && value >= 12.75 ? 0 : spec.digits;
  return value.toFixed(Math.max(digits, actual));
}

export function machineHint(spec: FieldSpec, value: number) {
  if (!spec.encode || spec.wraps?.(value)) return null;
  const encoded = spec.encode(value);
  return Math.abs(encoded - value) < 0.0005 ? null : encoded;
}

export type Flag = { tone: "block" | "warn"; text: string };

export function flagFor(spec: FieldSpec, value: number, key?: StepFieldKey): Flag | null {
  const wrap = spec.wraps?.(value);
  if (wrap) return { tone: "block", text: wrap };
  if (key === "exitValue" && value === 0) return { tone: "warn", text: "0 fires at once or never" };
  if (value > spec.max) return { tone: "warn", text: `Above ${spec.max} ${spec.unit}` };
  if (value < spec.min) return { tone: "warn", text: `Below ${spec.min} ${spec.unit}` };
  return null;
}

/** Fields shown for a Step, in de1app's four groups. Optional ones appear only when switched on. */
export function stepFlags(step: ProtoStep) {
  const keys: StepFieldKey[] = ["temperature", "target", "seconds", "volume", "weight"];
  if (limiterOn(step)) keys.push("cap", "range");
  if (exitOf(step)) keys.push("exitValue");
  return keys.flatMap((key) => {
    const { spec, value } = stepField(step, key);
    const flag = flagFor(spec, value, key);
    return flag ? [{ key, label: spec.label, ...flag }] : [];
  });
}

export const stepName = (step: ProtoStep, index: number) =>
  typeof step.name === "string" && step.name.trim() ? step.name : `Step ${index + 1}`;

export function stepSummary(step: ProtoStep) {
  const pump = pumpOf(step);
  const { spec, value } = stepField(step, "target");
  return `${pump === "pressure" ? "P" : "F"} ${formatValue(spec, value)} ${spec.unit}`;
}
