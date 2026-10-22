import { useNavigate, useSearch } from "@tanstack/react-router";

// PROTOTYPE — throwaway imports for the app-placement variants (ticket 09).
import { ConfirmDialog, PrototypeSwitcher } from "@/components/prototype/app-placement/shared";
import {
  VariantAGrownChooser,
  variantAName,
} from "@/components/prototype/app-placement/variant-a-grown-chooser";
import {
  VariantBLibraryPage,
  variantBName,
} from "@/components/prototype/app-placement/variant-b-library-page";
import {
  VariantCWorkbench,
  variantCName,
} from "@/components/prototype/app-placement/variant-c-workbench";
import { WorkflowProfileChooserPanel } from "@/components/workflows/workflow-profile-chooser-panel";
import { WorkflowShotSetupPanel } from "@/components/workflows/workflow-shot-setup-panel";
import { FramePreviewOverlay } from "@/components/workflows/frame-preview-overlay";
import { formatBrewRatio } from "@/lib/recipe-utils";
import { getProfileTitle } from "@/lib/workflow-utils";
import { useWorkflowQuery } from "@/rest/queries";

const prototypeVariants = [
  { key: "today", name: "Today's Profiles tab" },
  { key: "A", name: variantAName },
  { key: "B", name: variantBName },
  { key: "C", name: variantCName },
] as const;

function AppPlacementPrototype({ variant }: { variant: "A" | "B" | "C" }) {
  if (variant === "A") return <VariantAGrownChooser />;
  if (variant === "B") return <VariantBLibraryPage />;
  return <VariantCWorkbench />;
}

export function WorkflowsPage() {
  const navigate = useNavigate();
  const { variant } = useSearch({ from: "/workflows" });

  return (
    <>
      {variant ? <AppPlacementPrototype variant={variant} /> : <CurrentWorkflowsPage />}
      <PrototypeSwitcher
        current={variant ?? "today"}
        onChange={(key) =>
          navigate({
            to: "/workflows",
            search: { variant: key === "today" ? undefined : (key as "A" | "B" | "C") },
            replace: true,
          })
        }
        variants={prototypeVariants}
      />
      <ConfirmDialog />
    </>
  );
}

function CurrentWorkflowsPage() {
  return (
    <div>
      <div className="app-shell overflow-hidden border-b border-border/30 bg-shell md:flex md:flex-col">
        <WorkflowActiveTicker />

        <section className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden">
          <div className="grid md:h-full md:grid-cols-[minmax(230px,270px)_minmax(0,1fr)]">
            <WorkflowProfileChooserPanel />
            <WorkflowShotSetupPanel />
          </div>
        </section>
      </div>

      <FramePreviewOverlay />
    </div>
  );
}

function WorkflowActiveTicker() {
  const { data: workflow } = useWorkflowQuery();
  const activeProfile = workflow?.profile;
  const targetDose = workflow?.context?.targetDoseWeight;
  const targetYield = workflow?.context?.targetYield;
  const ratio = formatBrewRatio(targetDose, targetYield);

  return (
    <section
      className="shrink-0 flex items-stretch border-b border-border/40 bg-panel-strong/30"
      data-testid="workflow-active-ticker"
    >
      <div className="flex items-center gap-2 border-r border-border/40 px-3 py-1.5 md:px-4">
        <span className="block size-2 rounded-full bg-status-success-foreground shadow-[0_0_6px_rgba(107,231,159,0.5)]" />
        <p className="font-mono text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-status-success-foreground md:text-[0.78rem]">
          Active
        </p>
      </div>

      <div className="flex min-w-0 items-center border-r border-border/30 px-3 py-1.5 md:px-4">
        <p className="truncate font-mono text-[0.81rem] font-semibold text-foreground md:text-[0.83rem]">
          {getProfileTitle(activeProfile)}
        </p>
      </div>

      <div className="flex items-center gap-2 border-r border-border/30 px-3 py-1.5 md:px-4">
        <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.06em] text-muted-foreground md:text-[0.7rem]">
          Dose
        </p>
        <p className="whitespace-nowrap font-mono text-[0.81rem] font-semibold tabular-nums text-foreground md:text-[0.83rem]">
          {targetDose != null ? `${targetDose.toFixed(0)}g` : "--"}
        </p>
      </div>

      <div className="flex items-center gap-2 border-r border-border/30 px-3 py-1.5 md:px-4">
        <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.06em] text-muted-foreground md:text-[0.7rem]">
          Yield
        </p>
        <p className="whitespace-nowrap font-mono text-[0.81rem] font-semibold tabular-nums text-foreground md:text-[0.83rem]">
          {targetYield != null ? `${targetYield.toFixed(0)}g` : "--"}
        </p>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 md:px-4">
        <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.06em] text-muted-foreground md:text-[0.7rem]">
          Ratio
        </p>
        <p className="whitespace-nowrap font-mono text-[0.81rem] font-semibold tabular-nums text-highlight md:text-[0.83rem]">
          {ratio}
        </p>
      </div>
    </section>
  );
}
