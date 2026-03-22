import { useEffect, useState } from "react";

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
import { getProfileTitle, joinValues } from "@/lib/workflow-utils";
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
      className="fixed inset-0 z-50 bg-[#030508]/88 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex min-h-screen flex-col bg-[#07090b] text-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 border-b border-border bg-[#07090b]/96 px-3 py-1.5 backdrop-blur md:px-4 md:py-1.5 xl:px-6 xl:py-3">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-[0.98rem] leading-none text-foreground md:text-[1.1rem] xl:text-[1.8rem]">
                {getProfileTitle(profile)}
              </h2>
              <p className="mt-1 truncate font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted-foreground md:text-[0.58rem] xl:text-[0.66rem]">
                {joinValues([
                  profile.author ?? "Unknown author",
                  `${preview.frames.length} frames`,
                  formatPresetLabel(activePreset),
                ])}
              </p>
            </div>

            <Button
              autoFocus
              className="size-8 rounded-[10px] border-[#35260d] bg-[#0b0c0f] px-0 text-muted-foreground md:size-9 xl:min-h-[36px] xl:w-auto xl:px-3 xl:font-mono xl:text-[0.68rem] xl:uppercase xl:tracking-[0.16em] xl:text-foreground"
              onClick={onClose}
              type="button"
              variant="outline"
            >
              <X className="size-4" />
              <span className="sr-only xl:not-sr-only xl:ml-1">Close</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-3 px-3 py-3 md:px-4 md:py-3 xl:grid-cols-[minmax(0,1.15fr)_340px] xl:gap-4 xl:px-6 xl:py-5">
            <section className="grid min-w-0 gap-3 xl:gap-4">
              <WorkflowFrameChart
                className="p-2.5 md:p-3 xl:p-5"
                onSelectFrame={setSelectedFrameIndex}
                preview={preview}
                selectedFrameIndex={selectedFrameIndex}
              />

              <details className="rounded-[14px] border border-border bg-[#0b0c0f] p-2.5 md:p-3 xl:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Selected frame fields</span>
                  <span>
                    {selectedFrame
                      ? `F${selectedFrameIndex + 1}/${preview.frames.length} • ${Object.keys(selectedFrame).length}`
                      : "Unavailable"}
                  </span>
                </summary>
                <div className="mt-2.5 grid max-h-[34svh] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {selectedFrame ? (
                    Object.entries(selectedFrame).map(([key, value]) => (
                      <div
                        className="rounded-[9px] border border-border bg-[#090a0c] px-2 py-1.5"
                        key={key}
                      >
                        <p className="font-mono text-[0.5rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {formatSeriesKey(key)}
                        </p>
                        <p className="mt-0.5 break-words font-mono text-[0.68rem] leading-5 text-foreground">
                          {formatFrameValue(value)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <WorkflowEmptyState body="No frame selected." title="Unavailable" />
                  )}
                </div>
              </details>

              <details className="rounded-[14px] border border-border bg-[#0b0c0f] p-2.5 md:p-3 xl:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Raw frame JSON</span>
                  <span>F{selectedFrameIndex + 1}</span>
                </summary>
                <pre className="mt-2.5 overflow-x-auto rounded-[10px] border border-border bg-[#090a0c] p-2.5 font-mono text-[0.64rem] leading-5 text-muted-foreground">
                  {JSON.stringify(selectedFrame ?? {}, null, 2)}
                </pre>
              </details>
            </section>

            <aside className="hidden xl:grid xl:content-start xl:gap-4">
              <div className="rounded-[14px] border border-border bg-[#0b0c0f] p-3 md:p-4">
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

              <div className="rounded-[14px] border border-border bg-[#0b0c0f] p-3 md:p-4">
                <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Structured frame
                </p>
                <div className="mt-3 grid gap-2">
                  {selectedFrame ? (
                    Object.entries(selectedFrame).map(([key, value]) => (
                      <div
                        className="rounded-[9px] border border-border bg-[#090a0c] px-2.5 py-2"
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

              <div className="rounded-[14px] border border-border bg-[#0b0c0f] p-3 md:p-4">
                <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Raw frame
                </p>
                <pre className="mt-3 overflow-x-auto rounded-[10px] border border-border bg-[#090a0c] p-3 font-mono text-[0.68rem] leading-5 text-muted-foreground">
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

function formatPresetLabel(preset: "core-frames" | "all-series" | "custom") {
  if (preset === "core-frames") {
    return "Core frames";
  }

  if (preset === "all-series") {
    return "All series";
  }

  return "Custom";
}
