// PROTOTYPE — throwaway. Floating variant switcher; hidden in production builds.
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  if (!import.meta.env.DEV) {
    return null;
  }

  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  );
  const cycle = (delta: number) =>
    onChange(variants[(index + delta + variants.length) % variants.length].key);

  return (
    <div
      className="fixed bottom-[68px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-fuchsia-400/70 bg-fuchsia-950/90 px-1.5 py-1 text-fuchsia-100 shadow-lg"
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
      <span className="min-w-[200px] text-center font-mono text-[0.74rem] font-semibold">
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
    </div>
  );
}
