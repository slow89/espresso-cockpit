import {
  useState,
} from "react";

import { useRouter } from "@tanstack/react-router";

import { SettingsAdvancedBridgePanel } from "@/components/settings/settings-advanced-bridge-panel";
import { SettingsDevicePairingPanel } from "@/components/settings/settings-device-pairing-panel";
import { SettingsDisplaySleepPanel } from "@/components/settings/settings-display-sleep-panel";
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
    <div className="panel min-h-[calc(100vh-var(--app-footer-height))] overflow-y-auto rounded-none border-x-0 border-t-0 bg-shell">
      <section className="mx-auto grid max-w-[1520px] gap-3 px-2 py-2 md:px-3 md:py-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
          <SettingsDevicePairingPanel />
          <SettingsDisplaySleepPanel />
        </div>

        <SettingsAdvancedBridgePanel
          draftGatewayUrl={resolvedDraftGatewayUrl}
          gatewayUrl={gatewayUrl}
          onSave={handleSave}
          onUseCurrentOrigin={() => setDraftGatewayUrl(window.location.origin)}
          setDraftGatewayUrl={setDraftGatewayUrl}
        />
      </section>
    </div>
  );
}
