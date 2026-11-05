import { getProfileTitle } from "@/lib/workflow-utils";
import { cn } from "@/lib/utils";
import { useProfileLibraryUiStore, type ProfilesSegment } from "@/stores/profile-library-ui-store";

import { LibraryBadge } from "./library-badge";
import type { ProfileLibraryView } from "./use-profile-library";

const segments: ReadonlyArray<{ key: ProfilesSegment; label: string }> = [
  { key: "library", label: "Library" },
  { key: "setup", label: "Shot setup" },
];

export function LoadedProfileStrip({ link, loaded }: Pick<ProfileLibraryView, "link" | "loaded">) {
  const segment = useProfileLibraryUiStore((state) => state.segment);
  const setSegment = useProfileLibraryUiStore((state) => state.setSegment);

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border/40 bg-panel-strong/30 px-2 py-1">
      <div className="flex shrink-0 gap-1">
        {segments.map(({ key, label }) => (
          <button
            aria-pressed={segment === key}
            className={cn(
              "h-10 rounded-[4px] border px-3 font-mono text-[0.74rem] font-semibold uppercase tracking-[0.1em] transition",
              segment === key
                ? "border-primary/30 bg-primary/15 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            key={key}
            onClick={() => setSegment(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="ml-auto flex min-w-0 items-center gap-2 pr-1"
        data-testid="loaded-profile-strip"
      >
        {loaded ? (
          <span
            aria-hidden
            className="block size-2 shrink-0 rounded-full bg-status-success-foreground shadow-[0_0_6px_rgba(107,231,159,0.5)]"
          />
        ) : null}
        <p className="truncate font-mono text-[0.83rem] font-semibold text-foreground">
          {getStripTitle({ link, loaded })}
        </p>
        {link.status === "differs" ? (
          <LibraryBadge tone="warning">Differs from saved</LibraryBadge>
        ) : null}
        {link.status === "not-saved" ? <LibraryBadge tone="warning">Not saved</LibraryBadge> : null}
      </div>
    </header>
  );
}

function getStripTitle({ link, loaded }: Pick<ProfileLibraryView, "link" | "loaded">) {
  if (loaded) {
    return getProfileTitle(loaded);
  }

  return link.status === "unknown" ? "Waiting for the Bridge" : "No profile loaded";
}
