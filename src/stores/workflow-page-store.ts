import { create } from "zustand";

import type { WorkflowProfile } from "@/rest/types";

type WorkflowLibraryStatus = {
  message: string | null;
  tone: "error" | "success";
};

type WorkflowPageState = {
  closeFramePreview: () => void;
  framePreviewProfile: WorkflowProfile | null;
  openFramePreview: (profile: WorkflowProfile | undefined) => void;
  profileLibraryStatus: WorkflowLibraryStatus;
  reset: () => void;
  setProfileLibraryError: (message: string) => void;
  setProfileLibrarySuccess: (message: string) => void;
};

const defaultProfileLibraryStatus: WorkflowLibraryStatus = {
  message: null,
  tone: "success",
};

const defaultWorkflowPageState = {
  framePreviewProfile: null,
  profileLibraryStatus: defaultProfileLibraryStatus,
} satisfies Pick<WorkflowPageState, "framePreviewProfile" | "profileLibraryStatus">;

export const useWorkflowPageStore = create<WorkflowPageState>((set) => ({
  ...defaultWorkflowPageState,
  closeFramePreview: () =>
    set({
      framePreviewProfile: null,
    }),
  openFramePreview: (profile) => {
    if (!profile?.steps?.length) {
      return;
    }

    set({
      framePreviewProfile: profile,
    });
  },
  reset: () =>
    set({
      ...defaultWorkflowPageState,
    }),
  setProfileLibraryError: (message) =>
    set({
      profileLibraryStatus: {
        message,
        tone: "error",
      },
    }),
  setProfileLibrarySuccess: (message) =>
    set({
      profileLibraryStatus: {
        message,
        tone: "success",
      },
    }),
}));

export const workflowPageDefaultState = defaultWorkflowPageState;
