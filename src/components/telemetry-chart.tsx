import { Grid, Group, Scale, Shape } from "@visx/visx";

import { cn, formatNumber } from "@/lib/utils";

type TelemetryPoint = {
  timestamp: string;
  pressure: number;
  flow: number;
  temperature: number;
};

const chartSeries = [
  { key: "pressure", label: "Pressure", color: "#d8a16a", unit: "bar" },
  { key: "flow", label: "Flow", color: "#87cad2", unit: "ml/s" },
  { key: "temperature", label: "Temp", color: "#f09b6f", unit: "C" },
] as const;

export function TelemetryChart({
  data,
  className,
  mode = "full",
}: {
  data: TelemetryPoint[];
  className?: string;
  mode?: "full" | "minimal";
}) {
  const isMinimal = mode === "minimal";
  const width = 760;
  const height = isMinimal ? 560 : 350;
  const margin = isMinimal
    ? { top: 22, right: 20, bottom: 28, left: 20 }
    : { top: 28, right: 20, bottom: 36, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const hasLiveData = data.length > 1;
  const hasSignal = data.some(
    (point) => point.pressure > 0.15 || point.flow > 0.15,
  );
  const points = hasLiveData ? data : seedTelemetry(data.at(0));
  const values = points.flatMap((point) => [
    point.pressure,
    point.flow,
    point.temperature / 10,
  ]);
  const maxY = Math.max(12, ...values);

  const xScale = Scale.scaleLinear<number>({
    domain: [0, Math.max(points.length - 1, 1)],
    range: [0, innerWidth],
  });

  const yScale = Scale.scaleLinear<number>({
    domain: [0, maxY],
    range: [innerHeight, 0],
  });

  return (
    <div className={cn("panel rounded-[32px] p-5", isMinimal ? "p-3" : "", className)}>
      {!isMinimal ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Live extraction
            </p>
            <h3 className="mt-2 font-display text-[2rem] leading-none text-foreground">
              Brew curves
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pressure, flow, and brew temperature aligned in one glance so
              decisions stay near the chart.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {chartSeries.map((series) => (
              <div
                key={series.key}
                className="rounded-full border border-border bg-background/82 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground"
              >
                <span
                  className="mr-2 inline-block size-2 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <svg
        aria-label="espresso telemetry chart"
        className="h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="var(--surface-chart)"
          rx={28}
          stroke="var(--border)"
        />

        <Group.Group left={margin.left} top={margin.top}>
          <Grid.GridRows
            height={innerHeight}
            scale={yScale}
            width={innerWidth}
            stroke="var(--surface-chart-grid)"
            numTicks={5}
          />

          <line
            x1={0}
            y1={innerHeight}
            x2={innerWidth}
            y2={innerHeight}
            stroke="var(--surface-chart-axis)"
          />

          {isMinimal
            ? [0, 2, 4, 6, 8, 10].map((tick) => (
                <text
                  key={tick}
                  x={0}
                  y={yScale(tick) + 4}
                  fill="var(--muted-foreground)"
                  fontSize="14"
                >
                  {tick}
                </text>
              ))
            : null}

          {hasSignal
            ? chartSeries.map((series) => (
                <Shape.LinePath
                  key={series.key}
                  data={points}
                  x={(_point: TelemetryPoint, index: number) => xScale(index)}
                  y={(point: TelemetryPoint) =>
                    yScale(
                      series.key === "temperature"
                        ? point.temperature / 10
                        : point[series.key],
                    )
                  }
                  stroke={series.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              ))
            : null}

          {!hasSignal && !isMinimal ? (
            <text
              fill="var(--muted-foreground)"
              fontSize="16"
              textAnchor="middle"
              x={innerWidth / 2}
              y={innerHeight / 2}
            >
              Waiting for shot data
            </text>
          ) : null}
        </Group.Group>
      </svg>

      {!isMinimal ? (
        <div className="mt-5 grid grid-cols-3 gap-3">
          {chartSeries.map((series) => {
            const last = points.at(-1);
            const rawValue =
              series.key === "temperature"
                ? last?.temperature
                : last?.[series.key];

            return (
              <div
                key={series.key}
                className="rounded-[22px] border border-border bg-background/84 px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {series.label}
                </p>
                <p className="mt-2 text-[1.65rem] font-semibold leading-none text-foreground">
                  {formatNumber(rawValue)}{" "}
                  <span className="text-sm font-medium text-muted-foreground">
                    {series.unit}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function seedTelemetry(point?: TelemetryPoint) {
  const base = point ?? {
    timestamp: new Date().toISOString(),
    pressure: 0,
    flow: 0,
    temperature: 0,
  };

  return Array.from({ length: 24 }, (_, index) => ({
    timestamp: base.timestamp,
    pressure: base.pressure,
    flow: base.flow,
    temperature: base.temperature,
  }));
}
