import { useState } from "react";

import { useRouter } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EndpointRow } from "@/components/settings/settings-shell";
import { toWebSocketUrl } from "@/rest/client";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";
import { useDevicesStore } from "@/stores/devices-store";

export function SettingsAdvancedBridgePanel() {
  const router = useRouter();
  const gatewayUrl = useBridgeConfigStore((state) => state.gatewayUrl);
  const setGatewayUrl = useBridgeConfigStore((state) => state.setGatewayUrl);
  const devices = useDevicesStore((state) => state.devices);
  const [draftGatewayUrl, setDraftGatewayUrl] = useState<string | null>(null);
  const resolvedDraftGatewayUrl = draftGatewayUrl ?? gatewayUrl;
  const endpointRows = [
    { label: "REST origin", value: gatewayUrl },
    {
      label: "Machine snapshot",
      value: `${toWebSocketUrl(gatewayUrl)}/ws/v1/machine/snapshot`,
    },
    {
      label: "Display stream",
      value: `${toWebSocketUrl(gatewayUrl)}/ws/v1/display`,
    },
    { label: "Workflow API", value: `${gatewayUrl}/api/v1/workflow` },
    { label: "Devices API", value: `${gatewayUrl}/api/v1/devices` },
    { label: "Heartbeat API", value: `${gatewayUrl}/api/v1/machine/heartbeat` },
  ];

  async function handleSave() {
    setGatewayUrl(resolvedDraftGatewayUrl);
    setDraftGatewayUrl(null);
    await router.invalidate();
  }

  return (
    <details className="group px-2.5 py-2.5 md:px-3 md:py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-highlight-muted">
            Advanced Bridge
          </p>
          <span className="font-mono text-[0.42rem] text-muted-foreground/40">|</span>
          <p className="font-mono text-[0.46rem] uppercase tracking-[0.06em] text-muted-foreground/60">
            Only for debugging or switching targets
          </p>
        </div>
        <span className="shrink-0 font-mono text-[0.46rem] uppercase tracking-[0.08em] text-muted-foreground/50 group-open:text-highlight-muted">
          <span className="group-open:hidden">Open</span>
          <span className="hidden group-open:inline">Close</span>
        </span>
      </summary>

      <div className="mt-2 grid gap-2">
        {/* URL editor */}
        <div className="grid gap-2 rounded-[3px] border border-border/50 bg-panel-strong/60 px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <label className="grid gap-1" htmlFor="gatewayUrl">
            <span className="font-mono text-[0.42rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
              REST origin
            </span>
            <Input
              className="h-9 rounded-[3px] border-border/50 bg-panel-strong font-mono text-[0.68rem]"
              id="gatewayUrl"
              onChange={(event) => setDraftGatewayUrl(event.target.value)}
              placeholder="http://localhost:8080"
              value={resolvedDraftGatewayUrl}
            />
          </label>

          <Button
            className="min-h-[36px] rounded-[3px] px-3 text-[0.52rem] uppercase tracking-[0.14em]"
            onClick={() => void handleSave()}
            size="sm"
          >
            Save & reconnect
          </Button>
          <Button
            className="min-h-[36px] rounded-[3px] px-3 text-[0.52rem] uppercase tracking-[0.14em]"
            onClick={() => setDraftGatewayUrl(window.location.origin)}
            size="sm"
            variant="secondary"
          >
            Use current origin
          </Button>
        </div>

        {/* Active target + endpoints */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
                Active target
              </p>
              <p className="font-mono text-[0.72rem] font-semibold tracking-[0.02em] text-foreground">
                {gatewayUrl.replace(/^https?:\/\//, "")}
              </p>
            </div>
            <Badge variant="secondary">{devices.length} devices</Badge>
          </div>

          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {endpointRows.map((row) => (
              <EndpointRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
