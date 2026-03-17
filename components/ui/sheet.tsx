"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type SheetContextValue = {
  open: boolean
  onOpenChange?: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

type SheetProps = React.PropsWithChildren<{
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>

export function Sheet({ open = false, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

function useSheet() {
  const ctx = React.useContext(SheetContext)
  if (!ctx) {
    throw new Error("Sheet components must be used within a Sheet.")
  }
  return ctx
}

type SheetContentProps = React.ComponentProps<"div"> & {
  side?: "left" | "right"
}

export function SheetContent({
  className,
  side = "left",
  children,
  ...props
}: SheetContentProps) {
  const { open, onOpenChange } = useSheet()

  if (!open) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex bg-black/60",
        side === "left" ? "justify-start" : "justify-end",
      )}
      onClick={() => onOpenChange?.(false)}
    >
      <div
        className={cn(
          "relative h-full max-w-full shadow-lg transition-transform",
          side === "left" ? "translate-x-0" : "-translate-x-0",
          className,
        )}
        {...props}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

type SheetHeaderProps = React.ComponentProps<"div">

export function SheetHeader({ className, ...props }: SheetHeaderProps) {
  return (
    <div
      className={cn("px-4 py-3", className)}
      {...props}
    />
  )
}

type SheetTitleProps = React.ComponentProps<"h2">

export function SheetTitle({ className, ...props }: SheetTitleProps) {
  return (
    <h2
      className={cn("text-base font-semibold", className)}
      {...props}
    />
  )
}

type SheetDescriptionProps = React.ComponentProps<"p">

export function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

