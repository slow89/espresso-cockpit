import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { VisualizerSettingsPanel } from "@/components/settings/visualizer-settings-panel";
import { Button } from "@/components/ui/button";
import {
  ControlBlock,
  MetricTile,
  SettingsSection,
  SleepTimeoutOptionButton,
  StateCallout,
  ThemeOptionButton,
} from "@/components/settings/settings-shell";
import {
  usePresenceSettingsQuery,
  useUpdatePresenceSettingsMutation,
} from "@/rest/queries";
import type {
  DisplayState,
  PresenceSettings,
} from "@/rest/types";
import { useDisplayStore } from "@/stores/display-store";
import { usePresenceStore } from "@/stores/presence-store";
import { useThemeStore } from "@/stores/theme-store";

export function SettingsDisplaySleepPanel() {
  const sleepTimeoutOptions = [0, 15, 30, 45, 60] as const;
  const {
    data: presenceSettings,
    error: presenceSettingsError,
    isPending: isPresenceSettingsPending,
  } = usePresenceSettingsQuery();
  const updatePresenceSettingsMutation = useUpdatePresenceSettingsMutation();
  const displayError = useDisplayStore((state) => state.error);
  const displayState = useDisplayStore((state) => state.displayState);
  const requestWakeLock = useDisplayStore((state) => state.requestWakeLock);
  const releaseWakeLock = useDisplayStore((state) => state.releaseWakeLock);
  const setBrightness = useDisplayStore((state) => state.setBrightness);
  const heartbeatError = usePresenceStore((state) => state.error);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isFullscreen = useIsFullscreen();
  const [brightnessDraft, setBrightnessDraft] = useState(100);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const canToggleFullscreen = hasFullscreenApi();
  const wakeLockLabel = getWakeLockLabel(displayState);
  const sleepTimerLabel = formatConfiguredSleepTimeout(presenceSettings);

  useEffect(() => {
    setBrightnessDraft(displayState?.requestedBrightness ?? 100);
  }, [displayState?.requestedBrightness]);

  function handleBrightnessChange(event: ChangeEvent<HTMLInputElement>) {
    setBrightnessDraft(Number(event.target.value));
  }

  function commitBrightness(nextBrightness = brightnessDraft) {
    void setBrightness(nextBrightness);
  }

  function handleBrightnessKeyUp(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
      commitBrightness();
    }
  }

  async function handleFullscreenToggle() {
    if (!hasFullscreenApi()) {
      setFullscreenError("Full screen is not available on this device.");
      return;
    }

    setFullscreenError(null);

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch (error) {
      setFullscreenError(
        error instanceof Error ? error.message : "Unable to change full screen mode.",
      );
    }
  }

  async function handleSleepTimeoutChange(minutes: number) {
    await updatePresenceSettingsMutation.mutateAsync({
      sleepTimeoutMinutes: minutes,
      userPresenceEnabled: minutes > 0,
    });
  }

  return (
    <SettingsSection
      description="Brightness, sleep, theme, screen tools"
      title="Display & Sleep"
    >
      <div className="grid gap-2">
        {/* Quick-glance metric row */}
        <div className="grid grid-cols-3 gap-1.5">
          <MetricTile label="Wake-lock" value={wakeLockLabel} />
          <MetricTile label="Sleep timer" value={sleepTimerLabel} />
          <MetricTile label="Theme" value={theme} />
        </div>

        {/* Brightness */}
        <ControlBlock
          description={formatBrightnessSupport(displayState)}
          label="Brightness"
          value={formatBrightnessValue(brightnessDraft)}
        >
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[0.46rem] uppercase tracking-[0.08em] text-muted-foreground/70">
              Dim
            </span>
            <input
              className="h-1.5 w-full cursor-pointer accent-[#d0a954] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={displayState?.platformSupported.brightness === false}
              max={100}
              min={0}
              onBlur={() => commitBrightness()}
              onChange={handleBrightnessChange}
              onKeyUp={handleBrightnessKeyUp}
              onPointerUp={() => commitBrightness()}
              step={1}
              type="range"
              value={brightnessDraft}
            />
            <span className="font-mono text-[0.46rem] uppercase tracking-[0.08em] text-muted-foreground/70">
              Auto
            </span>
          </div>
          <p className="mt-1 font-mono text-[0.46rem] tracking-[0.03em] text-muted-foreground/50">
            Applied: {formatBrightness(displayState)}
          </p>
        </ControlBlock>

        {/* Sleep timer */}
        <ControlBlock
          description="Auto-sleep after inactivity"
          label="Sleep timer"
          value={sleepTimerLabel}
        >
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {sleepTimeoutOptions.map((minutes) => (
              <SleepTimeoutOptionButton
                disabled={isPresenceSettingsPending || updatePresenceSettingsMutation.isPending}
                isActive={getSleepTimeoutMinutes(presenceSettings) === minutes}
                key={minutes}
                label={formatSleepTimeoutOption(minutes)}
                onClick={() => void handleSleepTimeoutChange(minutes)}
              />
            ))}
          </div>
        </ControlBlock>

        {/* Theme */}
        <ControlBlock
          description="Surface appearance"
          label="Theme"
          value={theme}
        >
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <ThemeOptionButton
              isActive={theme === "dark"}
              label="Dark"
              onClick={() => setTheme("dark")}
            />
            <ThemeOptionButton
              isActive={theme === "light"}
              label="Light"
              onClick={() => setTheme("light")}
            />
          </div>
        </ControlBlock>

        {/* Visualizer */}
        <VisualizerSettingsPanel />

        {/* Screen tools */}
        <ControlBlock
          description="Wake lock + fullscreen"
          label="Screen tools"
          value={isFullscreen ? "Fullscreen" : "Normal"}
        >
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Button
              className="min-h-[34px] rounded-[3px] px-3 text-[0.52rem] uppercase tracking-[0.14em]"
              disabled={displayState?.platformSupported.wakeLock === false}
              onClick={() =>
                void (displayState?.wakeLockOverride ? releaseWakeLock() : requestWakeLock())
              }
              size="sm"
            >
              {displayState?.wakeLockOverride ? "Let screen sleep" : "Keep screen on"}
            </Button>
            <Button
              className="min-h-[34px] rounded-[3px] px-3 text-[0.52rem] uppercase tracking-[0.14em]"
              disabled={!canToggleFullscreen}
              onClick={() => void handleFullscreenToggle()}
              size="sm"
              variant="secondary"
            >
              {isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            </Button>
          </div>
        </ControlBlock>

        {/* Error callouts */}
        {displayError ? <StateCallout tone="error">{displayError}</StateCallout> : null}
        {presenceSettingsError ? (
          <StateCallout tone="error">{presenceSettingsError.message}</StateCallout>
        ) : null}
        {heartbeatError ? <StateCallout tone="error">{heartbeatError}</StateCallout> : null}
        {fullscreenError ? <StateCallout tone="error">{fullscreenError}</StateCallout> : null}
      </div>
    </SettingsSection>
  );
}

