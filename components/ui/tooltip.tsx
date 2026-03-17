"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type TooltipContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

export function TooltipProvider({
  children,
}: {
  children: React.ReactNode
  delayDuration?: number
}) {
  return <>{children}</>
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      {children}
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({
  children,
  asChild,
  ...props
}: React.HTMLAttributes<HTMLElement> & { asChild?: boolean }) {
  const ctx = React.useContext(TooltipContext)
  const child = React.isValidElement(children) ? children : <span>{children}</span>

  return React.cloneElement(child as React.ReactElement, {
    ...props,
    onMouseEnter: () => ctx?.setOpen(true),
    onMouseLeave: () => ctx?.setOpen(false),
  })
}

type TooltipContentProps = React.ComponentProps<"div">

export function TooltipContent({
  className,
  children,
  hidden,
  ...props
}: TooltipContentProps) {
  const ctx = React.useContext(TooltipContext)
  if (hidden || !ctx?.open) return null

  return (
    <div
      className={cn(
        "pointer-events-none z-50 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

