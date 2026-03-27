import { useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { joinValues, getProfileTitle } from "@/lib/workflow-utils";
import type { ProfileRecord, WorkflowProfile } from "@/rest/types";

import { WorkflowEmptyState } from "./workflow-empty-state";
import { WorkflowPanel } from "./workflow-panel";

export function WorkflowProfileChooserPanel({
  activeProfile,
  availableProfiles,
  isApplying,
  isImporting,
  isVisualizerReady,
  libraryStatus,
  onApplyProfile,
  onImportVisualizerProfile,
  onOpenFrames,
}: {
  activeProfile: WorkflowProfile | undefined;
  availableProfiles: ProfileRecord[];
  isApplying: boolean;
  isImporting: boolean;
  isVisualizerReady: boolean;
  libraryStatus: {
    message: string | null;
    tone: "error" | "success";
  };
  onApplyProfile: (record: ProfileRecord) => void;
  onImportVisualizerProfile: (shareCode: string) => Promise<void>;
  onOpenFrames: (profile: WorkflowProfile | undefined) => void;
}) {
  return (
    <WorkflowPanel
      className="md:flex md:h-full md:min-h-0 md:flex-col"
      contentClassName="md:flex md:min-h-0 md:flex-1 px-0 py-0"
      title="Choose Profile"
    >
      <div className="grid gap-0 md:min-h-0 md:flex-1 md:grid-rows-[auto_auto_minmax(0,1fr)]">
        <ProfileLibraryActions
          isImporting={isImporting}
          isVisualizerReady={isVisualizerReady}
          libraryStatus={libraryStatus}
          onImportVisualizerProfile={onImportVisualizerProfile}
        />
        <CurrentProfileRow
          onOpenFrames={() => onOpenFrames(activeProfile)}
          profile={activeProfile}
        />
        <div className="grid md:min-h-0 md:overflow-hidden">
          <p className="border-b border-border/30 px-3 py-1.5 font-mono text-[0.5rem] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
            Saved profiles
          </p>
          {availableProfiles.length ? (
            <div className="max-h-[420px] divide-y divide-border/30 overflow-y-auto overscroll-contain md:max-h-none md:min-h-0">
              {availableProfiles.map((record) => (
                <ProfileCard
                  isActive={false}
                  isApplying={isApplying}
                  key={record.id}
                  onApply={() => onApplyProfile(record)}
                  onOpenFrames={() => onOpenFrames(record.profile)}
                  record={record}
                />
              ))}
            </div>
          ) : (
            <div className="p-3">
              <WorkflowEmptyState
                body="No other visible profiles came back from the bridge."
                title="Only the current profile is available"
              />
            </div>
          )}
        </div>
      </div>
    </WorkflowPanel>
  );
}

function ProfileLibraryActions({
  isImporting,
  isVisualizerReady,
  libraryStatus,
  onImportVisualizerProfile,
}: {
  isImporting: boolean;
  isVisualizerReady: boolean;
  libraryStatus: {
    message: string | null;
    tone: "error" | "success";
  };
  onImportVisualizerProfile: (shareCode: string) => Promise<void>;
}) {
  const [shareCode, setShareCode] = useState("");
  const isImportDisabled = isImporting || !shareCode.trim() || !isVisualizerReady;

  async function handleVisualizerImport() {
    if (isImportDisabled) {
      return;
    }

    await onImportVisualizerProfile(shareCode.trim());
    setShareCode("");
  }

  return (
    <section className="border-b border-border/30 px-3 py-2">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.5rem] font-medium uppercase tracking-[0.1em] text-highlight">
            Visualizer Import
          </p>
          <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <label className="grid gap-0.5" htmlFor="visualizer-share-code">
              <span className="sr-only">Share code</span>
              <Input
                autoCapitalize="characters"
                className="h-8 rounded-[3px] border-border/60 bg-panel-strong font-mono text-[0.68rem] uppercase"
                id="visualizer-share-code"
                onChange={(event) => setShareCode(event.target.value)}
                placeholder="AB12"
                value={shareCode}
              />
            </label>
            <Button
              className="h-8 shrink-0 rounded-[3px] px-3 font-mono text-[0.56rem] uppercase tracking-[0.1em]"
              disabled={isImportDisabled}
              onClick={() => {
                void handleVisualizerImport();
              }}
              size="sm"
              type="button"
            >
              {isImporting ? "..." : "Import"}
            </Button>
          </div>
        </div>
      </div>

      {libraryStatus.message ? (
        <p
          className={cn(
            "mt-1.5 font-mono text-[0.56rem] leading-4",
            libraryStatus.tone === "error" ? "text-destructive" : "text-highlight",
          )}
        >
          {libraryStatus.message}
        </p>
      ) : !isVisualizerReady ? (
        <p className="mt-1.5 font-mono text-[0.56rem] leading-4 text-muted-foreground/60">
          Enable Visualizer in Setup.
        </p>
      ) : (
        <p className="mt-1.5 font-mono text-[0.56rem] leading-4 text-muted-foreground/60">
          Enter 4-digit share code.
        </p>
      )}
    </section>
  );
}

