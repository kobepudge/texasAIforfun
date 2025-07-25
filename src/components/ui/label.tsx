"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentProps<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      ref={ref}
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
Label.displayName = "Label";

export { Label };
