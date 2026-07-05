import { z } from "zod";

import { useShotAnalysisSettingsStore } from "@/stores/shot-analysis-store";

/**
 * Deploy-time provisioning: `pnpm deploy:tablet` bundles the operator's
 * provider settings from the laptop's .env into the skin as a static JSON
 * file, so the tablet never needs a key typed into it (ADR 0002).
 */
export const shotAnalysisProvisionFileName = "shot-analysis-provision.json";

const shotAnalysisProvisionSchema = z.object({
  apiKey: z.string().default(""),
  baseUrl: z.string().default(""),
  model: z.string().default(""),
  provider: z.enum(["anthropic", "openai-compatible"]).default("anthropic"),
});

export type ShotAnalysisProvision = z.infer<typeof shotAnalysisProvisionSchema>;

/**
 * Applies a provision payload once per distinct payload: manual edits made on
 * the tablet survive reboots, while a redeploy with a rotated key wins again.
 * Returns whether the payload was applied.
 */
export function applyShotAnalysisProvision(raw: unknown): boolean {
  const parsed = shotAnalysisProvisionSchema.safeParse(raw);

  if (!parsed.success) {
    return false;
  }

  const stamp = JSON.stringify(parsed.data);

  if (useShotAnalysisSettingsStore.getState().provisionStamp === stamp) {
    return false;
  }

  useShotAnalysisSettingsStore.setState({ ...parsed.data, provisionStamp: stamp });

  return true;
}

export async function provisionShotAnalysisFromDeploy(): Promise<void> {
  let payload: unknown;

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${shotAnalysisProvisionFileName}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    payload = await response.json();
  } catch {
    // No provision file (dev server, or deploy without SHOT_ANALYSIS_* set).
    return;
  }

  applyShotAnalysisProvision(payload);
}
