import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError } from "@ai-sdk/provider";
import {
  generateText,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  RetryError,
} from "ai";
import { z } from "zod";

import type { DashboardPostShotSummary } from "@/lib/dashboard-post-shot-summary";
import {
  getPostShotActualRatio,
  getPostShotDurationSeconds,
  getPostShotFinalWeight,
} from "@/lib/dashboard-post-shot-summary";
import type { TelemetrySample } from "@/lib/telemetry";

export type ShotAnalysisProviderId = "anthropic" | "openai-compatible";

export const shotAnalysisProviders: ReadonlyArray<{
  id: ShotAnalysisProviderId;
  label: string;
}> = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai-compatible", label: "OpenAI-compatible" },
];

/** Model used when the operator leaves the model field empty on Anthropic. */
export const defaultShotAnalysisModel = "claude-opus-4-8";

/** Operator-supplied provider settings, persisted Skin-local. */
export interface ShotAnalysisConnection {
  apiKey: string;
  /** OpenAI-compatible endpoint, e.g. https://openrouter.ai/api/v1. Unused for Anthropic. */
  baseUrl: string;
  /** Empty selects the provider default (Anthropic only). */
  model: string;
  provider: ShotAnalysisProviderId;
}

export function isShotAnalysisConfigured(connection: ShotAnalysisConnection): boolean {
  if (connection.provider === "anthropic") {
    return connection.apiKey !== "";
  }

  // Keyless endpoints (e.g. local Ollama) are valid, so only the endpoint and
  // model are required.
  return connection.baseUrl !== "" && connection.model !== "";
}

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

export const shotAnalysisResultSchema = z.object({
  diagnosis: z
    .string()
    .min(1)
    .describe(
      "Two or three sentences reading the telemetry (and taste input when given), citing concrete numbers from the data.",
    ),
  primary: z.object({
    action: z
      .string()
      .min(1)
      .describe("Short imperative label for the single dial-in change, e.g. 'Grind finer'."),
    detail: z.string().min(1).describe("The magnitude, e.g. '2 steps' or '1:2.0 → 1:2.3'."),
    rationale: z.string().min(1).describe("One sentence on why this change first."),
  }),
  secondary: z
    .object({
      action: z.string().min(1),
      rationale: z.string().min(1),
    })
    .nullable()
    .describe("Optional follow-up to consider only after the primary change is tested, or null."),
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

function buildShotAnalysisModel(connection: ShotAnalysisConnection) {
  if (connection.provider === "anthropic") {
    // ADR 0002: the Skin calls the provider directly from the tablet with the
    // operator's own key, so browser access is deliberate.
    return createAnthropic({
      apiKey: connection.apiKey,
      headers: { "anthropic-dangerous-direct-browser-access": "true" },
    })(connection.model === "" ? defaultShotAnalysisModel : connection.model);
  }

  return createOpenAICompatible({
    apiKey: connection.apiKey === "" ? undefined : connection.apiKey,
    baseURL: connection.baseUrl,
    name: "openai-compatible",
  })(connection.model);
}

export async function requestShotAnalysis({
  apiKey,
  baseUrl,
  compass,
  model,
  provider,
  signal,
  summary,
}: ShotAnalysisConnection & {
  compass: TasteCompassState;
  signal?: AbortSignal;
  summary: DashboardPostShotSummary;
}): Promise<ShotAnalysisResult> {
  try {
    const { output } = await generateText({
      abortSignal: signal,
      maxRetries: 1,
      model: buildShotAnalysisModel({ apiKey, baseUrl, model, provider }),
      output: Output.object({ schema: shotAnalysisResultSchema }),
      prompt: buildShotAnalysisPrompt(summary, compass),
      system: shotAnalysisSystemPrompt,
    });

    return output;
  } catch (error) {
    const normalizedError = toShotAnalysisError(error);

    // Streamline Bridge persists WebView console output. Keep this deliberately
    // free of request data and credentials while retaining enough information
    // to diagnose failures that only happen in the tablet's embedded browser.
    const errorName = error instanceof Error ? error.name : typeof error;
    const errorMessage = error instanceof Error ? error.message : "No error message";
    const kind = normalizedError instanceof ShotAnalysisError ? normalizedError.kind : "cancelled";

    console.warn(`[shot-analysis] Request failed: ${errorName} (${kind}): ${errorMessage}`);

    throw normalizedError;
  }
}

export function toShotAnalysisError(error: unknown): unknown {
  if (error instanceof ShotAnalysisError) {
    return error;
  }

  if (RetryError.isInstance(error)) {
    // Aborts propagate untouched so callers can tell a cancelled request from
    // a failed one; otherwise classify what actually failed.
    return error.reason === "abort" ? error : toShotAnalysisError(error.lastError);
  }

  if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)) {
    return new ShotAnalysisError("response", "The analysis came back malformed.");
  }

  if (APICallError.isInstance(error)) {
    const status = error.statusCode;

    if (status === 401 || status === 403) {
      return new ShotAnalysisError("auth", "The API key was rejected.");
    }

    if (status === 429 || (status != null && status >= 500)) {
      return new ShotAnalysisError("busy", "The analysis service is busy right now.");
    }

    if (status == null) {
      return new ShotAnalysisError("network", "Couldn't reach the analysis service.");
    }

    return new ShotAnalysisError("response", "The analysis request failed.");
  }

  // Browser fetch failures surface as a bare TypeError instead of an
  // APICallError in some Android WebView / provider combinations.
  if (error instanceof TypeError) {
    return new ShotAnalysisError("network", "Couldn't reach the analysis service.");
  }

  // Do not make callers understand every AI SDK error class. Anything that
  // reached the provider but was not classified above is a response failure.
  return new ShotAnalysisError("response", "The analysis request failed.");
}
