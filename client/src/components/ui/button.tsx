import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_18px_40px_rgba(3,105,161,0.28)] hover:brightness-[1.03]",
        destructive:
          "bg-[linear-gradient(135deg,hsl(var(--destructive)),hsl(15_90%_62%))] text-destructive-foreground shadow-[0_16px_36px_rgba(220,38,38,0.22)] hover:brightness-[1.03]",
        outline:
          "border border-white/70 bg-white/80 text-foreground shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl hover:border-primary/30 hover:bg-white dark:border-white/10 dark:bg-slate-950/65 dark:hover:bg-slate-950",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_12px_30px_rgba(8,47,73,0.08)] hover:bg-secondary/80 dark:bg-sky-500/15 dark:text-sky-100",
        ghost: "text-foreground/80 hover:bg-foreground/5 hover:text-foreground dark:hover:bg-white/10",
        link: "rounded-none px-0 py-0 text-primary shadow-none hover:text-primary/80 hover:underline",
        tab: "rounded-full border border-white/70 bg-white/70 text-foreground/75 shadow-[0_10px_22px_rgba(15,23,42,0.06)] backdrop-blur-xl hover:border-primary/30 hover:text-foreground dark:border-white/10 dark:bg-slate-950/60",
        circle: "rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_18px_40px_rgba(3,105,161,0.28)] hover:brightness-[1.03]"
      },
      size: {
        default: "h-12 px-5 py-3",
        sm: "h-10 rounded-xl px-4 text-xs",
        lg: "h-14 rounded-[20px] px-7 text-base",
        icon: "h-12 w-12 rounded-2xl p-0",
        circle: "h-14 w-14 rounded-full p-0"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
