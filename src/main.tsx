import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app/providers";
import { initializeAppRuntime } from "@/app/runtime";
import { AppRouter } from "@/router";
import { initializeTheme } from "@/stores/theme-store";
import "@/styles.css";

declare global {
  interface Window {
    __espressoBoot?: {
      fail: (message: string) => void;
      mark: (message: string) => void;
      ready: () => void;
    };
  }
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing root container");
}

window.__espressoBoot?.mark("Espresso Cockpit booting...\n\nMain bundle loaded. Mounting app...");

initializeTheme();
initializeAppRuntime();

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);

window.__espressoBoot?.ready();
