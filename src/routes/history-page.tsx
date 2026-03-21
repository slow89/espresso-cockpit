import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNumber, formatRelativeTimestamp } from "@/lib/utils";
import { useShotsQuery } from "@/rest/queries";

export function HistoryPage() {
  const { data: shots = [], isFetching, error, refetch } = useShotsQuery();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Shot history</CardTitle>
          <CardDescription>
            The bridge keeps history separate from the legacy app, so this page
            is a clean place to design your own brew journal and filtering
            model.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/80"
            onClick={() => void refetch()}
            type="button"
          >
            {isFetching ? "Refreshing..." : "Refresh history"}
          </button>
          {error ? (
            <span className="text-sm text-destructive">{error.message}</span>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {shots.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No shots yet</CardTitle>
              <CardDescription>
                Once the bridge returns shot records, they will appear here.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          shots.slice(0, 12).map((shot, index) => (
            <Card key={shot.id ?? `${shot.timestamp ?? "shot"}-${index}`}>
              <CardContent className="mt-0 grid gap-4 md:grid-cols-4">
                <HistoryCell
                  label="Pulled"
                  value={formatRelativeTimestamp(shot.timestamp)}
                />
                <HistoryCell
                  label="Workflow"
                  value={shot.workflow?.name ?? "Unknown workflow"}
                />
                <HistoryCell
                  label="Coffee"
                  value={shot.context?.coffeeName ?? "No coffee metadata"}
                />
                <HistoryCell
                  label="Yield"
                  value={`${formatNumber(shot.weight)} g`}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function HistoryCell({
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
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