function CurrentProfileRow({
  onOpenFrames,
  profile,
}: {
  onOpenFrames: () => void;
  profile: WorkflowProfile | undefined;
}) {
  return (
    <div className="border-b border-border/30 bg-panel-strong/30 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="block size-1.5 rounded-full bg-status-success-foreground shadow-[0_0_4px_rgba(107,231,159,0.5)]" />
        <p className="font-mono text-[0.5rem] font-medium uppercase tracking-[0.1em] text-status-success-foreground">
          Active
        </p>
      </div>
      <p className="mt-1 font-mono text-[0.92rem] font-semibold leading-none tracking-[0.02em] text-foreground">
        {getProfileTitle(profile)}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className="font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
          {joinValues([
            profile?.author ?? "Unknown author",
            profile?.beverage_type ?? "espresso",
          ])}
        </p>
        <FrameCountButton
          count={profile?.steps?.length ?? 0}
          disabled={!profile?.steps?.length}
          onClick={onOpenFrames}
        />
      </div>
    </div>
  );
}

function ProfileCard({
  isActive,
  isApplying,
  onApply,
  onOpenFrames,
  record,
}: {
  isActive: boolean;
  isApplying: boolean;
  onApply: () => void;
  onOpenFrames: () => void;
  record: ProfileRecord;
}) {
  const profile = record.profile;
  const isDisabled = isApplying || isActive;

  function handleApply() {
    if (isDisabled) {
      return;
    }

    onApply();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (isDisabled) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onApply();
    }
  }

  return (
    <div
      aria-disabled={isDisabled}
      className={cn(
        "px-3 py-2 transition",
        isDisabled
          ? "opacity-60"
          : "cursor-pointer hover:bg-panel-strong/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40",
        isActive ? "bg-highlight/8" : null,
      )}
      onClick={handleApply}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[0.82rem] font-semibold leading-none tracking-[0.02em] text-foreground">
            {getProfileTitle(profile)}
          </p>
          {record.isDefault ? (
            <span className="font-mono text-[0.44rem] font-semibold uppercase tracking-[0.08em] text-highlight-muted">
              Def
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted-foreground">
            {joinValues([
              profile.author ?? "Unknown author",
              profile.beverage_type ?? "espresso",
            ])}
          </p>
          <FrameCountButton
            count={profile.steps?.length ?? 0}
            disabled={!profile.steps?.length}
            onClick={onOpenFrames}
          />
        </div>
        <p
          className="mt-0.5 line-clamp-1 font-mono text-[0.52rem] leading-4 text-muted-foreground/60"
          title={profile.notes?.trim() || "No profile notes from the bridge."}
        >
          {profile.notes?.trim() || "No profile notes."}
        </p>
      </div>
    </div>
  );
}

function FrameCountButton({
  count,
  disabled,
  onClick,
}: {
  count: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-[2px] border px-1.5 py-0.5 font-mono text-[0.46rem] uppercase tabular-nums tracking-[0.08em] transition",
        disabled
          ? "border-border/30 text-muted-foreground/40"
          : "border-border/50 text-muted-foreground hover:border-highlight/40 hover:text-foreground",
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      {count}f
    </button>
  );
}
