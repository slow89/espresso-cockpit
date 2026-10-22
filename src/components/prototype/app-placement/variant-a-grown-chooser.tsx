// PROTOTYPE — throwaway. Variant A: today's Profiles tab, with the Choose Profile column grown into
// the library. Tapping a row still loads it; Edit and Duplicate sit on each row; the editor opens
// full screen over the nav and returns here.
import { Copy, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { WorkflowShotSetupPanel } from "@/components/workflows/workflow-shot-setup-panel";
import { cn } from "@/lib/utils";

import { EditorStub } from "./editor-stub";
import { describeOrigin, getTitle, yoursThenBundled, type ProtoRecord } from "./fixtures";
import { useProtoStore } from "./proto-store";
import { ActiveTicker, ProtoBadge, ProtoButton } from "./shared";
import { busyReason, useActiveLink, useEditorEntry, useProfileLoader } from "./use-active-link";

export const variantAName = "Choose list grows up";

export function VariantAGrownChooser() {
  const editor = useProtoStore((state) => state.editor);

  return (
    <>
      <div className="app-shell flex flex-col overflow-hidden border-b border-border/30 bg-shell">
        <ActiveTicker />
        <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)]">
          <LibraryColumn />
          <div className="min-h-0 overflow-hidden">
            <WorkflowShotSetupPanel />
          </div>
        </div>
      </div>
      {editor ? <EditorStub layout="fullscreen" /> : null}
    </>
  );
}

function LibraryColumn() {
  const records = useProtoStore((state) => state.records);
  const link = useActiveLink();
  const entry = useEditorEntry("Profiles");
  const { bundled, yours } = yoursThenBundled(records);
  const notLoaded = (record: ProtoRecord) => getTitle(record) !== link.title;

  return (
    <section className="flex min-h-0 flex-col border-r border-border/40 bg-panel/60">
      <div className="flex items-center gap-2 border-b border-border/30 px-3 py-1.5">
        <p className="flex-1 font-mono text-[0.71rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Profiles
        </p>
        <ProtoButton
          onClick={() => toast("Visualizer import: unchanged, moved behind this button")}
        >
          Import
        </ProtoButton>
        <ProtoButton onClick={entry.createNew} tone="primary">
          <Plus className="size-3.5" /> New
        </ProtoButton>
      </div>

      <div className="border-b border-border/30 bg-panel-strong/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="block size-1.5 rounded-full bg-status-success-foreground" />
          <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.1em] text-status-success-foreground">
            Active
          </p>
          {link.unsaved ? (
            <ProtoBadge tone="warning">
              {link.saved ? "Differs from saved" : "Not saved"}
            </ProtoBadge>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-mono text-[0.92rem] font-semibold">
            {link.title ?? "—"}
          </p>
          <ProtoButton onClick={entry.editLoaded}>
            <Pencil className="size-3.5" /> Edit
          </ProtoButton>
        </div>
      </div>

      {link.busy ? (
        <p className="border-b border-border/30 bg-highlight/8 px-3 py-1 font-mono text-[0.72rem] text-highlight">
          Choosing a profile: {busyReason}.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <SectionLabel count={yours.length}>Yours</SectionLabel>
        {yours.filter(notLoaded).map((record) => (
          <LibraryRow key={record.id} record={record} />
        ))}
        <SectionLabel count={bundled.length}>Bundled</SectionLabel>
        {bundled.filter(notLoaded).map((record) => (
          <LibraryRow key={record.id} record={record} />
        ))}
      </div>
    </section>
  );
}

function SectionLabel({ children, count }: { children: string; count: number }) {
  return (
    <p className="sticky top-0 z-10 border-b border-border/30 bg-panel px-3 py-1.5 font-mono text-[0.7rem] font-medium uppercase tracking-[0.1em] text-muted-foreground/80">
      {children} · {count}
    </p>
  );
}

function LibraryRow({ record }: { record: ProtoRecord }) {
  const records = useProtoStore((state) => state.records);
  const loader = useProfileLoader();
  const entry = useEditorEntry("Profiles");
  const origin = describeOrigin(record, records);

  return (
    <div
      aria-disabled={loader.busy}
      className={cn(
        "flex items-center gap-1.5 border-b border-border/30 py-1.5 pl-3 pr-1.5",
        loader.busy ? "opacity-60" : "cursor-pointer hover:bg-panel-strong/40",
      )}
      onClick={() => loader.load(record.profile)}
      role="button"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[0.84rem] font-semibold">{getTitle(record)}</p>
        <p className="mt-0.5 truncate font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted-foreground">
          {origin ??
            `${record.profile.beverage_type ?? "espresso"} · ${record.profile.steps?.length ?? 0} steps`}
        </p>
      </div>
      <ProtoButton className="w-10 px-0" onClick={() => entry.edit(record)}>
        <Pencil className="size-3.5" />
        <span className="sr-only">Edit</span>
      </ProtoButton>
      <ProtoButton className="w-10 px-0" onClick={() => entry.duplicate(record)}>
        <Copy className="size-3.5" />
        <span className="sr-only">Duplicate</span>
      </ProtoButton>
    </div>
  );
}
