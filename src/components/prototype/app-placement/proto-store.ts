// PROTOTYPE — throwaway. In-memory library and editor session for the app-placement prototype.
// Nothing here is written to the Bridge except loads into the (fake gateway) Workflow.
import { create } from "zustand";

import type { WorkflowProfile } from "@/rest/types";

import {
  getTitle,
  initialLibrary,
  visibleRecords,
  type BeverageFilter,
  type ProtoRecord,
} from "./fixtures";

export type DraftKind = "edit" | "fork" | "new";

export type EditorSession = {
  // What "has anything the machine runs changed" compares against; null for a brand-new profile.
  baseline: WorkflowProfile | null;
  draft: WorkflowProfile;
  isLoaded: boolean;
  kind: DraftKind;
  origin: string;
  sourceId: string | null;
};

type PendingConfirm = {
  confirmLabel: string;
  message: string;
  onConfirm: () => void;
};

type ProtoState = {
  askConfirm: (confirm: PendingConfirm) => void;
  clearConfirm: () => void;
  closeEditor: () => void;
  commitSave: () => ProtoRecord | null;
  confirm: PendingConfirm | null;
  editor: EditorSession | null;
  filter: BeverageFilter;
  openEditor: (session: EditorSession) => void;
  records: ProtoRecord[];
  replaceDraft: (draft: WorkflowProfile) => void;
  saveAsNew: () => void;
  selectedId: string | null;
  setFilter: (filter: BeverageFilter) => void;
  setSelected: (id: string | null) => void;
  simulateEdit: () => void;
};

let savedCount = 0;

export const useProtoStore = create<ProtoState>((set, get) => ({
  askConfirm: (confirm) => set({ confirm }),
  clearConfirm: () => set({ confirm: null }),
  closeEditor: () => set({ editor: null }),
  commitSave: () => {
    const { editor, records } = get();

    if (!editor) {
      return null;
    }

    savedCount += 1;
    const saved: ProtoRecord = {
      createdAt: new Date().toISOString(),
      id: `op:saved-${savedCount}`,
      isDefault: false,
      marker: editor.kind === "fork" ? "fork" : editor.sourceId != null ? "revision" : undefined,
      parentId: editor.sourceId ?? undefined,
      profile: editor.draft,
    };
    const nextRecords = records.map((record) =>
      editor.kind === "edit" && record.id === editor.sourceId
        ? { ...record, hidden: true }
        : record,
    );

    set({
      editor: { ...editor, baseline: editor.draft, kind: "edit", sourceId: saved.id },
      records: [saved, ...nextRecords],
      selectedId: saved.id,
    });

    return saved;
  },
  confirm: null,
  editor: null,
  filter: "all",
  openEditor: (editor) => set({ editor }),
  records: initialLibrary,
  replaceDraft: (draft) => {
    const { editor } = get();

    if (editor) {
      set({ editor: { ...editor, draft } });
    }
  },
  saveAsNew: () => {
    const { editor, records } = get();

    if (!editor) {
      return;
    }

    const source = records.find((record) => record.id === editor.sourceId);

    set({
      editor: {
        baseline: source?.profile ?? editor.baseline,
        draft: { ...editor.draft, title: copyTitle(editor.draft.title ?? "Untitled", records) },
        isLoaded: false,
        kind: "fork",
        origin: editor.origin,
        sourceId: editor.sourceId,
      },
    });
  },
  selectedId: "op:house-v2",
  setFilter: (filter) => set({ filter }),
  setSelected: (selectedId) => set({ selectedId }),
  simulateEdit: () => {
    const { editor } = get();

    if (!editor) {
      return;
    }

    const steps = editor.draft.steps ?? [];
    const index = Math.min(1, steps.length - 1);

    set({
      editor: {
        ...editor,
        draft: {
          ...editor.draft,
          steps: steps.map((step, stepIndex) =>
            stepIndex === index
              ? { ...step, temperature: Number(step.temperature ?? 92) + 0.5 }
              : step,
          ),
        },
      },
    });
  },
}));

export function copyTitle(title: string, records: ProtoRecord[]) {
  const taken = new Set(visibleRecords(records).map(getTitle));
  let candidate = `${title} copy`;
  let suffix = 2;

  while (taken.has(candidate)) {
    candidate = `${title} copy ${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export const newProfileDraft: WorkflowProfile = {
  author: "Operator",
  beverage_type: "espresso",
  notes: "",
  steps: [{ flow: 0, name: "Step 1", pressure: 9, pump: "pressure", seconds: 30, temperature: 93 }],
  title: "New profile",
  version: "2",
};
