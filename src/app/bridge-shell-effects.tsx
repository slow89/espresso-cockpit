import { useEffect, useEffectEvent } from "react";

import { presenceStore } from "@/stores/presence-store";

const activityEvents = ["keydown", "pointerdown", "touchstart"] as const;

export function BridgeShellEffects() {
  const signalPresence = useEffectEvent(() => {
    void presenceStore.getState().signalPresence();
  });
  // Older tablet WebViews can misreport `vh`/`svh`, so we expose a measured viewport height to CSS.
  const syncViewportHeight = useEffectEvent(() => {
    const nextHeight = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty(
      "--app-viewport-height",
      `${Math.round(nextHeight)}px`,
    );
  });

  useEffect(() => {
    const visualViewport = window.visualViewport;

    syncViewportHeight();
    window.addEventListener("resize", syncViewportHeight);
    window.addEventListener("orientationchange", syncViewportHeight);
    window.addEventListener("pageshow", syncViewportHeight);
    visualViewport?.addEventListener("resize", syncViewportHeight);
    visualViewport?.addEventListener("scroll", syncViewportHeight);

    return () => {
      window.removeEventListener("resize", syncViewportHeight);
      window.removeEventListener("orientationchange", syncViewportHeight);
      window.removeEventListener("pageshow", syncViewportHeight);
      visualViewport?.removeEventListener("resize", syncViewportHeight);
      visualViewport?.removeEventListener("scroll", syncViewportHeight);
      document.documentElement.style.removeProperty("--app-viewport-height");
    };
  }, [syncViewportHeight]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void presenceStore.getState().signalPresence(true);
      }
    }

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, signalPresence, { passive: true });
    }

    window.addEventListener("focus", signalPresence);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void presenceStore.getState().signalPresence(true);

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, signalPresence);
      }

      window.removeEventListener("focus", signalPresence);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [signalPresence]);

  return null;
}
