import { useState, type FormEvent } from "react";
import { ClipboardPaste, Eye, EyeOff } from "lucide-react";

import { ControlBlock, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import {
  defaultShotAnalysisModel,
  shotAnalysisProviders,
  type ShotAnalysisProviderId,
} from "@/lib/shot-analysis";
import { useShotAnalysisSettingsStore } from "@/stores/shot-analysis-store";

const inputClassName =
  "h-8 min-w-0 flex-1 rounded-[3px] border border-border/60 bg-shell px-2 font-mono text-[0.6rem] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none";

export function SettingsShotAnalysisPanel() {
  const apiKey = useShotAnalysisSettingsStore((state) => state.apiKey);
  const baseUrl = useShotAnalysisSettingsStore((state) => state.baseUrl);
  const model = useShotAnalysisSettingsStore((state) => state.model);
  const provider = useShotAnalysisSettingsStore((state) => state.provider);
  const setApiKey = useShotAnalysisSettingsStore((state) => state.setApiKey);
  const setBaseUrl = useShotAnalysisSettingsStore((state) => state.setBaseUrl);
  const setModel = useShotAnalysisSettingsStore((state) => state.setModel);
  const setProvider = useShotAnalysisSettingsStore((state) => state.setProvider);
  const clearApiKey = useShotAnalysisSettingsStore((state) => state.clearApiKey);
  const [draft, setDraft] = useState("");
  // Visible by default: this is a single-operator kitchen tablet, and pasting
  // or typing a ~100-char key blind is worse than the shoulder-surfing risk.
  const [showKey, setShowKey] = useState(true);
  const hasApiKey = apiKey !== "";
  const isAnthropic = provider === "anthropic";
  const canPaste = typeof navigator !== "undefined" && navigator.clipboard?.readText != null;

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();

      if (text.trim() !== "") {
        setDraft(text.trim());
      }
    } catch {
      // Clipboard permission denied — the operator can still long-press paste.
    }
  }

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
      description="Post-shot readings via your own LLM provider — keys stay on this tablet"
      title="Shot Analysis"
    >
      <ControlBlock
        description="The provider must allow direct browser requests"
        label="Provider"
        value={shotAnalysisProviders.find((entry) => entry.id === provider)?.label ?? provider}
      >
        <select
          aria-label="Provider"
          className={`${inputClassName} mt-2 w-full`}
          onChange={(event) => setProvider(event.target.value as ShotAnalysisProviderId)}
          value={provider}
        >
          {shotAnalysisProviders.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </ControlBlock>
      <ControlBlock
        description={
          isAnthropic ? `Empty uses ${defaultShotAnalysisModel}` : "Required for this provider"
        }
        label="Model"
        value={model === "" ? (isAnthropic ? "Default" : "Not set") : model}
      >
        <input
          aria-label="Model"
          autoComplete="off"
          className={`${inputClassName} mt-2 w-full`}
          onChange={(event) => setModel(event.target.value)}
          placeholder={isAnthropic ? defaultShotAnalysisModel : "e.g. llama3.3:70b"}
          type="text"
          value={model}
        />
      </ControlBlock>
      {isAnthropic ? null : (
        <ControlBlock
          description="OpenAI-compatible endpoint, e.g. Ollama or OpenRouter"
          label="Base URL"
          value={baseUrl === "" ? "Not set" : baseUrl}
        >
          <input
            aria-label="Base URL"
            autoComplete="off"
            className={`${inputClassName} mt-2 w-full`}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="http://localhost:11434/v1"
            type="text"
            value={baseUrl}
          />
        </ControlBlock>
      )}
      <ControlBlock
        description="Used only when you tap Analyze on a finished shot"
        label="API key"
        value={hasApiKey ? `Saved · …${apiKey.slice(-4)}` : "Not set"}
      >
        <form className="mt-2 flex items-center gap-2" onSubmit={handleSubmit}>
          <input
            aria-label="API key"
            autoComplete="off"
            className={inputClassName}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={hasApiKey ? "Replace saved key…" : isAnthropic ? "sk-ant-…" : "Optional"}
            type={showKey ? "text" : "password"}
            value={draft}
          />
          <Button
            aria-label={showKey ? "Hide API key" : "Show API key"}
            className="h-8 rounded-[3px] px-2"
            onClick={() => setShowKey((previous) => !previous)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>
          {canPaste ? (
            <Button
              aria-label="Paste API key"
              className="h-8 rounded-[3px] px-2"
              onClick={handlePaste}
              size="sm"
              type="button"
              variant="ghost"
            >
              <ClipboardPaste className="size-3.5" />
            </Button>
          ) : null}
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
