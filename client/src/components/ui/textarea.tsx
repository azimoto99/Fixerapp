import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-[24px] border border-white/70 bg-white/78 px-4 py-3 text-sm font-medium text-foreground shadow-[0_10px_25px_rgba(15,23,42,0.06)] ring-offset-background transition-all placeholder:text-muted-foreground/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/65 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
