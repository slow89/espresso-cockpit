import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatNumber } from "@/lib/utils";
import { useWorkflowQuery } from "@/rest/queries";

export function WorkflowsPage() {
  const { data: workflow, isFetching, error, refetch } = useWorkflowQuery();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Workflow model</CardTitle>
          <CardDescription>
            This page is intentionally centered on the bridge&apos;s workflow
            object, since that is the recommended write surface for recipes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/80"
            onClick={() => void refetch()}
            type="button"
          >
            {isFetching ? "Refreshing..." : "Refresh workflow"}
          </button>
          {error ? (
            <span className="text-sm text-destructive">{error.message}</span>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>{workflow?.name ?? "Current workflow"}</CardTitle>
            <CardDescription>
              {workflow?.description ?? "No workflow description from bridge."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoBlock
                label="Dose target"
                value={`${formatNumber(workflow?.context?.targetDoseWeight)} g`}
              />
              <InfoBlock
                label="Yield target"
                value={`${formatNumber(workflow?.context?.targetYield)} g`}
              />
              <InfoBlock
                label="Grinder"
                value={workflow?.context?.grinderModel ?? "Not linked"}
              />
              <InfoBlock
                label="Coffee"
                value={workflow?.context?.coffeeName ?? "Not linked"}
              />
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-3">
              <InfoBlock
                label="Steam temp"
                value={`${formatNumber(workflow?.steamSettings?.targetTemperature)} C`}
              />
              <InfoBlock
                label="Water volume"
                value={`${formatNumber(workflow?.hotWaterData?.volume)} ml`}
              />
              <InfoBlock
                label="Rinse duration"
                value={`${formatNumber(workflow?.rinseData?.duration)} s`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile summary</CardTitle>
            <CardDescription>
              Good next step: add an editor that operates on a local workflow
              draft, then pushes one cohesive update through the bridge API.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <InfoBlock
              label="Title"
              value={workflow?.profile?.title ?? "No title"}
            />
            <InfoBlock
              label="Author"
              value={workflow?.profile?.author ?? "Unknown"}
            />
            <InfoBlock
              label="Beverage type"
              value={workflow?.profile?.beverage_type ?? "espresso"}
            />
            <InfoBlock
              label="Target weight"
              value={`${formatNumber(workflow?.profile?.target_weight)} g`}
            />
            <InfoBlock
              label="Steps"
              value={`${workflow?.profile?.steps?.length ?? 0} frames`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-border/80 bg-background/70 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-base font-medium text-foreground">{value}</p>
    </div>
  );
}
