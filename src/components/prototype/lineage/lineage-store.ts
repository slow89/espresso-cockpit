// PROTOTYPE — throwaway. Which profile's history is open, which version is selected, and the two
// go-back actions under test. Library records live in the app-placement prototype's store.
import { create } from "zustand";
import { toast } from "sonner";

import { getTitle, type ProtoRecord } from "../app-placement/fixtures";
import { useProtoStore } from "../app-placement/proto-store";
import { buildLineage, formatWhen } from "./lineage-model";

type LineageState = {
  close: () => void;
  compareTo: "previous" | "current";
  open: (record: ProtoRecord) => void;
  openId: string | null;
  select: (id: string) => void;
  selectedId: string | null;
  setCompareTo: (compareTo: "previous" | "current") => void;
};

export const useLineageStore = create<LineageState>((set) => ({
  close: () => set({ openId: null }),
  compareTo: "previous",
  open: (record) => set({ openId: record.id, selectedId: record.id }),
  openId: null,
  select: (selectedId) => set({ selectedId }),
  selectedId: null,
  setCompareTo: (compareTo) => set({ compareTo }),
}));

export function useOpenLineage() {
  const records = useProtoStore((state) => state.records);
  const openId = useLineageStore((state) => state.openId);
  const selectedId = useLineageStore((state) => state.selectedId);
  const start = records.find((record) => record.id === openId);
  if (!start) return null;
  const lineage = buildLineage(records, start);
  const selected =
    lineage.versions.find((version) => version.record.id === selectedId) ?? lineage.versions[0];
  return { ...lineage, selected };
}

// Go back = make an older version current: un-hide it and hide the current one. Both stay in the
// lineage; the newer one counts as Superseded because it carries the revision marker.
export function goBack(target: ProtoRecord) {
  const { records } = useProtoStore.getState();
  const lineage = buildLineage(records, target);
  const current = lineage.current;
  useProtoStore.setState({
    records: records.map((record) =>
      record.id === target.id
        ? { ...record, deleted: false, hidden: false }
        : record.id === current?.id
          ? { ...record, hidden: true }
          : record,
    ),
    selectedId: target.id,
  });
  useLineageStore.setState({ openId: target.id, selectedId: target.id });
  toast(`${getTitle(target)} is back to the version of ${formatWhen(target.createdAt)} · Undo`);
}

// Open as draft = the streamline-js model: the older Steps become an unsaved draft of the current
// version. Saving it unchanged would collide with the older record (POST dedups).
export function openAsDraft(target: ProtoRecord) {
  const { records, openEditor } = useProtoStore.getState();
  const current = buildLineage(records, target).current;
  openEditor({
    baseline: current?.profile ?? null,
    draft: { ...target.profile, title: current?.profile.title ?? target.profile.title },
    isLoaded: false,
    kind: "edit",
    origin: "History",
    sourceId: current?.id ?? null,
  });
}
