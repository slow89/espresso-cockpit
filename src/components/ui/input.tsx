import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[3px] border border-border bg-background px-3 py-2 font-mono text-[0.76rem] tracking-[0.08em] text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
