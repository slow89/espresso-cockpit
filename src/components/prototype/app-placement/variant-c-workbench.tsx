// PROTOTYPE — throwaway. Variant C: a workbench inside the Profiles tab. The library rail stays on
// the left (tap loads, as today); Edit opens the editor in the right pane where Shot setup sits, so
// the rail and the nav stay on screen. No full-screen surface.
import { Pencil, Plus } from "lucide-react";

import { WorkflowShotSetupPanel } from "@/components/workflows/workflow-shot-setup-panel";
import { cn } from "@/lib/utils";

import { EditorStub } from "./editor-stub";
import { describeOrigin, getTitle, yoursThenBundled, type ProtoRecord } from "./fixtures";
import { useProtoStore } from "./proto-store";
import { ActiveTicker, ProtoBadge, ProtoButton } from "./shared";
import { busyReason, useActiveLink, useEditorEntry, useProfileLoader } from "./use-active-link";

export const variantCName = "Workbench, editor in the pane";

export function VariantCWorkbench() {
  const editor = useProtoStore((state) => state.editor);
  const entry = useEditorEntry("Profiles");

  return (
    <div className="app-shell flex flex-col overflow-hidden border-b border-border/30 bg-shell">
      <ActiveTicker>
        <ProtoButton onClick={entry.editLoaded}>
          <Pencil className="size-3.5" /> Edit
        </ProtoButton>
      </ActiveTicker>
      <div className="grid min-h-0 flex-1 grid-cols-[270px_minmax(0,1fr)]">
        <Rail />
        <div className="min-h-0 overflow-hidden">
          {editor ? <EditorStub layout="pane" /> : <WorkflowShotSetupPanel />}
        </div>
      </div>
    </div>
  );
}

function Rail() {
  const records = useProtoStore((state) => state.records);
  const entry = useEditorEntry("Profiles");
  const link = useActiveLink();
  const { bundled, yours } = yoursThenBundled(records);

  return (
    <section className="flex min-h-0 flex-col bg-panel/60">
      <div className="flex items-center gap-2 border-b border-border/30 px-3 py-1.5">
        <p className="flex-1 font-mono text-[0.71rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Choose profile
        </p>
        <ProtoButton onClick={entry.createNew} tone="primary">
          <Plus className="size-3.5" /> New
        </ProtoButton>
      </div>
      {link.busy ? (
        <p className="border-b border-border/30 bg-highlight/8 px-3 py-1 font-mono text-[0.72rem] text-highlight">
          {busyReason}.
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {[...yours, ...bundled].map((record) => (
          <RailRow key={record.id} record={record} />
        ))}
      </div>
    </section>
  );
}

function RailRow({ record }: { record: ProtoRecord }) {
  const records = useProtoStore((state) => state.records);
  const editor = useProtoStore((state) => state.editor);
  const link = useActiveLink();
  const loader = useProfileLoader();
  const entry = useEditorEntry("Profiles");
  const isLoaded = getTitle(record) === link.title;
  const isEditing =
    editor != null && (editor.sourceId === record.id || (editor.isLoaded && isLoaded));
  const origin = describeOrigin(record, records);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border-b border-border/30 py-1.5 pl-3 pr-1.5",
        isEditing && "bg-primary/15",
        loader.busy ? "opacity-60" : "cursor-pointer hover:bg-panel-strong/40",
      )}
      onClick={() => loader.load(record.profile)}
      role="button"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {isLoaded ? (
            <span className="size-1.5 shrink-0 rounded-full bg-status-success-foreground" />
          ) : null}
          <p className="truncate font-mono text-[0.82rem] font-semibold">{getTitle(record)}</p>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          {record.isDefault ? <ProtoBadge tone="muted">Def</ProtoBadge> : null}
          {isEditing ? <ProtoBadge tone="warning">Editing</ProtoBadge> : null}
          <p className="truncate font-mono text-[0.68rem] uppercase tracking-[0.06em] text-muted-foreground">
            {origin ?? record.profile.beverage_type ?? "espresso"}
          </p>
        </div>
      </div>
      <ProtoButton className="w-10 px-0" onClick={() => entry.edit(record)}>
        <Pencil className="size-3.5" />
        <span className="sr-only">Edit</span>
      </ProtoButton>
    </div>
  );
}
