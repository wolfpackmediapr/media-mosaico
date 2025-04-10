
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, readOnly, ...props }, ref) => {
    // Apply different styling for readOnly vs disabled states
    const readOnlyClass = readOnly 
      ? "bg-background text-foreground cursor-text opacity-100" 
      : "";
      
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          readOnlyClass,
          className
        )}
        ref={ref}
        readOnly={readOnly}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
