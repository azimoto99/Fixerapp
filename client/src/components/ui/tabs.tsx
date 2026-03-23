import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex min-h-[3.4rem] items-center justify-center gap-1 rounded-full border border-white/70 bg-white/75 p-1.5 text-muted-foreground shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex min-h-[2.5rem] items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_14px_28px_rgba(3,105,161,0.24)]",
      className
    )}
    {...props}
  >
    {children}
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-5 ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
