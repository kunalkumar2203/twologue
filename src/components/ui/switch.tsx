import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  const isSm = size === "sm"

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 cursor-pointer items-center rounded-full border shadow-xs outline-none transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40",
        isSm ? "h-4 w-7 p-0.5" : "h-6 w-11 p-0.5",
        "data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=unchecked]:bg-ink-soft/20 data-[state=unchecked]:border-ink-soft/25",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        data-size={size}
        className={cn(
          "pointer-events-none block rounded-full bg-surface shadow-md ring-0 transition-transform duration-200 ease-in-out will-change-transform",
          isSm
            ? "size-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0"
            : "size-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
