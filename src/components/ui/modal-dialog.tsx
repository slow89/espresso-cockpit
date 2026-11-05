import type { ReactNode } from "react";

/** A stable callback ref, so the dialog opens once when it mounts and never on a re-render. */
function openAsModal(dialog: HTMLDialogElement | null) {
  if (dialog && !dialog.open) {
    dialog.showModal();
  }
}

/**
 * A native modal dialog, which brings focus handling, inert content behind it, and the top layer.
 * It's anchored near the top of the screen so the tablet's soft keyboard can't cover it.
 */
export function ModalDialog({
  children,
  label,
  onClose,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
}) {
  return (
    <dialog
      aria-label={label}
      className="mx-auto mb-auto mt-10 w-[440px] max-w-[calc(100vw-2rem)] rounded-[6px] border border-border bg-panel p-0 text-foreground shadow-panel backdrop:bg-overlay"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      ref={openAsModal}
    >
      <div className="p-4">{children}</div>
    </dialog>
  );
}
