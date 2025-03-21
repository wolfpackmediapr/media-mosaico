
import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyPlaceholderProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

// Main component
export function EmptyPlaceholder({
  message,
  description,
  icon,
  className,
  children,
  ...props
}: EmptyPlaceholderProps) {
  return (
    <div className={cn("flex min-h-[200px] flex-col items-center justify-center rounded-md p-8 text-center", className)} {...props}>
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        {icon && <div className="mb-4">{icon}</div>}
        <h3 className="text-lg font-semibold">{message}</h3>
        {description && <p className="mb-4 mt-2 text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
    </div>
  );
}

// Compound components for backward compatibility
EmptyPlaceholder.Icon = function EmptyPlaceholderIcon({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
};

EmptyPlaceholder.Title = function EmptyPlaceholderTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold">{children}</h3>;
};

EmptyPlaceholder.Description = function EmptyPlaceholderDescription({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 mt-2 text-sm text-muted-foreground">{children}</p>;
};
