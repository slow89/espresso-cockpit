import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getVisualizerCredentialKey,
  getVisualizerDraft,
  hasVisualizerCredentials,
  isVisualizerEnabled,
} from "@/lib/visualizer";
import { cn } from "@/lib/utils";
import {
  useUpdateVisualizerSettingsMutation,
  useVerifyVisualizerCredentialsMutation,
  useVisualizerSettingsQuery,
} from "@/rest/queries";

type NoticeTone = "error" | "success";

interface NoticeState {
  message: string;
  tone: NoticeTone;
}

export function VisualizerSettingsPanel() {
  const settingsQuery = useVisualizerSettingsQuery();
  const updateSettingsMutation = useUpdateVisualizerSettingsMutation();
  const verifyCredentialsMutation = useVerifyVisualizerCredentialsMutation();
  const savedDraft = getVisualizerDraft(settingsQuery.data);
  const [draftOverride, setDraftOverride] = useState<typeof savedDraft | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);
  const draft = draftOverride ?? savedDraft;

  const hasCredentials = hasVisualizerCredentials(draft);
  const isBusy =
    settingsQuery.isPending ||
    updateSettingsMutation.isPending ||
    verifyCredentialsMutation.isPending;
  const isConfigured = hasVisualizerCredentials(settingsQuery.data);
  const isEnabled = isVisualizerEnabled(settingsQuery.data);
  const hasDraftChanges =
    draft.Username !== savedDraft.Username || draft.Password !== savedDraft.Password;
  const draftKey = getVisualizerCredentialKey(draft);
  const isDraftVerified = hasCredentials && verifiedKey === draftKey;
  const status = getStatusLabel({
    hasCredentials,
    isConfigured,
    isDraftVerified,
    isEnabled,
    isLoading: settingsQuery.isPending,
    isSaving: updateSettingsMutation.isPending,
    isVerifying: verifyCredentialsMutation.isPending,
    notice,
  });

  async function handleVerify() {
    const username = draft.Username.trim();
    const password = draft.Password.trim();

    if (!username || !password) {
      setNotice({
        message: "Enter credentials",
        tone: "error",
      });
      setVerifiedKey(null);
      return;
    }

    setNotice(null);

    try {
      const result = await verifyCredentialsMutation.mutateAsync({
        password,
        username,
      });

      if (!result.valid) {
        setNotice({
          message: "Check credentials",
          tone: "error",
        });
        setVerifiedKey(null);
        return;
      }

      setVerifiedKey(
        getVisualizerCredentialKey({
          Password: password,
          Username: username,
        }),
      );
      setNotice({
        message: "Verified",
        tone: "success",
      });
    } catch (error) {
      setNotice({
        message: getVisualizerActionErrorMessage(error, "Verify failed"),
        tone: "error",
      });
      setVerifiedKey(null);
    }
  }

  async function handleEnable() {
    if (!isDraftVerified) {
      setNotice({
        message: "Verify first",
        tone: "error",
      });
      return;
    }

    const nextSettings = {
      AutoUpload: true,
      LengthThreshold: savedDraft.LengthThreshold,
      Password: draft.Password.trim(),
      Username: draft.Username.trim(),
    };

    try {
      const updatedSettings = await updateSettingsMutation.mutateAsync(nextSettings);
      const nextDraft = getVisualizerDraft(updatedSettings);

      setDraftOverride(null);
      setVerifiedKey(getVisualizerCredentialKey(nextDraft));
      setNotice({
        message: "Visualizer on",
        tone: "success",
      });
    } catch (error) {
      setNotice({
        message: getVisualizerActionErrorMessage(error, "Save failed"),
        tone: "error",
      });
    }
  }

  async function handleDisable() {
    try {
      const updatedSettings = await updateSettingsMutation.mutateAsync({
        AutoUpload: false,
        LengthThreshold: savedDraft.LengthThreshold,
        Password: savedDraft.Password,
        Username: savedDraft.Username,
      });
      const nextDraft = getVisualizerDraft(updatedSettings);
      let nextVerifiedKey: string | null = null;

      if (isVisualizerEnabled(updatedSettings)) {
        nextVerifiedKey = getVisualizerCredentialKey(nextDraft);
      }

      setDraftOverride(null);
      setVerifiedKey(nextVerifiedKey);
      setNotice({
        message: "Visualizer off",
        tone: "success",
      });
    } catch (error) {
      setNotice({
        message: getVisualizerActionErrorMessage(error, "Save failed"),
        tone: "error",
      });
    }
  }

  return (
    <section className="rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[0.5rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Visualizer
          </p>
          <span className="font-mono text-[0.42rem] text-muted-foreground/40">|</span>
          <p className="font-mono text-[0.46rem] uppercase tracking-[0.06em] text-muted-foreground/60">
            Upload + profile import
          </p>
        </div>
        <span
          className={cn(
            "rounded-[2px] border px-1.5 py-0.5 font-mono text-[0.48rem] font-semibold uppercase tracking-[0.12em]",
            status.tone === "success"
              ? "border-accent/35 bg-accent/10 text-accent"
              : status.tone === "error"
                ? "border-destructive/35 bg-destructive/10 text-destructive"
                : "border-border/50 bg-panel-strong text-muted-foreground",
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        <label className="grid gap-0.5" htmlFor="visualizer-username">
          <span className="font-mono text-[0.42rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            Username
          </span>
          <Input
            autoCapitalize="none"
            autoCorrect="off"
            className="h-8 rounded-[3px] border-border/50 bg-panel-strong px-2.5 font-mono text-[0.64rem]"
            disabled={isBusy}
            id="visualizer-username"
            onChange={(event) => {
              setDraftOverride({
                ...draft,
                Username: event.target.value,
              });
              setNotice(null);
              setVerifiedKey(null);
            }}
            value={draft.Username}
          />
        </label>

        <label className="grid gap-0.5" htmlFor="visualizer-password">
          <span className="font-mono text-[0.42rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            Password
          </span>
          <Input
            className="h-8 rounded-[3px] border-border/50 bg-panel-strong px-2.5 font-mono text-[0.64rem]"
            disabled={isBusy}
            id="visualizer-password"
            onChange={(event) => {
              setDraftOverride({
                ...draft,
                Password: event.target.value,
              });
              setNotice(null);
              setVerifiedKey(null);
            }}
            type="password"
            value={draft.Password}
          />
        </label>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <Button
          className="min-h-[32px] rounded-[3px] px-2.5 text-[0.5rem] uppercase tracking-[0.14em]"
          disabled={!hasCredentials || isBusy}
          onClick={() => void handleVerify()}
          size="sm"
          type="button"
          variant="secondary"
        >
          {verifyCredentialsMutation.isPending ? "Verifying" : "Verify"}
        </Button>

        {isEnabled && !hasDraftChanges ? (
          <Button
            className="min-h-[32px] rounded-[3px] px-2.5 text-[0.5rem] uppercase tracking-[0.14em]"
            disabled={isBusy}
            onClick={() => void handleDisable()}
            size="sm"
            type="button"
          >
            {updateSettingsMutation.isPending ? "Saving" : "Disable"}
          </Button>
        ) : (
          <Button
            className="min-h-[32px] rounded-[3px] px-2.5 text-[0.5rem] uppercase tracking-[0.14em]"
            disabled={!isDraftVerified || isBusy}
            onClick={() => void handleEnable()}
            size="sm"
            type="button"
          >
            {updateSettingsMutation.isPending
              ? "Saving"
              : isEnabled
                ? "Save"
                : "Enable uploads"}
          </Button>
        )}

        {settingsQuery.error ? (
          <p className="ml-auto font-mono text-[0.5rem] text-destructive">
            {settingsQuery.error.message}
          </p>
        ) : notice ? (
          <p
            className={cn(
              "ml-auto font-mono text-[0.5rem]",
              notice.tone === "error" ? "text-destructive" : "text-highlight",
            )}
          >
            {notice.message}
          </p>
        ) : (
          <p className="ml-auto font-mono text-[0.46rem] text-muted-foreground/50">
            {isConfigured ? "Verify before enabling" : "Enter your Visualizer account"}
          </p>
        )}
      </div>
    </section>
  );
}

function getStatusLabel({
  hasCredentials,
  isConfigured,
  isDraftVerified,
  isEnabled,
  isLoading,
  isSaving,
  isVerifying,
  notice,
}: {
  hasCredentials: boolean;
  isConfigured: boolean;
  isDraftVerified: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isVerifying: boolean;
  notice: NoticeState | null;
}) {
  if (isLoading || isSaving) {
    return { label: "Loading", tone: "default" as const };
  }

  if (isVerifying) {
    return { label: "Verifying", tone: "default" as const };
  }

  if (notice?.tone === "error") {
    return { label: "Attention", tone: "error" as const };
  }

  if (isEnabled) {
    return { label: "Connected", tone: "success" as const };
  }

  if (isDraftVerified) {
    return { label: "Ready", tone: "success" as const };
  }

  if (hasCredentials || isConfigured) {
    return { label: "Credentials", tone: "default" as const };
  }

  return {
    label: hasCredentials ? "Ready" : "Off",
    tone: "default" as const,
  };
}

function getVisualizerActionErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
