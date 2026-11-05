import { useState } from "react";

import { Button } from "@/components/ui/button";
import { WorkflowEmptyState } from "@/components/workflows/workflow-empty-state";
import {
  isLinkedRecord,
  libraryChips,
  listLibraryRows,
  type LibraryRow,
} from "@/lib/profile-library";
import { cn } from "@/lib/utils";
import { getProfileTitle } from "@/lib/workflow-utils";
import { useProfileLibraryUiStore } from "@/stores/profile-library-ui-store";

import { ImportProfileDialog } from "./import-profile-dialog";
import { LibraryBadge } from "./library-badge";
import type { ProfileLibraryView } from "./use-profile-library";

/**
 * A stable callback ref, so a row scrolls into view only when it becomes the selected one or
 * mounts as it (arriving at the Library, changing chip), and a refetch never moves the list.
 */
function scrollRowIntoView(row: HTMLElement | null) {
  row?.scrollIntoView({ block: "nearest" });
}

export function LibraryList({
  error,
  isPending,
  library,
  link,
  selectedId,
}: Pick<ProfileLibraryView, "error" | "isPending" | "library" | "link"> & {
  selectedId: string | null;
}) {
  const chip = useProfileLibraryUiStore((state) => state.chip);
  const setChip = useProfileLibraryUiStore((state) => state.setChip);
  // Temporary interaction state: the dialog opens from here and doesn't outlive the tab.
  const [isImportOpen, setIsImportOpen] = useState(false);
  const rows = listLibraryRows(library, chip);

  return (
    <section className="flex min-h-0 flex-col border-b border-border/40 bg-panel/60 md:border-b-0 md:border-r">
      <div className="flex shrink-0 items-center justify-end border-b border-border/30 px-2 py-1">
        <Button
          className="h-9 rounded-[3px] px-3 font-mono text-[0.72rem] uppercase tracking-[0.1em]"
          onClick={() => setIsImportOpen(true)}
          size="sm"
          type="button"
          variant="outline"
        >
          Import
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border/30 px-2 py-1.5">
        {libraryChips.map(({ key, label }) => (
          <button
            aria-pressed={chip === key}
            className={cn(
              "h-9 shrink-0 rounded-full border px-2 font-mono text-[0.7rem] font-semibold transition",
              chip === key
                ? "border-highlight/50 bg-highlight/12 text-highlight"
                : "border-border/50 text-muted-foreground hover:text-foreground",
            )}
            key={key}
            onClick={() => setChip(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {rows.map((row) => (
          <LibraryListRow
            isLoaded={isLinkedRecord(link, row.record)}
            isSelected={selectedId === row.record.id}
            key={row.record.id}
            row={row}
          />
        ))}
        {rows.length === 0 ? (
          <div className="p-3">
            <LibraryListEmpty error={error} isPending={isPending} />
          </div>
        ) : null}
      </div>

      {isImportOpen ? <ImportProfileDialog onClose={() => setIsImportOpen(false)} /> : null}
    </section>
  );
}

function LibraryListEmpty({ error, isPending }: Pick<ProfileLibraryView, "error" | "isPending">) {
  if (isPending) {
    return <WorkflowEmptyState body="Reading the Profile Library." title="Loading" />;
  }

  if (error) {
    return <WorkflowEmptyState body={error.message} title="Profiles unavailable" />;
  }

  return <WorkflowEmptyState body="Nothing matches this filter." title="No profiles" />;
}

function LibraryListRow({
  isLoaded,
  isSelected,
  row: { depth, record },
}: {
  isLoaded: boolean;
  isSelected: boolean;
  row: LibraryRow;
}) {
  const selectRecord = useProfileLibraryUiStore((state) => state.selectRecord);

  return (
    <button
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "flex min-h-[44px] w-full items-center gap-2 border-b border-border/30 pr-3 text-left transition",
        depth === 0 && "pl-3",
        depth === 1 && "pl-5",
        depth > 1 && "pl-8",
        isSelected ? "bg-primary/15" : "hover:bg-panel-strong/40",
      )}
      data-testid="library-row"
      onClick={() => selectRecord(record.id)}
      ref={isSelected ? scrollRowIntoView : undefined}
      type="button"
    >
      {depth > 0 ? (
        <span aria-hidden className="shrink-0 font-mono text-[0.72rem] text-muted-foreground">
          ↳
        </span>
      ) : null}
      <span className="flex size-2 shrink-0">
        {isLoaded ? (
          <>
            <span className="block size-2 rounded-full bg-status-success-foreground shadow-[0_0_4px_rgba(107,231,159,0.5)]" />
            <span className="sr-only">Loaded</span>
          </>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[0.82rem] font-semibold text-foreground">
        {getProfileTitle(record.profile)}
      </span>
      {record.isDefault ? null : <LibraryBadge tone="muted">Yours</LibraryBadge>}
    </button>
  );
}
