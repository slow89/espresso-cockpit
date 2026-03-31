import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppTheme = "dark" | "light";

const themeStorageKey = "espresso-cockpit-theme";
const fallbackTheme: AppTheme = "dark";

function isAppTheme(value: unknown): value is AppTheme {
  return value === "dark" || value === "light";
}

function readStoredTheme(): AppTheme {
  if (typeof window === "undefined") {
    return fallbackTheme;
  }

  const rawValue = window.localStorage.getItem(themeStorageKey);

  if (!rawValue) {
    return fallbackTheme;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      state?: {
        theme?: unknown;
      };
    };

    return isAppTheme(parsed.state?.theme) ? parsed.state.theme : fallbackTheme;
  } catch {
    return fallbackTheme;
  }
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function initializeTheme() {
  applyTheme(readStoredTheme());
}

interface ThemeStoreState {
  setTheme: (theme: AppTheme) => void;
  theme: AppTheme;
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set) => ({
      theme: readStoredTheme(),
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: themeStorageKey,
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? fallbackTheme);
      },
    },
  ),
);
