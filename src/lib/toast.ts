import { toast } from "sonner";

export function showVisualizerToast(message: string) {
  toast(message, {
    classNames: {
      description: "hidden",
      toast:
        "min-h-0 rounded-[12px] border border-[color:var(--status-info-border)] bg-[color:var(--status-info-surface)] px-3 py-2 text-[color:var(--status-info-foreground)] shadow-panel",
      title: "font-mono text-[0.8rem] font-medium leading-4 tracking-[0.01em]",
    },
    duration: 2400,
  });
}
