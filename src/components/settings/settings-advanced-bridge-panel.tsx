import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EndpointRow } from "@/components/settings/settings-shell";
import { toWebSocketUrl } from "@/rest/client";
import { useDevicesQuery } from "@/rest/queries";

export function SettingsAdvancedBridgePanel({
  draftGatewayUrl,
  gatewayUrl,
  onSave,
  onUseCurrentOrigin,
  setDraftGatewayUrl,
}: {
  draftGatewayUrl: string;
  gatewayUrl: string;
  onSave: () => void | Promise<void>;
  onUseCurrentOrigin: () => void;
  setDraftGatewayUrl: (value: string) => void;
}) {
  const { data: devices = [] } = useDevicesQuery();
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

  return (
    <details className="rounded-[18px] border border-border bg-panel px-3 py-3 shadow-panel">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-highlight">
            Advanced Bridge Settings
          </p>
          <p className="mt-1 max-w-[40rem] text-[0.78rem] leading-5 text-muted-foreground">
            Only touch these when the tablet is pointed at the wrong bridge or you are debugging a
            connection.
          </p>
        </div>
        <span className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
          Open
        </span>
      </summary>

      <div className="mt-3 grid gap-3">
        <div className="grid gap-3 rounded-[16px] border border-border bg-panel-muted px-3 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-1.5" htmlFor="gatewayUrl">
            <span className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              REST origin
            </span>
            <Input
              className="h-11 rounded-[12px] border-border bg-panel-strong font-mono text-[0.8rem]"
              id="gatewayUrl"
              onChange={(event) => setDraftGatewayUrl(event.target.value)}
              placeholder="http://localhost:8080"
              value={draftGatewayUrl}
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              className="min-h-[42px] rounded-[12px] px-4 text-[0.66rem] uppercase tracking-[0.16em]"
              onClick={() => void onSave()}
              size="sm"
            >
              Save and reconnect
            </Button>
            <Button
              className="min-h-[42px] rounded-[12px] px-4 text-[0.66rem] uppercase tracking-[0.16em]"
              onClick={onUseCurrentOrigin}
              size="sm"
              variant="secondary"
            >
              Use current origin
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Active target
              </p>
              <p className="mt-1 font-mono text-[0.92rem] font-semibold tracking-[0.03em] text-foreground">
                {gatewayUrl.replace(/^https?:\/\//, "")}
              </p>
            </div>
            <Badge variant="secondary">{devices.length} devices tracked</Badge>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {endpointRows.map((row) => (
              <EndpointRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
