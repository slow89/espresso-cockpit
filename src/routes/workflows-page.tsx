import type { FormEvent } from "react";
import { useState } from "react";

import { FramePreviewOverlay } from "@/components/workflows/frame-preview-overlay";
import { WorkflowProfileChooserPanel } from "@/components/workflows/workflow-profile-chooser-panel";
import { WorkflowShotSetupPanel } from "@/components/workflows/workflow-shot-setup-panel";
import { isVisualizerEnabled } from "@/lib/visualizer";
import { formatBrewRatio, roundValue } from "@/lib/recipe-utils";
import { getProfileFingerprint, getProfileTitle, readString } from "@/lib/workflow-utils";
import {
  useImportVisualizerProfileMutation,
  useProfilesQuery,
  useUpdateWorkflowMutation,
  useVisualizerSettingsQuery,
  useWorkflowQuery,
} from "@/rest/queries";
import type {
  ProfileRecord,
  WorkflowContext,
  WorkflowProfile,
} from "@/rest/types";

export function WorkflowsPage() {
  const workflowQuery = useWorkflowQuery();
  const profilesQuery = useProfilesQuery();
  const visualizerSettingsQuery = useVisualizerSettingsQuery();
  const updateWorkflowMutation = useUpdateWorkflowMutation();
  const importVisualizerProfileMutation = useImportVisualizerProfileMutation();
  const [framePreviewProfile, setFramePreviewProfile] = useState<WorkflowProfile | null>(null);
  const [profileLibraryStatus, setProfileLibraryStatus] = useState<{
    message: string | null;
    tone: "error" | "success";
  }>({
    message: null,
    tone: "success",
  });

  const workflow = workflowQuery.data;
  const activeProfile = workflow?.profile;
  const activeProfileKey = getProfileFingerprint(activeProfile);
  const visibleProfiles = (profilesQuery.data ?? [])
    .filter((profile) => profile.visibility == null || profile.visibility === "visible")
    .sort((left, right) => {
      const defaultRank = Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault));

      if (defaultRank !== 0) {
        return defaultRank;
      }

      return getProfileTitle(left.profile).localeCompare(getProfileTitle(right.profile));
    });
  const availableProfiles = visibleProfiles.filter(
    (profile) => getProfileFingerprint(profile.profile) !== activeProfileKey,
  );
  const targetDose = workflow?.context?.targetDoseWeight;
  const targetYield = workflow?.context?.targetYield;
  const ratio = formatBrewRatio(targetDose, targetYield);
  const isUpdating = updateWorkflowMutation.isPending;
  const isImportingVisualizer = importVisualizerProfileMutation.isPending;
  const isVisualizerReady = isVisualizerEnabled(visualizerSettingsQuery.data);

  const dosePresets = [
    { label: "16g", value: 16 },
    { label: "18g", value: 18 },
    { label: "20g", value: 20 },
    { label: "22g", value: 22 },
  ] as const;
  const drinkPresets = [
    { label: "1:1.5", value: 1.5 },
    { label: "1:2.0", value: 2.0 },
    { label: "1:2.5", value: 2.5 },
    { label: "1:3.0", value: 3.0 },
  ] as const;

  function updateWorkflow(patch: Record<string, unknown>) {
    updateWorkflowMutation.mutate(patch);
  }

  function setProfileLibraryError(message: string) {
    setProfileLibraryStatus({
      message,
      tone: "error",
    });
  }

  function setProfileLibrarySuccess(message: string) {
    setProfileLibraryStatus({
      message,
      tone: "success",
    });
  }

  function applyProfile(record: ProfileRecord) {
    updateWorkflow({
      profile: record.profile,
    });
  }

  function openFramePreview(profile: WorkflowProfile | undefined) {
    if (!profile?.steps?.length) {
      return;
    }

    setFramePreviewProfile(profile);
  }

  function closeFramePreview() {
    setFramePreviewProfile(null);
  }

  function updateDose(nextDose: number) {
    updateWorkflow({
      context: {
        targetDoseWeight: roundValue(nextDose, 0),
      },
    });
  }

  function updateYield(nextYield: number) {
    updateWorkflow({
      context: {
        targetYield: roundValue(nextYield, 0),
      },
    });
  }

  function handleShotSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    updateWorkflow({
      name: readString(formData, "name", workflow?.name ?? "Workflow"),
      description: readString(formData, "description", workflow?.description ?? ""),
      context: {
        grinderModel: readString(formData, "grinderModel", workflow?.context?.grinderModel ?? ""),
        grinderSetting: readString(
          formData,
          "grinderSetting",
          workflow?.context?.grinderSetting ?? "",
        ),
        coffeeName: readString(formData, "coffeeName", workflow?.context?.coffeeName ?? ""),
        coffeeRoaster: readString(
          formData,
          "coffeeRoaster",
          workflow?.context?.coffeeRoaster ?? "",
        ),
      } satisfies Partial<WorkflowContext>,
    });
  }

  async function handleImportVisualizerProfile(shareCode: string) {
    if (!isVisualizerReady) {
      setProfileLibraryError("Enable Visualizer in Setup.");
      return;
    }

    let importedProfileTitle = "Visualizer profile";

    try {
      const result = await importVisualizerProfileMutation.mutateAsync(shareCode);

      if (result.profileTitle) {
        importedProfileTitle = result.profileTitle;
      }
    } catch (error) {
      setProfileLibraryError(
        getWorkflowActionErrorMessage(error, "Unable to import from Visualizer."),
      );
      return;
    }

    setProfileLibrarySuccess(`Imported ${importedProfileTitle}.`);
  }

  return (
    <div>
      <div className="min-h-[calc(100svh-var(--app-footer-height))] overflow-hidden border-b border-border/30 bg-shell md:flex md:h-[calc(100svh-var(--app-footer-height))] md:flex-col">
        {/* Active profile ticker — trading-style status bar */}
        <WorkflowActiveTicker
          activeProfile={activeProfile}
          ratio={ratio}
          targetDose={targetDose}
          targetYield={targetYield}
        />

        {/* Main workspace */}
        <section className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden">
          <div className="grid md:h-full md:grid-cols-[minmax(230px,270px)_minmax(0,1fr)]">
            <WorkflowProfileChooserPanel
              activeProfile={activeProfile}
              availableProfiles={availableProfiles}
              isApplying={isUpdating}
              isImporting={isImportingVisualizer}
              isVisualizerReady={isVisualizerReady}
              libraryStatus={profileLibraryStatus}
              onApplyProfile={applyProfile}
              onImportVisualizerProfile={handleImportVisualizerProfile}
              onOpenFrames={openFramePreview}
            />

            <WorkflowShotSetupPanel
              dosePresets={dosePresets}
              drinkPresets={drinkPresets}
              isUpdating={isUpdating}
              onDecreaseDose={() => updateDose(Math.max(8, Math.round((targetDose ?? 18) - 1)))}
              onDecreaseDrink={() =>
                updateYield(Math.max(1, Math.round((targetYield ?? 36) - 1)))
              }
              onIncreaseDose={() => updateDose(Math.round((targetDose ?? 18) + 1))}
              onIncreaseDrink={() => updateYield(Math.round((targetYield ?? 36) + 1))}
              onSelectDosePreset={updateDose}
              onSelectDrinkPreset={(value) => updateYield((targetDose ?? 18) * value)}
              onSubmit={handleShotSetupSubmit}
              ratio={ratio}
              targetDose={targetDose}
              targetYield={targetYield}
              workflow={workflow}
            />
          </div>
        </section>
      </div>

      {framePreviewProfile ? (
        <FramePreviewOverlay
          key={getProfileFingerprint(framePreviewProfile)}
          onClose={closeFramePreview}
          profile={framePreviewProfile}
        />
      ) : null}
    </div>
  );
}

