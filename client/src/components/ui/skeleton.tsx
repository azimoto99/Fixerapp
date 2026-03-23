import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-[20px] bg-gradient-to-r from-muted via-white/70 to-muted dark:via-slate-900/80", className)}
      {...props}
    />
  )
}

export { Skeleton }
