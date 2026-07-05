import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, KeyRound, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DashboardPostShotSummary } from "@/lib/dashboard-post-shot-summary";
import {
  isShotAnalysisConfigured,
  requestShotAnalysis,
  ShotAnalysisError,
  tasteCompassScales,
  type ShotAnalysisErrorKind,
  type ShotAnalysisResult,
  type TasteCompassState,
} from "@/lib/shot-analysis";
import { useShotAnalysisSettingsStore } from "@/stores/shot-analysis-store";

type AnalysisUiState =
  | { phase: "idle" }
  | { phase: "setup" }
  | { phase: "loading" }
  | { phase: "done"; result: ShotAnalysisResult }
  | { phase: "error"; kind: ShotAnalysisErrorKind | "unknown"; message: string };

function useShotAnalysisRequest(summary: DashboardPostShotSummary) {
  const apiKey = useShotAnalysisSettingsStore((state) => state.apiKey);
  const baseUrl = useShotAnalysisSettingsStore((state) => state.baseUrl);
  const model = useShotAnalysisSettingsStore((state) => state.model);
  const provider = useShotAnalysisSettingsStore((state) => state.provider);
  const [state, setState] = useState<AnalysisUiState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function analyze(compass: TasteCompassState) {
    if (!isShotAnalysisConfigured({ apiKey, baseUrl, model, provider })) {
      setState({ phase: "setup" });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ phase: "loading" });

    requestShotAnalysis({
      apiKey,
      baseUrl,
      compass,
      model,
      provider,
      signal: controller.signal,
      summary,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setState({ phase: "done", result });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ShotAnalysisError) {
          setState({ kind: error.kind, message: error.message, phase: "error" });
          return;
        }

        setState({
          kind: "unknown",
          message: "The analysis failed unexpectedly.",
          phase: "error",
        });
      });
  }

  function reset() {
    abortRef.current?.abort();
    setState({ phase: "idle" });
  }

  return { analyze, reset, state };
}

/**
 * Shot Analysis + Taste Compass console inside the expanded Post-Shot Summary.
 * Everything here is ephemeral — taste taps and the analysis are discarded
 * with the summary (the parent keys this component by the summary's localId).
 */
export function DashboardPostShotAnalysis({ summary }: { summary: DashboardPostShotSummary }) {
  const [compass, setCompass] = useState<TasteCompassState>({});
  const { analyze, reset, state } = useShotAnalysisRequest(summary);

  return (
    <div
      className="grid gap-3 px-3 py-2.5 md:grid-cols-[auto_minmax(0,1fr)] md:gap-6 md:px-4"
      data-testid="dashboard-post-shot-analysis"
    >
      <div className="space-y-1.5">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
          Taste · optional
        </p>
        {tasteCompassScales.map((scale) => (
          <div className="flex items-center gap-1.5" key={scale.id}>
            {scale.options.map((option, index) => {
              const selected = compass[scale.id] === index;

              return (
                <button
                  aria-pressed={selected}
                  className={
                    selected
                      ? "rounded-full border border-primary/60 bg-primary/20 px-3 py-2 font-mono text-[0.72rem] text-primary transition-colors"
                      : "rounded-full border border-border/70 px-3 py-2 font-mono text-[0.72rem] text-muted-foreground transition-colors hover:text-foreground"
                  }
                  key={option}
                  onClick={() =>
                    setCompass((previous) => ({
                      ...previous,
                      [scale.id]: selected ? undefined : index,
                    }))
                  }
                  type="button"
                >
                  {option}
                </button>
              );
            })}
          </div>
        ))}
        <Button
          className="mt-1 h-11 w-full rounded-[4px] font-mono text-[0.76rem] font-semibold"
          disabled={state.phase === "loading"}
          onClick={() => (state.phase === "done" ? reset() : analyze(compass))}
          size="sm"
          variant={state.phase === "done" ? "outline" : "default"}
        >
          <Sparkles className="size-3.5" />
          {state.phase === "done" ? "Clear reading" : "Analyze"}
        </Button>
      </div>

      <div className="min-w-0">
        <AnalysisConsole onRetry={() => analyze(compass)} state={state} />
      </div>
    </div>
  );
}

function AnalysisConsole({ onRetry, state }: { onRetry: () => void; state: AnalysisUiState }) {
  if (state.phase === "setup") {
    return <SetupPanel />;
  }

  if (state.phase === "loading") {
    return (
      <div className="flex h-full min-h-[88px] items-center justify-center rounded-[4px] border border-dashed border-border/70">
        <div className="flex items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-muted-foreground">
          <Sparkles className="size-3.5 animate-pulse text-primary" />
          <span className="animate-pulse">Reading telemetry…</span>
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-[4px] border border-status-error-border/60 bg-status-error-surface/40 px-3 py-2.5">
        <p className="min-w-0 flex-1 text-[0.79rem] text-status-error-foreground">
          {state.message}
        </p>
        {state.kind === "auth" ? (
          <Button
            asChild
            className="h-10 rounded-[4px] px-3 font-mono text-[0.75rem]"
            size="sm"
            variant="secondary"
          >
            <Link to="/settings">Open Setup</Link>
          </Button>
        ) : null}
        <Button
          className="h-10 rounded-[4px] px-3 font-mono text-[0.75rem]"
          onClick={onRetry}
          size="sm"
          variant="secondary"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <div className="space-y-2">
        <p className="text-[0.79rem] leading-relaxed text-foreground/90">
          {state.result.diagnosis}
        </p>
        <div className="flex items-center gap-3 rounded-[4px] border border-primary/40 bg-primary/10 px-3 py-2">
          <ArrowDownRight className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">
              Primary adjustment
            </p>
            <p className="font-mono text-[0.85rem] font-semibold uppercase tracking-[0.06em] text-primary">
              {state.result.primary.action} · {state.result.primary.detail}
            </p>
            <p className="mt-0.5 text-[0.77rem] text-muted-foreground">
              {state.result.primary.rationale}
            </p>
          </div>
        </div>
        {state.result.secondary ? (
          <p className="text-[0.76rem] text-muted-foreground">
            <span className="font-mono uppercase tracking-[0.1em]">Then consider:</span>{" "}
            {state.result.secondary.action} — {state.result.secondary.rationale}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[88px] items-center justify-center rounded-[4px] border border-dashed border-border/70 px-4">
      <p className="text-center font-mono text-[0.73rem] uppercase tracking-[0.1em] text-muted-foreground/70">
        No reading yet — Analyze reads telemetry alone; taste taps sharpen it
      </p>
    </div>
  );
}

function SetupPanel() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[4px] border border-status-info-border/50 bg-status-info-surface/40 px-3 py-2.5">
      <KeyRound className="size-4 shrink-0 text-status-info-foreground" />
      <p className="min-w-0 flex-1 text-[0.79rem] text-status-info-foreground">
        Shot Analysis needs an LLM provider. Configure one in Setup — keys stay on this tablet.
      </p>
      <Button
        asChild
        className="h-10 rounded-[4px] px-3 font-mono text-[0.75rem]"
        size="sm"
        variant="secondary"
      >
        <Link to="/settings">Open Setup</Link>
      </Button>
    </div>
  );
}
