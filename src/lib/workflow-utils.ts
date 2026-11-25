import type { WorkflowProfile } from "@/rest/types";

export function readString(formData: FormData, key: string, fallback: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
}

export function getProfileTitle(profile: WorkflowProfile | undefined) {
  return profile?.title?.trim() || "Untitled profile";
}

export function joinValues(values: Array<string | null | undefined>) {
  const presentValues = values.filter((value): value is string => Boolean(value?.trim()));

  if (!presentValues.length) {
    return "Nothing linked";
  }

  return presentValues.join(" / ");
}
