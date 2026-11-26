import { create } from "zustand";

import type { LibraryChip } from "@/lib/profile-library";

export type ProfilesSegment = "library" | "setup";

type ProfileLibraryUiState = {
  chip: LibraryChip;
  segment: ProfilesSegment;
  selectedRecordId: string | null;
  selectRecord: (recordId: string) => void;
  setChip: (chip: LibraryChip) => void;
  setSegment: (segment: ProfilesSegment) => void;
};

/** Survives leaving the Profiles tab. A null selection means "follow the loaded profile". */
export const useProfileLibraryUiStore = create<ProfileLibraryUiState>((set) => ({
  chip: "all",
  segment: "library",
  selectedRecordId: null,
  selectRecord: (selectedRecordId) => set({ selectedRecordId }),
  setChip: (chip) => set({ chip }),
  setSegment: (segment) => set({ segment }),
}));
