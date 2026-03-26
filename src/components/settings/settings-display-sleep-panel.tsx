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
      className="xl:sticky xl:top-3"
      description="Keep the tablet readable, awake, and easy to recover during service."
      title="Display & Sleep"
    >
      <div className="grid gap-3">
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-2">
          <MetricTile label="Wake-lock" value={wakeLockLabel} />
          <MetricTile label="Sleep timer" value={sleepTimerLabel} />
          <MetricTile label="Theme" value={theme} />
        </div>

        <ControlBlock
          description={formatBrightnessSupport(displayState)}
          label="Brightness"
          value={formatBrightnessValue(brightnessDraft)}
        >
          <div className="mt-2.5 flex items-center gap-2">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
              Dim
            </span>
            <input
              className="h-2 w-full cursor-pointer accent-[#d0a954] disabled:cursor-not-allowed disabled:opacity-50"
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
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
              Auto
            </span>
          </div>

          <p className="mt-2 font-mono text-[0.62rem] tracking-[0.03em] text-muted-foreground">
            Applied: {formatBrightness(displayState)}
          </p>
        </ControlBlock>

        <ControlBlock
          description="Choose when the machine should auto-sleep after no activity."
          label="Sleep timer"
          value={sleepTimerLabel}
        >
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
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

        <ControlBlock
          description="Pick the surface that is easiest to read in the room you are in."
          label="Theme"
          value={theme}
        >
          <div className="mt-2 grid grid-cols-2 gap-2">
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

        <VisualizerSettingsPanel />

        <ControlBlock
          description="Use these if the tablet should stay visible all shift or fill the whole screen."
          label="Screen tools"
          value={isFullscreen ? "Full screen on" : "Normal view"}
        >
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Button
              disabled={displayState?.platformSupported.wakeLock === false}
              onClick={() =>
                void (displayState?.wakeLockOverride ? releaseWakeLock() : requestWakeLock())
              }
              size="sm"
            >
              {displayState?.wakeLockOverride ? "Let screen sleep" : "Keep screen on"}
            </Button>
            <Button
              disabled={!canToggleFullscreen}
              onClick={() => void handleFullscreenToggle()}
              size="sm"
              variant="secondary"
            >
              {isFullscreen ? "Exit full screen" : "Enter full screen"}
            </Button>
          </div>
        </ControlBlock>

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
    return "Waiting for the bridge to report display state.";
  }

  if (!displayState.platformSupported.brightness) {
    return "Brightness control is not available on this platform.";
  }

  if (displayState.lowBatteryBrightnessActive) {
    return "Low battery mode may cap the applied brightness.";
  }

  return "Drag the slider to set screen brightness. Auto uses the OS setting.";
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
