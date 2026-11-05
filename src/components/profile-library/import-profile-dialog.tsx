import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { isVisualizerEnabled } from "@/lib/visualizer";
import { useImportVisualizerProfileMutation, useVisualizerSettingsQuery } from "@/rest/queries";

export function ImportProfileDialog({ onClose }: { onClose: () => void }) {
  // An editable draft, cleared once it has been imported.
  const [shareCode, setShareCode] = useState("");
  const { data: visualizerSettings } = useVisualizerSettingsQuery();
  const importMutation = useImportVisualizerProfileMutation();
  const isVisualizerReady = isVisualizerEnabled(visualizerSettings);
  const isImportDisabled = importMutation.isPending || !shareCode.trim() || !isVisualizerReady;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isImportDisabled) {
      return;
    }

    importMutation.mutate(shareCode.trim(), { onSuccess: () => setShareCode("") });
  }

  return (
    <ModalDialog label="Import a profile" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.1em] text-highlight">
          Visualizer Import
        </p>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <label className="grid gap-0.5" htmlFor="visualizer-share-code">
            <span className="sr-only">Share code</span>
            <Input
              autoCapitalize="characters"
              className="h-10 rounded-[3px] border-border/60 bg-panel-strong font-mono text-[0.78rem] uppercase"
              id="visualizer-share-code"
              onChange={(event) => setShareCode(event.target.value)}
              placeholder="AB12"
              value={shareCode}
            />
          </label>
          <Button
            className="h-10 shrink-0 rounded-[3px] px-3 font-mono text-[0.72rem] uppercase tracking-[0.1em]"
            disabled={isImportDisabled}
            size="sm"
            type="submit"
          >
            {importMutation.isPending ? "..." : "Import"}
          </Button>
        </div>

        {importMutation.error ? (
          <p className="mt-1.5 font-mono text-[0.72rem] leading-4 text-destructive">
            {importMutation.error.message}
          </p>
        ) : importMutation.data ? (
          <p className="mt-1.5 font-mono text-[0.72rem] leading-4 text-highlight">
            Imported {importMutation.data.profileTitle || "Visualizer profile"}.
          </p>
        ) : (
          <p className="mt-1.5 font-mono text-[0.72rem] leading-4 text-muted-foreground/60">
            {isVisualizerReady ? "Enter 4-digit share code." : "Enable Visualizer in Setup."}
          </p>
        )}

        <div className="mt-3 flex justify-end">
          <Button
            className="h-10 rounded-[3px] px-3 font-mono text-[0.72rem] uppercase tracking-[0.1em]"
            onClick={onClose}
            size="sm"
            type="button"
            variant="outline"
          >
            Close
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
