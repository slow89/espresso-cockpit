// PROTOTYPE — throwaway. Pieces the three lineage variants share: state badges, change lists, and
// the go-back actions. Layout stays per variant.
import { getTitle } from "../app-placement/fixtures";
import { ProtoBadge, ProtoButton } from "../app-placement/shared";
import { busyReason, useActiveLink, useProfileLoader } from "../app-placement/use-active-link";
import type { Change, Version } from "./lineage-model";
import { goBack, openAsDraft } from "./lineage-store";

export function VersionBadges({ version }: { version: Version }) {
  return (
    <>
      {version.state === "current" ? <ProtoBadge tone="success">Current</ProtoBadge> : null}
      {version.state === "retired" ? <ProtoBadge tone="warning">Retired</ProtoBadge> : null}
      {version.state === "removed" ? <ProtoBadge tone="warning">Removed</ProtoBadge> : null}
      {version.isBundled ? <ProtoBadge tone="muted">Bundled</ProtoBadge> : null}
    </>
  );
}

export function changeSummary(version: Version) {
  if (version.changes.length === 0) {
    return version.isBundled ? "Bundled original" : "First version";
  }
  const [first, ...rest] = version.changes;
  return rest.length ? `${first.label} +${rest.length} more` : first.label;
}

export function ChangeList({ changes, empty }: { changes: Change[]; empty: string }) {
  if (changes.length === 0) {
    return <p className="font-mono text-[0.72rem] text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-0.5">
      {changes.map((change) => (
        <li className="font-mono text-[0.74rem] leading-5" key={change.label}>
          · {change.label}
        </li>
      ))}
    </ul>
  );
}

export function useGoBack(version: Version) {
  const link = useActiveLink();
  const loader = useProfileLoader();
  const isLoaded = link.title != null && getTitle(version.record) === link.title;
  const blocked =
    version.state === "current"
      ? "This is the current version"
      : (version.goBackBlocked ?? (isLoaded && link.busy ? busyReason : null));
  return {
    blocked,
    label: isLoaded ? "Go back & use" : "Go back to this version",
    run: () => {
      goBack(version.record);
      // The loaded profile follows, like Save on the loaded profile (ticket 07).
      if (isLoaded) loader.load(version.record.profile);
    },
  };
}

export function VersionActions({ version }: { version: Version }) {
  const back = useGoBack(version);
  return (
    <div className="flex shrink-0 flex-col border-t border-border/40">
      {back.blocked && version.state !== "current" ? (
        <p className="bg-highlight/8 px-3 py-1 font-mono text-[0.7rem] text-highlight">
          Go back: {back.blocked}.
        </p>
      ) : null}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <ProtoButton disabled={back.blocked != null} onClick={back.run} tone="primary">
          {back.label}
        </ProtoButton>
        <ProtoButton
          disabled={version.state === "current"}
          onClick={() => openAsDraft(version.record)}
        >
          Open as draft
        </ProtoButton>
      </div>
    </div>
  );
}
