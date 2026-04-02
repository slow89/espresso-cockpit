import { useEffect } from "react";

import { useMachineStateQuery } from "@/rest/queries";
import { useMachineStore } from "@/stores/machine-store";
import { useWaterAlertStore } from "@/stores/water-alert-store";

export function DashboardWaterAlertOverlay() {
  const currentLevel = useMachineStore((state) => state.waterLevels?.currentLevel ?? null);
  const refillLevel = useMachineStore((state) => state.waterLevels?.refillLevel ?? null);
  const { data: snapshot } = useMachineStateQuery();
  const dismissed = useWaterAlertStore((state) => state.dismissed);
  const dismiss = useWaterAlertStore((state) => state.dismiss);
  const resetDismiss = useWaterAlertStore((state) => state.resetDismiss);
  const isThresholdLow =
    currentLevel != null && refillLevel != null && currentLevel <= refillLevel;
  const isNeedsWater = snapshot?.state.state === "needsWater";
  const isLow = isThresholdLow || isNeedsWater;

  useEffect(() => {
    if (!isLow) {
      resetDismiss();
    }
  }, [isLow, resetDismiss]);

  if (!isLow || dismissed) {
    return null;
  }

  return (
    <section
      aria-label="Water tank low"
      className="fixed inset-x-0 top-0 z-50 flex w-full flex-col overflow-hidden bg-[#e8c96e] text-left"
      style={{
        height: "calc(100vh - var(--app-footer-height) - env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Background image — contained so it stays sharp */}
      <div
        className="absolute inset-0 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/corgi-water-desert.png')" }}
      />

      {/* Bottom gradient so text is readable */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(60,35,10,0.7)_75%,rgba(40,22,6,0.95)_100%)]" />

      {/* Content */}
      <div className="relative flex flex-1 flex-col justify-end px-6 pb-8">
        <div className="mx-auto w-full max-w-[760px] text-center">
          <h1 className="font-mono text-[1.6rem] font-semibold leading-tight tracking-[0.04em] text-white md:text-[2.2rem]">
            Refill the tank!
          </h1>
          <p className="mt-1.5 font-mono text-[0.68rem] font-bold tabular-nums text-[#f5d485]">
            Water level: {formatMillimeters(currentLevel)}
            {refillLevel != null ? ` / refill at ${formatMillimeters(refillLevel)}` : ""}
          </p>
        </div>
      </div>

      {/* Dismiss button */}
      <div className="relative px-6 pb-4 text-center">
        <button
          className="rounded-[12px] border border-white/20 bg-white/10 px-6 py-2.5 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition hover:bg-white/20 active:bg-white/25 md:text-[0.78rem]"
          onClick={dismiss}
          type="button"
        >
          I'll refill, I promise
        </button>
      </div>
    </section>
  );
}

function formatMillimeters(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-- mm";
  }

  const hasFraction = Math.abs(value % 1) > 0.001;
  return `${value.toFixed(hasFraction ? 1 : 0)} mm`;
}
