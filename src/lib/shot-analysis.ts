import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import type { DashboardPostShotSummary } from "@/lib/dashboard-post-shot-summary";
import {
  getPostShotActualRatio,
  getPostShotDurationSeconds,
  getPostShotFinalWeight,
} from "@/lib/dashboard-post-shot-summary";
import type { TelemetrySample } from "@/lib/telemetry";

export const shotAnalysisModel = "claude-opus-4-8";

// Enough resolution for the model to see ramps and tails without paying for
// every sample the DE1 streamed.
export const maxShotAnalysisTelemetryRows = 100;

export type TasteCompassScaleId = "extraction" | "strength" | "body";

/** Index into the scale's options, matching the tap order in the UI. */
export type TasteCompassState = Partial<Record<TasteCompassScaleId, number>>;

export const tasteCompassScales: ReadonlyArray<{
  id: TasteCompassScaleId;
  label: string;
  options: readonly [string, string, string];
}> = [
  { id: "extraction", label: "Extraction", options: ["Too sour", "Balanced", "Too bitter"] },
  { id: "strength", label: "Strength", options: ["Weak", "Right", "Harsh"] },
  { id: "body", label: "Body", options: ["Thin", "Right", "Heavy"] },
];

const shotAnalysisAdjustmentSchema = z.object({
  action: z.string().min(1),
  detail: z.string().min(1),
  rationale: z.string().min(1),
});

const shotAnalysisResultSchema = z.object({
  diagnosis: z.string().min(1),
  primary: shotAnalysisAdjustmentSchema,
  secondary: z
    .object({
      action: z.string().min(1),
      rationale: z.string().min(1),
    })
    .nullable(),
});

export type ShotAnalysisResult = z.infer<typeof shotAnalysisResultSchema>;

export type ShotAnalysisErrorKind = "auth" | "network" | "busy" | "response";

export class ShotAnalysisError extends Error {
  readonly kind: ShotAnalysisErrorKind;

  constructor(kind: ShotAnalysisErrorKind, message: string) {
    super(message);
    this.name = "ShotAnalysisError";
    this.kind = kind;
  }
}

const shotAnalysisResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["diagnosis", "primary", "secondary"],
  properties: {
    diagnosis: {
      type: "string",
      description:
        "Two or three sentences reading the telemetry (and taste input when given), citing concrete numbers from the data.",
    },
    primary: {
      type: "object",
      additionalProperties: false,
      required: ["action", "detail", "rationale"],
      properties: {
        action: {
          type: "string",
          description: "Short imperative label for the single dial-in change, e.g. 'Grind finer'.",
        },
        detail: {
          type: "string",
          description: "The magnitude, e.g. '2 steps' or '1:2.0 → 1:2.3'.",
        },
        rationale: { type: "string", description: "One sentence on why this change first." },
      },
    },
    secondary: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["action", "rationale"],
          properties: {
            action: { type: "string" },
            rationale: { type: "string" },
          },
        },
        { type: "null" },
      ],
      description:
        "Optional follow-up to consider only after the primary change is tested, or null.",
    },
  },
} as const;

const shotAnalysisSystemPrompt = [
  "You are an espresso dial-in assistant reading a single finished shot from a Decent DE1.",
  "Ground every claim in the telemetry table: cite the numbers you are reacting to.",
  "Recommend exactly one primary adjustment changing one variable (grind, dose, yield/ratio, or temperature) with a concrete magnitude.",
  "Only add a secondary suggestion when it is clearly worth queuing behind the primary; otherwise return null for it.",
  "When taste input is present, weigh it above telemetry shape; when absent, read the telemetry alone without asking for taste input.",
  "The operator applies changes by hand. Never suggest firmware, machine, or workflow edits beyond dial-in variables.",
].join(" ");

export function buildShotAnalysisPrompt(
  summary: DashboardPostShotSummary,
  compass: TasteCompassState,
): string {
  const durationSeconds = getPostShotDurationSeconds(summary.telemetry);
  const finalWeight = getPostShotFinalWeight(summary.telemetry);
  const actualRatio = getPostShotActualRatio(summary);
  const { targetDoseWeight, targetYield } = summary.workflow;

  const facts = [
    `Profile: ${summary.workflow.profileTitle ?? summary.workflow.name ?? "unknown"}`,
    `Coffee: ${summary.workflow.coffeeName ?? "not recorded"}`,
    `Target dose: ${formatFact(targetDoseWeight, "g")}`,
    `Target yield: ${formatFact(targetYield, "g")}`,
    `Final yield: ${formatFact(finalWeight, "g")}`,
    `Actual ratio: ${actualRatio == null ? "unknown" : `1:${actualRatio.toFixed(1)}`}`,
    `Duration: ${durationSeconds == null ? "unknown" : `${durationSeconds.toFixed(1)}s`}`,
  ];

  const tasteLines = tasteCompassScales.flatMap((scale) => {
    const picked = compass[scale.id];

    if (picked == null || scale.options[picked] == null) {
      return [];
    }

    return [`${scale.label}: ${scale.options[picked]}`];
  });

  const taste =
    tasteLines.length > 0
      ? `Operator taste input:\n${tasteLines.join("\n")}`
      : "Operator taste input: none — read telemetry alone.";

  return [
    "Read this espresso shot and recommend one primary dial-in adjustment.",
    `Shot facts:\n${facts.join("\n")}`,
    taste,
    `Telemetry (columns: ${telemetryColumns.join(", ")}):\n${buildTelemetryTable(summary.telemetry)}`,
  ].join("\n\n");
}