function getWakeLockLabel(displayState: DisplayState | null) {
  if (displayState == null) {
    return "Unknown";
  }

  if (displayState.wakeLockOverride) {
    return "Override active";
  }

  return displayState.wakeLockEnabled ? "Auto-managed on" : "Auto-managed off";
}

function formatBrightness(displayState: DisplayState | null) {
  if (!displayState) {
    return "Unknown";
  }

  const base =
    displayState.requestedBrightness === 100
      ? "Auto"
      : `${displayState.brightness}%`;

  if (
    displayState.lowBatteryBrightnessActive &&
    displayState.requestedBrightness !== displayState.brightness
  ) {
    return `${base} (capped from ${displayState.requestedBrightness}%)`;
  }

  if (displayState.requestedBrightness === 100) {
    return "Auto (OS managed)";
  }

  return base;
}

function formatBrightnessValue(brightness: number) {
  if (brightness === 100) {
    return "Auto";
  }

  return `${brightness}%`;
}

function formatBrightnessSupport(displayState: DisplayState | null) {
  if (!displayState) {
    return "Waiting for bridge";
  }

  if (!displayState.platformSupported.brightness) {
    return "Not available on this platform";
  }

  if (displayState.lowBatteryBrightnessActive) {
    return "Low battery may cap brightness";
  }

  return "Drag to set, Auto uses OS";
}

function getSleepTimeoutMinutes(presenceSettings: PresenceSettings | undefined) {
  if (!presenceSettings) {
    return 30;
  }

  if (!presenceSettings.userPresenceEnabled || presenceSettings.sleepTimeoutMinutes <= 0) {
    return 0;
  }

  return presenceSettings.sleepTimeoutMinutes;
}

function formatConfiguredSleepTimeout(presenceSettings: PresenceSettings | undefined) {
  if (!presenceSettings) {
    return "Loading";
  }

  const minutes = getSleepTimeoutMinutes(presenceSettings);

  if (minutes <= 0) {
    return "Disabled";
  }

  return `${minutes} min`;
}

function formatSleepTimeoutOption(minutes: number) {
  if (minutes <= 0) {
    return "Off";
  }

  return `${minutes}m`;
}

function hasFullscreenApi() {
  if (typeof document === "undefined") {
    return false;
  }

  return typeof document.documentElement.requestFullscreen === "function";
}

function subscribeToFullscreen(callback: () => void) {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  document.addEventListener("fullscreenchange", callback);
  return () => {
    document.removeEventListener("fullscreenchange", callback);
  };
}

function getFullscreenSnapshot() {
  if (typeof document === "undefined") {
    return false;
  }

  return Boolean(document.fullscreenElement);
}

function useIsFullscreen() {
  return useSyncExternalStore(subscribeToFullscreen, getFullscreenSnapshot, () => false);
}
