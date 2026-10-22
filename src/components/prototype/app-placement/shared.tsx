// PROTOTYPE — throwaway. Small shared pieces for the app-placement variants: buttons, badges,
// the replace confirm, and the floating switcher with a state readout and a shot simulator.
import { useState, type ReactNode } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { DevShotToggleButton } from "@/components/dashboard/dashboard-top-bar-cards";
import { cn } from "@/lib/utils";

import { useProtoStore } from "./proto-store";
import { useActiveLink } from "./use-active-link";

export function ProtoButton({
  children,
  className,
  disabled,
  onClick,
  tone = "outline",
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  tone?: "ghost" | "outline" | "primary";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[4px] border px-2.5 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-40",
        tone === "primary" && "border-primary/40 bg-primary text-primary-foreground",
        tone === "outline" && "border-border/60 bg-panel-strong text-foreground hover:bg-panel",
        tone === "ghost" && "border-transparent text-muted-foreground hover:text-foreground",
        className,
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      {children}
    </button>
  );
}

export function ProtoBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "muted" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] border px-1.5 py-[1px] font-mono text-[0.67rem] font-semibold uppercase tracking-[0.08em]",
        tone === "muted" && "border-border/50 text-muted-foreground",
        tone === "success" && "border-status-success-foreground/40 text-status-success-foreground",
        tone === "warning" && "border-highlight/50 bg-highlight/10 text-highlight",
      )}
    >
      {children}
    </span>
  );
}

export function ConfirmDialog() {
  const confirm = useProtoStore((state) => state.confirm);
  const clearConfirm = useProtoStore((state) => state.clearConfirm);

  if (!confirm) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="w-[420px] rounded-[6px] border border-border bg-panel p-4 shadow-lg">
        <p className="font-mono text-[0.84rem] leading-5">{confirm.message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <ProtoButton onClick={clearConfirm}>Cancel</ProtoButton>
          <ProtoButton
            onClick={() => {
              confirm.onConfirm();
              clearConfirm();
            }}
            tone="primary"
          >
            {confirm.confirmLabel}
          </ProtoButton>
        </div>
      </div>
    </div>
  );
}

export function ActiveTicker({ children }: { children?: ReactNode }) {
  const link = useActiveLink();

  return (
    <section className="flex shrink-0 items-center gap-3 border-b border-border/40 bg-panel-strong/30 px-3 py-1.5">
      <span className="block size-2 rounded-full bg-status-success-foreground shadow-[0_0_6px_rgba(107,231,159,0.5)]" />
      <p className="font-mono text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-status-success-foreground">
        Active
      </p>
      <p className="truncate font-mono text-[0.83rem] font-semibold">{link.title ?? "—"}</p>
      {link.unsaved ? (
        <ProtoBadge tone="warning">{link.saved ? "Differs from saved" : "Not saved"}</ProtoBadge>
      ) : null}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </section>
  );
}

export type PrototypeVariant = { key: string; name: string };

export function PrototypeSwitcher({
  current,
  onChange,
  variants,
}: {
  current: string;
  onChange: (key: string) => void;
  variants: ReadonlyArray<PrototypeVariant>;
}) {
  const link = useActiveLink();
  const editor = useProtoStore((state) => state.editor);
  // Temporary UI state: the bar can be tucked away so it doesn't cover the variant.
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!import.meta.env.DEV) {
    return null;
  }

  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  );
  const cycle = (delta: number) =>
    onChange(variants[(index + delta + variants.length) % variants.length].key);
  const readout = [
    `loaded: ${link.title ?? "—"}${link.unsaved ? " (differs)" : ""}`,
    `machine: ${link.machineState ?? "none"}${link.busy ? " BUSY" : ""}`,
    editor
      ? `editor: ${editor.kind} ${editor.draft.title}${editor.isLoaded ? " [loaded]" : ""}`
      : "editor: closed",
  ].join(" · ");

  if (isCollapsed) {
    return (
      <button
        className="fixed bottom-[68px] right-2 z-[70] size-10 rounded-full border border-fuchsia-400/70 bg-fuchsia-950/90 font-mono text-[0.74rem] font-semibold text-fuchsia-100"
        onClick={() => setIsCollapsed(false)}
        type="button"
      >
        {variants[index].key === "today" ? "0" : variants[index].key}
      </button>
    );
  }

  return (
    <div className="fixed bottom-[68px] right-2 z-[70] flex flex-col items-end gap-1">
      <button
        className="rounded-full bg-fuchsia-950/90 px-3 py-0.5 font-mono text-[0.66rem] text-fuchsia-200"
        onClick={() => setIsCollapsed(true)}
        type="button"
      >
        {readout} · tap to hide
      </button>
      <div
        className="flex items-center gap-1 rounded-full border border-fuchsia-400/70 bg-fuchsia-950/90 px-1.5 py-1 text-fuchsia-100 shadow-lg"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") cycle(-1);
          if (event.key === "ArrowRight") cycle(1);
        }}
        tabIndex={0}
      >
        <button
          aria-label="Previous variant"
          className="flex size-9 items-center justify-center rounded-full hover:bg-fuchsia-800"
          onClick={() => cycle(-1)}
          type="button"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[230px] text-center font-mono text-[0.74rem] font-semibold">
          PROTOTYPE {variants[index].key} — {variants[index].name}
        </span>
        <button
          aria-label="Next variant"
          className="flex size-9 items-center justify-center rounded-full hover:bg-fuchsia-800"
          onClick={() => cycle(1)}
          type="button"
        >
          <ChevronRight className="size-4" />
        </button>
        <DevShotToggleButton />
      </div>
    </div>
  );
}
