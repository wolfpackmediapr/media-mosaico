
import { ReactNode } from "react";

interface SettingsHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;  // Added this line to support the action prop
}

export function SettingsHeader({ title, description, action }: SettingsHeaderProps) {
  return (
    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
