import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex items-center gap-1 rounded-[14px] bg-[var(--color-surface-sunken)] p-1.5", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-[10px] px-5 py-2 text-[16px] font-semibold text-[var(--color-text-secondary)] transition-colors",
        "data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:shadow-[var(--shadow-low)]",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-7 focus-visible:outline-none", className)} {...props} />;
}
