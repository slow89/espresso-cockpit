import {
  buildProfileLibrary,
  linkActiveProfile,
  type ActiveProfileLink,
} from "@/lib/profile-library";
import { useBundledManifestQuery, useProfilesQuery, useWorkflowQuery } from "@/rest/queries";

export function useProfileLibrary() {
  const profilesQuery = useProfilesQuery();
  const { data: manifest } = useBundledManifestQuery();
  const { data: workflow } = useWorkflowQuery();
  const library = buildProfileLibrary(profilesQuery.data ?? [], manifest);
  const loaded = workflow?.profile;
  const link: ActiveProfileLink =
    profilesQuery.data && workflow
      ? linkActiveProfile(library, loaded)
      : { record: null, status: "unknown" };

  return {
    error: profilesQuery.error,
    isPending: profilesQuery.isPending,
    library,
    link,
    loaded,
  };
}

export type ProfileLibraryView = ReturnType<typeof useProfileLibrary>;
