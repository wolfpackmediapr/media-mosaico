
import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyPlaceholderProps {
  message: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyPlaceholder({
  message,
  description,
  icon,
  className,
  children,
}: EmptyPlaceholderProps) {
  return (
    <div className={cn("flex min-h-[200px] flex-col items-center justify-center rounded-md p-8 text-center", className)}>
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        {icon && <div className="mb-4">{icon}</div>}
        <h3 className="text-lg font-semibold">{message}</h3>
        {description && <p className="mb-4 mt-2 text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
    </div>
  );
}
