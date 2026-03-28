import { useEffect, useRef, useState } from "react";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  WorkflowFrameChart,
  WorkflowFrameMetricGrid,
} from "@/components/workflows/workflow-frame-chart";
import {
  buildFramePreviewData,
  formatFrameValue,
  formatSeriesKey,
} from "@/lib/workflow-frame-preview";
import { getProfileTitle } from "@/lib/workflow-utils";
import { cn } from "@/lib/utils";
import {
  deriveWorkflowFrameActivePreset,
  sanitizeWorkflowFrameSelection,
  useWorkflowFrameChartStore,
} from "@/stores/workflow-frame-chart-store";
import type { WorkflowProfile } from "@/rest/types";

import { WorkflowEmptyState } from "./workflow-empty-state";

export function FramePreviewOverlay({
  onClose,
  profile,
}: {
  onClose: () => void;
  profile: WorkflowProfile;
}) {
  const preview = buildFramePreviewData(profile);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const rawActivePreset = useWorkflowFrameChartStore((state) => state.activePreset);
  const rawSelectedSeriesIds = useWorkflowFrameChartStore((state) => state.selectedSeriesIds);
  const selectedSeriesIds = sanitizeWorkflowFrameSelection({
    activePreset: rawActivePreset,
    allSeriesIds: preview.seriesIds,
    defaultSeriesIds: preview.defaultSeriesIds,
    selectedSeriesIds: rawSelectedSeriesIds,
  });
  const activePreset = deriveWorkflowFrameActivePreset({
    allSeriesIds: preview.seriesIds,
    defaultSeriesIds: preview.defaultSeriesIds,
    selectedSeriesIds,
  });
  const selectedFrame = preview.frames[selectedFrameIndex] ?? null;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex h-[100svh] flex-col bg-shell text-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ── Trading-style header ── */}
        <header className="shrink-0 border-b border-border/40 bg-panel-strong/30 pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-stretch">
            {/* Status beacon + frame counter */}
            <div className="flex items-center gap-2 border-r border-border/40 px-3 py-1.5 md:px-4">
              <span className="block size-2 rounded-full bg-status-success-foreground shadow-[0_0_6px_rgba(107,231,159,0.5)]" />
              <p className="font-mono text-[0.58rem] font-semibold uppercase tabular-nums tracking-[0.08em] text-status-success-foreground md:text-[0.64rem]">
                F{selectedFrameIndex + 1}/{preview.frames.length}
              </p>
            </div>

            {/* Profile name */}
            <div className="flex min-w-0 flex-1 items-center border-r border-border/30 px-3 py-1.5 md:px-4">
              <p className="truncate font-mono text-[0.72rem] font-semibold text-foreground md:text-[0.78rem]">
                {getProfileTitle(profile)}
              </p>
            </div>

            {/* Author */}
            <div className="hidden items-center border-r border-border/30 px-3 py-1.5 md:flex md:px-4">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.06em] text-muted-foreground md:text-[0.6rem]">
                {profile.author ?? "Unknown"}
              </p>
            </div>

            {/* Preset label */}
            <div className="hidden items-center border-r border-border/30 px-3 py-1.5 md:flex md:px-4">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.08em] text-highlight md:text-[0.6rem]">
                {formatPresetLabel(activePreset)}
              </p>
            </div>

            {/* Close */}
            <Button
              autoFocus
              className="my-auto mx-2 size-9 shrink-0 rounded-[8px] border-border/40 bg-panel px-0 text-muted-foreground hover:bg-panel-muted md:mx-3 md:size-10 xl:min-h-[36px] xl:w-auto xl:px-3 xl:font-mono xl:text-[0.68rem] xl:uppercase xl:tracking-[0.16em] xl:text-foreground"
              onClick={onClose}
              type="button"
              variant="outline"
            >
              <X className="size-4" />
              <span className="sr-only xl:not-sr-only xl:ml-1">Close</span>
            </Button>
          </div>
        </header>

        {/* ── Main content ── */}
        <div className="min-h-0 flex-1 overflow-hidden xl:overflow-y-auto">
          {/* Tablet layout: chart fills viewport, frame nav below */}
          <div className="flex h-full flex-col xl:hidden">
            <div className="min-h-0 flex-1 p-2 md:p-3">
              <WorkflowFrameChart
                className="h-full"
                layout="tablet"
                onSelectFrame={setSelectedFrameIndex}
                preview={preview}
                selectedFrameIndex={selectedFrameIndex}
              />
            </div>

            {/* Frame navigator strip */}
            <FrameNavigator
              frameCount={preview.frames.length}
              onSelectFrame={setSelectedFrameIndex}
              selectedFrameIndex={selectedFrameIndex}
            />
          </div>

          {/* Desktop layout: chart + sidebar */}
          <div className="hidden h-full xl:grid xl:grid-cols-[minmax(0,1.15fr)_340px] xl:gap-4 xl:px-6 xl:py-5">
            <section className="grid min-w-0 gap-4">
              <WorkflowFrameChart
                className="p-5"
                onSelectFrame={setSelectedFrameIndex}
                preview={preview}
                selectedFrameIndex={selectedFrameIndex}
              />
            </section>

            <aside className="grid content-start gap-4 overflow-y-auto">
              <div className="rounded-[3px] border border-border bg-panel p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Selected frame
                  </p>
                  <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Frame {selectedFrameIndex + 1} / {preview.frames.length}
                  </p>
                </div>
                <div className="mt-3">
                  <WorkflowFrameMetricGrid
                    preview={preview}
                    selectedFrameIndex={selectedFrameIndex}
                    selectedSeriesIds={selectedSeriesIds}
                  />
                </div>
              </div>

              <div className="rounded-[3px] border border-border bg-panel p-3 md:p-4">
                <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Structured frame
                </p>
                <div className="mt-3 grid gap-2">
                  {selectedFrame ? (
                    Object.entries(selectedFrame).map(([key, value]) => (
                      <div
                        className="rounded-[3px] border border-border bg-panel-muted px-2.5 py-2"
                        key={key}
                      >
                        <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {formatSeriesKey(key)}
                        </p>
                        <p className="mt-1 break-words font-mono text-[0.76rem] text-foreground">
                          {formatFrameValue(value)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <WorkflowEmptyState body="No frame selected." title="Unavailable" />
                  )}
                </div>
              </div>

              <div className="rounded-[3px] border border-border bg-panel p-3 md:p-4">
                <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Raw frame
                </p>
                <pre className="mt-3 overflow-x-auto rounded-[3px] border border-border bg-panel-muted p-3 font-mono text-[0.68rem] leading-5 text-muted-foreground">
                  {JSON.stringify(selectedFrame ?? {}, null, 2)}
                </pre>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function FrameNavigator({
  frameCount,
  onSelectFrame,
  selectedFrameIndex,
}: {
  frameCount: number;
  onSelectFrame: (index: number) => void;
  selectedFrameIndex: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    const activeButton = container.children[selectedFrameIndex] as HTMLElement | undefined;

    if (activeButton && typeof activeButton.scrollIntoView === "function") {
      activeButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedFrameIndex]);

  if (frameCount === 0) {
    return null;
  }

  return (
    <div className="shrink-0 border-t border-border/40 bg-panel-strong/30 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center gap-2 px-2.5 py-1 md:px-3 md:py-1.5">
        <p className="shrink-0 font-mono text-[0.46rem] font-medium uppercase tracking-[0.1em] text-muted-foreground md:text-[0.5rem]">
          Frame
        </p>
        <div
          className="-mx-0.5 flex min-w-0 flex-1 gap-1 overflow-x-auto px-0.5 py-1 scrollbar-none md:gap-1.5"
          ref={scrollRef}
        >
          {Array.from({ length: frameCount }, (_, i) => (
            <button
              className={cn(
                "shrink-0 rounded-[4px] px-2 py-1.5 font-mono text-[0.56rem] font-medium tabular-nums transition-colors md:min-w-[36px] md:px-2.5 md:py-2 md:text-[0.62rem]",
                i === selectedFrameIndex
                  ? "border border-accent/50 bg-accent/12 text-accent"
                  : "border border-border/30 text-muted-foreground hover:border-highlight/40 hover:text-foreground active:bg-highlight/8",
              )}
              key={i}
              onClick={() => onSelectFrame(i)}
              type="button"
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatPresetLabel(preset: "core-frames" | "all-series" | "custom") {
  if (preset === "core-frames") {
    return "Core frames";
  }

  if (preset === "all-series") {
    return "All series";
  }

  return "Custom";
}
