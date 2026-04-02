import { cn } from "@/lib/utils";

export function DashboardSleepScreen({
  disabled,
  hasError,
  isPending,
  onWake,
}: {
  disabled: boolean;
  hasError: boolean;
  isPending: boolean;
  onWake: () => void;
}) {
  return (
    <button
      aria-label={isPending ? "Turning on machine" : "Turn on machine"}
      className={cn(
        "fixed inset-x-0 top-0 z-10 flex w-full appearance-none flex-col overflow-hidden border-0 bg-[#120f0d] bg-cover bg-center bg-no-repeat p-0 text-center transition dark",
        disabled ? "cursor-wait" : "cursor-pointer hover:brightness-[1.03]",
      )}
      data-testid="dashboard-sleep-screen"
      disabled={disabled}
      onClick={onWake}
      style={{
        backgroundImage: "url('/corgi-drinking-espresso.png')",
        height: "calc(100vh - var(--app-footer-height) - env(safe-area-inset-bottom, 0px))",
      }}
      type="button"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,12,10,0.2)_0%,rgba(15,12,10,0.08)_32%,rgba(15,12,10,0.35)_68%,rgba(15,12,10,0.82)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(245,226,192,0.18),_transparent_62%)]" />

      <div className="pointer-events-none relative flex w-full flex-1 flex-col justify-end px-6 pb-12 pt-[calc(env(safe-area-inset-top,0px)+2rem)]">
        <div className="mx-auto w-full max-w-[760px] text-center">
          <div className="mx-auto max-w-[520px] rounded-[24px] bg-[linear-gradient(180deg,rgba(15,12,10,0.1)_0%,rgba(15,12,10,0.42)_100%)] px-5 py-6 backdrop-blur-[2px]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-highlight-muted">
              Coffee break
            </p>
            <h1 className="mt-3 font-mono text-[1.8rem] font-semibold tracking-[0.04em] text-foreground md:text-[2.4rem]">
              Your corgi barista is napping.
            </h1>
          </div>
        </div>
      </div>

      <div className="pointer-events-none relative w-full px-6 pb-4 text-center">
        <p className="font-mono text-[0.78rem] uppercase tracking-[0.18em] text-muted-foreground md:text-[0.84rem]">
          {isPending ? "Turning on..." : "Tap anywhere to turn on machine"}
        </p>
        {hasError && !isPending ? (
          <p className="mt-2 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-status-warning-foreground">
            Reconnecting to bridge. Wake retry stays available.
          </p>
        ) : null}
      </div>
    </button>
  );
}
