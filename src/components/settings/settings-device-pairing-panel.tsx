import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useConnectDeviceMutation,
  useDevicesQuery,
  useDisconnectDeviceMutation,
  useScanDevicesMutation,
} from "@/rest/queries";
import type { DeviceSummary } from "@/rest/types";
import {
  MetricTile,
  SettingsSection,
  StateCallout,
} from "@/components/settings/settings-shell";

export function SettingsDevicePairingPanel() {
  const deviceRefreshMs = 3_000;
  const {
    data: devices = [],
    error: devicesError,
    isFetching: isFetchingDevices,
  } = useDevicesQuery({
    refetchInterval: deviceRefreshMs,
  });
  const scanDevicesMutation = useScanDevicesMutation();
  const connectDeviceMutation = useConnectDeviceMutation();
  const disconnectDeviceMutation = useDisconnectDeviceMutation();
  const connectedDevices = devices.filter((device) => device.state === "connected");
  const disconnectedDevices = devices.filter((device) => device.state !== "connected");

  return (
    <SettingsSection
      description="Auto-refreshing every 3s"
      title="Device Pairing"
    >
      <div className="grid gap-2">
        {/* Metric row + action buttons */}
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
          <MetricTile label="Tracked" value={`${devices.length}`} />
          <MetricTile label="Connected" value={`${connectedDevices.length}`} />
          <MetricTile label="Unpaired" value={`${disconnectedDevices.length}`} />

          <Button
            className="col-span-2 min-h-[38px] rounded-[3px] px-3 text-[0.54rem] uppercase tracking-[0.14em] sm:col-span-1"
            disabled={scanDevicesMutation.isPending}
            onClick={() => void scanDevicesMutation.mutateAsync(undefined)}
            size="sm"
          >
            {scanDevicesMutation.isPending ? "Scanning" : "Find & pair"}
          </Button>
          <Button
            className="col-span-1 min-h-[38px] rounded-[3px] px-3 text-[0.54rem] uppercase tracking-[0.14em] sm:col-span-1"
            disabled={scanDevicesMutation.isPending}
            onClick={() => void scanDevicesMutation.mutateAsync({ connect: false })}
            size="sm"
            variant="outline"
          >
            Find only
          </Button>
        </div>

        <DeviceSummaryPanel
          connectPendingDeviceId={
            connectDeviceMutation.isPending ? connectDeviceMutation.variables : null
          }
          disconnectPendingDeviceId={
            disconnectDeviceMutation.isPending ? disconnectDeviceMutation.variables : null
          }
          devices={devices}
          errorMessage={devicesError?.message}
          isFetching={isFetchingDevices}
          onConnectDevice={(deviceId) => void connectDeviceMutation.mutateAsync(deviceId)}
          onDisconnectDevice={(deviceId) => void disconnectDeviceMutation.mutateAsync(deviceId)}
          scanErrorMessage={scanDevicesMutation.error?.message}
        />
      </div>
    </SettingsSection>
  );
}

