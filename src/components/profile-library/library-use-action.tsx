import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { getUseAction, readMachine } from "@/lib/profile-library";
import { useMachineStateQuery, useUpdateWorkflowMutation } from "@/rest/queries";
import type { ProfileRecord } from "@/rest/types";
import { useDevicesStore } from "@/stores/devices-store";

import type { ProfileLibraryView } from "./use-profile-library";

const actionButtonClassName =
  "h-10 shrink-0 rounded-[3px] px-4 font-mono text-[0.74rem] uppercase tracking-[0.1em]";

export function LibraryUseAction({
  link,
  loaded,
  record,
}: Pick<ProfileLibraryView, "link" | "loaded"> & {
  record: ProfileRecord;
}) {
  const { data: snapshot, isError: isMachineStateError } = useMachineStateQuery();
  const devices = useDevicesStore((state) => (state.connection === "live" ? state.devices : null));
  const updateWorkflowMutation = useUpdateWorkflowMutation();
  // Temporary interaction state: the question being asked, kept so a change behind the dialog
  // can't reword or dismiss it while the operator is reading it.
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const action = getUseAction({
    link,
    loaded,
    machine: readMachine({
      devices,
      state: isMachineStateError ? undefined : snapshot?.state.state,
    }),
    record,
  });
  const blockedReason = action.kind === "blocked" ? action.reason : null;

  function load() {
    updateWorkflowMutation.mutate({ profile: record.profile });
  }

  function handleUse() {
    if (action.kind === "confirm") {
      setConfirmMessage(action.message);
    } else if (action.kind === "load") {
      load();
    }
  }

  return (
    <div className="flex min-h-[3.25rem] shrink-0 items-center gap-3 border-t border-border/40 px-2 py-1.5">
      <Button
        className={actionButtonClassName}
        disabled={
          action.kind === "loaded" || Boolean(blockedReason) || updateWorkflowMutation.isPending
        }
        onClick={handleUse}
        size="sm"
        type="button"
      >
        {action.kind === "loaded" ? "Loaded" : "Use"}
      </Button>

      {blockedReason ? (
        <p className="min-w-0 font-mono text-[0.72rem] leading-4 text-highlight">{blockedReason}</p>
      ) : null}
      {updateWorkflowMutation.error ? (
        <p className="min-w-0 font-mono text-[0.72rem] leading-4 text-destructive">
          {updateWorkflowMutation.error.message}
        </p>
      ) : null}

      {confirmMessage ? (
        <ModalDialog label="Discard unsaved changes" onClose={() => setConfirmMessage(null)}>
          <p className="font-mono text-[0.84rem] leading-5 text-foreground">{confirmMessage}</p>
          {blockedReason ? (
            <p className="mt-2 font-mono text-[0.72rem] leading-4 text-highlight">
              {blockedReason}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              className={actionButtonClassName}
              onClick={() => setConfirmMessage(null)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className={actionButtonClassName}
              disabled={Boolean(blockedReason)}
              onClick={() => {
                setConfirmMessage(null);
                load();
              }}
              size="sm"
              type="button"
            >
              Discard and load
            </Button>
          </div>
        </ModalDialog>
      ) : null}
    </div>
  );
}
