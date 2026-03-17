"use client"

import * as React from "react"

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)

    const onChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile("matches" in event ? event.matches : (event as MediaQueryList).matches)
    }

    onChange(mql)
    mql.addEventListener("change", onChange)

    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return isMobile
}

