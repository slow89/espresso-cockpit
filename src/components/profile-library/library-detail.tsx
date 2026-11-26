import { useState } from "react";

import { WorkflowFrameChart } from "@/components/workflows/workflow-frame-chart";
import { describeRecord, isLinkedRecord } from "@/lib/profile-library";
import { buildFramePreviewData } from "@/lib/workflow-frame-preview";
import type { ProfileRecord } from "@/rest/types";

import { LibraryBadge } from "./library-badge";
import { LibraryUseAction } from "./library-use-action";
import type { ProfileLibraryView } from "./use-profile-library";

interface LibraryDetailProps extends Pick<ProfileLibraryView, "library" | "link" | "loaded"> {
  record: ProfileRecord;
}

export function LibraryDetail({ library, link, loaded, record }: LibraryDetailProps) {
  // Temporary interaction state: the Step the chart highlights. The parent keys this by record.
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const description = describeRecord(library, record);
  const isLoaded = isLinkedRecord(link, record);

  return (
    <section className="flex min-h-0 min-w-0 flex-col" data-testid="library-detail">
      <div className="shrink-0 border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <h2 className="min-w-0 truncate font-mono text-[1rem] font-semibold text-foreground">
            {description.title}
          </h2>
          <LibraryBadge tone="muted">{description.origin}</LibraryBadge>
          {isLoaded ? <LibraryBadge tone="success">Loaded</LibraryBadge> : null}
          {isLoaded && link.status === "differs" ? (
            <LibraryBadge tone="warning">Differs from saved</LibraryBadge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted-foreground">
          {description.meta}
        </p>
        <p className="mt-1 line-clamp-2 min-h-8 font-mono text-[0.72rem] leading-4 text-muted-foreground/80">
          {description.notes ?? "No notes."}
        </p>
      </div>

      <div className="min-h-0 flex-1 p-1.5">
        <WorkflowFrameChart
          className="md:p-2"
          onSelectFrame={setSelectedStepIndex}
          preview={buildFramePreviewData(record.profile)}
          selectedFrameIndex={selectedStepIndex}
        />
      </div>

      <LibraryUseAction link={link} loaded={loaded} record={record} />
    </section>
  );
}
