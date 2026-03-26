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
      description="This area stays up to date automatically. Technical bridge details are pushed below."
      title="Device Pairing"
    >
      <div className="grid gap-3">
        <div className="grid gap-2 rounded-[18px] border border-border bg-panel-subtle px-3 py-3 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-[30rem]">
              <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.18em] text-highlight">
                Recommended path
              </p>
              <h2 className="mt-1 text-balance font-display text-[1.38rem] leading-none text-foreground md:text-[1.7rem]">
                Find devices, then pair what shows up.
              </h2>
              <p className="mt-2 max-w-[28rem] text-[0.78rem] leading-5 text-muted-foreground">
                Most people only need one action: look for nearby devices, then connect the scale
                or machine that appears below.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-3 xl:w-auto xl:min-w-[320px]">
              <MetricTile label="Tracked" value={`${devices.length}`} />
              <MetricTile label="Connected" value={`${connectedDevices.length}`} />
              <MetricTile label="Needs pairing" value={`${disconnectedDevices.length}`} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-[42px] rounded-[12px] px-4 text-[0.66rem] uppercase tracking-[0.16em]"
            disabled={scanDevicesMutation.isPending}
            onClick={() => void scanDevicesMutation.mutateAsync(undefined)}
            size="sm"
          >
            {scanDevicesMutation.isPending ? "Looking..." : "Find and pair"}
          </Button>
          <Button
            className="min-h-[42px] rounded-[12px] px-4 text-[0.66rem] uppercase tracking-[0.16em]"
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
      <div className="grid gap-2">
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
    <div className="grid gap-3">
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
      <div className="grid gap-1.5">
        <p className="font-mono text-[0.54rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <StateCallout tone="neutral">{emptyMessage}</StateCallout>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <p className="font-mono text-[0.54rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <p className="text-[0.74rem] leading-5 text-muted-foreground">{description}</p>
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
    <div className="overflow-hidden rounded-[16px] border border-border bg-panel-muted">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="font-mono text-[0.52rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
        <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {devices.length}
        </p>
      </div>

      <div className="divide-y divide-border">
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
    <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-mono text-[0.84rem] font-semibold tracking-[0.02em] text-foreground">
            {device.name}
          </p>
          <Badge variant={device.state === "connected" ? "default" : "secondary"}>
            {device.state}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-mono text-[0.54rem] uppercase tracking-[0.18em] text-muted-foreground">
            {device.type}
          </p>
          <p className="break-all font-mono text-[0.64rem] font-semibold tracking-[0.03em] text-muted-foreground">
            {device.id}
          </p>
        </div>
      </div>

      <Button
        className="min-h-[38px] rounded-[12px] px-3 text-[0.62rem] uppercase tracking-[0.14em] sm:shrink-0"
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
