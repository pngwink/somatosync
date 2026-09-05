import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../../lib/utils";

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
        <SliderPrimitive.Range className="absolute h-full bg-[var(--color-accent)]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block h-4.5 w-4.5 h-[18px] w-[18px] rounded-full border-2 border-[var(--color-accent)] bg-[var(--color-surface)] shadow-[var(--shadow-low)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
        aria-label="value"
      />
    </SliderPrimitive.Root>
  );
}
