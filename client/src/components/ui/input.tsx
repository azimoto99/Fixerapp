import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.ComponentProps<"input">

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-white/70 bg-white/78 px-4 py-3 text-sm font-medium text-foreground shadow-[0_10px_25px_rgba(15,23,42,0.06)] ring-offset-background transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/65 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
