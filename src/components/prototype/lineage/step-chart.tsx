// PROTOTYPE — throwaway. Ticket 12's Step chart (one column per Step) taking a profile instead of
// the draft store, so two versions can be drawn and their changed Steps outlined.
import type { WorkflowProfile } from "@/rest/types";
import { cn } from "@/lib/utils";

import { exitOf, limiterOf, limiterOn, num, pumpOf, stepName, type ProtoStep } from "./fields";

const AXIS_MAX = 12;
const yAxis = (value: number) => 100 - (Math.min(value, AXIS_MAX) / AXIS_MAX) * 92;
const yTemp = (value: number) => 100 - ((Math.min(Math.max(value, 75), 105) - 75) / 30) * 92;
const color = { flow: "#39c97b", pressure: "#f7b437", temperature: "#ff7b57" };

export function StepChart({
  className,
  highlight,
  profile,
}: {
  className?: string;
  highlight?: Set<number>;
  profile: WorkflowProfile;
}) {
  const steps = (profile.steps ?? []) as ProtoStep[];
  const boundary = num(profile.target_volume_count_start);
  return (
    <div
      className={cn(
        "flex min-h-0 gap-px overflow-hidden rounded-[3px] border border-chart-border bg-chart-border",
        className,
      )}
    >
      {steps.map((step, index) => (
        <div
          className={cn(
            "relative flex min-w-[36px] flex-1 flex-col",
            index < boundary ? "bg-[#0f1a24]" : "bg-chart-surface",
            highlight?.has(index) && "bg-[#2a2414] shadow-[inset_0_0_0_2px_rgba(208,169,84,0.9)]",
            index === boundary && boundary > 0 && "border-l-2 border-l-status-info-foreground",
          )}
          key={index}
        >
          <span className="truncate px-1 pt-0.5 font-mono text-[0.66rem] font-semibold text-muted-foreground">
            {index + 1} <span className="font-sans text-foreground/80">{stepName(step, index)}</span>
          </span>
          <svg className="min-h-0 w-full flex-1" preserveAspectRatio="none" viewBox="0 0 100 100">
            <Trace previous={steps[index - 1]} step={step} />
          </svg>
          <span className="truncate px-1 pb-0.5 font-mono text-[0.66rem] tabular-nums text-muted-foreground">
            {caption(step)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Trace({ previous, step }: { previous?: ProtoStep; step: ProtoStep }) {
  const pump = pumpOf(step);
  const target = num(step[pump]);
  const from = previous ? num(previous[pumpOf(previous)]) : 0;
  const smooth = step.transition === "smooth";
  const temp = num(step.temperature);
  const prevTemp = previous ? num(previous.temperature) : temp;
  return (
    <>
      <polyline
        fill="none"
        points={smooth ? `0,${yTemp(prevTemp)} 100,${yTemp(temp)}` : `0,${yTemp(temp)} 100,${yTemp(temp)}`}
        stroke={color.temperature}
        strokeOpacity={0.7}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      {limiterOn(step) ? (
        <line
          stroke={pump === "pressure" ? color.flow : color.pressure}
          strokeDasharray="3 3"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          x1="0"
          x2="100"
          y1={yAxis(num(limiterOf(step)?.value))}
          y2={yAxis(num(limiterOf(step)?.value))}
        />
      ) : null}
      <polyline
        fill="none"
        points={
          smooth
            ? `0,${yAxis(from)} 100,${yAxis(target)}`
            : `0,${yAxis(from)} 0,${yAxis(target)} 100,${yAxis(target)}`
        }
        stroke={color[pump]}
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
      />
    </>
  );
}

function caption(step: ProtoStep) {
  const pump = pumpOf(step);
  const exit = exitOf(step);
  const until = exit
    ? `${exit.type[0].toUpperCase()}${exit.condition === "over" ? ">" : "<"}${exit.value}`
    : `${num(step.seconds)}s`;
  return `${pump === "pressure" ? "P" : "F"}${num(step[pump])} ${until} ${num(step.temperature)}°`;
}
