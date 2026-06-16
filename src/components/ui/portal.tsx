import * as React from "react"
import { createPortal } from "react-dom"
import { isH5 } from "@/lib/platform"

const Portal = ({ children }: { children: React.ReactNode }) => {
  if (isH5()) {
    if (typeof document === "undefined") return <>{children}</>
    return createPortal(children, document.body)
  }
  return <>{children}</>
}

export { Portal }
