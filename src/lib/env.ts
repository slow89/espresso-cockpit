import { z } from "zod";

const envSchema = z.object({
  VITE_BRIDGE_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(import.meta.env);

export const env = parsed.success
  ? parsed.data
  : {
      VITE_BRIDGE_URL: undefined,
    };
