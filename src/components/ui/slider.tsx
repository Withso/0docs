import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center group/slider", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-[5px] w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary rounded-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-[1.5px] border-primary bg-background shadow-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 hover:shadow-md active:scale-95" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
