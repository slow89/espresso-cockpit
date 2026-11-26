import { LibraryDetail } from "@/components/profile-library/library-detail";
import { LibraryList } from "@/components/profile-library/library-list";
import { LoadedProfileStrip } from "@/components/profile-library/loaded-profile-strip";
import {
  useProfileLibrary,
  type ProfileLibraryView,
} from "@/components/profile-library/use-profile-library";
import { WorkflowShotSetupPanel } from "@/components/workflows/workflow-shot-setup-panel";
import { resolveSelectedRecord } from "@/lib/profile-library";
import { useProfileLibraryUiStore } from "@/stores/profile-library-ui-store";

export function WorkflowsPage() {
  const segment = useProfileLibraryUiStore((state) => state.segment);
  const view = useProfileLibrary();

  return (
    <div className="app-shell flex flex-col overflow-hidden border-b border-border/30 bg-shell">
      <LoadedProfileStrip link={view.link} loaded={view.loaded} />

      {segment === "library" ? (
        <ProfileLibraryPanel view={view} />
      ) : (
        <section
          className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden"
          data-testid="shot-setup"
        >
          <WorkflowShotSetupPanel />
        </section>
      )}
    </div>
  );
}

interface ProfileLibraryPanelProps {
  view: ProfileLibraryView;
}

function ProfileLibraryPanel({ view }: ProfileLibraryPanelProps) {
  const { library, link, loaded } = view;
  const selectedRecordId = useProfileLibraryUiStore((state) => state.selectedRecordId);
  const selected = resolveSelectedRecord(library, selectedRecordId, link);

  return (
    <div
      className="grid min-h-0 flex-1 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] md:grid-cols-[340px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]"
      data-testid="profile-library"
    >
      <LibraryList
        error={view.error}
        isPending={view.isPending}
        library={library}
        link={link}
        selectedId={selected?.id ?? null}
      />
      {selected ? (
        <LibraryDetail
          key={selected.id}
          library={library}
          link={link}
          loaded={loaded}
          record={selected}
        />
      ) : null}
    </div>
  );
}
