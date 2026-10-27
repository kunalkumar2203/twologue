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
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 cursor-pointer items-center rounded-full border border-ink-soft/25 shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=default]:p-0.5 data-[size=sm]:h-4 data-[size=sm]:w-7 data-[size=sm]:p-0.5 data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=unchecked]:bg-ink-soft/20",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full shadow-sm ring-0 transition-transform data-[size=default]:size-5 data-[size=sm]:size-3 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-on-accent data-[state=unchecked]:bg-surface"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