function WorkflowActiveTicker({
  activeProfile,
  ratio,
  targetDose,
  targetYield,
}: {
  activeProfile: WorkflowProfile | undefined;
  ratio: string;
  targetDose: number | null | undefined;
  targetYield: number | null | undefined;
}) {
  return (
    <section
      className="shrink-0 flex items-stretch border-b border-border/40 bg-panel-strong/30"
      data-testid="workflow-active-ticker"
    >
      {/* Status beacon */}
      <div className="flex items-center gap-2 border-r border-border/40 px-3 py-1.5 md:px-4">
        <span className="block size-2 rounded-full bg-status-success-foreground shadow-[0_0_6px_rgba(107,231,159,0.5)]" />
        <p className="font-mono text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-status-success-foreground md:text-[0.68rem]">
          Active
        </p>
      </div>

      {/* Profile name */}
      <div className="flex min-w-0 items-center border-r border-border/30 px-3 py-1.5 md:px-4">
        <p className="truncate font-mono text-[0.76rem] font-semibold text-foreground md:text-[0.8rem]">
          {getProfileTitle(activeProfile)}
        </p>
      </div>

      {/* Dose */}
      <div className="flex items-center gap-2 border-r border-border/30 px-3 py-1.5 md:px-4">
        <p className="font-mono text-[0.5rem] font-medium uppercase tracking-[0.06em] text-muted-foreground md:text-[0.52rem]">
          Dose
        </p>
        <p className="whitespace-nowrap font-mono text-[0.76rem] font-semibold tabular-nums text-foreground md:text-[0.8rem]">
          {targetDose != null ? `${targetDose.toFixed(0)}g` : "--"}
        </p>
      </div>

      {/* Yield */}
      <div className="flex items-center gap-2 border-r border-border/30 px-3 py-1.5 md:px-4">
        <p className="font-mono text-[0.5rem] font-medium uppercase tracking-[0.06em] text-muted-foreground md:text-[0.52rem]">
          Yield
        </p>
        <p className="whitespace-nowrap font-mono text-[0.76rem] font-semibold tabular-nums text-foreground md:text-[0.8rem]">
          {targetYield != null ? `${targetYield.toFixed(0)}g` : "--"}
        </p>
      </div>

      {/* Ratio */}
      <div className="flex items-center gap-2 px-3 py-1.5 md:px-4">
        <p className="font-mono text-[0.5rem] font-medium uppercase tracking-[0.06em] text-muted-foreground md:text-[0.52rem]">
          Ratio
        </p>
        <p className="whitespace-nowrap font-mono text-[0.76rem] font-semibold tabular-nums text-highlight md:text-[0.8rem]">
          {ratio}
        </p>
      </div>
    </section>
  );
}

function getWorkflowActionErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
