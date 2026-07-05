import { useState, type FormEvent } from "react";

import { ControlBlock, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { useShotAnalysisSettingsStore } from "@/stores/shot-analysis-store";

export function SettingsShotAnalysisPanel() {
  const apiKey = useShotAnalysisSettingsStore((state) => state.apiKey);
  const setApiKey = useShotAnalysisSettingsStore((state) => state.setApiKey);
  const clearApiKey = useShotAnalysisSettingsStore((state) => state.clearApiKey);
  const [draft, setDraft] = useState("");
  const hasApiKey = apiKey !== "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (draft.trim() === "") {
      return;
    }

    setApiKey(draft);
    setDraft("");
  }

  return (
    <SettingsSection
      description="Post-shot readings via the Anthropic API — the key stays on this tablet"
      title="Shot Analysis"
    >
      <ControlBlock
        description="Used only when you tap Analyze on a finished shot"
        label="Anthropic API key"
        value={hasApiKey ? "Configured" : "Not set"}
      >
        <form className="mt-2 flex items-center gap-2" onSubmit={handleSubmit}>
          <input
            aria-label="Anthropic API key"
            autoComplete="off"
            className="h-8 min-w-0 flex-1 rounded-[3px] border border-border/60 bg-shell px-2 font-mono text-[0.6rem] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none"
            onChange={(event) => setDraft(event.target.value)}
            placeholder={hasApiKey ? "Replace saved key…" : "sk-ant-…"}
            type="password"
            value={draft}
          />
          <Button
            className="h-8 rounded-[3px] px-3 text-[0.52rem] uppercase tracking-[0.14em]"
            disabled={draft.trim() === ""}
            size="sm"
            type="submit"
            variant="secondary"
          >
            Save
          </Button>
          {hasApiKey ? (
            <Button
              className="h-8 rounded-[3px] px-3 text-[0.52rem] uppercase tracking-[0.14em]"
              onClick={clearApiKey}
              size="sm"
              type="button"
              variant="ghost"
            >
              Clear
            </Button>
          ) : null}
        </form>
      </ControlBlock>
    </SettingsSection>
  );
}
