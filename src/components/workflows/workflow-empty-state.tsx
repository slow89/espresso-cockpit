export function WorkflowEmptyState({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
  return (
    <div className="border border-dashed border-border/40 px-3 py-2.5">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-highlight-muted">
        {title}
      </p>
      <p className="mt-1 font-mono text-[0.56rem] leading-4 text-muted-foreground">{body}</p>
    </div>
  );
}
