// PROTOTYPE — throwaway. Variant B: the Profiles tab becomes the Profile Library (master/detail).
// Tapping a row selects it; the detail pane shows its chart and every action, Use included. Shot setup
// moves to its own segment. Forks nest under their parent. The editor opens full screen.
import { useState } from "react";

import { Copy, History, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { WorkflowFrameChart } from "@/components/workflows/workflow-frame-chart";
import { WorkflowShotSetupPanel } from "@/components/workflows/workflow-shot-setup-panel";
import { buildFramePreviewData } from "@/lib/workflow-frame-preview";
import { cn } from "@/lib/utils";

import { EditorStub } from "./editor-stub";
import {
  byTitle,
  describeOrigin,
  getTitle,
  matchesFilter,
  visibleRecords,
  type BeverageFilter,
  type ProtoRecord,
} from "./fixtures";
import { useProtoStore } from "./proto-store";
import { ProtoBadge, ProtoButton } from "./shared";
import { busyReason, useActiveLink, useEditorEntry, useProfileLoader } from "./use-active-link";

export const variantBName = "Library page, master/detail";

const filters: Array<{ key: BeverageFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "yours", label: "Yours" },
  { key: "espresso", label: "Espresso" },
  { key: "pourover", label: "Pour-over" },
  { key: "other", label: "Other" },
];