const telemetryColumns = [
  "t_s",
  "pressure_bar",
  "target_pressure_bar",
  "flow_mls",
  "target_flow_mls",
  "weight_g",
  "weight_flow_gs",
  "mix_temp_c",
  "group_temp_c",
] as const;

export function buildTelemetryTable(telemetry: TelemetrySample[]): string {
  const samples = downsampleTelemetry(telemetry, maxShotAnalysisTelemetryRows);
  const startElapsed = samples[0]?.elapsedSeconds ?? 0;

  return samples
    .map((sample) => {
      const elapsed = sample.shotElapsedSeconds ?? sample.elapsedSeconds - startElapsed;

      return [
        elapsed.toFixed(1),
        formatCell(sample.pressure),
        formatCell(sample.targetPressure),
        formatCell(sample.flow),
        formatCell(sample.targetFlow),
        formatCell(sample.weight),
        formatCell(sample.weightFlow),
        formatCell(sample.mixTemperature),
        formatCell(sample.groupTemperature),
      ].join(",");
    })
    .join("\n");
}

export function downsampleTelemetry(
  telemetry: TelemetrySample[],
  maxRows: number,
): TelemetrySample[] {
  if (telemetry.length <= maxRows || maxRows < 2) {
    return telemetry.slice(0, Math.max(0, maxRows));
  }

  const samples: TelemetrySample[] = [];
  const step = (telemetry.length - 1) / (maxRows - 1);

  for (let index = 0; index < maxRows; index += 1) {
    samples.push(telemetry[Math.round(index * step)]);
  }

  return samples;
}

function formatCell(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return value.toFixed(1);
}

function formatFact(value: number | null | undefined, unit: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "unknown";
  }

  return `${value.toFixed(1)} ${unit}`;
}

export function parseShotAnalysisText(text: string): ShotAnalysisResult {
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch {
    throw new ShotAnalysisError("response", "The analysis came back malformed.");
  }

  const parsed = shotAnalysisResultSchema.safeParse(raw);

  if (!parsed.success) {
    throw new ShotAnalysisError("response", "The analysis came back malformed.");
  }

  return parsed.data;
}

export async function requestShotAnalysis({
  apiKey,
  compass,
  signal,
  summary,
}: {
  apiKey: string;
  compass: TasteCompassState;
  signal?: AbortSignal;
  summary: DashboardPostShotSummary;
}): Promise<ShotAnalysisResult> {
  // ADR 0002: the Skin calls the Anthropic API directly from the tablet with
  // the operator's own key, so browser access is deliberate.
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });

  let response: Anthropic.Message;

  try {
    response = await client.messages.create(
      {
        model: shotAnalysisModel,
        max_tokens: 8192,
        thinking: { type: "adaptive" },
        system: shotAnalysisSystemPrompt,
        output_config: {
          format: {
            type: "json_schema",
            schema: shotAnalysisResponseJsonSchema,
          },
        },
        messages: [{ role: "user", content: buildShotAnalysisPrompt(summary, compass) }],
      },
      { signal },
    );
  } catch (error) {
    throw toShotAnalysisError(error);
  }

  if (response.stop_reason === "refusal") {
    throw new ShotAnalysisError("response", "The analysis service declined this request.");
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (text === "") {
    throw new ShotAnalysisError("response", "The analysis came back empty.");
  }

  return parseShotAnalysisText(text);
}

function toShotAnalysisError(error: unknown): unknown {
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return new ShotAnalysisError("auth", "The API key was rejected.");
  }

  if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
    return new ShotAnalysisError("busy", "The analysis service is busy right now.");
  }

  if (error instanceof Anthropic.APIConnectionError) {
    return new ShotAnalysisError("network", "Couldn't reach the analysis service.");
  }

  if (error instanceof Anthropic.APIError) {
    return new ShotAnalysisError("response", "The analysis request failed.");
  }

  // AbortError and anything else non-API propagate untouched so callers can
  // tell a cancelled request from a failed one.
  return error;
}
