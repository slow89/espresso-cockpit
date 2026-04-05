import { useState } from "react";

import { useRouter } from "@tanstack/react-router";

import { SettingsAdvancedBridgePanel } from "@/components/settings/settings-advanced-bridge-panel";
import { SettingsDevicePairingPanel } from "@/components/settings/settings-device-pairing-panel";
import { SettingsDisplaySleepPanel } from "@/components/settings/settings-display-sleep-panel";
import { SettingsWaterAlertPanel } from "@/components/settings/settings-water-alert-panel";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";

export function SettingsPage() {
  const router = useRouter();
  const gatewayUrl = useBridgeConfigStore((state) => state.gatewayUrl);
  const setGatewayUrl = useBridgeConfigStore((state) => state.setGatewayUrl);
  const [draftGatewayUrl, setDraftGatewayUrl] = useState<string | null>(null);
  const resolvedDraftGatewayUrl = draftGatewayUrl ?? gatewayUrl;

  async function handleSave() {
    setGatewayUrl(resolvedDraftGatewayUrl);
    setDraftGatewayUrl(null);
    await router.invalidate();
  }

  return (
    <div className="app-shell overflow-y-auto border-b border-border/30 bg-shell">
      {/* Top bar — mirrors dashboard top bar styling */}
      <header className="shrink-0 border-b border-border/40 bg-panel-strong/30 px-2.5 py-1.5 pt-[calc(env(safe-area-inset-top,0px)+0.375rem)]">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted">
            System Configuration
          </p>
          <p className="font-mono text-[0.42rem] uppercase tracking-[0.06em] text-muted-foreground/70">
            Setup
          </p>
        </div>
      </header>

      {/* Content — single column scroll, dense sections separated by border lines */}
      <div className="divide-y divide-border/40">
        <SettingsDevicePairingPanel />
        <SettingsDisplaySleepPanel />
        <SettingsWaterAlertPanel />
        <SettingsAdvancedBridgePanel
          draftGatewayUrl={resolvedDraftGatewayUrl}
          gatewayUrl={gatewayUrl}
          onSave={handleSave}
          onUseCurrentOrigin={() => setDraftGatewayUrl(window.location.origin)}
          setDraftGatewayUrl={setDraftGatewayUrl}
        />
      </div>
    </div>
  );
}
