import * as React from "react";
import { cn } from "@/lib/utils";

/** Styled native select — keeps the bundle light until we need richer pickers. */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:[&>option]:bg-card",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
