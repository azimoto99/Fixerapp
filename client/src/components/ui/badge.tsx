import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        primary: "border-transparent bg-primary-100 text-primary-600 hover:bg-primary-200/80",
        cyan: "border-transparent bg-cyan-100 text-cyan-600 hover:bg-cyan-200/80",
        purple: "border-transparent bg-purple-100 text-purple-600 hover:bg-purple-200/80",
        indigo: "border-transparent bg-indigo-100 text-indigo-600 hover:bg-indigo-200/80",
        amber: "border-transparent bg-amber-100 text-amber-600 hover:bg-amber-200/80",
        rose: "border-transparent bg-rose-100 text-rose-600 hover:bg-rose-200/80",
        green: "border-transparent bg-green-100 text-green-600 hover:bg-green-200/80",
        blue: "border-transparent bg-blue-100 text-blue-600 hover:bg-blue-200/80",
        gray: "border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200/80",
        price: "border-transparent bg-green-100 text-green-800 hover:bg-green-200/80",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-2.5 py-0.5 text-sm",
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