function DeviceSummaryPanel({
  connectPendingDeviceId,
  disconnectPendingDeviceId,
  devices,
  errorMessage,
  isFetching,
  onConnectDevice,
  onDisconnectDevice,
  scanErrorMessage,
}: {
  connectPendingDeviceId: string | null;
  disconnectPendingDeviceId: string | null;
  devices: DeviceSummary[];
  errorMessage?: string;
  isFetching: boolean;
  onConnectDevice: (deviceId: string) => void;
  onDisconnectDevice: (deviceId: string) => void;
  scanErrorMessage?: string;
}) {
  const scaleDevices = devices.filter((device) => device.type === "scale");
  const otherDevices = devices.filter((device) => device.type !== "scale");
  const connectedScales = scaleDevices.filter((device) => device.state === "connected");
  const disconnectedScales = scaleDevices.filter((device) => device.state !== "connected");

  if (errorMessage) {
    return (
      <StateCallout tone="error">
        Device state is unavailable right now.
        <br />
        {errorMessage}
      </StateCallout>
    );
  }

  if (!devices.length) {
    return (
      <div className="grid gap-1.5">
        <StateCallout tone="neutral">
          {isFetching
            ? "Checking the bridge for tracked devices."
            : "No tracked devices are currently reported by the bridge."}
        </StateCallout>
        {!isFetching ? (
          <StateCallout tone="neutral">Use Find only, then pair your scale here.</StateCallout>
        ) : null}
        {scanErrorMessage ? <StateCallout tone="error">{scanErrorMessage}</StateCallout> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <DeviceGroup
        connectPendingDeviceId={connectPendingDeviceId}
        description={
          connectedScales.length
            ? `Scale live on ${connectedScales[0]?.name}. Disconnect here if you need to switch devices.`
            : disconnectedScales.length
              ? "Discovered scales can be paired directly from this page."
              : "No scales discovered yet. Use Find only, then pair your scale here."
        }
        devices={scaleDevices}
        disconnectPendingDeviceId={disconnectPendingDeviceId}
        emptyMessage="No scales discovered yet. Use Find only, then pair your scale here."
        onConnectDevice={onConnectDevice}
        onDisconnectDevice={onDisconnectDevice}
        title="Scale Pairing"
      />

      {otherDevices.length ? (
        <DeviceGroup
          connectPendingDeviceId={connectPendingDeviceId}
          description="Machines and other bridge-managed devices remain available below."
          devices={otherDevices}
          disconnectPendingDeviceId={disconnectPendingDeviceId}
          onConnectDevice={onConnectDevice}
          onDisconnectDevice={onDisconnectDevice}
          title="Other Devices"
        />
      ) : null}

      {scanErrorMessage ? <StateCallout tone="error">{scanErrorMessage}</StateCallout> : null}
    </div>
  );
}

function DeviceGroup({
  connectPendingDeviceId,
  description,
  devices,
  disconnectPendingDeviceId,
  emptyMessage,
  onConnectDevice,
  onDisconnectDevice,
  title,
}: {
  connectPendingDeviceId: string | null;
  description: string;
  devices: DeviceSummary[];
  disconnectPendingDeviceId: string | null;
  emptyMessage?: string;
  onConnectDevice: (deviceId: string) => void;
  onDisconnectDevice: (deviceId: string) => void;
  title: string;
}) {
  const connectedDevices = devices.filter((device) => device.state === "connected");
  const disconnectedDevices = devices.filter((device) => device.state !== "connected");

  if (!devices.length) {
    if (!emptyMessage) {
      return null;
    }

    return (
      <div className="grid gap-1">
        <p className="font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
          {title}
        </p>
        <StateCallout tone="neutral">{emptyMessage}</StateCallout>
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <p className="font-mono text-[0.46rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
          {title}
        </p>
        <p className="font-mono text-[0.42rem] uppercase tracking-[0.06em] text-muted-foreground/50">
          {description}
        </p>
      </div>

      {connectedDevices.length ? (
        <DeviceList
          actionVariant="secondary"
          connectPendingDeviceId={connectPendingDeviceId}
          devices={connectedDevices}
          disconnectPendingDeviceId={disconnectPendingDeviceId}
          onConnectDevice={onConnectDevice}
          onDisconnectDevice={onDisconnectDevice}
          title="Connected"
        />
      ) : null}

      {disconnectedDevices.length ? (
        <DeviceList
          actionVariant="default"
          connectPendingDeviceId={connectPendingDeviceId}
          devices={disconnectedDevices}
          disconnectPendingDeviceId={disconnectPendingDeviceId}
          onConnectDevice={onConnectDevice}
          onDisconnectDevice={onDisconnectDevice}
          title="Available"
        />
      ) : null}
    </div>
  );
}

function DeviceList({
  actionVariant,
  connectPendingDeviceId,
  devices,
  disconnectPendingDeviceId,
  onConnectDevice,
  onDisconnectDevice,
  title,
}: {
  actionVariant: "default" | "secondary";
  connectPendingDeviceId: string | null;
  devices: DeviceSummary[];
  disconnectPendingDeviceId: string | null;
  onConnectDevice: (deviceId: string) => void;
  onDisconnectDevice: (deviceId: string) => void;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-[3px] border border-border/50 bg-panel-strong/60">
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-2.5 py-1">
        <p className="font-mono text-[0.42rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
          {title}
        </p>
        <p className="font-mono text-[0.52rem] font-semibold tabular-nums text-muted-foreground">
          {devices.length}
        </p>
      </div>

      <div className="divide-y divide-border/40">
        {devices.map((device) => (
          <DeviceRow
            actionLabel={
              connectPendingDeviceId === device.id || disconnectPendingDeviceId === device.id
                ? getPendingDeviceActionLabel(device)
                : getDeviceActionLabel(device)
            }
            actionVariant={actionVariant}
            device={device}
            disabled={Boolean(connectPendingDeviceId || disconnectPendingDeviceId)}
            key={device.id}
            onAction={device.state === "connected" ? onDisconnectDevice : onConnectDevice}
          />
        ))}
      </div>
    </div>
  );
}

function DeviceRow({
  actionLabel,
  actionVariant,
  device,
  disabled,
  onAction,
}: {
  actionLabel: string;
  actionVariant: "default" | "secondary";
  device: DeviceSummary;
  disabled: boolean;
  onAction: (deviceId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-mono text-[0.72rem] font-semibold tracking-[0.02em] text-foreground">
            {device.name}
          </p>
          <Badge variant={device.state === "connected" ? "default" : "secondary"}>
            {device.state}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="font-mono text-[0.42rem] uppercase tracking-[0.08em] text-muted-foreground/70">
            {device.type}
          </p>
          <p className="break-all font-mono text-[0.5rem] font-semibold tracking-[0.02em] text-muted-foreground/50">
            {device.id}
          </p>
        </div>
      </div>

      <Button
        className="min-h-[34px] shrink-0 rounded-[3px] px-2.5 text-[0.52rem] uppercase tracking-[0.12em]"
        disabled={disabled}
        onClick={() => onAction(device.id)}
        size="sm"
        variant={actionVariant}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

function getDeviceActionLabel(device: DeviceSummary) {
  if (device.state === "connected") {
    return `Disconnect ${device.type}`;
  }

  if (device.type === "scale") {
    return "Pair scale";
  }

  return `Connect ${device.type}`;
}

function getPendingDeviceActionLabel(device: DeviceSummary) {
  if (device.state === "connected") {
    return `Disconnecting ${device.type}...`;
  }

  if (device.type === "scale") {
    return "Pairing scale...";
  }

  return `Connecting ${device.type}...`;
}
