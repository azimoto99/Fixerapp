import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.02em] transition-colors focus:outline-none focus:ring-4 focus:ring-ring/15",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_10px_25px_rgba(3,105,161,0.18)]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive/14 text-destructive dark:bg-destructive/20",
        outline: "border-border bg-background/60 text-foreground",
        primary: "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
        cyan: "border-transparent bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200",
        purple: "border-transparent bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
        indigo: "border-transparent bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200",
        amber: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
        rose: "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
        green: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
        blue: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
        gray: "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
        price: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2.5 py-1 text-[11px]",
        lg: "px-3.5 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
