// PROTOTYPE — throwaway. The editor surface with its action bar; the Step editor body is a stub
// (its layout is ticket 12). `layout` decides only the frame: full screen over the nav, or a pane.
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useUpdateWorkflowMutation } from "@/rest/queries";

import { runsKey } from "./fixtures";
import { useProtoStore } from "./proto-store";
import { ProtoBadge, ProtoButton } from "./shared";
import { busyReason, useActiveLink, useProfileLoader } from "./use-active-link";

export function EditorStub({ layout }: { layout: "fullscreen" | "pane" }) {
  const editor = useProtoStore((state) => state.editor);
  const closeEditor = useProtoStore((state) => state.closeEditor);
  const simulateEdit = useProtoStore((state) => state.simulateEdit);
  const saveAsNew = useProtoStore((state) => state.saveAsNew);
  const commitSave = useProtoStore((state) => state.commitSave);
  const replaceDraft = useProtoStore((state) => state.replaceDraft);
  const link = useActiveLink();
  const loader = useProfileLoader();
  const writeWorkflow = useUpdateWorkflowMutation();

  if (!editor) {
    return null;
  }

  const { draft } = editor;
  const title = draft.title ?? "Untitled";
  const runsChanged = editor.baseline == null || runsKey(editor.baseline) !== runsKey(draft);
  const differsFromWorkflow = runsKey(draft) !== runsKey(link.loaded);
  const isFork = editor.kind === "fork";
  const sourceIsBundled = editor.sourceId?.startsWith("bundled:") ?? false;
  const saveDisabledReason = !runsChanged
    ? isFork
      ? "A copy must change how the profile runs"
      : "Nothing to save"
    : editor.isLoaded && link.busy
      ? busyReason
      : null;

  function save() {
    const saved = commitSave();

    if (saved && editor?.isLoaded) {
      writeWorkflow.mutate({ profile: saved.profile });
    }

    toast(isFork ? `Saved ${title} as a Fork (stub)` : `Saved ${title} as a Revision (stub)`);
  }

  function saveAndUse() {
    const saved = commitSave();

    if (saved) {
      loader.load(saved.profile, () => toast(`Saved and loaded ${title} (stub)`));
    }
  }

  function useForNextShot() {
    // Keeps the saved title; title changes land only through Save.
    loader.load({ ...draft, title: link.title && editor?.isLoaded ? link.title : title }, () =>
      toast(`${title} loaded for the next shot. Library unchanged.`),
    );
  }

  function revertToSaved() {
    if (!link.saved) {
      return;
    }

    replaceDraft(link.saved.profile);

    if (link.unsaved) {
      writeWorkflow.mutate({ profile: link.saved.profile });
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-shell text-foreground",
        layout === "fullscreen"
          ? "fixed inset-0 z-40 bg-canvas"
          : "h-full min-h-0 border-l border-border/40",
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border/40 bg-panel-strong/30 px-2 py-1.5">
        <ProtoButton onClick={closeEditor} tone="ghost">
          <ArrowLeft className="size-4" />
          {layout === "fullscreen" ? editor.origin : "Close"}
        </ProtoButton>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[0.9rem] font-semibold">{title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <ProtoBadge tone="muted">
              {editor.kind === "new" ? "New" : isFork ? "Copy" : "Editing"}
            </ProtoBadge>
            {editor.isLoaded ? <ProtoBadge tone="success">Loaded</ProtoBadge> : null}
            {editor.isLoaded && link.unsaved ? (
              <ProtoBadge tone="warning">Differs from saved</ProtoBadge>
            ) : null}
            {sourceIsBundled && !isFork ? <ProtoBadge tone="muted">Bundled</ProtoBadge> : null}
          </div>
        </div>
        {editor.isLoaded && link.saved ? (
          <ProtoButton disabled={link.busy && link.unsaved} onClick={revertToSaved} tone="outline">
            Revert to saved
          </ProtoButton>
        ) : null}
        <ProtoButton disabled={!runsChanged} onClick={saveAsNew} tone="outline">
          Save as new
        </ProtoButton>
        <ProtoButton
          disabled={link.busy || (editor.isLoaded && !differsFromWorkflow)}
          onClick={useForNextShot}
          tone="outline"
        >
          Use for next shot
        </ProtoButton>
        {editor.isLoaded ? null : (
          <ProtoButton disabled={link.busy || !runsChanged} onClick={saveAndUse} tone="outline">
            Save &amp; use
          </ProtoButton>
        )}
        <ProtoButton disabled={saveDisabledReason != null} onClick={save} tone="primary">
          Save
        </ProtoButton>
      </header>

      {link.busy || saveDisabledReason ? (
        <p className="shrink-0 border-b border-border/30 bg-highlight/8 px-3 py-1 font-mono text-[0.72rem] text-highlight">
          {link.busy
            ? `Machine: ${link.machineState}. Loading and Workflow writes: ${busyReason}.`
            : null}
          {!link.busy && saveDisabledReason ? `Save: ${saveDisabledReason}.` : null}
          {sourceIsBundled && !runsChanged && !isFork
            ? " Title and notes stay locked until something that runs changes."
            : null}
        </p>
      ) : null}

      <div className="m-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-[4px] border border-dashed border-border/60 p-4 text-center">
        <p className="font-mono text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground">
          Step editor stub
        </p>
        <p className="max-w-[420px] font-mono text-[0.74rem] leading-5 text-muted-foreground/80">
          Step list, field panel, ruler and target chart go here (ticket 12: How does the step
          editor lay out at 1024×600?). This is the room this placement leaves it.
        </p>
        <div className="flex flex-wrap justify-center gap-1">
          {(draft.steps ?? []).slice(0, 8).map((step, index) => (
            <span
              className="rounded-[3px] border border-border/50 px-2 py-1 font-mono text-[0.7rem] tabular-nums"
              key={index}
            >
              {index + 1} · {String(step.temperature ?? "?")}°
            </span>
          ))}
          {(draft.steps?.length ?? 0) > 8 ? (
            <span className="px-2 py-1 font-mono text-[0.7rem]">
              +{(draft.steps?.length ?? 0) - 8}
            </span>
          ) : null}
        </div>
        <ProtoButton onClick={simulateEdit} tone="outline">
          Simulate an edit (+0.5 °C on Step 2)
        </ProtoButton>
      </div>
    </div>
  );
}
