import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDevicesQuery, useScanDevicesMutation } from "@/rest/queries";

export function DevicesPage() {
  const { data: devices = [], isFetching, error, refetch } = useDevicesQuery();
  const scanMutation = useScanDevicesMutation();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
          <CardDescription>
            Streamline Bridge already owns scan and connection policy. The skin
            should mostly visualize state and let the bridge stay authoritative.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/80"
            onClick={() => void refetch()}
            type="button"
          >
            Refresh list
          </button>
          <button
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            onClick={() => void scanMutation.mutateAsync()}
            type="button"
          >
            {scanMutation.isPending ? "Scanning..." : "Scan and connect"}
          </button>
          {error ? (
            <span className="text-sm text-destructive">{error.message}</span>
          ) : null}
          {scanMutation.error ? (
            <span className="text-sm text-destructive">
              {scanMutation.error.message}
            </span>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardHeader>
              <CardTitle className="text-xl">{device.name}</CardTitle>
              <CardDescription>{device.type}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <DeviceRow label="State" value={device.state} />
              <DeviceRow label="ID" value={device.id} />
            </CardContent>
          </Card>
        ))}

        {devices.length === 0 && !isFetching ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle>No discovered devices</CardTitle>
              <CardDescription>
                Use scan to let the bridge discover and connect preferred
                machine and scale devices.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function DeviceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/60 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}
