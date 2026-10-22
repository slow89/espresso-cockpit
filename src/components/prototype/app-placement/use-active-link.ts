// PROTOTYPE — throwaway. Derived link between the Workflow's Active Profile and the library, plus
// the entry points into the editor. Rules from tickets 06 and 07 (title link, busy gate, replace confirm).
import { useMachineStateQuery, useUpdateWorkflowMutation, useWorkflowQuery } from "@/rest/queries";
import type { MachineState, WorkflowProfile } from "@/rest/types";

import { getTitle, runsKey, visibleRecords, type ProtoRecord } from "./fixtures";
import { copyTitle, newProfileDraft, useProtoStore } from "./proto-store";

const freeStates = new Set<MachineState>([
  "idle",
  "schedIdle",
  "heating",
  "preheating",
  "sleeping",
]);

export const busyReason = "Available when the shot ends";

export function useActiveLink() {
  const { data: workflow } = useWorkflowQuery();
  const { data: machine } = useMachineStateQuery();
  const records = useProtoStore((state) => state.records);
  const loaded = workflow?.profile;
  const title = loaded?.title?.trim() || null;
  const saved = visibleRecords(records).find((record) => getTitle(record) === title) ?? null;
  const machineState = machine?.state.state ?? null;

  return {
    busy: machineState != null && !freeStates.has(machineState),
    loaded,
    machineState,
    saved,
    title,
    unsaved: loaded != null && (!saved || runsKey(saved.profile) !== runsKey(loaded)),
  };
}

export function useProfileLoader() {
  const link = useActiveLink();
  const mutation = useUpdateWorkflowMutation();
  const askConfirm = useProtoStore((state) => state.askConfirm);

  function load(profile: WorkflowProfile, onLoaded?: () => void) {
    if (link.busy) {
      return;
    }

    const write = () => mutation.mutate({ profile }, { onSuccess: () => onLoaded?.() });

    if (profile.title !== link.title && link.unsaved) {
      askConfirm({
        confirmLabel: "Discard and load",
        message: `${link.title} has unsaved changes. Loading another profile discards them.`,
        onConfirm: write,
      });
      return;
    }

    write();
  }

  return { busy: link.busy, isPending: mutation.isPending, load };
}

export function useEditorEntry(origin: string) {
  const link = useActiveLink();
  const records = useProtoStore((state) => state.records);
  const openEditor = useProtoStore((state) => state.openEditor);

  function editLoaded() {
    if (!link.loaded) {
      return;
    }

    // One profile, one draft: the loaded profile's draft always starts from the Workflow copy.
    openEditor({
      baseline: link.saved?.profile ?? null,
      draft: link.loaded,
      isLoaded: true,
      kind: "edit",
      origin,
      sourceId: link.saved?.id ?? null,
    });
  }

  function edit(record: ProtoRecord) {
    if (getTitle(record) === link.title) {
      editLoaded();
      return;
    }

    openEditor({
      baseline: record.profile,
      draft: record.profile,
      isLoaded: false,
      kind: "edit",
      origin,
      sourceId: record.id,
    });
  }

  function duplicate(record: ProtoRecord) {
    openEditor({
      baseline: record.profile,
      draft: { ...record.profile, title: copyTitle(getTitle(record), records) },
      isLoaded: false,
      kind: "fork",
      origin,
      sourceId: record.id,
    });
  }

  function createNew() {
    openEditor({
      baseline: null,
      draft: newProfileDraft,
      isLoaded: false,
      kind: "new",
      origin,
      sourceId: null,
    });
  }

  return { createNew, duplicate, edit, editLoaded };
}
