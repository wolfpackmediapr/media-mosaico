
import React from "react";
import { cn } from "@/lib/utils";

interface EmptyPlaceholderProps {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyPlaceholder({
  icon,
  title,
  message,
  children,
  className,
}: EmptyPlaceholderProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8 h-full",
      className
    )}>
      {icon && <div className="mb-4">{icon}</div>}
      {title && <h3 className="text-lg font-medium mb-2">{title}</h3>}
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {children}
    </div>
  );
}