export function VariantBLibraryPage() {
  const editor = useProtoStore((state) => state.editor);
  // Temporary UI state for the prototype's segment switch.
  const [segment, setSegment] = useState<"library" | "setup">("library");
  const link = useActiveLink();
  const entry = useEditorEntry("Library");

  return (
    <>
      <div className="app-shell flex flex-col overflow-hidden border-b border-border/30 bg-shell">
        <header className="flex shrink-0 items-center gap-2 border-b border-border/40 bg-panel-strong/30 px-2 py-1">
          {(["library", "setup"] as const).map((key) => (
            <button
              className={cn(
                "h-10 rounded-[4px] border px-3 font-mono text-[0.74rem] font-semibold uppercase tracking-[0.1em]",
                segment === key
                  ? "border-primary/30 bg-primary/15 text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
              key={key}
              onClick={() => setSegment(key)}
              type="button"
            >
              {key === "library" ? "Library" : "Shot setup"}
            </button>
          ))}
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <span className="block size-2 shrink-0 rounded-full bg-status-success-foreground" />
            <p className="truncate font-mono text-[0.8rem] font-semibold">{link.title ?? "—"}</p>
            {link.unsaved ? (
              <ProtoBadge tone="warning">
                {link.saved ? "Differs from saved" : "Not saved"}
              </ProtoBadge>
            ) : null}
            <ProtoButton onClick={entry.editLoaded}>
              <Pencil className="size-3.5" /> Edit loaded
            </ProtoButton>
          </div>
        </header>
        {segment === "library" ? (
          <div className="grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)]">
            <LibraryList />
            <LibraryDetail />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden">
            <WorkflowShotSetupPanel />
          </div>
        )}
      </div>
      {editor ? <EditorStub layout="fullscreen" /> : null}
    </>
  );
}

function LibraryList() {
  const records = useProtoStore((state) => state.records);
  const filter = useProtoStore((state) => state.filter);
  const setFilter = useProtoStore((state) => state.setFilter);
  const entry = useEditorEntry("Library");
  const visible = visibleRecords(records);
  const visibleIds = new Set(visible.map((record) => record.id));
  // Forks nest under a visible parent; everything else is a root, yours first.
  const roots = visible
    .filter((record) => record.marker !== "fork" || !visibleIds.has(record.parentId ?? ""))
    .sort(
      (left, right) => Number(left.isDefault) - Number(right.isDefault) || byTitle(left, right),
    );
  const forksOf = (record: ProtoRecord) =>
    visible
      .filter((child) => child.marker === "fork" && child.parentId === record.id)
      .sort(byTitle);
  const rows = roots.flatMap((root) => {
    const children = forksOf(root);
    const shown = [root, ...children].filter((record) => matchesFilter(record, filter));

    return shown.map((record) => ({ depth: record === root ? 0 : 1, record }));
  });

  return (
    <section className="flex min-h-0 flex-col border-r border-border/40 bg-panel/60">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border/30 px-2 py-1.5">
        {filters.map((option) => (
          <button
            className={cn(
              "h-9 shrink-0 rounded-full border px-2.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.06em]",
              filter === option.key
                ? "border-highlight/50 bg-highlight/12 text-highlight"
                : "border-border/50 text-muted-foreground",
            )}
            key={option.key}
            onClick={() => setFilter(option.key)}
            type="button"
          >
            {option.label}
          </button>
        ))}
        <ProtoButton className="ml-auto" onClick={entry.createNew} tone="primary">
          <Plus className="size-3.5" /> New
        </ProtoButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {rows.map(({ depth, record }) => (
          <ListRow depth={depth} key={record.id} record={record} />
        ))}
      </div>
    </section>
  );
}

function ListRow({ depth, record }: { depth: number; record: ProtoRecord }) {
  const selectedId = useProtoStore((state) => state.selectedId);
  const setSelected = useProtoStore((state) => state.setSelected);
  const link = useActiveLink();
  const isLoaded = getTitle(record) === link.title;

  return (
    <button
      className={cn(
        "flex min-h-[44px] w-full items-center gap-2 border-b border-border/30 pr-3 text-left",
        depth ? "pl-8" : "pl-3",
        selectedId === record.id ? "bg-primary/15" : "hover:bg-panel-strong/40",
      )}
      onClick={() => setSelected(record.id)}
      type="button"
    >
      {depth ? <span className="font-mono text-[0.72rem] text-muted-foreground">↳</span> : null}
      <span className="min-w-0 flex-1 truncate font-mono text-[0.82rem] font-semibold">
        {getTitle(record)}
      </span>
      {isLoaded ? (
        <span className="size-2 shrink-0 rounded-full bg-status-success-foreground" />
      ) : null}
      {record.isDefault ? null : <ProtoBadge tone="muted">Yours</ProtoBadge>}
    </button>
  );
}

function LibraryDetail() {
  const records = useProtoStore((state) => state.records);
  const selectedId = useProtoStore((state) => state.selectedId);
  const record = visibleRecords(records).find((entry) => entry.id === selectedId);

  if (!record) {
    return <p className="p-6 font-mono text-[0.8rem] text-muted-foreground">Pick a profile.</p>;
  }

  return <DetailBody key={record.id} record={record} />;
}

function DetailBody({ record }: { record: ProtoRecord }) {
  const records = useProtoStore((state) => state.records);
  const link = useActiveLink();
  const loader = useProfileLoader();
  const entry = useEditorEntry("Library");
  // Temporary UI state: which Step the chart highlights.
  const [frame, setFrame] = useState(0);
  const isLoaded = getTitle(record) === link.title;
  const origin = describeOrigin(record, records);
  const preview = buildFramePreviewData(record.profile);

  return (
    <section className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/30 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-mono text-[1rem] font-semibold">{getTitle(record)}</p>
          <ProtoBadge tone="muted">{record.isDefault ? "Bundled" : "Yours"}</ProtoBadge>
          {isLoaded ? <ProtoBadge tone="success">Loaded</ProtoBadge> : null}
          {isLoaded && link.unsaved ? (
            <ProtoBadge tone="warning">Differs from saved</ProtoBadge>
          ) : null}
        </div>
        <p className="mt-0.5 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted-foreground">
          {[
            record.profile.author,
            record.profile.beverage_type,
            `${record.profile.steps?.length ?? 0} steps`,
            origin,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-1 line-clamp-2 font-mono text-[0.72rem] leading-4 text-muted-foreground/80">
          {record.profile.notes?.trim() || "No notes."}
        </p>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <WorkflowFrameChart
          className="h-full"
          layout="tablet"
          onSelectFrame={setFrame}
          preview={preview}
          selectedFrameIndex={frame}
        />
      </div>
      {loader.busy ? (
        <p className="shrink-0 bg-highlight/8 px-3 py-1 font-mono text-[0.72rem] text-highlight">
          Use: {busyReason}.
        </p>
      ) : null}
      <div className="flex shrink-0 items-center gap-1.5 border-t border-border/40 px-2 py-1.5">
        <ProtoButton
          disabled={loader.busy || (isLoaded && !link.unsaved)}
          onClick={() => loader.load(record.profile)}
          tone="primary"
        >
          {isLoaded ? (link.unsaved ? "Revert loaded" : "Loaded") : "Use"}
        </ProtoButton>
        <ProtoButton onClick={() => entry.edit(record)}>
          <Pencil className="size-3.5" /> Edit
        </ProtoButton>
        <ProtoButton onClick={() => entry.duplicate(record)}>
          <Copy className="size-3.5" /> Duplicate
        </ProtoButton>
        <ProtoButton onClick={() => toast("History: ticket 13 decides the lineage view")}>
          <History className="size-3.5" /> History
        </ProtoButton>
        <ProtoButton
          className="ml-auto"
          onClick={() => toast("Hide / Delete: ticket 11 decides these")}
        >
          <MoreHorizontal className="size-3.5" />
        </ProtoButton>
      </div>
    </section>
  );
}
